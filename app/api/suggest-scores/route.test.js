import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
// This route bills the Anthropic API per call, so it is gated behind Clerk
// AND a per-user daily quota (lib/api-auth.js's withUser), which needs
// Supabase. vi.mock intercepts the dynamic import inside getUserId() and the
// static import of lib/supabase. Both default to "authenticated, well under
// quota"; the describe blocks below override one or the other.
const { mockAuth, mockGetSupabase } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockGetSupabase: vi.fn(),
}));
vi.mock("@clerk/nextjs/server", () => ({ auth: mockAuth }));
vi.mock("../../../lib/supabase", () => ({ getSupabase: mockGetSupabase }));

import { POST } from "./route";

// Exercise the real admission wrapper while provider responses are mocked.
const fakeSupabase = (count = 0) => ({
  rpc: name => ({ abortSignal: async () => name === "reserve_ai_request"
    ? {data:count >= 50 ? {allowed:false,reason:"quota_exceeded",retry_after:60}
      : {allowed:true,reservation_id:"52b723bd-1ef5-43cb-8f1e-d6a10fb1b576",global_used:count+1},error:null}
    : name === "reserve_ai_spend" ? {data:{allowed:true,reserved:1000000},error:null} : {data:null,error:null} }),
});

const makeRequest = (body) => ({ json: () => Promise.resolve(body) });
const assessment = score => ({ score, justification: "reason", evidence: [], assumptions: [], gaps: [], nextAction: "Validate audience", claimReviews: [], followUp: score === null ? {question:"How many eligible accounts are there?", whyItChangesScore:"The audience share determines the reach band.", claimIds:[]} : null });
const okText = (obj) => ({
  ok: true,
  status: 200,
  json: () => Promise.resolve({ content: [{ type: "text", text: JSON.stringify(Object.fromEntries(Object.entries(obj).map(([k,v]) => [k, { ...assessment(v.score), ...v }]))) }] }),
});

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
  process.env.ANTHROPIC_API_KEY = "sk-test";
  mockAuth.mockResolvedValue({ userId: "user_test" });
  mockGetSupabase.mockReturnValue(fakeSupabase(0));
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.ANTHROPIC_API_KEY;
});

