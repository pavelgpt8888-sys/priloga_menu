import { describe, expect, it } from "vitest";

import { seededState } from "../../../lib/local-state";
import type { AppState } from "../../../lib/types";
import {
  PREVIOUS_LOCAL_STATE_KEY,
  browserBackupDownload,
  createVerifiedBackup,
  downloadVerifiedBackup,
  preservePreviousSnapshot,
  runMigrationAfterVerifiedBackup,
  verifyBackupBytes,
} from "../backup";
import { CURRENT_LOCAL_STATE_KEY, CURRENT_SCHEMA_VERSION, writePersistedState } from "../index";

class MemoryStorage {
  readonly values = new Map<string, string>();
  failWriteKey: string | undefined;
  writeError: unknown = new Error("storage disabled");

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    if (key === this.failWriteKey) throw this.writeError;
    this.values.set(key, value);
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

describe("local JSON backup", () => {
  it("exports a complete versioned envelope and verifies an equivalent read-back", () => {
    const state = seededState();
    const savedAt = "2026-09-17T12:34:56.789Z";

    const backup = createVerifiedBackup(state, savedAt);

    expect(backup.status).toBe("verified");
    if (backup.status !== "verified") throw new Error("Expected verified backup");
    const parsed = JSON.parse(backup.bytes);
    expect(Object.keys(parsed)).toEqual(["schemaVersion", "savedAt", "payload"]);
    expect(parsed).toEqual({ schemaVersion: CURRENT_SCHEMA_VERSION, savedAt, payload: JSON.parse(JSON.stringify(state)) });
    expect(backup.envelope.payload).toEqual(parsed.payload);
    expect(backup.fileName).toBe("family-meal-planner-backup-2026-09-17T12-34-56-789Z.json");
  });

  it("preserves intentionally empty collections", () => {
    const backup = createVerifiedBackup(emptyState(), "2026-09-17T12:00:00.000Z");

    expect(backup.status).toBe("verified");
    if (backup.status !== "verified") throw new Error("Expected verified backup");
    expect(backup.envelope.payload).toEqual(emptyState());
  });

  it("rejects malformed and structurally invalid generated backup bytes", () => {
    const invalid = JSON.stringify({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      savedAt: "2026-09-17T12:00:00.000Z",
      payload: { ...emptyState(), shopping: "invalid" },
    });

    expect(verifyBackupBytes("{not-json")).toEqual(expect.objectContaining({ status: "error", code: "backup_validation_failed" }));
    expect(verifyBackupBytes(invalid)).toEqual(expect.objectContaining({ status: "error", code: "backup_validation_failed" }));
  });

  it("returns a typed serialization error", () => {
    const circular = emptyState() as AppState & { circular?: unknown };
    circular.circular = circular;

    expect(createVerifiedBackup(circular)).toEqual(expect.objectContaining({ status: "error", code: "serialization_failed" }));
  });

  it("reports an unavailable download path without claiming success", () => {
    expect(downloadVerifiedBackup(emptyState(), undefined, "2026-09-17T12:00:00.000Z")).toEqual(expect.objectContaining({
      status: "error",
      code: "download_unavailable",
    }));
  });

  it("returns a typed error when browser download APIs are unavailable", () => {
    expect(browserBackupDownload({ bytes: "{}", fileName: "backup.json", mimeType: "application/json" })).toEqual(expect.objectContaining({
      status: "error",
      code: "download_unavailable",
    }));
  });

  it("delivers only bytes that already passed read-back verification", () => {
    let downloadedBytes = "";
    const result = downloadVerifiedBackup(emptyState(), (file) => {
      downloadedBytes = file.bytes;
      expect(verifyBackupBytes(file.bytes).status).toBe("verified");
      return { status: "downloaded" };
    }, "2026-09-17T12:00:00.000Z");

    expect(result.status).toBe("downloaded");
    expect(downloadedBytes).not.toBe("");
  });
});

describe("pre-migration previous snapshot", () => {
  it("stores and verifies the exact current versioned bytes", () => {
    const storage = new MemoryStorage();
    expect(writePersistedState(storage, seededState(), "2026-09-17T12:00:00.000Z").status).toBe("written");
    const currentBytes = storage.getItem(CURRENT_LOCAL_STATE_KEY);

    const backup = preservePreviousSnapshot(storage);

    expect(backup).toEqual(expect.objectContaining({ status: "verified", key: PREVIOUS_LOCAL_STATE_KEY, bytes: currentBytes }));
    expect(storage.getItem(PREVIOUS_LOCAL_STATE_KEY)).toBe(currentBytes);
    expect(storage.getItem(CURRENT_LOCAL_STATE_KEY)).toBe(currentBytes);
  });

  it("allows a simulated migration only after the previous snapshot is verified", () => {
    const storage = new MemoryStorage();
    expect(writePersistedState(storage, emptyState(), "2026-09-17T12:00:00.000Z").status).toBe("written");
    const currentBytes = storage.getItem(CURRENT_LOCAL_STATE_KEY);

    const result = runMigrationAfterVerifiedBackup(storage, () => {
      expect(storage.getItem(PREVIOUS_LOCAL_STATE_KEY)).toBe(currentBytes);
      return "migration-ran";
    });

    expect(result).toEqual(expect.objectContaining({ status: "migration_completed", value: "migration-ran" }));
  });

  it("blocks a simulated migration when previous-snapshot storage fails and leaves current bytes untouched", () => {
    const storage = new MemoryStorage();
    expect(writePersistedState(storage, seededState(), "2026-09-17T12:00:00.000Z").status).toBe("written");
    const currentBytes = storage.getItem(CURRENT_LOCAL_STATE_KEY);
    storage.failWriteKey = PREVIOUS_LOCAL_STATE_KEY;
    storage.writeError = { name: "QuotaExceededError", message: "full" };
    let migrationRan = false;

    const result = runMigrationAfterVerifiedBackup(storage, () => {
      migrationRan = true;
    });

    expect(result).toEqual(expect.objectContaining({
      status: "migration_blocked",
      error: expect.objectContaining({ code: "previous_snapshot_quota_exceeded" }),
    }));
    expect(migrationRan).toBe(false);
    expect(storage.getItem(CURRENT_LOCAL_STATE_KEY)).toBe(currentBytes);
  });

  it("blocks migration when the current versioned bytes are invalid", () => {
    const storage = new MemoryStorage();
    const invalidBytes = "{not-json";
    storage.values.set(CURRENT_LOCAL_STATE_KEY, invalidBytes);
    let migrationRan = false;

    const result = runMigrationAfterVerifiedBackup(storage, () => {
      migrationRan = true;
    });

    expect(result).toEqual(expect.objectContaining({ status: "migration_blocked" }));
    expect(migrationRan).toBe(false);
    expect(storage.getItem(CURRENT_LOCAL_STATE_KEY)).toBe(invalidBytes);
    expect(storage.getItem(PREVIOUS_LOCAL_STATE_KEY)).toBeNull();
  });
});
