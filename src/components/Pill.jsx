export const Pill = ({ children, color, dimColor, small }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: small ? "2px 8px" : "3px 10px", borderRadius: 20, fontSize: small ? 10 : 11, fontWeight: 600, color, background: dimColor, letterSpacing: "0.04em", fontFamily: "var(--mono)" }}>{children}</span>
);
