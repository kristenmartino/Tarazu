// Decision and review dates describe calendar days, not instants. Existing
// timestamptz storage uses midnight UTC as a transport representation only.
export function dateOnly(value) {
  const match = typeof value === "string" && value.match(/^(\d{4}-\d{2}-\d{2})(?:T|$)/);
  if (!match) return "";
  const date = new Date(`${match[1]}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === match[1] ? match[1] : "";
}

export function localToday(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function serializeDateOnly(value) {
  const day = dateOnly(value);
  return day ? `${day}T00:00:00.000Z` : null;
}

export function formatDateOnly(value, locale) {
  const day = dateOnly(value);
  return day ? new Intl.DateTimeFormat(locale, { timeZone: "UTC" }).format(new Date(`${day}T00:00:00.000Z`)) : "";
}
