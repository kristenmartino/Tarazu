import { useC } from "../ThemeProvider";
import { Pill } from "./Pill";

export const PlaceholderScreen = ({ title, description, icon }) => {
  const C = useC();
  return (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 60, gap: 16, minHeight: 400 }}>
    <div style={{ width: 64, height: 64, borderRadius: 16, background: C.surface, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: C.textDim, fontSize: 28 }}>
      {icon}
    </div>
    <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: 0 }}>{title}</h2>
    <p style={{ fontSize: 13, color: C.textMuted, margin: 0, textAlign: "center", maxWidth: 320, lineHeight: 1.6 }}>{description}</p>
    <Pill color={C.textMuted} dimColor={C.border}>COMING SOON</Pill>
  </div>
  );
};
