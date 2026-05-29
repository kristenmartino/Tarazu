import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchWorkspaces, createWorkspace, fetchFeatures,
  fetchProductContext, saveProductContext,
  fetchWorkspaceSettings, saveWorkspaceSettings,
  syncFeatures,
} from "./cloud-storage";

beforeEach(() => {
  vi.restoreAllMocks();
});

function mockFetch(data, ok = true) {
  globalThis.fetch = vi.fn(() =>
    Promise.resolve({
      ok,
      json: () => Promise.resolve(ok ? data : { error: data }),
    })
  );
}

describe("fetchWorkspaces", () => {
  it("calls GET /api/workspaces and returns data", async () => {
    const data = [{ id: "ws1", name: "Test" }];
    mockFetch(data);
    const result = await fetchWorkspaces();
    expect(result).toEqual(data);
    expect(globalThis.fetch).toHaveBeenCalledWith("/api/workspaces");
  });
});

describe("createWorkspace", () => {
  it("calls POST with name in body", async () => {
    const data = { id: "ws2", name: "New" };
    mockFetch(data);
    const result = await createWorkspace("New");
    expect(result).toEqual(data);
    expect(globalThis.fetch).toHaveBeenCalledWith("/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New" }),
    });
  });
});

describe("fetchFeatures", () => {
  it("calls GET with correct workspace ID", async () => {
    const data = { features: [], manualOrder: [] };
    mockFetch(data);
    const result = await fetchFeatures("ws1");
    expect(result).toEqual(data);
    expect(globalThis.fetch).toHaveBeenCalledWith("/api/workspaces/ws1/features");
  });
});

describe("fetchProductContext", () => {
  it("calls GET with correct workspace ID", async () => {
    const data = { productSummary: "Test", targetUsers: "" };
    mockFetch(data);
    const result = await fetchProductContext("ws1");
    expect(result).toEqual(data);
    expect(globalThis.fetch).toHaveBeenCalledWith("/api/workspaces/ws1/context");
  });
});

describe("saveProductContext", () => {
  it("calls PUT with context body", async () => {
    const ctx = { productSummary: "Updated" };
    mockFetch({ ok: true });
    await saveProductContext("ws1", ctx);
    expect(globalThis.fetch).toHaveBeenCalledWith("/api/workspaces/ws1/context", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ctx),
    });
  });
});

describe("fetchWorkspaceSettings", () => {
  it("calls GET /api/workspaces/{id}/settings", async () => {
    const data = { viewMode: "map", sortMode: "rice" };
    mockFetch(data);
    const result = await fetchWorkspaceSettings("ws1");
    expect(result).toEqual(data);
    expect(globalThis.fetch).toHaveBeenCalledWith("/api/workspaces/ws1/settings");
  });
});

describe("saveWorkspaceSettings", () => {
  it("calls PUT with settings body", async () => {
    const settings = { viewMode: "map", sortMode: "manual", mapColorBy: "tier", mapSizeBy: "uniform", mapLabelMode: "hover" };
    mockFetch({ ok: true });
    await saveWorkspaceSettings("ws1", settings);
    expect(globalThis.fetch).toHaveBeenCalledWith("/api/workspaces/ws1/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
  });
});

describe("error handling", () => {
  it("throws when response is not ok", async () => {
    mockFetch("Something went wrong", false);
    await expect(fetchWorkspaces()).rejects.toThrow("Something went wrong");
  });

  it("throws generic message when error body is empty", async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({}),
      })
    );
    await expect(fetchWorkspaces()).rejects.toThrow("Request failed");
  });
});

describe("syncFeatures (non-destructive sync, #26)", () => {
  // Routes fetch by method+url and records which feature IDs get DELETEd.
  function routeFetch(remote) {
    const deletes = [];
    const upserts = [];
    const orders = [];
    globalThis.fetch = vi.fn((url, opts = {}) => {
      const method = opts.method || "GET";
      const ok = (data) => Promise.resolve({ ok: true, json: () => Promise.resolve(data) });
      if (method === "GET" && url.endsWith("/features")) {
        return ok({ features: remote, manualOrder: remote.map((f) => f.id) });
      }
      if (method === "DELETE") {
        deletes.push(url.split("/features/")[1]);
        return ok({ ok: true });
      }
      if (method === "POST" && url.endsWith("/features")) {
        const body = JSON.parse(opts.body);
        upserts.push(body.id);
        return ok({ id: body.id || "new-id" });
      }
      if (method === "PUT" && url.endsWith("/features")) {
        orders.push(JSON.parse(opts.body).orderedIds);
        return ok({ ok: true });
      }
      return ok({});
    });
    return { deletes, upserts, orders };
  }

  it("does NOT delete remote features that are simply missing locally", async () => {
    // Remote has B (added by another device); this client's local set only has A.
    const { deletes } = routeFetch([{ id: "A" }, { id: "B" }]);
    await syncFeatures("ws1", [{ id: "A", name: "A" }], ["A"], []);
    expect(deletes).toEqual([]); // B is preserved — the old code would have deleted it
  });

  it("deletes only features the client explicitly removed", async () => {
    const { deletes } = routeFetch([{ id: "A" }, { id: "B" }]);
    await syncFeatures("ws1", [{ id: "A", name: "A" }], ["A"], ["B"]);
    expect(deletes).toEqual(["B"]);
  });

  it("skips deletes for tombstones no longer present remotely", async () => {
    const { deletes } = routeFetch([{ id: "A" }]);
    // B was already deleted remotely (e.g. by the direct delete call); no-op here.
    await syncFeatures("ws1", [{ id: "A", name: "A" }], ["A"], ["B"]);
    expect(deletes).toEqual([]);
  });

  it("edit on one device preserves another device's additions", async () => {
    // Cloud: X (ours) + Y (added by device B). We edit X and sync with no deletions.
    const { deletes, upserts } = routeFetch([{ id: "X" }, { id: "Y" }]);
    await syncFeatures("ws1", [{ id: "X", name: "edited" }], ["X"], []);
    expect(deletes).toEqual([]); // Y survives
    expect(upserts).toContain("X");
  });

  it("appends remote-only features to the order so they get deterministic positions", async () => {
    // Remote has A and B; local manualOrder only knows A (B was added elsewhere
    // and is not being deleted). B must be appended after A — not dropped or
    // left with an ambiguous/duplicate position.
    const { orders } = routeFetch([{ id: "A" }, { id: "B" }]);
    await syncFeatures("ws1", [{ id: "A", name: "A" }], ["A"], []);
    expect(orders).toHaveLength(1);
    const order = orders[0];
    expect(order).toEqual(["A", "B"]); // B appended after A
    expect(new Set(order).size).toBe(order.length); // no duplicate positions
    expect(order).toContain("B"); // remote-only B is not missing
  });
});
