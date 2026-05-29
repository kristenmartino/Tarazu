// @ts-check
// Hardened client for Anthropic's Messages API (GitHub #22).
//
// Centralizes: response.ok checking, request timeouts via AbortController,
// JSON extraction + schema validation, one repair retry on malformed output,
// and typed errors so route handlers can return meaningful HTTP statuses.

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

/**
 * Error type that carries a category and a suggested HTTP status so route
 * handlers can translate failures into appropriate client responses.
 */
export class AiError extends Error {
  /**
   * @param {"config"|"rate_limit"|"auth"|"upstream"|"timeout"|"invalid_response"} category
   * @param {string} message
   * @param {number} status
   */
  constructor(category, message, status) {
    super(message);
    this.name = "AiError";
    this.category = category;
    this.status = status;
  }
}

/** @param {string} text */
function extractJson(text) {
  const clean = (text || "").replace(/```json|```/g, "").trim();
  return JSON.parse(clean); // throws SyntaxError on malformed input
}

/**
 * @param {object} opts
 * @param {string} opts.apiKey
 * @param {string} opts.model
 * @param {number} opts.maxTokens
 * @param {{ role: string, content: string }[]} opts.messages
 * @param {number} opts.timeoutMs
 * @returns {Promise<string>}
 */
async function callOnce({ apiKey, model, maxTokens, messages, timeoutMs }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model, max_tokens: maxTokens, messages }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError")
      throw new AiError("timeout", "The AI request timed out. Please try again.", 504);
    throw new AiError("upstream", "Could not reach the AI service.", 502);
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    if (response.status === 429)
      throw new AiError("rate_limit", "The AI service is rate limited. Please try again shortly.", 429);
    if (response.status === 401 || response.status === 403)
      throw new AiError("auth", "The AI service rejected the request credentials.", 502);
    throw new AiError("upstream", `The AI service returned an error (${response.status}).`, 502);
  }

  const data = await response.json().catch(() => null);
  return data?.content?.map(/** @param {{ text?: string }} c */ (c) => c.text || "").join("") || "";
}

/**
 * Call Anthropic and return a schema-validated JSON object.
 * Retries once with a corrective instruction if the first reply is not valid
 * JSON matching `schema`. Throws {@link AiError} on config/transport/validation
 * failures so callers can map to HTTP responses.
 *
 * @param {object} opts
 * @param {string|undefined} opts.apiKey
 * @param {string} opts.model
 * @param {number} opts.maxTokens
 * @param {string} opts.prompt
 * @param {{ parse: (v: unknown) => any }} opts.schema  Zod schema
 * @param {number} [opts.timeoutMs]
 */
export async function requestJson({ apiKey, model, maxTokens, prompt, schema, timeoutMs = 30000 }) {
  if (!apiKey) throw new AiError("config", "AI is not configured.", 500);

  const base = [{ role: "user", content: prompt }];
  let lastText = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const messages =
      attempt === 0
        ? base
        : [
            ...base,
            { role: "assistant", content: lastText || "(no output)" },
            {
              role: "user",
              content:
                "That was not valid JSON matching the required structure. Reply with ONLY the JSON object — no prose, no code fences.",
            },
          ];
    // Transport/HTTP errors propagate immediately (no point retrying a 429/timeout here).
    lastText = await callOnce({ apiKey, model, maxTokens, messages, timeoutMs });
    try {
      return schema.parse(extractJson(lastText));
    } catch {
      // malformed JSON or schema mismatch — retry once, then give up below
    }
  }
  throw new AiError("invalid_response", "The AI returned a malformed response.", 502);
}
