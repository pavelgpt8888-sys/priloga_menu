import { addManualShoppingItem, addRecipeToShopping, moveCheckedShoppingToInventory } from "./planner";
import type { AppState, RecipeEntry } from "./types";

export type AppCommand =
  | { commandId: string; type: "state.replace"; payload: { state: AppState } }
  | { commandId: string; type: "state.restore"; payload: { snapshot: AppState } }
  | { commandId: string; type: "shopping.add_manual"; payload: { product: string } }
  | { commandId: string; type: "shopping.add_recipe"; payload: { recipe: RecipeEntry } }
  | { commandId: string; type: "shopping.move_checked_to_inventory"; payload: Record<string, never> };

export interface CommandExecutionState {
  state: AppState;
  appliedCommandIds: readonly string[];
}

export type CommandResult =
  | {
    status: "applied";
    commandId: string;
    previousState: AppState;
    state: AppState;
    appliedCommandIds: string[];
  }
  | {
    status: "duplicate";
    commandId: string;
    previousState: AppState;
    state: AppState;
    appliedCommandIds: string[];
  };

export type CommandExecutor = (input: CommandExecutionState, command: AppCommand) => CommandResult;

function cloneState(state: AppState) {
  return structuredClone(state);
}

function executeTransition(state: AppState, command: AppCommand): AppState {
  switch (command.type) {
    case "state.replace":
      return cloneState(command.payload.state);
    case "state.restore":
      return cloneState(command.payload.snapshot);
    case "shopping.add_manual":
      return addManualShoppingItem(state, command.payload.product, command.commandId);
    case "shopping.add_recipe":
      return addRecipeToShopping(state, command.payload.recipe, command.commandId);
    case "shopping.move_checked_to_inventory":
      return moveCheckedShoppingToInventory(state, command.commandId);
  }
}

export const applyCommand: CommandExecutor = (input, command) => {
  const previousState = cloneState(input.state);
  const appliedCommandIds = [...input.appliedCommandIds];

  if (appliedCommandIds.includes(command.commandId)) {
    return {
      status: "duplicate",
      commandId: command.commandId,
      previousState,
      state: previousState,
      appliedCommandIds,
    };
  }

  const state = executeTransition(input.state, command);
  return {
    status: "applied",
    commandId: command.commandId,
    previousState,
    state: cloneState(state),
    appliedCommandIds: [...appliedCommandIds, command.commandId],
  };
};

export const localCommandExecutor: CommandExecutor = applyCommand;
