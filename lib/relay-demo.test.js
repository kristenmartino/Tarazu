import { beforeEach, describe, expect, it } from "vitest";
import { prepareRelayDemo, RELAY_DEMO_ID } from "./relay-demo";
import { BriefDraftSchema, loadLocalBriefs, saveLocalBrief, signalSnapshot, briefFingerprint } from "./validation-brief";
import { sourceStatus } from "./scoring-claims";
import relay from "../src/demo/relay.json";

const prefix = `prioritize-ws-${RELAY_DEMO_ID}`;
const snapshot = storage => Object.fromEntries(Object.keys(storage).map(k => [k, storage.getItem(k)]));
beforeEach(() => localStorage.clear());

describe("complete public Relay story", () => {
  it("keeps every candidate, claim and evidence reference connected", () => {
    expect(relay.features).toHaveLength(3);
    expect(relay.signals).toHaveLength(5);
    const ids = new Set(relay.features.map(f => f.id));
    expect(new Set(relay.manualOrder)).toEqual(ids);
    for (const signal of relay.signals) {
      expect(signal.workspace_id).toBe(RELAY_DEMO_ID);
      expect(ids.has(signal.linked_candidate_id)).toBe(true);
    }
    for (const feature of relay.features) {
      for (const dimension of ["reach", "impact", "confidence", "effort"]) {
        expect(feature[dimension]).toBeGreaterThanOrEqual(1);
        expect(feature[dimension]).toBeLessThanOrEqual(100);
        const claim = feature.scoringBasis.claims.find(c => c.id === feature.scoringBasis.basisClaimIds[dimension]);
        expect(claim?.dimension).toBe(dimension);
      }
      for (const claim of feature.scoringBasis.claims) for (const source of claim.sources)
        expect(sourceStatus(source, relay.signals)).toBe("Excerpt matches source");
    }
  });

  it("preserves the reviewed revision-5 brief and frozen revision-4/5 decisions", () => {
    prepareRelayDemo(localStorage);
    const [brief] = loadLocalBriefs(RELAY_DEMO_ID);
    expect(brief.revision).toBe(5);
    BriefDraftSchema.parse(brief.draft);
    expect(brief.draft.attachedSignals).toHaveLength(3);
    for (const saved of brief.draft.attachedSignals) {
      const live = relay.signals.find(s => s.id === saved.id);
      expect(briefFingerprint(saved)).toBe(briefFingerprint(signalSnapshot(live)));
    }
    expect(relay.decisions).toHaveLength(2);
    const [a, b] = relay.decisions.map(d => d.recommendation_snapshot.validation_brief);
    expect([a.revision, b.revision]).toEqual([4, 5]);
    expect(a.draft.attachedSignals).toHaveLength(2);
    expect(b.draft).toEqual(brief.draft);
    for (const decision of relay.decisions) {
      expect(decision.status).toBe("draft");
      expect(decision.workspace_id).toBe(RELAY_DEMO_ID);
      const frozen = decision.recommendation_snapshot.validation_brief;
      expect(frozen.id).toBe(brief.id);
      BriefDraftSchema.parse(frozen.draft);
    }
    saveLocalBrief(RELAY_DEMO_ID, { ...brief.draft, risks: "Visitor's next investigation" }, brief);
    expect(loadLocalBriefs(RELAY_DEMO_ID)[0].revision).toBe(6);
    expect(JSON.parse(localStorage.getItem(`${prefix}-decisions`))[1].recommendation_snapshot.validation_brief.draft.risks).toBe(brief.draft.risks);
  });

  it("contains fictional data without account attribution or private identifiers", () => {
    const text = JSON.stringify(relay);
    expect(text).not.toMatch(/created_by|user_[A-Za-z0-9]+|org_[A-Za-z0-9]+|@gmail|079c77f8-25fe-456b-aca5-47789e92aeb3/);
    expect(relay.context.productSummary).toMatch(/fictional/);
    expect(relay.features.every(f => /synthetic/.test(f.name))).toBe(true);
  });
});

describe("isolated browser persistence", () => {
  it("reopens edits without reseeding and resets only the reserved workspace", () => {
    localStorage.setItem("prioritize-workspaces", '[{"id":"mine","name":"My work"}]');
    localStorage.setItem("prioritize-active-workspace", "mine");
    localStorage.setItem("prioritize-ws-mine", '{"features":[{"name":"Keep me"}]}');
    localStorage.setItem("tarazu-cloud-workspace:user:personal", "cloud-id");
    const ownWork = snapshot(localStorage);
    prepareRelayDemo(localStorage);
    localStorage.setItem(`${prefix}-signals`, "[]");
    localStorage.setItem(`${prefix}-briefs`, "[]");
    prepareRelayDemo(localStorage);
    expect(localStorage.getItem(`${prefix}-signals`)).toBe("[]");
    expect(loadLocalBriefs(RELAY_DEMO_ID)).toEqual([]);
    prepareRelayDemo(localStorage, { reset: true });
    expect(JSON.parse(localStorage.getItem(`${prefix}-signals`))).toHaveLength(5);
    expect(loadLocalBriefs(RELAY_DEMO_ID)).toHaveLength(1);
    for (const [key, value] of Object.entries(ownWork)) expect(localStorage.getItem(key)).toBe(value);
  });

  it.each([1, 4, 8])("rolls back a failed initial seed at write %i", failAt => {
    const data = new Map([["my-existing-data", "keep"]]); let writes = 0;
    const storage = { getItem: key => data.get(key) ?? null, removeItem: key => data.delete(key), setItem: (key, value) => {
      if (++writes === failAt) throw new Error("Quota exceeded");
      data.set(key, value);
    } };
    expect(() => prepareRelayDemo(storage)).toThrow("Quota exceeded");
    expect([...data]).toEqual([["my-existing-data", "keep"]]);
    prepareRelayDemo(storage);
    expect(JSON.parse(data.get(`${prefix}-briefs`))[0].revision).toBe(5);
  });

  it("retains edited data when reset fails", () => {
    prepareRelayDemo(localStorage);
    localStorage.setItem(`${prefix}-signals`, "[]");
    const before = snapshot(localStorage); let writes = 0;
    const storage = { getItem: key => localStorage.getItem(key), removeItem: key => localStorage.removeItem(key), setItem: (key, value) => {
      if (++writes === 4) throw new Error("Quota exceeded");
      localStorage.setItem(key, value);
    } };
    expect(() => prepareRelayDemo(storage, { reset: true })).toThrow("Quota exceeded");
    expect(snapshot(localStorage)).toEqual(before);
  });

  it("surfaces blocked storage and refuses to overwrite incomplete or corrupt copies", () => {
    expect(() => prepareRelayDemo({ getItem: () => { throw new Error("Storage blocked"); } })).toThrow("Storage blocked");
    localStorage.setItem(prefix, "visitor data");
    expect(() => prepareRelayDemo(localStorage)).toThrow("incomplete");
    expect(localStorage.getItem(prefix)).toBe("visitor data");
    prepareRelayDemo(localStorage, { reset: true });
    localStorage.setItem(`${prefix}-signals`, "{}");
    expect(() => prepareRelayDemo(localStorage)).toThrow("could not be read");
  });
});