describe("POST /api/suggest-scores", () => {
  it("returns scored dimensions on success", async () => {
    fetch.mockResolvedValueOnce(okText({
      reach: { score: 55, justification: "broad" },
      impact: { score: 75, justification: "meaningful" },
      confidence: { score: 50, justification: "some data" },
      effort: { score: 35, justification: "moderate" },
    }));
    const res = await POST(makeRequest({ featureName: "Search" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.reach.score).toBe(55);
    expect(data.impact.justification).toBe("meaningful");
  });

  it("rejects out-of-range scores rather than silently clamping", async () => {
    fetch.mockResolvedValue(okText({ reach: assessment(250) }));
    const res = await POST(makeRequest({ featureName: "X", dimensions: ["reach"] }));
    expect(res.status).toBe(502);
  });
  it("repairs arbitrary precision and sends the shared rubric with candidate answers", async () => {
    fetch.mockResolvedValueOnce(okText({reach:assessment(42)})).mockResolvedValueOnce(okText({reach:{...assessment(35), evidence:['scoring:rubric', 'candidate:unsaved']}}));
    const res = await POST(makeRequest({featureName:'Reminders', dimensions:['reach'], productContext:{scoring:{timeframe:'90 days', audience:'100 accounts'}}, scoringBasis:{reach:'30 accounts; estimate'}}));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.reach.score).toBe(35);
    expect(data.context.candidate.scoringBasis.reach).toBe('30 accounts; estimate');
    const prompt = JSON.parse(fetch.mock.calls[0][1].body).messages[0].content;
    expect(prompt).toContain('30 accounts; estimate');
    expect(prompt).toContain('About 30% of the workspace audience');
    expect(prompt).toContain('return reach:null');
    expect(JSON.parse(fetch.mock.calls[1][1].body).messages[2].content).toContain('Use a shared anchor score');
  });
  it("supports insufficient information without a default score", async () => {
    fetch.mockResolvedValue(okText({ reach: assessment(null) }));
    const res = await POST(makeRequest({ featureName: "X", dimensions: ["reach"], productContext: { constraints: "No engineers", successMetrics: "Retention" } }));
    expect((await res.json()).reach.score).toBeNull();
    const prompt = JSON.parse(fetch.mock.calls[0][1].body).messages[0].content;
    expect(prompt).toContain('No engineers'); expect(prompt).toContain('Retention');
  });
  it("rejects invented evidence references", async () => {
    fetch.mockResolvedValue(okText({ reach: { ...assessment(50), evidence: ['signal:invented'] } }));
    const res = await POST(makeRequest({ featureName: "X", dimensions: ["reach"] }));
    expect(res.status).toBe(502);
  });

  it("repairs assessment narration before returning a score suggestion", async () => {
    fetch.mockResolvedValueOnce(okText({ confidence: { ...assessment(20), justification: 'The draft decision notes four of seven opportunity dimensions remain unassessed.' } }))
      .mockResolvedValueOnce(okText({ confidence: { ...assessment(20), justification: 'Synthetic interviews conflict on the cause of delays.' } }));
    const res = await POST(makeRequest({ featureName: 'Reminders', dimensions: ['confidence'] }));
    expect(res.status).toBe(200);
    expect((await res.json()).confidence.justification).toBe('Synthetic interviews conflict on the cause of delays.');
    expect(fetch).toHaveBeenCalledTimes(2);
    const messages = JSON.parse(fetch.mock.calls[1][1].body).messages;
    expect(messages[2].content).toContain('confidence.justification: Do not narrate validation assessment');
  });

  it("returns no suggestions if the repair still narrates assessment counts", async () => {
    fetch.mockResolvedValue(okText({ confidence: { ...assessment(20), gaps: ['4 of 7 dimensions unassessed.'] } }));
    const res = await POST(makeRequest({ featureName: 'Reminders', dimensions: ['confidence'] }));
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ category: 'invalid_response' });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("requires a feature name", async () => {
    const res = await POST(makeRequest({ featureName: "" }));
    expect(res.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('sends source-linked claims with checked provenance and rejects an invented claim review', async () => {
    const claim = {id:'c1',dimension:'reach',text:'30 accounts; forecast',kind:'estimate',sources:[{signalId:'s1',relation:'supports',quote:'30 accounts'}]};
    const body = {featureName:'Reminders',dimensions:['reach'],scoringBasis:{claims:[claim]},signals:[{id:'s1',body:'30 accounts'}]};
    fetch.mockResolvedValue(okText({reach:{...assessment(35),claimReviews:[{claimId:'made-up',status:'supported',explanation:'A source',evidence:['signal:s1']}]}}));
    expect((await POST(makeRequest(body))).status).toBe(502);
    const prompt = JSON.parse(fetch.mock.calls[0][1].body).messages[0].content;
    expect(prompt).toContain('Excerpt matches source');
    expect(prompt).toContain('30 accounts; forecast');
    expect(prompt).toContain('A complaint about a problem does not establish its prevalence');
  });

  it('rejects malformed scoring claims before billing AI', async () => {
    const response = await POST(makeRequest({featureName:'Reminders',scoringBasis:{claims:[{kind:'verified'}]}}));
    expect(response.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('spells out the exact confidence review list so cross-input claims are not omitted', async () => {
    const claims = ['reach','impact','confidence','effort'].map((dimension,i)=>({id:`c${i}`,dimension,text:'An explicit planning estimate',kind:'estimate',sources:[]}));
    const review = id => ({claimId:id,status:'source_missing',explanation:'No source supplied',evidence:[]});
    fetch.mockResolvedValueOnce(okText({confidence:{...assessment(20),claimReviews:[review('c2')]}}))
      .mockResolvedValueOnce(okText({confidence:{...assessment(20),claimReviews:[review('c0'),review('c1'),review('c2')]}}));
    const response = await POST(makeRequest({featureName:'Reminders',dimensions:['confidence'],scoringBasis:{claims}}));
    expect(response.status).toBe(200);
    const prompt = JSON.parse(fetch.mock.calls[0][1].body).messages[0].content;
    expect(prompt).toContain('Required claimId lists for claimReviews, by response key: {"confidence":["c0","c1","c2"]}');
    const repair = JSON.parse(fetch.mock.calls[1][1].body).messages[2].content;
    expect(repair).toContain('Missing: ["c0","c1"]');
  });

  it("rejects when no valid dimensions are requested", async () => {
    const res = await POST(makeRequest({ featureName: "X", dimensions: ["bogus"] }));
    expect(res.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("maps a rate limit to a categorized 429", async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 429, json: () => Promise.resolve({}) });
    const res = await POST(makeRequest({ featureName: "X" }));
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.category).toBe("rate_limit");
  });
});

describe("POST /api/suggest-scores — auth gate", () => {
  it("rejects an anonymous caller with 401 and never calls the AI API", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const res = await POST(makeRequest({ featureName: "X" }));
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.code).toBe("auth_required");
    // The point of the gate: an anonymous request must cost nothing upstream.
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects when Clerk is not configured at all (guest mode)", async () => {
    mockAuth.mockRejectedValue(new Error("Missing publishableKey"));
    const res = await POST(makeRequest({ featureName: "X" }));
    expect(res.status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("control: the same request succeeds once authenticated", async () => {
    // Guards against the 401s above passing for an unrelated reason (a bad
    // body, a defeated mock). If this fails, the gate tests prove nothing.
    const res = await POST(makeRequest({ featureName: "X" }));
    expect(res.status).not.toBe(401);
  });
});

describe("POST /api/suggest-scores — quota gate", () => {
  // The quota mechanism itself (boundary, recording, fail-closed behavior) is
  // covered exhaustively in lib/api-auth.test.js. This just proves the route
  // is actually wired to it under the right name, and distinguishes it from
  // the OTHER 429 this route can return (Anthropic's own rate limit, tested
  // above as "maps a rate limit to a categorized 429" — that one carries
  // `category: "rate_limit"`, this one carries `code: "quota_exceeded"`).
  it("refuses with 429 once the caller is at the daily limit, and never calls the AI API", async () => {
    mockGetSupabase.mockReturnValue(fakeSupabase(50));
    const res = await POST(makeRequest({ featureName: "X" }));
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.code).toBe("quota_exceeded");
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('POST /api/suggest-scores — supplied-answer review', () => {
  const answer = {id:'saved',dimension:'reach',kind:'estimate',text:'No measured count exists. Forecast 60 of 100 pilot users over 30 days.',question:'What share of the 100 pilot users had an overdue request in a comparable 30-day period?',sources:[]};
  const body = {featureName:'Reminders',dimensions:['reach'],scoringBasis:{claims:[answer]}};
  const proposed = {...assessment(55),claimReviews:[{claimId:'saved',status:'source_missing',explanation:'This forecast is unmeasured.',evidence:[]}],followUp:{question:'How many of 100 users had an overdue request in the most recent comparable 30 days?',whyItChangesScore:'Changes reach band.',claimIds:['saved']},nextAction:'Ask how many users were eligible.'};
  const raw = object => ({ok:true,status:200,json:async()=>({content:[{text:JSON.stringify(object)}]})});
  it('returns a source-backed acknowledgement for the observed paraphrase without retrying the valid scores', async () => {
    fetch.mockResolvedValueOnce(okText({reach:proposed})).mockResolvedValueOnce(raw({reviews:['followUp','nextAction'].map(field=>({id:`reach:${field}`,status:'answered',sourceId:'claim:saved',quote:'No measured count exists.'}))}));
    const response = await POST(makeRequest(body));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({reach:{score:55,followUp:null,followUpResolution:{status:'answered',sourceId:'claim:saved',text:'No measured count exists.'}}});
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetch.mock.calls[1][1].body).messages[0].content).toContain(answer.question);
  });
  it('withholds an unchecked question when review invents an answer, preserving a valid score response', async () => {
    fetch.mockResolvedValueOnce(okText({reach:proposed})).mockResolvedValue(raw({reviews:[{id:'reach:followUp',status:'answered',sourceId:'claim:saved',quote:'There are 60 measured users.'},{id:'reach:nextAction',status:'new',sourceId:null,quote:null}]}));
    const response = await POST(makeRequest(body));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.reach).toMatchObject({score:55,followUp:null,followUpResolution:{status:'unavailable'}});
    expect(JSON.stringify(data.reach)).not.toContain('60 measured users');
    expect(fetch).toHaveBeenCalledTimes(3); // one scoring call, two bounded review attempts
  });
  it('preserves a different timeframe question after a new-information review', async () => {
    const followUp={...proposed.followUp,question:'How many of the 100 users qualify over 90 days rather than 30?'};
    fetch.mockResolvedValueOnce(okText({reach:{...proposed,followUp}})).mockResolvedValueOnce(raw({reviews:['followUp','nextAction'].map(field=>({id:`reach:${field}`,status:'new',sourceId:null,quote:null,...(field === 'nextAction' ? {researchAction:'Track unique affected users prospectively during the new 90-day period.'} : {})}))}));
    const response = await POST(makeRequest(body));
    expect((await response.json()).reach.followUp).toEqual(followUp);
  });
  it('acknowledges an unavailable count and returns a reviewed method instead of asking ops for that count again', async () => {
    const originalAction='Ask ops teams: how many of the 100 pilot users had at least one overdue request last month?';
    const researchAction='Review event records if available; otherwise track unique affected users during the shared scoring period.';
    fetch.mockResolvedValueOnce(okText({reach:{...proposed,nextAction:originalAction}})).mockResolvedValueOnce(raw({reviews:[
      {id:'reach:followUp',status:'answered',sourceId:'claim:saved',quote:'No measured count exists.'},
      {id:'reach:nextAction',status:'new',sourceId:null,quote:null,researchAction},
    ]}));
    const response = await POST(makeRequest(body));
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.reach).toMatchObject({score:55,followUp:null,followUpResolution:{status:'answered'},nextAction:`Suggested research: ${researchAction}`});
    expect(data.reach.nextAction).not.toContain(originalAction);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('withholds a new action without a collection method after bounded review repair', async () => {
    fetch.mockResolvedValueOnce(okText({reach:proposed})).mockResolvedValue(raw({reviews:[
      {id:'reach:followUp',status:'answered',sourceId:'claim:saved',quote:'No measured count exists.'},
      {id:'reach:nextAction',status:'new',sourceId:null,quote:null},
    ]}));
    const response = await POST(makeRequest(body));
    expect(await response.json()).toMatchObject({reach:{score:55,nextAction:'Review the supplied context before choosing the next research step.'}});
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});
