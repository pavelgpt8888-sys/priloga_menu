import { initialState } from "./demo-data";
import { buildShoppingList, generateWeek } from "./planner";
import { validateAppState } from "../infrastructure/local-state";
import type { AppState } from "./types";

export function seededState(): AppState {
  const base = { ...initialState, meals: generateWeek(initialState) };
  return { ...base, shopping: buildShoppingList(base) };
}

export function hydrateState(value: unknown): AppState {
  const validation = validateAppState(value);
  if (!validation.success) {
    throw new Error(`Invalid AppState: ${validation.issues.map((entry) => `${entry.path} ${entry.message}`).join("; ")}`);
  }
  return validation.value;
}
