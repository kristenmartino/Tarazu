import { useEffect, useRef, useState, useCallback } from "react";
import { useC } from "../ThemeProvider";

// Accessible, promise-based replacement for window.prompt / window.confirm.
//
// Usage:
//   const name = await dialog.prompt({ title: "Workspace name", defaultValue });
//   if (await dialog.confirm({ title: "Delete?", danger: true })) { ... }
//
// A single <DialogHost /> must be mounted once in the app tree. The API is a
// module singleton so any component can call it without context plumbing
// (this is a single-window app, so one active dialog at a time is correct).

let resolver = null;
const listeners = new Set();
let currentState = null;

function emit() {
  for (const l of listeners) l(currentState);
}

function normalize(opts) {
  return typeof opts === "string" ? { title: opts } : opts || {};
}

function open(type, opts) {
  return new Promise((resolve) => {
    // If a dialog is already open, cancel it first — resolving with the value
    // appropriate to the PREVIOUS dialog's type (null for prompt, false for confirm).
    if (resolver) {
      const prev = resolver;
      const prevCancel = currentState?.type === "confirm" ? false : null;
      resolver = null;
      prev(prevCancel);
    }
    resolver = resolve;
    currentState = {
      type,
      confirmText: type === "confirm" ? "Confirm" : "OK",
      cancelText: "Cancel",
      ...normalize(opts),
    };
    emit();
  });
}

function settle(value) {
  const r = resolver;
  resolver = null;
  currentState = null;
  emit();
  if (r) r(value);
}

export const dialog = {
  /** @returns {Promise<string|null>} trimmed input, or null if cancelled */
  prompt: (opts) => open("prompt", opts),
  /** @returns {Promise<boolean>} */
  confirm: (opts) => open("confirm", opts),
};

const FOCUSABLE =
  'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])';

export function DialogHost() {
  const C = useC();
  const [state, setState] = useState(currentState);
  const [value, setValue] = useState("");
  const boxRef = useRef(null);
  const inputRef = useRef(null);
  const lastFocused = useRef(null);

  useEffect(() => {
    const l = (s) => {
      setState(s);
      if (s?.type === "prompt") setValue(s.defaultValue || "");
    };
    listeners.add(l);
    return () => listeners.delete(l);
  }, []);

  // Focus management: focus into the dialog on open, restore on close.
  useEffect(() => {
    if (state) {
      lastFocused.current = document.activeElement;
      // Defer so the elements exist.
      const t = setTimeout(() => {
        if (state.type === "prompt" && inputRef.current) inputRef.current.select();
        else boxRef.current?.querySelector(FOCUSABLE)?.focus();
      }, 0);
      return () => clearTimeout(t);
    }
    // Closed: restore focus to the trigger.
    if (lastFocused.current instanceof HTMLElement) lastFocused.current.focus();
  }, [state]);

  const cancel = useCallback(() => settle(state?.type === "confirm" ? false : null), [state]);
  const accept = useCallback(() => {
    if (state?.type === "confirm") return settle(true);
    const trimmed = value.trim();
    settle(trimmed || null);
  }, [state, value]);

  const onKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cancel();
      } else if (e.key === "Enter" && state?.type === "prompt" && document.activeElement === inputRef.current) {
        e.preventDefault();
        accept();
      } else if (e.key === "Tab") {
        // Trap focus within the dialog.
        const nodes = boxRef.current?.querySelectorAll(FOCUSABLE);
        if (!nodes || nodes.length === 0) return;
        const list = Array.from(nodes);
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [state, cancel, accept]
  );

  if (!state) return null;

  const danger = !!state.danger;
  const accent = danger ? C.danger : C.accent;

  return (
    <div
      onMouseDown={cancel}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
    >
      <div
        ref={boxRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
        style={{
          width: "100%", maxWidth: 420, background: C.surface,
          border: `1px solid ${C.border}`, borderRadius: 12, padding: 20,
          boxShadow: "0 16px 48px rgba(0,0,0,0.45)",
        }}
      >
        <h2 id="dialog-title" style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: "0 0 8px" }}>
          {state.title || (state.type === "confirm" ? "Are you sure?" : "Enter a value")}
        </h2>
        {state.message && (
          <p style={{ fontSize: 12, color: C.textMuted, margin: "0 0 14px", lineHeight: 1.5 }}>{state.message}</p>
        )}
        {state.type === "prompt" && (
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-label={state.label || state.title || "Value"}
            placeholder={state.placeholder || ""}
            style={{
              width: "100%", boxSizing: "border-box", padding: "10px 12px", marginBottom: 16,
              border: `1px solid ${C.border}`, borderRadius: 8, background: C.bg, color: C.text,
              fontSize: 13, fontFamily: "var(--body)", outline: "none",
            }}
          />
        )}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={cancel}
            style={{
              padding: "8px 16px", border: `1px solid ${C.border}`, borderRadius: 8,
              background: "transparent", color: C.textMuted, fontSize: 12, cursor: "pointer",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {state.cancelText}
          </button>
          <button
            onClick={accept}
            style={{
              padding: "8px 16px", border: `1px solid ${accent}40`, borderRadius: 8,
              background: `${accent}18`, color: accent, fontSize: 12, fontWeight: 700, cursor: "pointer",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {state.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
