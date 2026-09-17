import type { AppState } from "../../lib/types";
import {
  CURRENT_LOCAL_STATE_KEY,
  CURRENT_SCHEMA_VERSION,
  isQuotaError,
  readPersistedState,
  serializePersistedState,
  type LocalStateEnvelopeV1,
  type LocalStateStorageReader,
  type LocalStateStorageWriter,
} from "./index";

export const PREVIOUS_LOCAL_STATE_KEY = "family-meal-planner-state-previous";
const BACKUP_FILE_PREFIX = "family-meal-planner-backup";

export interface BackupDownloadFile {
  bytes: string;
  fileName: string;
  mimeType: "application/json";
}

export type BackupDownloadPort = (file: BackupDownloadFile) =>
  | { status: "downloaded" }
  | { status: "error"; code: "download_unavailable" | "download_failed"; message: string };

export type BackupErrorCode =
  | "invalid_state"
  | "serialization_failed"
  | "backup_validation_failed"
  | "download_unavailable"
  | "download_failed"
  | "current_snapshot_missing"
  | "storage_read_failed"
  | "previous_snapshot_quota_exceeded"
  | "previous_snapshot_write_failed"
  | "previous_snapshot_verification_failed";

export type BackupError = { status: "error"; code: BackupErrorCode; message: string };

export interface VerifiedBackup {
  status: "verified";
  bytes: string;
  fileName: string;
  envelope: LocalStateEnvelopeV1;
}

export type BackupDownloadResult =
  | ({ status: "downloaded" } & Omit<VerifiedBackup, "status">)
  | BackupError;

export type PreviousSnapshotResult =
  | { status: "verified"; key: typeof PREVIOUS_LOCAL_STATE_KEY; bytes: string; envelope: LocalStateEnvelopeV1 }
  | BackupError;

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function backupFileName(savedAt: string) {
  return `${BACKUP_FILE_PREFIX}-${savedAt.replaceAll(":", "-").replaceAll(".", "-")}.json`;
}

export function verifyBackupBytes(bytes: string):
  | { status: "verified"; envelope: LocalStateEnvelopeV1 }
  | BackupError {
  const readBack = readPersistedState({ currentRaw: bytes, legacyRaw: null });
  if (readBack.status !== "loaded" || readBack.source !== "envelope" || !readBack.savedAt) {
    return {
      status: "error",
      code: "backup_validation_failed",
      message: readBack.status === "error" ? readBack.message : "Backup не содержит поддерживаемый versioned envelope.",
    };
  }

  return {
    status: "verified",
    envelope: {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      savedAt: readBack.savedAt,
      payload: readBack.state,
    },
  };
}

export function createVerifiedBackup(state: AppState, savedAt = new Date().toISOString()): VerifiedBackup | BackupError {
  const serialized = serializePersistedState(state, savedAt);
  if (serialized.status === "error") return serialized;

  const verified = verifyBackupBytes(serialized.bytes);
  if (verified.status === "error") return verified;
  if (JSON.stringify(verified.envelope.payload) !== JSON.stringify(serialized.envelope.payload)) {
    return { status: "error", code: "backup_validation_failed", message: "Backup payload изменился при read-back validation." };
  }

  return {
    status: "verified",
    bytes: serialized.bytes,
    fileName: backupFileName(serialized.envelope.savedAt),
    envelope: verified.envelope,
  };
}

export function downloadVerifiedBackup(
  state: AppState,
  download: BackupDownloadPort | undefined,
  savedAt = new Date().toISOString(),
): BackupDownloadResult {
  const backup = createVerifiedBackup(state, savedAt);
  if (backup.status === "error") return backup;
  if (!download) return { status: "error", code: "download_unavailable", message: "Браузер не поддерживает скачивание файла." };

  let delivery: ReturnType<BackupDownloadPort>;
  try {
    delivery = download({ bytes: backup.bytes, fileName: backup.fileName, mimeType: "application/json" });
  } catch (error) {
    return { status: "error", code: "download_failed", message: errorMessage(error) };
  }
  if (delivery.status === "error") return delivery;
  return { status: "downloaded", bytes: backup.bytes, fileName: backup.fileName, envelope: backup.envelope };
}

export const browserBackupDownload: BackupDownloadPort = (file) => {
  if (typeof document === "undefined" || typeof Blob === "undefined" || typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
    return { status: "error", code: "download_unavailable", message: "Скачивание файлов недоступно в этом браузере." };
  }

  let objectUrl: string | undefined;
  try {
    objectUrl = URL.createObjectURL(new Blob([file.bytes], { type: file.mimeType }));
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = file.fileName;
    link.click();
    return { status: "downloaded" };
  } catch (error) {
    return { status: "error", code: "download_failed", message: errorMessage(error) };
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
};

export function preservePreviousSnapshot(
  storage: LocalStateStorageReader & LocalStateStorageWriter,
): PreviousSnapshotResult {
  let currentBytes: string | null;
  try {
    currentBytes = storage.getItem(CURRENT_LOCAL_STATE_KEY);
  } catch (error) {
    return { status: "error", code: "storage_read_failed", message: errorMessage(error) };
  }
  if (currentBytes === null) {
    return { status: "error", code: "current_snapshot_missing", message: "Текущее versioned-сохранение отсутствует." };
  }

  const current = verifyBackupBytes(currentBytes);
  if (current.status === "error") return current;

  try {
    storage.setItem(PREVIOUS_LOCAL_STATE_KEY, currentBytes);
  } catch (error) {
    return {
      status: "error",
      code: isQuotaError(error) ? "previous_snapshot_quota_exceeded" : "previous_snapshot_write_failed",
      message: errorMessage(error),
    };
  }

  let readBack: string | null;
  try {
    readBack = storage.getItem(PREVIOUS_LOCAL_STATE_KEY);
  } catch (error) {
    return { status: "error", code: "storage_read_failed", message: errorMessage(error) };
  }
  if (readBack !== currentBytes) {
    return { status: "error", code: "previous_snapshot_verification_failed", message: "Previous snapshot не совпал с текущими bytes после записи." };
  }

  const verified = verifyBackupBytes(readBack);
  if (verified.status === "error") {
    return { status: "error", code: "previous_snapshot_verification_failed", message: verified.message };
  }
  return { status: "verified", key: PREVIOUS_LOCAL_STATE_KEY, bytes: readBack, envelope: verified.envelope };
}

export function runMigrationAfterVerifiedBackup<T>(
  storage: LocalStateStorageReader & LocalStateStorageWriter,
  migrate: () => T,
): { status: "migration_completed"; backup: PreviousSnapshotResult & { status: "verified" }; value: T }
  | { status: "migration_blocked"; error: BackupError } {
  const backup = preservePreviousSnapshot(storage);
  if (backup.status === "error") return { status: "migration_blocked", error: backup };
  return { status: "migration_completed", backup, value: migrate() };
}
