import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { hydrateState, seededState } from "../local-state";
import { addRecipeToShopping, buildShoppingList, byId, generateWeek, replaceComponent } from "../planner";
import { fixedNow, generatedDemoState, manualAndCheckedShoppingState, mergingRecipeFixture, mixedUnitState, nestedMutationState, recipeFixture, restrictionBypassState } from "../../../test/fixtures/family-state";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(fixedNow);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("current core behavior", () => {
  it("generates the same seven-day menu from the same fixture", () => {
    const state = generatedDemoState();
    const again = generateWeek(state);

    expect(state.meals).toEqual(again);
    expect(state.meals).toHaveLength(21);
    expect(new Set(state.meals.map((meal) => meal.date))).toEqual(new Set(["2026-01-05", "2026-01-06", "2026-01-07", "2026-01-08", "2026-01-09", "2026-01-10", "2026-01-11"]));
  });

  it("replaces one existing dinner component and rebuilds shopping", () => {
    const state = generatedDemoState();
    const meal = state.meals.find((item) => item.kind === "dinner");
    if (!meal) throw new Error("Fixture requires a dinner");
    const original = meal.components.find((component) => component.slot === "main");
    if (!original) throw new Error("Fixture requires a dinner main component");

    const next = replaceComponent(state, meal.id, "main");
    const changedMeal = next.meals.find((item) => item.id === meal.id);
    const replacement = changedMeal?.components.find((component) => component.slot === "main");

    expect(replacement?.dishId).not.toBe(original.dishId);
    expect(changedMeal?.components.filter((component) => component.slot !== "main")).toEqual(meal.components.filter((component) => component.slot !== "main"));
    expect(next.shopping).toEqual(buildShoppingList(next));
  });

  it("adds a recipe ingredient to shopping as a manual item", () => {
    const state = generatedDemoState();
    const next = addRecipeToShopping(state, recipeFixture());

    expect(next.shopping).toEqual(expect.arrayContaining([
      expect.objectContaining({ product: "Тестовая крупа", amount: 2, unit: "пач", manuallyAdded: true, checked: false }),
    ]));
  });

  it("round-trips a complete stored state through the current hydrator", () => {
    const state = seededState();
    const restored = hydrateState(JSON.parse(JSON.stringify(state)));

    expect(restored).toEqual(state);
  });
});

describe("known current defects", () => {
  it("current behavior: combines 1 кг and 500 г as 501 кг", () => {
    expect(buildShoppingList(mixedUnitState())).toEqual([
      expect.objectContaining({ product: "Мука", amount: 501, unit: "кг" }),
    ]);
  });

  it("current behavior: uses a restricted fish dish when it is the only main candidate", () => {
    const state = restrictionBypassState();
    const dishes = byId(state.dishes);
    const dinnerMainIds = generateWeek(state)
      .filter((meal) => meal.kind === "dinner")
      .map((meal) => meal.components.find((component) => component.slot === "main")?.dishId);

    expect(dinnerMainIds.map((id) => id ? dishes.get(id)?.name : undefined)).toContain("Рыба запеченная");
  });

  it("current behavior: replacement recalculation drops manual and checked shopping state", () => {
    const state = manualAndCheckedShoppingState();
    const meal = state.meals.find((item) => item.kind === "dinner");
    if (!meal) throw new Error("Fixture requires a dinner");

    const next = replaceComponent(state, meal.id, "main");

    expect(next.shopping.find((item) => item.id === "fixture-manual")).toBeUndefined();
    expect(next.shopping.find((item) => item.id === "fixture-checked")).toBeUndefined();
  });

  it("current behavior: recipe shopping mutates the nested item that Undo would snapshot", () => {
    const before = nestedMutationState();
    const snapshotForUndo = before;
    const next = addRecipeToShopping(before, mergingRecipeFixture());

    expect(snapshotForUndo.shopping[0].amount).toBe(5);
    expect(next.shopping[0]).toBe(snapshotForUndo.shopping[0]);
  });
});
