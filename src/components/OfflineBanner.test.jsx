import { describe, it, expect, vi } from "vitest";

vi.mock("../ThemeProvider", () => ({
  useC: () => ({
    accentGlow: "#a6e3a110", accent: "#a6e3a1",
    warn: "#f9e2af",
  }),
}));

import { OfflineBanner } from "./OfflineBanner";

describe("OfflineBanner", () => {
  it("returns null when online and not syncing", () => {
    const result = OfflineBanner({ isOnline: true, isSyncing: false });
    expect(result).toBeNull();
  });

  it("renders offline message when offline", () => {
    const result = OfflineBanner({ isOnline: false, isSyncing: false });
    expect(result).not.toBeNull();
    expect(result.type).toBe("div");
    expect(result.props.role).toBe("alert");
    const text = JSON.stringify(result);
    expect(text).toContain("offline");
    expect(text).toContain("saved locally");
  });

  it("renders syncing message when online and syncing", () => {
    const result = OfflineBanner({ isOnline: true, isSyncing: true });
    expect(result).not.toBeNull();
    expect(result.props.role).toBe("alert");
    const text = JSON.stringify(result);
    expect(text).toContain("syncing");
    expect(text).toContain("Back online");
  });

  it("renders offline message when offline even if syncing flag is true", () => {
    const result = OfflineBanner({ isOnline: false, isSyncing: true });
    expect(result).not.toBeNull();
    const text = JSON.stringify(result);
    expect(text).toContain("offline");
  });
});
