import { describe, expect, it } from "vitest";

import { applyCommand, type AppCommand, type CommandExecutionState } from "../commands";
import type { AppState, ShoppingItem } from "../types";
import { cloneDemoState, mergingRecipeFixture, nestedMutationState } from "../../../test/fixtures/family-state";

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  Object.values(value).forEach((entry) => deepFreeze(entry));
  return value;
}

function execution(state: AppState, appliedCommandIds: readonly string[] = []): CommandExecutionState {
  return { state, appliedCommandIds };
}

function undo(result: ReturnType<typeof applyCommand>, commandId: string) {
  return applyCommand(
    execution(result.state, result.appliedCommandIds),
    { commandId, type: "state.restore", payload: { snapshot: result.previousState } },
  );
}

describe("local transport-neutral command boundary", () => {
  it("does not mutate a deeply frozen state when adding recipe ingredients", () => {
    const before = nestedMutationState();
    const frozen = deepFreeze(before);
    const command: AppCommand = {
      commandId: "command-add-recipe",
      type: "shopping.add_recipe",
      payload: { recipe: mergingRecipeFixture() },
    };

    const result = applyCommand(execution(frozen), command);

    expect(result.status).toBe("applied");
    expect(before.shopping[0].amount).toBe(2);
    expect(result.state.shopping[0].amount).toBe(5);
    expect(result.state.shopping[0]).not.toBe(before.shopping[0]);
  });

  it("restores the exact state before adding a recipe to shopping", () => {
    const before = nestedMutationState();
    const added = applyCommand(execution(before), {
      commandId: "command-recipe-undo",
      type: "shopping.add_recipe",
      payload: { recipe: mergingRecipeFixture() },
    });

    const restored = undo(added, "command-undo-recipe");

    expect(restored.status).toBe("applied");
    expect(restored.state).toEqual(before);
    expect(restored.state).not.toBe(before);
  });

  it("restores shopping and inventory after moving a checked purchase", () => {
    const base = cloneDemoState();
    const checked: ShoppingItem = {
      id: "checked-milk",
      product: "Молоко",
      amount: 1,
      unit: "л",
      category: "молочные",
      checked: true,
      alreadyAtHome: false,
    };
    const before: AppState = {
      ...base,
      shopping: [checked],
      inventory: [{ id: "inventory-milk", product: "Молоко", amount: 2, unit: "л", category: "молочные", place: "fridge", source: "manual" }],
    };

    const moved = applyCommand(execution(deepFreeze(before)), {
      commandId: "command-move-purchase",
      type: "shopping.move_checked_to_inventory",
      payload: {},
    });

    expect(moved.state.inventory[0].amount).toBe(3);
    expect(moved.state.shopping).toEqual([]);
    expect(before.inventory[0].amount).toBe(2);

    const restored = undo(moved, "command-undo-purchase");
    expect(restored.state).toEqual(before);
  });

  it("does not apply the same commandId twice", () => {
    const command: AppCommand = {
      commandId: "command-idempotent-recipe",
      type: "shopping.add_recipe",
      payload: { recipe: mergingRecipeFixture() },
    };
    const once = applyCommand(execution(nestedMutationState()), command);

    const twice = applyCommand(execution(once.state, once.appliedCommandIds), command);

    expect(once.state.shopping[0].amount).toBe(5);
    expect(twice.status).toBe("duplicate");
    expect(twice.state).toEqual(once.state);
    expect(twice.appliedCommandIds).toEqual([command.commandId]);
  });

  it("uses JSON-serializable command and result DTOs", () => {
    const command: AppCommand = {
      commandId: "command-serializable",
      type: "shopping.add_manual",
      payload: { product: "Хлеб" },
    };
    const result = applyCommand(execution(cloneDemoState()), command);

    expect(result.state.shopping).toEqual([
      expect.objectContaining({ id: `manual-${command.commandId}`, product: "Хлеб", manuallyAdded: true }),
    ]);
    expect(JSON.parse(JSON.stringify(command))).toEqual(command);
    expect(JSON.parse(JSON.stringify(result))).toMatchObject({
      status: "applied",
      commandId: command.commandId,
      appliedCommandIds: [command.commandId],
    });
  });
});
