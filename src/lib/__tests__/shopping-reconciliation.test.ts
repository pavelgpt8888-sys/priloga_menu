import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { hydrateState } from "../local-state";
import { applyQuickScenario, buildShoppingList, recalculateShoppingList, replaceComponent, replaceComponentWithDish } from "../planner";
import { reconcileShoppingList } from "../shopping";
import type { AppState, DishComponent, ShoppingItem } from "../types";
import { cloneDemoState, fixedNow, generatedDemoState } from "../../../test/fixtures/family-state";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(fixedNow);
});

afterEach(() => {
  vi.useRealTimers();
});

function shoppingItem(id: string, product: string, amount: number, unit: string, patch: Partial<ShoppingItem> = {}): ShoppingItem {
  return {
    id,
    product,
    amount,
    unit,
    category: "молочные",
    checked: false,
    alreadyAtHome: false,
    ...patch,
  };
}

describe("shopping reconciliation", () => {
  it("preserves a manual item and its user-entered label during menu regeneration", () => {
    const base = generatedDemoState();
    const manual = shoppingItem("manual-special-milk", "Молоко именно фермерское", 2, "шт", { manuallyAdded: true });
    const state = { ...base, shopping: [...base.shopping, manual] };

    const result = applyQuickScenario(state, "Сделать проще");

    expect(result.state.shopping.find((item) => item.id === manual.id)).toEqual(manual);
  });

  it("keeps a checked 1 l fact and leaves 1 l outstanding when 2 l are required", () => {
    const required = shoppingItem("shop-milk-volume", "Молоко", 2, "л");
    const purchased = shoppingItem("shop-milk-volume", "Молоко", 1, "л", { checked: true });

    const result = reconcileShoppingList([required], [purchased]);

    expect(result).toEqual([
      purchased,
      expect.objectContaining({ id: "shop-milk-volume-outstanding", product: "Молоко", amount: 1, unit: "л", checked: false }),
    ]);
  });

  it("does not erase a 1 l purchase fact when the requirement falls to 0.5 l", () => {
    const required = shoppingItem("shop-milk-volume", "Молоко", 0.5, "л");
    const purchased = shoppingItem("shop-milk-volume", "Молоко", 1, "л", { checked: true });

    expect(reconcileShoppingList([required], [purchased])).toEqual([purchased]);
  });

  it("keeps the stable outstanding row ID for the same logical requirement", () => {
    const required = shoppingItem("new-derived-id", "Молоко", 2, "л");
    const existing = shoppingItem("stable-row-id", "молоко", 1, "л");

    expect(reconcileShoppingList([required], [existing])).toEqual([
      expect.objectContaining({ id: "stable-row-id", product: "Молоко", amount: 2, unit: "л" }),
    ]);
  });

  it("is idempotent for repeated reconciliation with the same requirements", () => {
    const required = [shoppingItem("shop-milk-volume", "Молоко", 2, "л")];
    const purchased = [shoppingItem("shop-milk-volume", "Молоко", 1, "л", { checked: true })];

    const once = reconcileShoppingList(required, purchased);
    const twice = reconcileShoppingList(required, once);

    expect(twice).toEqual(once);
    expect(new Set(twice.map((item) => item.id)).size).toBe(twice.length);
  });

  it("keeps unresolved rows separate from resolved quantities", () => {
    const unresolved = shoppingItem("unresolved-milk", "Молоко", 0, "стакан", {
      category: "бакалея",
      quantityStatus: "unresolved",
      rawQuantity: "примерно один",
    });
    const resolved = shoppingItem("shop-milk-volume", "Молоко", 1, "л");

    const result = reconcileShoppingList([unresolved, resolved], [unresolved]);

    expect(result).toHaveLength(2);
    expect(result).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "unresolved-milk", quantityStatus: "unresolved", rawQuantity: "примерно один" }),
      expect.objectContaining({ id: "shop-milk-volume", amount: 1, unit: "л" }),
    ]));
    expect(result.find((item) => item.id === "shop-milk-volume")?.quantityStatus).toBeUndefined();
  });

  it("does not use a fulfilled incompatible dimension against a new requirement", () => {
    const required = shoppingItem("shop-milk-volume", "Молоко", 2, "л");
    const purchasedByMass = shoppingItem("shop-milk-mass", "Молоко", 1, "кг", { checked: true });

    const result = reconcileShoppingList([required], [purchasedByMass]);

    expect(result).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "shop-milk-volume", amount: 2, unit: "л", checked: false }),
      purchasedByMass,
    ]));
  });

  it("changes only affected derived quantities during menu replacement", () => {
    const base = cloneDemoState();
    const beforeDish: DishComponent = {
      id: "before-dish",
      name: "Блюдо до замены",
      role: "main",
      effort: "easy",
      cost: "low",
      kidsFriendly: true,
      ingredients: [
        { name: "Молоко", amount: 1, unit: "л", category: "молочные" },
        { name: "Рис", amount: 1, unit: "кг", category: "крупы и макароны" },
      ],
    };
    const afterDish: DishComponent = {
      ...beforeDish,
      id: "after-dish",
      name: "Блюдо после замены",
      ingredients: [
        { name: "Молоко", amount: 2, unit: "л", category: "молочные" },
        { name: "Рис", amount: 1, unit: "кг", category: "крупы и макароны" },
      ],
    };
    const meal = { id: "replacement-meal", date: "2026-01-05", kind: "dinner" as const, title: "Ужин", components: [{ slot: "main" as const, dishId: beforeDish.id }] };
    const initial: AppState = { ...base, dishes: [beforeDish, afterDish], meals: [meal], inventory: [], leftovers: [], freezer: [], shopping: [] };
    const shopping = buildShoppingList(initial);
    const state = { ...initial, shopping };
    const riceBefore = shopping.find((item) => item.product === "Рис");
    const milkBefore = shopping.find((item) => item.product === "Молоко");

    const next = replaceComponentWithDish(state, meal.id, "main", afterDish.id);
    const riceAfter = next.shopping.find((item) => item.product === "Рис");
    const milkAfter = next.shopping.find((item) => item.product === "Молоко");

    expect(riceAfter).toEqual(riceBefore);
    expect(milkAfter).toMatchObject({ id: milkBefore?.id, amount: 2, unit: "л" });
  });

  it("keeps an intentionally empty stored shopping list empty after hydration", () => {
    const state = generatedDemoState();

    const hydrated = hydrateState({ ...state, shopping: [] });

    expect(hydrated.shopping).toEqual([]);
  });

  it("keeps an intentionally empty list empty during an implicit menu replacement", () => {
    const state = { ...generatedDemoState(), shopping: [] };
    const dinner = state.meals.find((meal) => meal.kind === "dinner");
    if (!dinner) throw new Error("Fixture requires a dinner");

    expect(buildShoppingList(state).length).toBeGreaterThan(0);

    const next = replaceComponent(state, dinner.id, "main");

    expect(next.shopping).toEqual([]);
  });

  it("allows an explicit rebuild to repopulate an intentionally empty list", () => {
    const state = { ...generatedDemoState(), shopping: [] };
    const derived = buildShoppingList(state);

    const rebuilt = recalculateShoppingList(state, state.meals, { preserveEmpty: false });

    expect(derived.length).toBeGreaterThan(0);
    expect(rebuilt).toEqual(derived);
  });
});
