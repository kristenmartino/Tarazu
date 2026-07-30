#!/usr/bin/env node
// Fail the build if a server-only secret ends up in the client bundle.
//
// Next.js inlines every NEXT_PUBLIC_* env var into .next/static at build time,
// so anything carrying that prefix is world-readable the moment it deploys.
// The failure mode this guards against is prefixing a secret to make it reach
// client code — NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY would publish database
// god-mode to every visitor, and nothing would visibly break.
//
//   node scripts/check-bundle-secrets.mjs [dir]   # default: .next/static
//   node scripts/check-bundle-secrets.mjs --self-test
//
// Exits 1 on a finding. Matches are redacted in output so CI logs never
// become a second copy of the leak.

import { readdirSync, readFileSync, statSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const PATTERNS = [
  {
    name: "Clerk secret key",
    re: /\bsk_(?:live|test)_[A-Za-z0-9]{20,}/g,
    hint: "CLERK_SECRET_KEY is server-only — never prefix it with NEXT_PUBLIC_.",
  },
  {
    name: "Anthropic API key",
    re: /\bsk-ant-[A-Za-z0-9_-]{20,}/g,
    hint: "ANTHROPIC_API_KEY belongs in the API routes, not client code.",
  },
  {
    name: "Supabase service-role reference",
    re: /SUPABASE_SERVICE_ROLE_KEY|["']service_role["']/g,
    hint: "The service-role key bypasses RLS. It must stay in the server runtime.",
  },
  {
    name: "OpenSSL/PEM private key",
    re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
    hint: "A private key must never be committed, let alone bundled.",
  },
];

// Supabase anon and service-role keys are both JWTs; only the latter is
// dangerous, so decode rather than flagging every eyJ-shaped string (Clerk and
// other libraries legitimately embed JWT-looking values).
const JWT = /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g;

function decodeJwtRole(token) {
  try {
    const payload = token.split(".")[1];
    const json = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return json.role ?? null;
  } catch {
    return null;
  }
}

function redact(s) {
  return s.length <= 12 ? `${s.slice(0, 4)}…` : `${s.slice(0, 8)}…${s.slice(-2)}`;
}

function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

function scan(dir) {
  const findings = [];
  const files = walk(dir).filter((f) => /\.(js|mjs|cjs|json|css|html|txt|map)$/.test(f));

  for (const file of files) {
    const text = readFileSync(file, "utf8");

    for (const { name, re, hint } of PATTERNS) {
      for (const m of text.matchAll(re)) {
        findings.push({ file, name, hint, match: redact(m[0]) });
      }
    }

    for (const m of text.matchAll(JWT)) {
      const role = decodeJwtRole(m[0]);
      if (role && role !== "anon") {
        findings.push({
          file,
          name: `Supabase JWT with role "${role}"`,
          hint: 'Only the "anon" key may reach the browser.',
          match: redact(m[0]),
        });
      }
    }
  }
  return { findings, fileCount: files.length };
}

function selfTest() {
  // A check that cannot fail is worthless — prove each pattern actually fires,
  // and that the public publishable key does not.
  const dir = mkdtempSync(join(tmpdir(), "secretscan-"));
  const cases = [
    ["clerk.js", `const k="sk_live_${"a".repeat(32)}"`, true],
    ["anthropic.js", `const k="sk-ant-api03-${"b".repeat(40)}"`, true],
    ["supa.js", `const k="SUPABASE_SERVICE_ROLE_KEY"`, true],
    ["pem.js", `"-----BEGIN PRIVATE KEY-----"`, true],
    ["jwt.js", `const k="${makeJwt("service_role")}"`, true],
    ["clean.js", `const k="pk_live_Y2xlcmsudGFyYXp1LmFwcCQ"`, false],
    ["anon.js", `const k="${makeJwt("anon")}"`, false],
  ];

  let failed = 0;
  for (const [name, body, shouldFlag] of cases) {
    const sub = mkdtempSync(join(dir, "c-"));
    writeFileSync(join(sub, name), body);
    const hit = scan(sub).findings.length > 0;
    const ok = hit === shouldFlag;
    if (!ok) failed++;
    console.log(
      `  ${ok ? "✓" : "✗"} ${name.padEnd(14)} ${shouldFlag ? "must flag" : "must pass"}` +
        `${ok ? "" : `  <-- got ${hit ? "flagged" : "clean"}`}`
    );
  }
  rmSync(dir, { recursive: true, force: true });

  if (failed) {
    console.error(`\nSelf-test FAILED (${failed} case${failed === 1 ? "" : "s"}).`);
    process.exit(1);
  }
  console.log("\nSelf-test passed — every pattern fires, no false positives.");
}

function makeJwt(role) {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ role, iss: "supabase" })}.${"s".repeat(43)}`;
}

// --- main ---
if (process.argv.includes("--self-test")) {
  console.log("Secret-scan self-test:");
  selfTest();
  process.exit(0);
}

const dir = process.argv[2] ?? ".next/static";
const { findings, fileCount } = scan(dir);

if (fileCount === 0) {
  console.error(`✗ No files found in ${dir} — run \`npm run build\` first.`);
  process.exit(1);
}

if (findings.length === 0) {
  console.log(`✓ No secrets in the client bundle (${fileCount} files scanned in ${dir}).`);
  process.exit(0);
}

console.error(`\n✗ SECRET IN CLIENT BUNDLE — ${findings.length} finding(s):\n`);
for (const f of findings) {
  console.error(`  ${f.name}`);
  console.error(`    file:  ${f.file}`);
  console.error(`    match: ${f.match}`);
  console.error(`    ${f.hint}\n`);
}
console.error("Anything named NEXT_PUBLIC_* is inlined into the browser bundle.");
console.error("Rename the variable to drop that prefix and read it server-side instead.\n");
process.exit(1);
