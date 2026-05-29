import { describe, it, expect } from "vitest";
import { dialog, DialogHost } from "./dialog";

describe("dialog singleton API", () => {
  it("exposes prompt and confirm that return promises", () => {
    const p = dialog.prompt("hi");
    const c = dialog.confirm("yo"); // opening confirm cancels the prompt above
    expect(p).toBeInstanceOf(Promise);
    expect(c).toBeInstanceOf(Promise);
    return p; // resolves to null (cancelled), keeps the test from leaking
  });

  it("opening a new dialog cancels a pending prompt with null", async () => {
    const first = dialog.prompt({ title: "first" });
    dialog.confirm({ title: "second" }); // cancels first
    await expect(first).resolves.toBeNull();
  });

  it("opening a new dialog cancels a pending confirm with false", async () => {
    const first = dialog.confirm({ title: "first" });
    dialog.prompt({ title: "second" }); // cancels first
    await expect(first).resolves.toBe(false);
  });

  it("DialogHost is a component", () => {
    expect(typeof DialogHost).toBe("function");
  });
});
