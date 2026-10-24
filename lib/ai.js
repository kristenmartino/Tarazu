// @ts-check
import { ZodError } from "zod";
import { reserveProviderSpend } from "./ai-spend";

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
   * @param {"config"|"rate_limit"|"auth"|"upstream"|"timeout"|"invalid_response"|"budget"} category
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
 * @returns {Promise<{text: string, stopReason: string|null, outputTokens: number|null}>}
 */
async function callOnce({ apiKey, model, maxTokens, messages, timeoutMs }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const spend = await reserveProviderSpend(model, messages, maxTokens);
    if (!spend.allowed) throw new AiError("budget", spend.message, spend.status);
    if (controller.signal.aborted) throw new AiError("timeout", "The AI request timed out. Please try again.", 504);
    const response = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model, max_tokens: maxTokens, messages }),
      signal: controller.signal,
    });
    if (!response.ok) {
      if (response.status === 429)
        throw new AiError("rate_limit", "The AI service is rate limited. Please try again shortly.", 429);
      if (response.status === 401 || response.status === 403)
        throw new AiError("auth", "The AI service rejected the request credentials.", 502);
      throw new AiError("upstream", `The AI service returned an error (${response.status}).`, 502);
    }

    // The deadline covers the body too, not just receipt of response headers.
    const data = await response.json().catch(err => {
      if (err?.name === "AbortError") throw err;
      return null;
    });
    return {
      text: data?.content?.map(/** @param {{ text?: string }} c */ (c) => c.text || "").join("") || "",
      stopReason: typeof data?.stop_reason === "string" ? data.stop_reason : null,
      outputTokens: typeof data?.usage?.output_tokens === "number" ? data.usage.output_tokens : null,
    };
  } catch (err) {
    if (err instanceof AiError) throw err;
    if (err instanceof Error && err.name === "AbortError")
      throw new AiError("timeout", "The AI request timed out. Please try again.", 504);
    throw new AiError("upstream", "Could not reach the AI service.", 502);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @typedef {object} AttemptDiagnostic
 * @property {number} attempt
 * @property {string} model
 * @property {number} maxTokens
 * @property {string|null} stopReason
 * @property {number|null} outputTokens
 * @property {string} outcome
 * @property {string[]} validationPaths
 */

/**
 * Call Anthropic and return a schema-validated JSON object.
 * Recovers once from truncation with a larger budget, or repairs invalid JSON
 * matching `schema`. Throws {@link AiError} on config/transport/validation
 * failures so callers can map to HTTP responses.
 *
 * @param {object} opts
 * @param {string|undefined} opts.apiKey
 * @param {string} opts.model
 * @param {number} opts.maxTokens
 * @param {string} opts.prompt
 * @param {{ parse: (v: unknown) => any }} opts.schema  Zod schema
 * @param {number} [opts.timeoutMs]
 * @param {number} [opts.totalTimeoutMs] Shared deadline across generation and repair.
 * @param {(event: AttemptDiagnostic) => void} [opts.onAttempt] Metadata only; never prompt or completion text.
 */
export async function requestJson({ apiKey, model, maxTokens, prompt, schema, timeoutMs = 30000, totalTimeoutMs, onAttempt }) {
  if (!apiKey) throw new AiError("config", "AI is not configured.", 500);
  const deadline = totalTimeoutMs === undefined ? Infinity : Date.now() + totalTimeoutMs;

  const base = [{ role: "user", content: prompt }];
  let lastText = "";
  let validationFeedback = "";
  let truncated = false;
  let tokenBudget = maxTokens;
  for (let attempt = 0; attempt < 2; attempt++) {
    const messages =
      attempt === 0
        ? base
        : truncated
          ? [{ role: "user", content: `${prompt}\n\nYour previous response reached the output token limit. Regenerate the complete JSON object concisely within the larger output budget. Do not continue the partial response.` }]
          : [
            ...base,
            { role: "assistant", content: lastText || "(no output)" },
            {
              role: "user",
              content:
                `That was not valid JSON matching the required structure. Fix these validation errors: ${validationFeedback}. Reply with ONLY the JSON object — no prose, no code fences.`,
            },
          ];
    // Transport/HTTP errors propagate immediately (no point retrying a 429/timeout here).
    const remainingMs = Math.min(timeoutMs, deadline - Date.now());
    if (remainingMs <= 0) throw new AiError("timeout", "The AI request timed out. Please try again.", 504);
    const response = await callOnce({ apiKey, model, maxTokens: tokenBudget, messages, timeoutMs: remainingMs });
    lastText = response.text;
    /** @param {string} outcome @param {string[]} [validationPaths] */
    const report = (outcome, validationPaths = []) => {
      // Diagnostics must never turn a valid recommendation into a failure.
      try { onAttempt?.({ attempt: attempt + 1, model, maxTokens: tokenBudget, stopReason: response.stopReason, outputTokens: response.outputTokens, outcome, validationPaths }); } catch {}
    };
    truncated = response.stopReason === "max_tokens";
    if (truncated) {
      report("truncated");
      // One bounded recovery with twice the budget, not the same cutoff again.
      tokenBudget = maxTokens * 2;
      continue;
    }
    try {
      const result = schema.parse(extractJson(lastText));
      report("valid");
      return result;
    } catch (err) {
      report(err instanceof ZodError ? "invalid_schema" : "invalid_json", err instanceof ZodError ? err.issues.map(issue => issue.path.join(".")).slice(0, 8) : []);
      // Give the repair attempt the failing fields and constraints. Repeating
      // "valid JSON" alone cannot repair a valid object with an overlong
      // rationale, wrong score type, or unknown evidence reference.
      validationFeedback = err instanceof ZodError
        ? err.issues.slice(0, 8).map(issue => `${issue.path.join(".") || "root"}: ${issue.message}`).join("; ").slice(0, 1200)
        : "The reply must be parseable JSON matching the requested object shape";
      // malformed JSON or schema mismatch — retry once, then give up below
    }
  }
  throw new AiError("invalid_response", truncated ? "The AI response was cut off before it finished. Please try again." : "The AI returned a malformed response.", 502);
}
