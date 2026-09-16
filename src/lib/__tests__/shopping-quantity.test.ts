import { describe, expect, it } from "vitest";

import { cloneDemoState } from "../../../test/fixtures/family-state";
import { buildShoppingList, moveCheckedShoppingToInventory } from "../planner";
import { formatIngredientQuantity } from "../quantity";
import type { AppState, IngredientNeed } from "../types";

function stateWithIngredients(ingredients: IngredientNeed[], overrides: Partial<AppState> = {}): AppState {
  const state = cloneDemoState();
  const dish = {
    id: "fixture-quantity-dish",
    name: "Тестовое блюдо",
    role: "main" as const,
    effort: "easy" as const,
    cost: "low" as const,
    kidsFriendly: true,
    ingredients,
  };
  return {
    ...state,
    dishes: [dish],
    meals: [{ id: "fixture-quantity-meal", date: "2026-01-05", kind: "dinner", title: "Ужин", components: [{ slot: "main", dishId: dish.id }] }],
    inventory: [],
    leftovers: [],
    freezer: [],
    shopping: [],
    ...overrides,
  };
}

describe("quantity-safe shopping requirements", () => {
  it("keeps an ingredient with a missing amount visible for clarification", () => {
    const [item] = buildShoppingList(stateWithIngredients([
      { name: "Соль", amount: 0, unit: "", category: "специи", rawQuantity: "", quantityStatus: "unresolved" },
    ]));

    expect(item).toMatchObject({ product: "Соль", amount: 0, unit: "", quantityStatus: "unresolved", rawQuantity: "", checked: false, alreadyAtHome: false });
    expect(formatIngredientQuantity(item)).toBe("Уточнить количество");
  });

  it("keeps invalid raw amount text instead of inventing a valid quantity", () => {
    const [item] = buildShoppingList(stateWithIngredients([
      { name: "Рис", amount: Number.NaN, unit: "кг", category: "крупы и макароны", rawQuantity: "примерно горсть", quantityStatus: "unresolved" },
    ]));

    expect(item).toMatchObject({ product: "Рис", amount: 0, unit: "кг", quantityStatus: "unresolved", rawQuantity: "примерно горсть" });
    expect(formatIngredientQuantity(item)).toBe("примерно горсть кг");
  });

  it("keeps an unknown household unit reviewable", () => {
    const [item] = buildShoppingList(stateWithIngredients(
      [{ name: "Макароны", amount: 2, unit: "пачка", category: "крупы и макароны", rawQuantity: "2", quantityStatus: "unresolved" }],
      {
        inventory: [{ id: "inventory-pasta", product: "Макароны", amount: 2, unit: "пачка", category: "крупы и макароны", place: "pantry", source: "manual" }],
      },
    ));

    expect(item).toMatchObject({ product: "Макароны", amount: 2, unit: "пачка", quantityStatus: "unresolved", rawQuantity: "2" });
    expect(formatIngredientQuantity(item)).toBe("2 пачка");
  });

  it("does not merge an unresolved requirement with an incompatible resolved quantity", () => {
    const items = buildShoppingList(stateWithIngredients([
      { name: "Мука", amount: 0, unit: "стакан", category: "бакалея", rawQuantity: "примерно один", quantityStatus: "unresolved" },
      { name: "Мука", amount: 500, unit: "г", category: "бакалея" },
    ]));

    expect(items).toHaveLength(2);
    expect(items).toEqual(expect.arrayContaining([
      expect.objectContaining({ product: "Мука", amount: 0, unit: "стакан", quantityStatus: "unresolved" }),
      expect.objectContaining({ product: "Мука", amount: 0.5, unit: "кг", quantityStatus: undefined }),
    ]));
  });

  it("does not deduct qualitative leftovers or freezer entries from a confirmed requirement", () => {
    const state = stateWithIngredients(
      [{ name: "Мука", amount: 1, unit: "кг", category: "бакалея" }],
      {
        leftovers: [{ id: "leftover-flour", name: "Мука", amount: "много", cookedAt: "2026-01-04", useBy: "2026-01-06", transformInto: [] }],
        freezer: [{ id: "freezer-flour", name: "Мука", amount: "2 пакета", frozenAt: "2026-01-01", useBy: "2026-02-01", serveWith: [] }],
      },
    );

    expect(buildShoppingList(state)).toEqual([
      expect.objectContaining({ product: "Мука", amount: 1, unit: "кг", quantityStatus: undefined }),
    ]);
  });

  it("keeps a checked unresolved item in shopping and out of inventory", () => {
    const state = stateWithIngredients([], {
      shopping: [{ id: "unresolved-rice", product: "Рис", amount: 0, unit: "кг", category: "крупы и макароны", checked: true, alreadyAtHome: false, quantityStatus: "unresolved", rawQuantity: "примерно горсть" }],
    });

    const next = moveCheckedShoppingToInventory(state);

    expect(next.inventory).toEqual(state.inventory);
    expect(next.shopping).toEqual(state.shopping);
  });

  it("still transfers a checked resolved item to inventory", () => {
    const state = stateWithIngredients([], {
      shopping: [{ id: "resolved-milk", product: "Молоко", amount: 1.5, unit: "л", category: "молочные", checked: true, alreadyAtHome: false }],
    });

    const next = moveCheckedShoppingToInventory(state);

    expect(next.shopping).toEqual([]);
    expect(next.inventory).toEqual(expect.arrayContaining([
      expect.objectContaining({ product: "Молоко", amount: 1.5, unit: "л", category: "молочные", place: "fridge", source: "shopping" }),
    ]));
  });
});
