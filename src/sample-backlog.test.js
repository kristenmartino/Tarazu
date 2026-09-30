import { describe, it, expect } from "vitest";
import { sampleBacklogFor } from "./sample-backlog";
import { SAMPLES } from "./theme";

describe("safe example backlog", () => {
  it("refuses replacement of an existing backlog without changing it", () => {
    const current = [{ id: "mine", name: "Real work", reach: 20 }];
    const before = structuredClone(current);
    expect(sampleBacklogFor(current)).toBeNull();
    expect(current).toEqual(before);
  });
  it("creates independent examples and labels their evidence as fictional", () => {
    const examples = sampleBacklogFor([]);
    expect(examples).toHaveLength(SAMPLES.length);
    expect(examples.every(x => x.description.startsWith("Fictional example"))).toBe(true);
    examples[0].name = "Edited";
    expect(SAMPLES[0].name).not.toBe("Edited");
  });
});
