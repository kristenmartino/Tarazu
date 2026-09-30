import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { dateOnly, serializeDateOnly, formatDateOnly } from "./dateOnly";

describe("calendar date persistence", () => {
  it.each(["2026-09-30", "2026-03-08", "2026-11-01", "2024-02-29"])("round-trips %s without changing its day", day => {
    expect(dateOnly(serializeDateOnly(day))).toBe(day);
    expect(dateOnly(`${day}T00:00:00+00:00`)).toBe(day);
  });
  it("does not guess or normalize malformed calendar dates", () => {
    for (const value of [null, "", "2026-02-30", "not-a-date"]) {
      expect(dateOnly(value)).toBe("");
      expect(serializeDateOnly(value)).toBeNull();
      expect(formatDateOnly(value)).toBe("");
    }
  });
  it.each(["UTC", "America/New_York", "America/Los_Angeles", "Asia/Kolkata", "Pacific/Auckland"])("keeps saved decision/review days in %s, including DST boundaries", timeZone => {
    const script = `import { dateOnly, serializeDateOnly, formatDateOnly, localToday } from './src/dateOnly.js';
      const days = ['2026-09-30', '2026-03-08', '2026-11-01'];
      console.log(JSON.stringify({ days: days.map(d => [dateOnly(serializeDateOnly(d)), formatDateOnly(serializeDateOnly(d), 'en-US')]), today: localToday(new Date(2026, 8, 30, 23, 30)) }));`;
    const result = JSON.parse(execFileSync(process.execPath, ["--input-type=module", "-e", script], { cwd: process.cwd(), env: { ...process.env, TZ: timeZone }, encoding: "utf8" }));
    expect(result).toEqual({ days: [["2026-09-30", "9/30/2026"], ["2026-03-08", "3/8/2026"], ["2026-11-01", "11/1/2026"]], today: "2026-09-30" });
  });
});
