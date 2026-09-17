import type { AppState } from "../../lib/types";
import { validateAppState, type ValidationIssue } from "./validation";

export const CURRENT_SCHEMA_VERSION = 1 as const;
export const CURRENT_LOCAL_STATE_KEY = "family-meal-planner-state-v2";
export const LEGACY_LOCAL_STATE_KEY = "family-meal-planner-state-v1";

export interface LocalStateEnvelopeV1 {
  schemaVersion: typeof CURRENT_SCHEMA_VERSION;
  savedAt: string;
  payload: AppState;
}

export interface LocalStateStorageReader {
  getItem(key: string): string | null;
}

export interface LocalStateStorageWriter {
  setItem(key: string, value: string): void;
}

export interface LocalStateBytes {
  currentRaw: string | null;
  legacyRaw: string | null;
}

export type LocalStateCaptureResult =
  | ({ status: "captured" } & LocalStateBytes)
  | { status: "error"; code: "storage_read_failed"; message: string };

export type LocalStateReadErrorCode =
  | "storage_read_failed"
  | "malformed_json"
  | "invalid_envelope"
  | "invalid_payload"
  | "unsupported_schema_version"
  | "future_schema_version"
  | "legacy_migration_failed";

export type LocalStateReadResult =
  | { status: "empty" }
  | { status: "loaded"; source: "envelope" | "legacy"; state: AppState; rawBytes: string; savedAt?: string }
  | {
    status: "error";
    code: LocalStateReadErrorCode;
    message: string;
    key?: string;
    rawBytes: string | null;
    issues?: ValidationIssue[];
    readOnly: true;
  };

export type LocalStateWriteErrorCode = "invalid_state" | "serialization_failed" | "quota_exceeded" | "storage_write_failed";

export type LocalStateSerializationResult =
  | { status: "serialized"; envelope: LocalStateEnvelopeV1; bytes: string }
  | { status: "error"; code: "invalid_state" | "serialization_failed"; message: string; issues?: ValidationIssue[] };

