import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runMeteredAi } from "./ai-usage";
import { createClient } from "@supabase/supabase-js";

const id = "52b723bd-1ef5-43cb-8f1e-d6a10fb1b576";
const approved = { allowed: true, reservation_id: id, global_used: 1 };
const dbFor = (data = approved, error = null) => ({ rpc: vi.fn(name => ({ abortSignal: vi.fn(async () => name === "reserve_ai_request" ? { data, error } : { data: null, error: null }) })) });
const run = (db, handler = vi.fn(() => Response.json({ ok: true }))) => runMeteredAi({ supabase: db, userId: "private-user", routeName: "analyze", handler });
beforeEach(() => { vi.spyOn(console, "warn").mockImplementation(() => {}); vi.spyOn(console, "error").mockImplementation(() => {}); });
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

it("reserves usage before running the handler, then completes the same durable reservation", async () => {
  const db = dbFor(); const expected = Response.json({ message: "The actual AI result" });
  const handler = vi.fn(() => { expect(db.rpc).toHaveBeenCalledTimes(1); return expected; });
  expect(await run(db, handler)).toBe(expected);
  expect(db.rpc).toHaveBeenNthCalledWith(1, "reserve_ai_request", {
    p_user_id: "private-user", p_route: "analyze", p_user_limit: 50, p_global_limit: 100,
    p_global_concurrency: 3, p_lease_seconds: 240, p_cooldown_seconds: 5,
  });
  expect(db.rpc).toHaveBeenNthCalledWith(2, "finish_ai_request", { p_reservation_id: id, p_status: 200 });
  expect(handler).toHaveBeenCalledExactlyOnceWith("private-user");
  expect(db.rpc.mock.results.every(r => r.value.abortSignal.mock.calls[0][0] instanceof AbortSignal)).toBe(true);
});

it("waits for database admission before making provider work possible", async () => {
  let admit; const handler = vi.fn(() => Response.json({ ok: true }));
  const db = { rpc: vi.fn(name => ({ abortSignal: () => name === "reserve_ai_request"
    ? new Promise(resolve => { admit = resolve; }) : Promise.resolve({ error: null }) })) };
  const result = run(db, handler);
  expect(handler).not.toHaveBeenCalled();
  admit({ data: approved, error: null }); await result;
  expect(handler).toHaveBeenCalledOnce();
});

it.each(["quota_exceeded", "global_quota_exceeded", "request_in_progress", "ai_busy", "request_too_soon"])("refuses %s with a retry hint before any provider work", async reason => {
  const db = dbFor({ allowed: false, reason, retry_after: 15 }); const handler = vi.fn();
  const response = await run(db, handler);
  expect(response.status).toBe(429); expect(response.headers.get("Retry-After")).toBe("15");
  const body = await response.json();
  expect(body).toMatchObject({ code: reason, error: expect.any(String) });
  expect(body.error).toMatch(/daily|shared|running|busy|few seconds/);
  expect(handler).not.toHaveBeenCalled(); expect(db.rpc).toHaveBeenCalledTimes(1);
});

it.each([null, {}, {allowed:"yes"}, {allowed:true}, {allowed:true,reservation_id:"not-a-reservation"},
  {allowed:false,reason:"unknown",retry_after:1}, {allowed:false,reason:"ai_busy",retry_after:0},
  {allowed:false,reason:"ai_busy",retry_after:86401}, {allowed:false,reason:"ai_busy",retry_after:1.5}])("fails closed on an invalid reservation response: %j", async data => {
  const handler = vi.fn(); const response = await run(dbFor(data), handler);
  expect(response.status).toBe(503); expect(await response.json()).toMatchObject({ code: "usage_unavailable", error: expect.stringMatching(/Could not verify AI usage/) });
  expect(handler).not.toHaveBeenCalled();
});

it("fails closed on database error or network rejection", async () => {
  const handler = vi.fn();
  expect((await run(dbFor(approved, {message:"Database unavailable"}), handler)).status).toBe(503);
  const db = { rpc: () => ({ abortSignal: async () => { throw new Error("Timeout"); } }) };
  expect((await run(db, handler)).status).toBe(503); expect(handler).not.toHaveBeenCalled();
});

it.each([200, 400, 413, 422, 429, 502, 504])("records response status %i so SQL applies the correct budget policy", async status => {
  const db = dbFor(); const response = new Response(null, {status});
  expect(await run(db, () => response)).toBe(response);
  expect(db.rpc).toHaveBeenLastCalledWith("finish_ai_request", {p_reservation_id:id, p_status:status});
});

