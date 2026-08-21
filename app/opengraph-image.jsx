import { ImageResponse } from "next/og";

// Generated at build/request time rather than shipped as a binary, so the card
// stays in sync with the brand tokens in app/tokens.css. Rendered by Satori:
// every container div needs an explicit display:flex, and only a subset of CSS
// is supported — keep the primitives to rectangles.

export const alt = "Tarazu — Weigh what matters. Prioritization your team can defend.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BRASS = "#E2AC4D";
const BONE = "#ECEAE4";
const BG = "#0E0F12";
const MUTED = "#8A8F98";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          background: BG,
          padding: "0 88px",
        }}
      >
        {/* Brass hairline along the top edge — the one brand flourish. */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: size.width,
            height: 6,
            background: BRASS,
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", maxWidth: 620 }}>
          <div style={{ display: "flex", fontSize: 22, letterSpacing: 8, color: BRASS }}>
            TA · RA · ZU
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 82,
              fontWeight: 700,
              color: BONE,
              marginTop: 20,
              lineHeight: 1.05,
            }}
          >
            Weigh what matters.
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 30,
              color: MUTED,
              marginTop: 28,
              lineHeight: 1.35,
            }}
          >
            Prioritization your team can defend.
          </div>
        </div>

        {/* Balance scale from rectangles: beam, two hanging pans, then the stem
            pulled back up with a negative margin so it rises from the base to
            the beam rather than stacking below the pans. */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", width: 300, height: 6, background: BRASS }} />
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              width: 300,
              justifyContent: "space-between",
            }}
          >
            {[0, 1].map((i) => (
              <div
                key={i}
                style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
              >
                <div style={{ display: "flex", width: 2, height: 56, background: MUTED }} />
                <div style={{ display: "flex", width: 104, height: 6, background: BONE }} />
              </div>
            ))}
          </div>
          <div
            style={{ display: "flex", width: 6, height: 150, background: BONE, marginTop: -62 }}
          />
          <div style={{ display: "flex", width: 168, height: 6, background: BONE }} />
        </div>
      </div>
    ),
    size
  );
}
