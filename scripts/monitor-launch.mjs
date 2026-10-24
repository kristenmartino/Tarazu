// Owner-facing incidents contain fixed health categories only, never customer data.
import fs from "node:fs/promises";
const repo = process.env.GITHUB_REPOSITORY;
const token = process.env.GH_TOKEN;
const test = process.env.MONITOR_TEST === "true";
const title = test ? "[Tarazu monitoring TEST] Delivery verification" : "[Tarazu operations] Production needs attention";
const api = async (path, method="GET", body) => {
  const r = await fetch(`https://api.github.com/repos/${repo}/${path}`, { method, headers: { Authorization:`Bearer ${token}`, Accept:"application/vnd.github+json", "Content-Type":"application/json", "X-GitHub-Api-Version":"2022-11-28" }, body:body===undefined?undefined:JSON.stringify(body), signal:AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error(`GitHub operation failed: ${r.status}`);
  return r.status===204?null:r.json();
};
if (!repo || !token) throw new Error("Monitoring credentials unavailable");
const problems = [];
try {
  const response = await fetch("https://tarazu.app/api/health",{cache:"no-store",signal:AbortSignal.timeout(15000)});
  const data = await response.json();
  const allowed = ["ai_paused","ai_spend_warning","ai_requests_warning","ai_failures","configuration_or_database_unavailable"];
  if (!response.ok || !["ok","attention"].includes(data.status) || !Array.isArray(data.problems) || data.problems.some(p=>!allowed.includes(p))) problems.push("production_health_unavailable");
  else problems.push(...data.problems);
  for (const path of ["/demo","/privacy","/contact"]) {
    const page=await fetch(`https://tarazu.app${path}`,{signal:AbortSignal.timeout(15000)});
    if(!page.ok) problems.push("public_route_unavailable");
  }
} catch { problems.push("production_health_unavailable"); }
try {
  const r=await fetch("https://api.supabase.com/v1/projects/lyrnkwqxxsjqjcjggies/database/query",{ method:"POST",headers:{Authorization:`Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,"Content-Type":"application/json"},body:JSON.stringify({query:"select public.prune_launch_records();"}),signal:AbortSignal.timeout(15000) });
  if(!r.ok) throw new Error("Prune unavailable");
} catch { problems.push("retention_cleanup_unavailable"); }
if(test) problems.splice(0,problems.length,"test_delivery_only");
const categories=[...new Set(problems)].sort();
const signature=categories.join(",");
// Only this workflow's exact issue titles and bot-created issues can be touched.
const issues=await api("issues?state=open&per_page=100&creator=github-actions%5Bbot%5D");
const existing=issues.find(i=>i.title===title && !i.pull_request);
const run=`https://github.com/${repo}/actions/runs/${process.env.GITHUB_RUN_ID}`;
const body=`${test?"TEST: owner-authorized alert delivery check. No outage is being claimed.":"Tarazu needs an operational review."}\n\nCategories: ${signature}\n\n[Run diagnostics](${run})\n\nSee docs/launch/OPERATIONS.md for triage, AI pause and rollback. No workspace content is included.\n\n<!-- tarazu-monitor:${signature} -->`;
let incident=existing;
if(categories.length) {
  if(!existing) incident=await api("issues","POST",{title,body,assignees:["kristenmartino"]});
  else if(!existing.body?.includes(`<!-- tarazu-monitor:${signature} -->`)) {
    await api(`issues/${existing.number}`,"PATCH",{body});
    await api(`issues/${existing.number}/comments`,"POST",{body:`Health categories changed to: ${signature}. [Diagnostics](${run}).`});
  }
  console.log(`Assigned incident: ${incident.html_url}`);
} else if(existing) {
  await api(`issues/${existing.number}/comments`,"POST",{body:`Recovery verified by [monitoring run](${run}).`});
  await api(`issues/${existing.number}`,"PATCH",{state:"closed",state_reason:"completed"});
}
if(test && incident) {
  // A test is clearly closed after creation. It still exercises assignment/email.
  await api(`issues/${incident.number}/comments`,"POST",{body:"Delivery test completed. Check GitHub and the notification email before marking email delivery verified."});
  await api(`issues/${incident.number}`,"PATCH",{state:"closed",state_reason:"completed"});
}
const summary=categories.length?`Attention: ${signature}. ${incident?.html_url||""}`:"Public routes, AI capacity, database health and retention cleanup passed.";
if(process.env.GITHUB_STEP_SUMMARY) await fs.appendFile(process.env.GITHUB_STEP_SUMMARY,summary+"\n");
// Unchanged warnings keep the existing incident visible without a new failed-
// Actions email every 15 minutes. New/changed incidents still fail visibly.
if(categories.length && !test && (!existing || !existing.body?.includes(`<!-- tarazu-monitor:${signature} -->`))) process.exitCode=1;
