import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { quadrantLabels } from "../theme";
import { useC } from "../ThemeProvider";
import { clamp, getTier, getConfidenceColor } from "../utils";

const PAD = { top: 40, right: 30, bottom: 50, left: 50 };

export const Matrix = ({ scored, maxScore, selectedId, onSelect, colorBy = "tier", sizeBy = "uniform", labelMode = "hover" }) => {
  const C = useC();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [hovered, setHovered] = useState(null);
  const [dims, setDims] = useState({ w: 600, h: 420 });
  const quadrants = useMemo(() => quadrantLabels(C), [C]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const { width } = entries[0].contentRect;
      setDims({ w: width, h: Math.min(420, width * 0.65) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const positions = useMemo(() => {
    const pw = dims.w - PAD.left - PAD.right;
    const ph = dims.h - PAD.top - PAD.bottom;
    return scored.map(f => ({ id: f.id, x: PAD.left + (f.effort / 100) * pw, y: dims.h - PAD.bottom - (f.impact / 100) * ph }));
  }, [scored, dims]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    canvas.width = dims.w * dpr;
    canvas.height = dims.h * dpr;
    ctx.scale(dpr, dpr);
    const pw = dims.w - PAD.left - PAD.right;
    const ph = dims.h - PAD.top - PAD.bottom;
    ctx.clearRect(0, 0, dims.w, dims.h);

    // Grid
    ctx.strokeStyle = C.border; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
    for (let i = 0; i <= 4; i++) {
      const x = PAD.left + (pw / 4) * i, y = PAD.top + (ph / 4) * i;
      ctx.beginPath(); ctx.moveTo(x, PAD.top); ctx.lineTo(x, dims.h - PAD.bottom); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(dims.w - PAD.right, y); ctx.stroke();
    }
    ctx.setLineDash([]);

    // Dividers
    const mx = PAD.left + pw / 2, my = PAD.top + ph / 2;
    ctx.strokeStyle = C.borderActive; ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(mx, PAD.top); ctx.lineTo(mx, dims.h - PAD.bottom); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(PAD.left, my); ctx.lineTo(dims.w - PAD.right, my); ctx.stroke();
    ctx.setLineDash([]);

    // Quadrant labels
    ctx.font = "600 10px 'JetBrains Mono', monospace"; ctx.textAlign = "center";
    quadrants.forEach(q => {
      ctx.fillStyle = q.color + "8C";
      ctx.fillText(q.label.toUpperCase(), PAD.left + pw * q.x, PAD.top + ph * (1 - q.y) + 1);
      ctx.font = "400 9px 'JetBrains Mono', monospace"; ctx.fillStyle = q.color + "59";
      ctx.fillText(q.sub, PAD.left + pw * q.x, PAD.top + ph * (1 - q.y) + 14);
      ctx.font = "600 10px 'JetBrains Mono', monospace";
    });

    // Axes
    ctx.font = "600 10px 'JetBrains Mono', monospace"; ctx.fillStyle = C.textMuted; ctx.textAlign = "center";
    ctx.fillText("EFFORT →", dims.w / 2, dims.h - 8);
    ctx.save(); ctx.translate(14, dims.h / 2); ctx.rotate(-Math.PI / 2); ctx.fillText("IMPACT →", 0, 0); ctx.restore();
    ctx.font = "400 9px 'JetBrains Mono', monospace"; ctx.fillStyle = C.textDim; ctx.textAlign = "center";
    for (let i = 0; i <= 4; i++) ctx.fillText(i * 25, PAD.left + (pw / 4) * i, dims.h - PAD.bottom + 16);
    ctx.textAlign = "right";
    for (let i = 0; i <= 4; i++) ctx.fillText(i * 25, PAD.left - 8, dims.h - PAD.bottom - (ph / 4) * i + 3);

    // Points
    scored.forEach((f, idx) => {
      const { x, y } = positions[idx];
      const isSel = f.id === selectedId, isHov = f.id === hovered;
      const baseR = sizeBy === "reach" ? 4 + (f.reach / 100) * 8
        : sizeBy === "score" ? 4 + (maxScore > 0 ? (f.score / maxScore) * 8 : 4)
        : 7;
      const r = isSel ? baseR + 3 : isHov ? baseR + 2 : baseR;
      const col = colorBy === "confidence" ? getConfidenceColor(f.confidence, C) : getTier(f, C).color;
      if (isSel || isHov) { ctx.beginPath(); ctx.arc(x, y, r + 8, 0, Math.PI * 2); ctx.fillStyle = col + "20"; ctx.fill(); }
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = C.surface; ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = isSel ? 2.5 : 1.5; ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, r * 0.45, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill();
      const showLabel = labelMode === "always" || (labelMode === "hover" && (isSel || isHov));
      if (showLabel) {
        const lbl = f.name.length > 20 ? f.name.slice(0, 18) + "…" : f.name;
        ctx.font = "600 10px 'JetBrains Mono', monospace"; const tw = ctx.measureText(lbl).width;
        const lx = clamp(x - tw / 2 - 6, 2, dims.w - tw - 14), ly = y - r - 14;
        ctx.fillStyle = C.surface + "F0"; ctx.strokeStyle = col + "50"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(lx, ly - 12, tw + 12, 18, 4); ctx.fill(); ctx.stroke();
        ctx.fillStyle = col; ctx.textAlign = "left"; ctx.fillText(lbl, lx + 6, ly + 1);
      }
    });
  }, [scored, maxScore, positions, selectedId, hovered, dims, colorBy, sizeBy, labelMode, quadrants, C]);

  const handleEvent = useCallback((e, click) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    let found = null;
    for (const p of positions) { if (Math.sqrt((mx - p.x) ** 2 + (my - p.y) ** 2) < 16) { found = p.id; break; } }
    if (click && found) onSelect(found); else if (!click) setHovered(found);
  }, [positions, onSelect]);

  return (
    <div ref={containerRef} style={{ width: "100%", position: "relative" }}>
      <canvas ref={canvasRef} style={{ width: dims.w, height: dims.h, cursor: hovered ? "pointer" : "crosshair" }}
        onClick={e => handleEvent(e, true)} onMouseMove={e => handleEvent(e, false)} onMouseLeave={() => setHovered(null)} />
    </div>
  );
};
