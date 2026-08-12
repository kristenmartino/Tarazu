import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const PUBLIC_DIR = path.join(process.cwd(), "public");

// The IndexNow key is deliberately public — hosting it at a fetchable URL IS the
// ownership proof — so it is committed rather than kept in an env var. What
// matters is that the filename and the contents agree: IndexNow answers 403 on a
// mismatch, and the failure message ("key not found") reads like a bad key
// rather than a typo'd file.
describe("IndexNow key file", () => {
  const keyFiles = readdirSync(PUBLIC_DIR).filter((f) => /^[a-f0-9]{8,128}\.txt$/i.test(f));

  it("ships exactly one key file in public/", () => {
    expect(keyFiles, `found: ${keyFiles.join(", ") || "none"}`).toHaveLength(1);
  });

  it("contains exactly the key it is named for", () => {
    const key = path.basename(keyFiles[0], ".txt");
    const contents = readFileSync(path.join(PUBLIC_DIR, keyFiles[0]), "utf8").trim();
    expect(contents).toBe(key);
  });

  it("uses a key of the length the protocol accepts", () => {
    const key = path.basename(keyFiles[0], ".txt");
    expect(key.length).toBeGreaterThanOrEqual(8);
    expect(key.length).toBeLessThanOrEqual(128);
    expect(key).toMatch(/^[a-f0-9]+$/i);
  });
});
