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
