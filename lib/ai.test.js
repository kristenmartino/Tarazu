import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { z } from "zod";
import { requestJson, AiError } from "./ai";

const schema = z.object({ value: z.number() });

const okText = (text) => ({
  ok: true,
  status: 200,
  json: () => Promise.resolve({ content: [{ type: "text", text }] }),
});
const httpErr = (status) => ({ ok: false, status, json: () => Promise.resolve({}) });

const base = { apiKey: "sk-test", model: "m", maxTokens: 100, prompt: "p", schema, timeoutMs: 50 };

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("requestJson", () => {
  it("returns a validated object on first success", async () => {
    fetch.mockResolvedValueOnce(okText(JSON.stringify({ value: 42 })));
    const out = await requestJson(base);
    expect(out).toEqual({ value: 42 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("strips code fences before parsing", async () => {
    fetch.mockResolvedValueOnce(okText("```json\n{ \"value\": 7 }\n```"));
    const out = await requestJson(base);
    expect(out.value).toBe(7);
  });

  it("retries once on malformed JSON, then succeeds", async () => {
    fetch
      .mockResolvedValueOnce(okText("not json at all"))
      .mockResolvedValueOnce(okText(JSON.stringify({ value: 1 })));
    const out = await requestJson(base);
    expect(out.value).toBe(1);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("throws invalid_response after two malformed replies", async () => {
    fetch.mockResolvedValue(okText("still not json"));
    await expect(requestJson(base)).rejects.toMatchObject({
      name: "AiError",
      category: "invalid_response",
      status: 502,
    });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("throws invalid_response when JSON fails schema validation", async () => {
    fetch.mockResolvedValue(okText(JSON.stringify({ value: "not-a-number" })));
    await expect(requestJson(base)).rejects.toMatchObject({ category: "invalid_response" });
  });

  it("maps 429 to a rate_limit error without retrying", async () => {
    fetch.mockResolvedValueOnce(httpErr(429));
    await expect(requestJson(base)).rejects.toMatchObject({ category: "rate_limit", status: 429 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("maps 401/403 to an auth error", async () => {
    fetch.mockResolvedValueOnce(httpErr(401));
    await expect(requestJson(base)).rejects.toMatchObject({ category: "auth" });
  });

  it("maps other HTTP errors to upstream", async () => {
    fetch.mockResolvedValueOnce(httpErr(500));
    await expect(requestJson(base)).rejects.toMatchObject({ category: "upstream", status: 502 });
  });

  it("maps an aborted request to a timeout error", async () => {
    fetch.mockRejectedValueOnce(Object.assign(new Error("aborted"), { name: "AbortError" }));
    await expect(requestJson(base)).rejects.toMatchObject({ category: "timeout", status: 504 });
  });

  it("throws a config error when the API key is missing", async () => {
    await expect(requestJson({ ...base, apiKey: undefined })).rejects.toMatchObject({ category: "config" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("exposes AiError as an Error subclass", () => {
    const e = new AiError("upstream", "x", 502);
    expect(e).toBeInstanceOf(Error);
    expect(e.category).toBe("upstream");
  });
});

// ---------------------------------------------------------------------------
// The block above asserts what comes back. Everything below asserts what goes
// out, and the exact wording that reaches users — the two gaps that let 38
// mutants survive at 92% line coverage.
// ---------------------------------------------------------------------------

const bodyOf = (n = 0) => JSON.parse(fetch.mock.calls[n][1].body);
const optsOf = (n = 0) => fetch.mock.calls[n][1];
const urlOf = (n = 0) => fetch.mock.calls[n][0];

describe("outgoing request", () => {
  beforeEach(() => {
    fetch.mockResolvedValue(okText(JSON.stringify({ value: 1 })));
  });

  it("POSTs to the Anthropic messages endpoint", async () => {
    await requestJson(base);
    expect(urlOf()).toBe("https://api.anthropic.com/v1/messages");
    expect(optsOf().method).toBe("POST");
  });

  it("sends the API key and the pinned API version header", async () => {
    // anthropic-version is a wire contract: a wrong value fails every call in
    // production, and no response-shape assertion would notice.
    await requestJson({ ...base, apiKey: "sk-secret" });
    expect(optsOf().headers).toEqual({
      "Content-Type": "application/json",
      "x-api-key": "sk-secret",
      "anthropic-version": "2023-06-01",
    });
  });

  it("passes model, max_tokens and the prompt through to the body", async () => {
    await requestJson({ ...base, model: "claude-x", maxTokens: 512, prompt: "score this" });
    expect(bodyOf()).toEqual({
      model: "claude-x",
      max_tokens: 512,
      messages: [{ role: "user", content: "score this" }],
    });
  });

  it("attaches an abort signal", async () => {
    await requestJson(base);
    expect(optsOf().signal).toBeInstanceOf(AbortSignal);
    expect(optsOf().signal.aborted).toBe(false);
  });
});

describe("retry prompt construction", () => {
  it("echoes the bad reply back and asks for JSON only", async () => {
    fetch
      .mockResolvedValueOnce(okText("here you go: nonsense"))
      .mockResolvedValueOnce(okText(JSON.stringify({ value: 3 })));

    await requestJson(base);

    expect(bodyOf(1).messages).toEqual([
      { role: "user", content: "p" },
      { role: "assistant", content: "here you go: nonsense" },
      {
        role: "user",
        content:
          "That was not valid JSON matching the required structure. Reply with ONLY the JSON object — no prose, no code fences.",
      },
    ]);
  });

  it("substitutes a placeholder when the first reply was empty", async () => {
    fetch
      .mockResolvedValueOnce(okText(""))
      .mockResolvedValueOnce(okText(JSON.stringify({ value: 3 })));

    await requestJson(base);

    expect(bodyOf(1).messages[1]).toEqual({ role: "assistant", content: "(no output)" });
  });

  it("does not send the corrective turn on the first attempt", async () => {
    fetch.mockResolvedValueOnce(okText(JSON.stringify({ value: 1 })));
    await requestJson(base);
    expect(bodyOf(0).messages).toHaveLength(1);
  });
});

describe("error messages (the text users actually see)", () => {
  const cases = [
    ["config", () => {}, { ...base, apiKey: undefined }, "AI is not configured."],
    ["rate_limit", () => fetch.mockResolvedValueOnce(httpErr(429)), base,
      "The AI service is rate limited. Please try again shortly."],
    ["auth", () => fetch.mockResolvedValueOnce(httpErr(403)), base,
      "The AI service rejected the request credentials."],
    ["upstream (status interpolated)", () => fetch.mockResolvedValueOnce(httpErr(503)), base,
      "The AI service returned an error (503)."],
    ["transport", () => fetch.mockRejectedValueOnce(new TypeError("network down")), base,
      "Could not reach the AI service."],
    ["timeout", () => fetch.mockRejectedValueOnce(Object.assign(new Error("x"), { name: "AbortError" })), base,
      "The AI request timed out. Please try again."],
    ["invalid_response", () => fetch.mockResolvedValue(okText("nope")), base,
      "The AI returned a malformed response."],
  ];

  for (const [name, arrange, opts, message] of cases) {
    it(`${name}: "${message}"`, async () => {
      arrange();
      await expect(requestJson(opts)).rejects.toThrow(message);
    });
  }
});

describe("transport failure category", () => {
  it("maps a non-abort fetch rejection to upstream/502", async () => {
    // The message alone is not enough: route handlers switch on `category` to
    // pick an HTTP status, so a blanked category silently changes every
    // caller's response while the user-facing text stays identical.
    fetch.mockRejectedValueOnce(new TypeError("network down"));
    await expect(requestJson(base)).rejects.toMatchObject({
      name: "AiError",
      category: "upstream",
      status: 502,
    });
  });

  it("keeps timeout distinct from upstream", async () => {
    fetch.mockRejectedValueOnce(Object.assign(new Error("x"), { name: "AbortError" }));
    await expect(requestJson(base)).rejects.toMatchObject({ category: "timeout", status: 504 });
  });
});

describe("response body parsing", () => {
  it("concatenates multiple text blocks with no separator", async () => {
    fetch.mockResolvedValueOnce(okText(""));
    fetch.mockReset();
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ content: [{ text: '{ "val' }, { text: 'ue": 9 }' }] }),
    });
    await expect(requestJson(base)).resolves.toEqual({ value: 9 });
  });

  it("treats a content block with no text as an empty string", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ content: [{}, { text: JSON.stringify({ value: 2 }) }] }),
    });
    await expect(requestJson(base)).resolves.toEqual({ value: 2 });
  });

  it("survives a response body that is not JSON", async () => {
    // response.json() rejecting must not escape as a raw error — it becomes an
    // empty completion, which then fails validation as invalid_response.
    fetch.mockResolvedValue({ ok: true, status: 200, json: () => Promise.reject(new Error("bad body")) });
    await expect(requestJson(base)).rejects.toMatchObject({ category: "invalid_response" });
  });

  it("survives a response with no content array", async () => {
    fetch.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({}) });
    await expect(requestJson(base)).rejects.toMatchObject({ category: "invalid_response" });
  });
});

describe("code fence stripping", () => {
  it.each([
    ['```json\n{"value":1}\n```', 1],
    ['```\n{"value":2}\n```', 2],
    ['  {"value":3}  ', 3],
    ['```json{"value":4}```', 4],
  ])("parses %s", async (text, expected) => {
    fetch.mockResolvedValueOnce(okText(text));
    await expect(requestJson(base)).resolves.toEqual({ value: expected });
  });
});

describe("timeout wiring", () => {
  it("aborts the in-flight request once timeoutMs elapses", async () => {
    vi.useFakeTimers();
    fetch.mockImplementation((_u, { signal }) =>
      new Promise((_res, rej) =>
        signal.addEventListener("abort", () =>
          rej(Object.assign(new Error("aborted"), { name: "AbortError" }))
        )
      )
    );

    const pending = requestJson({ ...base, timeoutMs: 1000 });
    const assertion = expect(pending).rejects.toMatchObject({ category: "timeout", status: 504 });
    await vi.advanceTimersByTimeAsync(1000);
    await assertion;

    vi.useRealTimers();
  });

  it("clears the abort timer once the request settles", async () => {
    // Without the finally-block clearTimeout, the timer stays pending and would
    // fire against a completed request.
    vi.useFakeTimers();
    fetch.mockResolvedValueOnce(okText(JSON.stringify({ value: 1 })));

    await requestJson(base);

    expect(vi.getTimerCount()).toBe(0);
    vi.useRealTimers();
  });

  it("defaults to a 30s timeout when none is given", async () => {
    vi.useFakeTimers();
    const spy = vi.spyOn(globalThis, "setTimeout");
    fetch.mockResolvedValueOnce(okText(JSON.stringify({ value: 1 })));

    const { timeoutMs: _omitted, ...noTimeout } = base;
    await requestJson(noTimeout);

    expect(spy).toHaveBeenCalledWith(expect.any(Function), 30000);
    spy.mockRestore();
    vi.useRealTimers();
  });
});
