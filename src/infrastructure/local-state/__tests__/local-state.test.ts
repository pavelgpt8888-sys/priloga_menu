import { describe, expect, it } from "vitest";

import { seededState } from "../../../lib/local-state";
import type { AppState } from "../../../lib/types";
import {
  CURRENT_LOCAL_STATE_KEY,
  CURRENT_SCHEMA_VERSION,
  LEGACY_LOCAL_STATE_KEY,
  captureLocalStateBytes,
  readPersistedState,
  writePersistedState,
} from "../index";

class MemoryStorage {
  readonly values = new Map<string, string>();
  readonly writes: Array<{ key: string; value: string }> = [];
  writeError: unknown;

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    if (this.writeError) throw this.writeError;
    this.values.set(key, value);
    this.writes.push({ key, value });
  }
}

function emptyState(): AppState {
  return {
    family: [],
    dishes: [],
    meals: [],
    inventory: [],
    leftovers: [],
    freezer: [],
    shopping: [],
    recipes: [],
    bannedDishIds: [],
    feedback: [],
  };
}

describe("versioned local-state boundary", () => {
  it("round-trips a valid current envelope", () => {
    const storage = new MemoryStorage();
    const state = seededState();
    const persistedState = JSON.parse(JSON.stringify(state)) as AppState;
    const savedAt = "2026-09-17T12:00:00.000Z";

    const written = writePersistedState(storage, state, savedAt);
    const captured = captureLocalStateBytes(storage);
    if (captured.status !== "captured") throw new Error("Expected captured storage");
    const loaded = readPersistedState(captured);

    expect(written).toMatchObject({ status: "written", key: CURRENT_LOCAL_STATE_KEY });
    expect(JSON.parse(storage.values.get(CURRENT_LOCAL_STATE_KEY) ?? "")).toMatchObject({ schemaVersion: CURRENT_SCHEMA_VERSION, savedAt, payload: persistedState });
    expect(loaded).toMatchObject({ status: "loaded", source: "envelope", state: persistedState, savedAt });
  });

  it("loads valid legacy state through the compatibility path without rewriting its bytes", () => {
    const storage = new MemoryStorage();
    const legacyBytes = JSON.stringify(seededState());
    storage.values.set(LEGACY_LOCAL_STATE_KEY, legacyBytes);

    const captured = captureLocalStateBytes(storage);
    if (captured.status !== "captured") throw new Error("Expected captured storage");
    const loaded = readPersistedState(captured);
    const persistedState = JSON.parse(legacyBytes) as AppState;

    expect(loaded).toMatchObject({ status: "loaded", source: "legacy", state: persistedState });
    expect(storage.values.get(LEGACY_LOCAL_STATE_KEY)).toBe(legacyBytes);
    expect(storage.values.has(CURRENT_LOCAL_STATE_KEY)).toBe(false);
    expect(storage.writes).toEqual([]);
  });

  it("defaults only legacy additive collections that were absent", () => {
    const legacy = structuredClone(seededState()) as Partial<AppState>;
    delete legacy.recipes;
    delete legacy.bannedDishIds;
    delete legacy.feedback;

    const loaded = readPersistedState({ currentRaw: null, legacyRaw: JSON.stringify(legacy) });

    expect(loaded).toMatchObject({ status: "loaded", source: "legacy", state: { recipes: [], bannedDishIds: [], feedback: [] } });
  });

  it("rejects a structurally invalid legacy optional field instead of treating it as missing", () => {
    const legacy = { ...seededState(), recipes: "invalid" };

    const loaded = readPersistedState({ currentRaw: null, legacyRaw: JSON.stringify(legacy) });

    expect(loaded).toEqual(expect.objectContaining({ status: "error", code: "legacy_migration_failed" }));
    if (loaded.status !== "error") throw new Error("Expected legacy migration error");
    expect(loaded.issues).toContainEqual({ path: "payload.recipes", message: "must be an array when present" });
  });

  it("keeps intentionally empty arrays empty", () => {
    const storage = new MemoryStorage();
    const state = emptyState();

    expect(writePersistedState(storage, state, "2026-09-17T12:00:00.000Z").status).toBe("written");
    const loaded = readPersistedState({ currentRaw: storage.values.get(CURRENT_LOCAL_STATE_KEY) ?? null, legacyRaw: null });

    expect(loaded).toMatchObject({ status: "loaded", state });
  });

  it("returns a recoverable typed error for malformed JSON", () => {
    const rawBytes = "{not-json";

    expect(readPersistedState({ currentRaw: rawBytes, legacyRaw: null })).toEqual(expect.objectContaining({
      status: "error",
      code: "malformed_json",
      rawBytes,
      readOnly: true,
    }));
  });

  it("returns a typed error when storage cannot be read", () => {
    const result = captureLocalStateBytes({
      getItem() {
        throw new Error("storage disabled");
      },
    });

    expect(result).toEqual({ status: "error", code: "storage_read_failed", message: "storage disabled" });
  });

  it("returns a recoverable typed error for a structurally invalid payload", () => {
    const rawBytes = JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION, savedAt: "2026-09-17T12:00:00.000Z", payload: { family: "invalid" } });
    const result = readPersistedState({ currentRaw: rawBytes, legacyRaw: null });

    expect(result).toEqual(expect.objectContaining({ status: "error", code: "invalid_payload", rawBytes, readOnly: true }));
    if (result.status !== "error") throw new Error("Expected invalid payload");
    expect(result.issues).toContainEqual(expect.objectContaining({ path: "payload.family" }));
  });

  it("rejects a missing nested dish reference", () => {
    const state = seededState();
    state.meals[0].components[0].dishId = "missing-dish";
    const rawBytes = JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION, savedAt: "2026-09-17T12:00:00.000Z", payload: state });
    const result = readPersistedState({ currentRaw: rawBytes, legacyRaw: null });

    expect(result).toEqual(expect.objectContaining({ status: "error", code: "invalid_payload" }));
    if (result.status !== "error") throw new Error("Expected invalid payload");
    expect(result.issues).toContainEqual(expect.objectContaining({ message: "references a missing dish" }));
  });

  it("keeps an unknown future version read-only and does not fall back to legacy", () => {
    const futureBytes = JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION + 1, savedAt: "2026-09-17T12:00:00.000Z", payload: emptyState() });
    const legacyBytes = JSON.stringify(seededState());

    expect(readPersistedState({ currentRaw: futureBytes, legacyRaw: legacyBytes })).toEqual(expect.objectContaining({
      status: "error",
      code: "future_schema_version",
      rawBytes: futureBytes,
      readOnly: true,
    }));
  });

  it("distinguishes quota errors from other storage write failures", () => {
    const quotaStorage = new MemoryStorage();
    quotaStorage.writeError = { name: "QuotaExceededError", message: "full" };
    const failedStorage = new MemoryStorage();
    failedStorage.writeError = new Error("storage disabled");

    expect(writePersistedState(quotaStorage, emptyState())).toEqual(expect.objectContaining({ status: "error", code: "quota_exceeded" }));
    expect(writePersistedState(failedStorage, emptyState())).toEqual(expect.objectContaining({ status: "error", code: "storage_write_failed" }));
  });

  it("leaves original legacy bytes untouched when migration fails", () => {
    const storage = new MemoryStorage();
    const invalidLegacyBytes = JSON.stringify({ family: [], meals: [] });
    storage.values.set(LEGACY_LOCAL_STATE_KEY, invalidLegacyBytes);

    const captured = captureLocalStateBytes(storage);
    if (captured.status !== "captured") throw new Error("Expected captured storage");
    const loaded = readPersistedState(captured);

    expect(loaded).toEqual(expect.objectContaining({ status: "error", code: "legacy_migration_failed", rawBytes: invalidLegacyBytes }));
    expect(storage.values.get(LEGACY_LOCAL_STATE_KEY)).toBe(invalidLegacyBytes);
    expect(storage.values.has(CURRENT_LOCAL_STATE_KEY)).toBe(false);
    expect(storage.writes).toEqual([]);
  });
});