export type LocalStateWriteResult =
  | { status: "written"; key: typeof CURRENT_LOCAL_STATE_KEY; envelope: LocalStateEnvelopeV1; bytes: string }
  | { status: "error"; code: LocalStateWriteErrorCode; message: string; issues?: ValidationIssue[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function parseJson(rawBytes: string, key: string): { success: true; value: unknown } | { success: false; result: LocalStateReadResult } {
  try {
    return { success: true, value: JSON.parse(rawBytes) };
  } catch {
    return {
      success: false,
      result: {
        status: "error",
        code: "malformed_json",
        message: "Сохраненные данные содержат некорректный JSON.",
        key,
        rawBytes,
        readOnly: true,
      },
    };
  }
}

function readEnvelope(rawBytes: string): LocalStateReadResult {
  const parsed = parseJson(rawBytes, CURRENT_LOCAL_STATE_KEY);
  if (!parsed.success) return parsed.result;
  if (!isRecord(parsed.value) || !Number.isInteger(parsed.value.schemaVersion)) {
    return {
      status: "error",
      code: "invalid_envelope",
      message: "Сохранение не содержит корректный schemaVersion.",
      key: CURRENT_LOCAL_STATE_KEY,
      rawBytes,
      readOnly: true,
    };
  }

  const version = parsed.value.schemaVersion as number;
  if (version > CURRENT_SCHEMA_VERSION) {
    return {
      status: "error",
      code: "future_schema_version",
      message: `Версия сохранения ${version} новее поддерживаемой ${CURRENT_SCHEMA_VERSION}.`,
      key: CURRENT_LOCAL_STATE_KEY,
      rawBytes,
      readOnly: true,
    };
  }
  if (version !== CURRENT_SCHEMA_VERSION) {
    return {
      status: "error",
      code: "unsupported_schema_version",
      message: `Версия сохранения ${version} не поддерживается.`,
      key: CURRENT_LOCAL_STATE_KEY,
      rawBytes,
      readOnly: true,
    };
  }
  if (typeof parsed.value.savedAt !== "string" || Number.isNaN(Date.parse(parsed.value.savedAt))) {
    return {
      status: "error",
      code: "invalid_envelope",
      message: "Сохранение не содержит корректный savedAt.",
      key: CURRENT_LOCAL_STATE_KEY,
      rawBytes,
      readOnly: true,
    };
  }

  const validation = validateAppState(parsed.value.payload);
  if (!validation.success) {
    return {
      status: "error",
      code: "invalid_payload",
      message: "Структура сохраненного состояния не прошла проверку.",
      key: CURRENT_LOCAL_STATE_KEY,
      rawBytes,
      issues: validation.issues,
      readOnly: true,
    };
  }
  return { status: "loaded", source: "envelope", state: validation.value, rawBytes, savedAt: parsed.value.savedAt };
}

function migrateLegacyPayload(value: unknown): { success: true; value: AppState } | { success: false; issues: ValidationIssue[] } {
  if (!isRecord(value)) return { success: false, issues: [{ path: "payload", message: "legacy state must be an object" }] };

  const issues: ValidationIssue[] = [];
  for (const field of ["family", "dishes", "meals", "inventory", "leftovers", "freezer", "shopping"] as const) {
    if (!Array.isArray(value[field])) issues.push({ path: `payload.${field}`, message: "must be an array" });
  }
  for (const field of ["recipes", "bannedDishIds", "feedback"] as const) {
    if (value[field] !== undefined && !Array.isArray(value[field])) issues.push({ path: `payload.${field}`, message: "must be an array when present" });
  }
  if (issues.length) return { success: false, issues };

  // These collections were additive fields in the legacy local-only model.
  // Missing values migrate to an explicit empty collection; present [] values
  // stay empty. Core collections are never replaced with demo/seed content.
  const migrated = {
    ...value,
    recipes: value.recipes === undefined ? [] : value.recipes,
    bannedDishIds: value.bannedDishIds === undefined ? [] : value.bannedDishIds,
    feedback: value.feedback === undefined ? [] : value.feedback,
  };
  const validation = validateAppState(migrated);
  return validation.success ? validation : { success: false, issues: validation.issues };
}

function readLegacy(rawBytes: string): LocalStateReadResult {
  const parsed = parseJson(rawBytes, LEGACY_LOCAL_STATE_KEY);
  if (!parsed.success) return parsed.result;
  const migration = migrateLegacyPayload(parsed.value);
  if (!migration.success) {
    return {
      status: "error",
      code: "legacy_migration_failed",
      message: "Legacy-состояние не прошло безопасную migration/validation.",
      key: LEGACY_LOCAL_STATE_KEY,
      rawBytes,
      issues: migration.issues,
      readOnly: true,
    };
  }
  return { status: "loaded", source: "legacy", state: migration.value, rawBytes };
}

export function captureLocalStateBytes(storage: LocalStateStorageReader): LocalStateCaptureResult {
  try {
    return {
      status: "captured",
      currentRaw: storage.getItem(CURRENT_LOCAL_STATE_KEY),
      legacyRaw: storage.getItem(LEGACY_LOCAL_STATE_KEY),
    };
  } catch (error) {
    return { status: "error", code: "storage_read_failed", message: errorMessage(error) };
  }
}

export function readPersistedState(bytes: LocalStateBytes): LocalStateReadResult {
  if (bytes.currentRaw !== null) return readEnvelope(bytes.currentRaw);
  if (bytes.legacyRaw !== null) return readLegacy(bytes.legacyRaw);
  return { status: "empty" };
}

export function captureLocalStateSnapshot(storage: LocalStateStorageReader) {
  return JSON.stringify(captureLocalStateBytes(storage));
}

export function decodeLocalStateSnapshot(snapshot: string): LocalStateReadResult {
  if (!snapshot) return { status: "empty" };
  try {
    const captured = JSON.parse(snapshot) as LocalStateCaptureResult;
    if (captured.status === "error") {
      return { status: "error", code: "storage_read_failed", message: captured.message, rawBytes: null, readOnly: true };
    }
    if (captured.status !== "captured") throw new Error("invalid capture status");
    return readPersistedState({ currentRaw: captured.currentRaw, legacyRaw: captured.legacyRaw });
  } catch (error) {
    return { status: "error", code: "storage_read_failed", message: errorMessage(error), rawBytes: null, readOnly: true };
  }
}

export function isQuotaError(error: unknown) {
  if (!isRecord(error)) return false;
  return error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED" || error.code === 22 || error.code === 1014;
}

export function serializePersistedState(
  state: AppState,
  savedAt = new Date().toISOString(),
): LocalStateSerializationResult {
  const validation = validateAppState(state);
  if (!validation.success) {
    return { status: "error", code: "invalid_state", message: "Состояние не прошло runtime validation и не было сохранено.", issues: validation.issues };
  }

  const envelope: LocalStateEnvelopeV1 = { schemaVersion: CURRENT_SCHEMA_VERSION, savedAt, payload: validation.value };
  let bytes: string;
  try {
    bytes = JSON.stringify(envelope);
  } catch (error) {
    return { status: "error", code: "serialization_failed", message: errorMessage(error) };
  }

  return { status: "serialized", envelope, bytes };
}

export function writePersistedState(
  storage: LocalStateStorageWriter,
  state: AppState,
  savedAt = new Date().toISOString(),
): LocalStateWriteResult {
  const serialized = serializePersistedState(state, savedAt);
  if (serialized.status === "error") return serialized;

  try {
    storage.setItem(CURRENT_LOCAL_STATE_KEY, serialized.bytes);
    return { status: "written", key: CURRENT_LOCAL_STATE_KEY, envelope: serialized.envelope, bytes: serialized.bytes };
  } catch (error) {
    return {
      status: "error",
      code: isQuotaError(error) ? "quota_exceeded" : "storage_write_failed",
      message: errorMessage(error),
    };
  }
}

export { validateAppState } from "./validation";
export type { ValidationIssue, ValidationResult } from "./validation";