it("finishes thrown work as a failure while preserving the exception", async () => {
  const db = dbFor(); const error = new Error("Provider processing failed");
  await expect(run(db, () => { throw error; })).rejects.toBe(error);
  expect(db.rpc).toHaveBeenLastCalledWith("finish_ai_request", {p_reservation_id:id,p_status:500});
});

it.each(["error", "throw"])("keeps a valid result if completion fails by %s; the durable reservation remains counted", async failure => {
  const db = dbFor(); const original = db.rpc.getMockImplementation();
  db.rpc.mockImplementation((...args) => args[0] === "finish_ai_request" ? { abortSignal: async () => {
    if (failure === "throw") throw new Error("Private database diagnostic");
    return {error:{message:"Private database diagnostic"}};
  } } : original(...args));
  const expected = Response.json({ok:true}); expect(await run(db, () => expected)).toBe(expected);
  expect(console.error).toHaveBeenCalledWith("AI usage completion unavailable; reservation retained", {route:"analyze"});
  expect(JSON.stringify(console.error.mock.calls)).not.toMatch(/private-user|Private database diagnostic/);
});

describe("server controls", () => {
  it("pauses AI before database or handler work", async () => {
    vi.stubEnv("AI_REQUESTS_ENABLED", "false"); const db = dbFor(); const handler = vi.fn();
    const response = await run(db, handler);
    expect(response.status).toBe(503); expect(await response.json()).toMatchObject({code:"ai_paused",error:expect.stringMatching(/temporarily paused/)});
    expect(db.rpc).not.toHaveBeenCalled(); expect(handler).not.toHaveBeenCalled();
  });
  it("uses bounded server configuration", async () => {
    vi.stubEnv("AI_DAILY_QUOTA_PER_USER","7"); vi.stubEnv("AI_GLOBAL_DAILY_QUOTA","20"); vi.stubEnv("AI_GLOBAL_CONCURRENCY","2");
    const db = dbFor(); await run(db);
    expect(db.rpc).toHaveBeenCalledWith("reserve_ai_request", expect.objectContaining({p_user_limit:7,p_global_limit:20,p_global_concurrency:2}));
  });
  it.each([["AI_DAILY_QUOTA_PER_USER","0"],["AI_DAILY_QUOTA_PER_USER","1001"],["AI_GLOBAL_DAILY_QUOTA","-1"],
    ["AI_GLOBAL_DAILY_QUOTA","100001"],["AI_GLOBAL_CONCURRENCY","33"],["AI_GLOBAL_CONCURRENCY","1.5"],["AI_GLOBAL_CONCURRENCY","no"]])("refuses invalid %s=%s instead of silently removing the cap", async (name,value) => {
    vi.stubEnv(name,value); const db = dbFor(); const handler = vi.fn();
    expect((await run(db,handler)).status).toBe(503); expect(db.rpc).not.toHaveBeenCalled(); expect(handler).not.toHaveBeenCalled();
  });
  it.each([[79,false],[80,true],[100,true]])("logs a budget warning at %i shared requests without logging user data", async (used,warn) => {
    await run(dbFor({...approved,global_used:used}));
    expect(console.warn.mock.calls.length > 0).toBe(warn);
    expect(JSON.stringify(console.warn.mock.calls)).not.toContain("private-user");
  });
});


it("allows bounded real Supabase HTTP round trips and finishes without a cleanup error", async () => {
  const http = vi.fn(async (url, options) => {
    await new Promise((resolve,reject) => {
      const timer=setTimeout(resolve,20);
      options.signal.addEventListener("abort",()=>{clearTimeout(timer);reject(new Error("Aborted request"));},{once:true});
    });
    return Response.json(String(url).endsWith("reserve_ai_request") ? approved : null);
  });
  const db=createClient("https://example.supabase.co","isolated-test-key",{global:{fetch:http},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  expect((await run(db)).status).toBe(200);
  expect(http).toHaveBeenCalledTimes(2);
  expect(console.error).not.toHaveBeenCalled();
});

it("uses defaults when optional limit environment values are blank", async () => {
  for (const name of ["AI_DAILY_QUOTA_PER_USER","AI_GLOBAL_DAILY_QUOTA","AI_GLOBAL_CONCURRENCY"]) vi.stubEnv(name,"");
  const db=dbFor(); expect((await run(db)).status).toBe(200);
  expect(db.rpc).toHaveBeenCalledWith("reserve_ai_request",expect.objectContaining({p_user_limit:50,p_global_limit:100,p_global_concurrency:3}));
});
