import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

// This destructive fixture reset can only run against the named isolated test
// database, with an explicit opt-in. It never reads .env.local or production.
if (process.env.AI_USAGE_TEST_DATABASE !== "isolated" || process.env.PGDATABASE !== "tarazu_quota_test")
  throw new Error("AI usage checks require the isolated tarazu_quota_test database.");
const exec = promisify(execFile);
const sql = async query => (await exec("psql", ["-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-c", query], { maxBuffer: 1024 * 1024 })).stdout.trim();
assert.equal(await sql("select current_database()"), "tarazu_quota_test");
const reset = () => sql("truncate public.ai_usage_reservations, public.ai_call_log");
const quote = value => "'" + String(value).replaceAll("'", "''") + "'";
const reserve = async (user, { perUser = 50, global = 100, concurrency = 3, cooldown = 0 } = {}) => JSON.parse(await sql(
  `select public.reserve_ai_request(${quote(user)}, 'analyze', ${perUser}, ${global}, ${concurrency}, 240, ${cooldown})`));
const finish = (reservation, status) => sql(`select public.finish_ai_request(${quote(reservation.reservation_id)}, ${status})`);
const check = async (label, fn) => { await reset(); await fn(); console.log(`PASS ${label}`); };

await check("simultaneous requests from one account admit exactly one", async () => {
  const results = await Promise.all(Array.from({length:16}, () => reserve("same-account")));
  assert.equal(results.filter(r => r.allowed).length, 1);
  assert.equal(results.filter(r => r.reason === "request_in_progress").length, 15);
  assert.equal(await sql("select count(*) from public.ai_usage_reservations"), "1");
});
await check("global concurrency is atomic across different accounts", async () => {
  const results = await Promise.all(Array.from({length:16}, (_, i) => reserve(`account-${i}`)));
  assert.equal(results.filter(r => r.allowed).length, 3);
  assert.equal(results.filter(r => r.reason === "ai_busy").length, 13);
});
await check("simultaneous requests cannot overrun the shared daily budget", async () => {
  const results = await Promise.all(Array.from({length:16}, (_,i) => reserve(`account-${i}`, {global:4, concurrency:16})));
  assert.equal(results.filter(r => r.allowed).length, 4);
  assert.equal(results.filter(r => r.reason === "global_quota_exceeded").length, 12);
});
await check("completed and failed work consume the per-user budget", async () => {
  const first = await reserve("daily", {perUser:2}); assert.equal(first.allowed,true); await finish(first,200);
  const second = await reserve("daily", {perUser:2}); assert.equal(second.allowed,true); await finish(second,504);
  const refused = await reserve("daily", {perUser:2}); assert.equal(refused.reason,"quota_exceeded");
  assert.ok(refused.retry_after > 86000 && refused.retry_after <= 86400);
  assert.equal(await sql("select string_agg(state, ',' order by created_at) from public.ai_usage_reservations"), "completed,failed");
});
await check("invalid-input rejections return budget and release concurrency", async () => {
  for (const status of [400,413,422]) {
    const result = await reserve("validation", {perUser:1}); assert.equal(result.allowed,true); await finish(result,status);
  }
  assert.equal((await reserve("validation", {perUser:1})).allowed,true);
});
await check("upstream failure stays counted and duplicate completion cannot refund it", async () => {
  const result = await reserve("failure", {perUser:1}); await finish(result,502); await finish(result,400);
  assert.equal((await reserve("failure", {perUser:1})).reason,"quota_exceeded");
  assert.equal(await sql("select state from public.ai_usage_reservations"),"failed");
});
await check("expired crash leases release concurrency but keep consumed budget", async () => {
  const result = await reserve("crash", {perUser:2}); assert.equal(result.allowed,true);
  await sql("update public.ai_usage_reservations set lease_expires_at = clock_timestamp() - interval '1 second'");
  const next = await reserve("crash", {perUser:2}); assert.equal(next.allowed,true); await finish(next,200);
  assert.equal((await reserve("crash", {perUser:2})).reason,"quota_exceeded");
});
await check("cooldown prevents immediate repeats after completion", async () => {
  const result = await reserve("repeat"); await finish(result,200);
  const refused = await reserve("repeat", {cooldown:5}); assert.equal(refused.reason,"request_too_soon");
  assert.ok(refused.retry_after >= 1 && refused.retry_after <= 5);
});
await check("the rolling window retains earlier deployment usage and expires old requests", async () => {
  await sql("insert into public.ai_call_log(user_id,route,created_at) values ('legacy','analyze',clock_timestamp()),('old','analyze',clock_timestamp()-interval '25 hours')");
  assert.equal((await reserve("legacy", {perUser:1})).reason,"quota_exceeded");
  assert.equal((await reserve("old", {perUser:1})).allowed,true);
  assert.equal((await reserve("someone-else", {global:2})).reason,"global_quota_exceeded");
});
await check("only the backend service role can reserve or complete usage", async () => {
  for (const role of ["anon","authenticated"]) {
    await assert.rejects(sql(`set role ${role}; select public.reserve_ai_request('x','analyze')`), /permission denied for function/);
    await assert.rejects(sql(`set role ${role}; select public.finish_ai_request('00000000-0000-0000-0000-000000000000',200)`), /permission denied for function/);
    await assert.rejects(sql(`set role ${role}; select * from public.ai_usage_reservations`), /permission denied/);
  }
  const allowed = JSON.parse(await sql("set role service_role; select public.reserve_ai_request('backend','analyze')"));
  assert.equal(allowed.allowed,true);
});
await check("invalid configuration cannot create an unmetered reservation", async () => {
  for (const args of ["'', 'analyze'", "'x', 'unknown'", "'x','analyze',0", "'x','analyze',50,0", "'x','analyze',50,100,0", "'x','analyze',50,100,3,10", "'x','analyze',50,100,3,240,-1"]) {
    await assert.rejects(sql(`select public.reserve_ai_request(${args})`), /Invalid AI usage configuration/);
  }
  assert.equal(await sql("select count(*) from public.ai_usage_reservations"),"0");
});
await reset();
console.log("All AI usage database checks passed.");
