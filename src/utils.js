// Color helpers take the live palette (`theme`) from the caller's useC() — no
// static default, so a screen can never silently render the Onyx palette.
export const rice = (f) => Math.round((f.reach * f.impact * f.confidence) / Math.max(f.effort, 1));
export const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

export const getTier = (f, theme) => {
  if (f.effort <= 50 && f.impact > 50) return { color: theme.accent, label: "QUICK WIN" };
  if (f.effort > 50 && f.impact > 50) return { color: theme.blue, label: "STRATEGIC" };
  if (f.effort <= 50 && f.impact <= 50) return { color: theme.warn, label: "FILL-IN" };
  return { color: theme.danger, label: "AVOID" };
};

export const getConfidenceColor = (confidence, theme) => {
  if (confidence >= 75) return theme.accent;
  if (confidence >= 50) return theme.blue;
  if (confidence >= 25) return theme.warn;
  return theme.danger;
};

export const getStatusColor = (status, theme) => {
  switch (status) {
    case "active": return theme.accent;
    case "review": return theme.blue;
    case "blocked": return theme.danger;
    case "done": return theme.textDim;
    default: return theme.textMuted;
  }
};

export const relativeTime = (dateStr) => {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 0) return "just now";
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  return `${mo}mo ago`;
};

const csvSafe = (str) => { const s = (str || "").replace(/"/g, '""'); return /^[=+\-@\t\r]/.test(s) ? `"'${s}"` : `"${s}"`; };

export const exportCSV = (ordered, wsName, theme) => {
  const header = "Rank,Name,Description,Reach,Impact,Confidence,Effort,RICE Score,Tier\n";
  const rows = ordered.map((f, i) => `${i + 1},${csvSafe(f.name)},${csvSafe(f.description)},${f.reach},${f.impact},${f.confidence},${f.effort},${f.score},${csvSafe(getTier(f, theme).label)}`).join("\n");
  const blob = new Blob([header + rows], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${(wsName || "backlog").replace(/\s+/g, "-").toLowerCase()}.csv`; a.click();
  URL.revokeObjectURL(url);
};

// Sample CSV matching the columns SignalsScreen's importer recognizes (title/body/source/type/theme/tags).
// The `type` column routes each row to a category: note, feedback, support, or research.
// Anything blank or unrecognized falls back to "note".
export const downloadSignalsTemplate = () => {
  const header = "title,body,source,type,theme,tags\n";
  const examples = [
    ["Users want bulk edit", "Several interviews mentioned editing many at once", "User interview", "research", "Editing", "ux,bulk"],
    ["Confusing onboarding flow", "New users get stuck on the second step", "Support ticket", "support", "Onboarding", "onboarding,ux"],
    ["Loved the redesign", "Customer called the new dashboard a big improvement", "Sales call", "feedback", "Dashboard", "positive"],
    ["Follow up on API latency", "Reminder to investigate p95 spikes next sprint", "Internal", "note", "Performance", "api,perf"],
  ];
  const rows = examples.map(cols => cols.map(csvSafe).join(",")).join("\n");
  const blob = new Blob([header + rows], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "signals-template.csv"; a.click();
  URL.revokeObjectURL(url);
};

// ─── CSV Import ─────────────────────────────────────────────────────
export const parseCSV = (text) => {
  const rows = [];
  let row = []; let field = ""; let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else field += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { row.push(field.trim()); field = ""; }
      else if (ch === '\n' || (ch === '\r' && text[i + 1] === '\n')) {
        if (ch === '\r') i++;
        row.push(field.trim()); if (row.some(c => c)) rows.push(row); row = []; field = "";
      } else field += ch;
    }
  }
  row.push(field.trim()); if (row.some(c => c)) rows.push(row);
  if (rows.length < 2) return null;
  return { headers: rows[0], rows: rows.slice(1) };
};

const HEADER_MAP = {
  name: ["name", "summary", "title", "feature", "issue"],
  description: ["description", "desc", "details", "body", "notes"],
  reach: ["reach"], impact: ["impact"], confidence: ["confidence"], effort: ["effort", "estimate"],
};

const findCol = (headers, aliases) => {
  const lower = headers.map(h => h.toLowerCase().replace(/[^a-z]/g, ""));
  for (const alias of aliases) { const idx = lower.indexOf(alias); if (idx !== -1) return idx; }
  return -1;
};

export const mapCSVToFeatures = (parsed) => {
  if (!parsed) return null;
  const { headers, rows } = parsed;
  const cols = {};
  for (const [field, aliases] of Object.entries(HEADER_MAP)) cols[field] = findCol(headers, aliases);
  if (cols.name === -1) return null;
  const nameHeader = headers[cols.name];
  const descHeader = cols.description !== -1 ? headers[cols.description] : null;
  const hasRice = cols.reach !== -1 && cols.impact !== -1 && cols.confidence !== -1 && cols.effort !== -1;
  const now = Date.now();
  const features = rows.map((row, i) => {
    const name = (row[cols.name] || "").trim();
    if (!name) return null;
    const riceVal = (idx) => { const v = parseInt(row[idx]); return (isNaN(v) || v < 1 || v > 100) ? 50 : v; };
    return {
      id: `imp-${now}-${i}`,
      name,
      description: cols.description !== -1 ? (row[cols.description] || "").trim() : "",
      reach: hasRice ? riceVal(cols.reach) : 50,
      impact: hasRice ? riceVal(cols.impact) : 50,
      confidence: hasRice ? riceVal(cols.confidence) : 50,
      effort: hasRice ? riceVal(cols.effort) : 50,
    };
  }).filter(Boolean);
  return { features, nameHeader, descHeader, hasRice };
};
