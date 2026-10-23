import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  save, load, STORAGE_KEY,
  saveWsIndex, loadWsIndex,
  saveWsFeatures, saveWsFeaturesChecked, loadWsFeatures, removeWsFeatures,
  saveWsContext, loadWsContext, removeWsContext,
  getActiveWsId, setActiveWsId,
  saveWsDecisions, loadWsDecisions, removeWsDecisions,
  saveWsSignals, loadWsSignals, removeWsSignals,
  saveWsSettings, loadWsSettings, removeWsSettings,
  saveWsScenarios, loadWsScenarios,
} from "./local-storage";

beforeEach(() => {
  localStorage.clear();
});

describe("legacy save/load", () => {
  it("round-trips an array of features", () => {
    const features = [{ id: "1", name: "A" }, { id: "2", name: "B" }];
    save(features);
    expect(load()).toEqual(features);
  });

  it("returns null when no data", () => {
    expect(load()).toBeNull();
  });
});

describe("workspace index", () => {
  it("round-trips workspace array", () => {
    const ws = [{ id: "ws1", name: "Test" }];
    saveWsIndex(ws);
    expect(loadWsIndex()).toEqual(ws);
  });

  it("returns null when no data", () => {
    expect(loadWsIndex()).toBeNull();
  });
});

describe("workspace features", () => {
  it("round-trips features with manualOrder", () => {
    const features = [{ id: "f1", name: "Feature" }];
    const order = ["f1"];
    saveWsFeatures("ws1", features, order);
    const loaded = loadWsFeatures("ws1");
    expect(loaded.features).toEqual(features);
    expect(loaded.manualOrder).toEqual(order);
  });

  it("defaults manualOrder to empty array", () => {
    saveWsFeatures("ws1", [{ id: "f1" }]);
    const loaded = loadWsFeatures("ws1");
    expect(loaded.manualOrder).toEqual([]);
  });

  it("backwards-compat: plain array returns { features, manualOrder }", () => {
    const arr = [{ id: "f1" }, { id: "f2" }];
    localStorage.setItem("prioritize-ws-ws1", JSON.stringify(arr));
    const loaded = loadWsFeatures("ws1");
    expect(loaded.features).toEqual(arr);
    expect(loaded.manualOrder).toEqual([]);
  });

  it("returns null when no data", () => {
    expect(loadWsFeatures("ws1")).toBeNull();
  });

  it("removes data", () => {
    saveWsFeatures("ws1", [{ id: "f1" }]);
    removeWsFeatures("ws1");
    expect(loadWsFeatures("ws1")).toBeNull();
  });
});

describe("workspace context", () => {
  it("round-trips context", () => {
    const ctx = { productSummary: "Test", targetUsers: "Devs" };
    saveWsContext("ws1", ctx);
    expect(loadWsContext("ws1")).toEqual(ctx);
  });

  it("returns null when no data", () => {
    expect(loadWsContext("ws1")).toBeNull();
  });

  it("removes data", () => {
    saveWsContext("ws1", { productSummary: "Test" });
    removeWsContext("ws1");
    expect(loadWsContext("ws1")).toBeNull();
  });
});

describe("active workspace id", () => {
  it("round-trips workspace id", () => {
    setActiveWsId("ws-123");
    expect(getActiveWsId()).toBe("ws-123");
  });
});

describe("workspace decisions", () => {
  it("round-trips decisions", () => {
    const decisions = [{ id: "d1", title: "Ship feature A" }];
    saveWsDecisions("ws1", decisions);
    expect(loadWsDecisions("ws1")).toEqual(decisions);
  });

  it("returns empty array when no data", () => {
    expect(loadWsDecisions("ws1")).toEqual([]);
  });

  it("removes data", () => {
    saveWsDecisions("ws1", [{ id: "d1" }]);
    removeWsDecisions("ws1");
    expect(loadWsDecisions("ws1")).toEqual([]);
  });
});

describe("workspace signals", () => {
  it("round-trips signals", () => {
    const signals = [{ id: "s1", title: "User feedback" }];
    saveWsSignals("ws1", signals);
    expect(loadWsSignals("ws1")).toEqual(signals);
  });

  it("returns empty array when no data", () => {
    expect(loadWsSignals("ws1")).toEqual([]);
  });

  it("removes data", () => {
    saveWsSignals("ws1", [{ id: "s1" }]);
    removeWsSignals("ws1");
    expect(loadWsSignals("ws1")).toEqual([]);
  });
});

describe("workspace settings", () => {
  it("round-trips settings", () => {
    const settings = { viewMode: "map", sortMode: "manual" };
    saveWsSettings("ws1", settings);
    expect(loadWsSettings("ws1")).toEqual(settings);
  });

  it("returns null when no data", () => {
    expect(loadWsSettings("ws1")).toBeNull();
  });

  it("removes settings", () => {
    saveWsSettings("ws1", { viewMode: "list" });
    removeWsSettings("ws1");
    expect(loadWsSettings("ws1")).toBeNull();
  });
});

describe("workspace scenarios", () => {
  it("round-trips scenarios", () => {
    const scenarios = [{ id: "sc1", name: "Aggressive" }];
    saveWsScenarios("ws1", scenarios);
    expect(loadWsScenarios("ws1")).toEqual(scenarios);
  });

  it("returns empty array when no data", () => {
    expect(loadWsScenarios("ws1")).toEqual([]);
  });
});

describe('explicit durable browser save', () => {
  it('persists the requested candidate and order before succeeding', () => {
    expect(saveWsFeaturesChecked('checked', [{ id: 'f' }], ['f'])).toBe(true);
    expect(loadWsFeatures('checked')).toEqual({ features: [{ id: 'f' }], manualOrder: ['f'] });
  });
  it('surfaces quota errors to the editor', () => {
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Quota exceeded'); });
    try { expect(() => saveWsFeaturesChecked('checked', [])).toThrow('Quota exceeded'); }
    finally { write.mockRestore(); }
  });
});
