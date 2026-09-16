import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { cloneDemoState, fixedNow, restrictionBypassState } from "../../../test/fixtures/family-state";
import {
  addRecipeToNextMenuResult,
  generateWeekResult,
  moveMealToDateResult,
  planDishForDateResult,
  planRecipeForMealResult,
  repeatMealResult,
  replaceComponentResult,
  replaceComponentWithDishResult,
} from "../planner";
import { validateDishRestrictions } from "../restrictions";
import type { AppState, DishComponent, MealPlan, RecipeEntry } from "../types";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(fixedNow);
});

afterEach(() => {
  vi.useRealTimers();
});

function namedDish(state: AppState, name: string) {
  const dish = state.dishes.find((candidate) => candidate.name === name);
  if (!dish) throw new Error(`Fixture requires ${name}`);
  return dish;
}

function withKnownFishRestriction(state: AppState) {
  return {
    ...state,
    family: state.family.map((member, index) => index === 0 ? { ...member, restrictions: ["рыба"] } : { ...member, restrictions: [] }),
  };
}

function withMainCandidates(state: AppState, candidates: DishComponent[]) {
  const candidateIds = new Set(candidates.map((dish) => dish.id));
  return { ...state, dishes: state.dishes.filter((dish) => dish.role !== "main" || candidateIds.has(dish.id)) };
}

function legacyMeal(dish: DishComponent): MealPlan {
  return {
    id: "legacy-dinner",
    date: "2026-01-05",
    kind: "dinner",
    title: "Ужин",
    source: "manual",
    components: [{ slot: "main", dishId: dish.id }],
  };
}

describe("hard restriction invariant", () => {
  it("filters one forbidden candidate while keeping a safe candidate", () => {
    const base = cloneDemoState();
    const fish = namedDish(base, "Рыба запеченная");
    const chicken = namedDish(base, "Курица запеченная");
    const state = withMainCandidates(withKnownFishRestriction(base), [fish, chicken]);

    const result = generateWeekResult(state);
    const dinnerMainIds = result.meals
      .filter((meal) => meal.kind === "dinner")
      .map((meal) => meal.components.find((component) => component.slot === "main")?.dishId);

    expect(dinnerMainIds).not.toContain(fish.id);
    expect(dinnerMainIds).toContain(chicken.id);
  });

  it("returns no_safe_candidate without crashing when every main candidate is forbidden", () => {
    const state = restrictionBypassState();

    expect(() => generateWeekResult(state)).not.toThrow();
    const result = generateWeekResult(state);

    expect(result).toMatchObject({ status: "blocked", reason: "no_safe_candidate" });
    expect(result.meals.filter((meal) => meal.kind === "dinner").every((meal) => !meal.components.some((component) => component.slot === "main"))).toBe(true);
  });

  it("leaves soup empty while generating other safe slots when the soup pool is blocked", () => {
    const base = cloneDemoState();
    const forbiddenSoup = namedDish(base, "Гороховый суп");
    const state = {
      ...base,
      family: base.family.map((member, index) => index === 0 ? { ...member, restrictions: ["горох"] } : { ...member, restrictions: [] }),
      dishes: base.dishes.filter((dish) => dish.role !== "soup" || dish.id === forbiddenSoup.id),
    };
    const safeSoupIds = state.dishes
      .filter((dish) => dish.role === "soup")
      .filter((dish) => validateDishRestrictions(state, dish).status === "safe")
      .map((dish) => dish.id);
    let result: ReturnType<typeof generateWeekResult> | undefined;

    expect(safeSoupIds).toEqual([]);
    expect(() => {
      result = generateWeekResult(state);
    }).not.toThrow();
    if (!result) throw new Error("Week generation did not return a result");

    const lunches = result.meals.filter((meal) => meal.kind === "lunch");
    const breakfasts = result.meals.filter((meal) => meal.kind === "breakfast");
    const dinners = result.meals.filter((meal) => meal.kind === "dinner");

    expect(result).toMatchObject({ status: "blocked", reason: "no_safe_candidate" });
    expect(result.blockedSlots).toHaveLength(7);
    expect(result.blockedSlots.every((slot) => slot.kind === "lunch" && slot.slot === "soup" && slot.reason === "no_safe_candidate")).toBe(true);
    expect(lunches).toHaveLength(7);
    expect(lunches.every((meal) => !meal.components.some((component) => component.slot === "soup"))).toBe(true);
    expect(result.meals.flatMap((meal) => meal.components).some((component) => component.dishId === forbiddenSoup.id)).toBe(false);
    expect(breakfasts.every((meal) => meal.components.some((component) => component.slot === "base"))).toBe(true);
    expect(dinners.every((meal) => meal.components.some((component) => component.slot === "main"))).toBe(true);
  });

  it("combines hard restrictions from multiple family members", () => {
    const base = cloneDemoState();
    const fish = namedDish(base, "Рыба запеченная");
    const chicken = namedDish(base, "Курица запеченная");
    const state = withMainCandidates({
      ...base,
      family: base.family.map((member, index) => index === 0
        ? { ...member, restrictions: ["рыба"] }
        : index === 1
          ? { ...member, restrictions: ["курица"] }
          : { ...member, restrictions: [] }),
    }, [fish, chicken]);

    const result = generateWeekResult(state);

    expect(result.status).toBe("blocked");
    expect(result.meals.filter((meal) => meal.kind === "dinner").every((meal) => !meal.components.some((component) => component.slot === "main"))).toBe(true);
  });

  it("blocks a manual plan bypass", () => {
    const state = withKnownFishRestriction(cloneDemoState());
    const fish = namedDish(state, "Рыба запеченная");

    const result = planDishForDateResult(state, fish.id, "2026-01-06", "dinner");

    expect(result).toMatchObject({ status: "blocked", reason: "hard_restriction", state });
    expect(result.state).toBe(state);
  });

  it("blocks manual and automatic replace bypasses", () => {
    const base = cloneDemoState();
    const fish = namedDish(base, "Рыба запеченная");
    const chicken = namedDish(base, "Курица запеченная");
    const meal = legacyMeal(chicken);
    const state = { ...withMainCandidates(withKnownFishRestriction(base), [fish, chicken]), meals: [meal] };

    const manual = replaceComponentWithDishResult(state, meal.id, "main", fish.id);
    const automatic = replaceComponentResult(state, meal.id, "main");

    expect(manual).toMatchObject({ status: "blocked", reason: "hard_restriction" });
    expect(automatic).toMatchObject({ status: "blocked", reason: "no_safe_candidate" });
    expect(manual.state).toBe(state);
    expect(automatic.state).toBe(state);
  });

  it("blocks repeating or moving a legacy meal that now violates a hard restriction", () => {
    const base = withKnownFishRestriction(cloneDemoState());
    const fish = namedDish(base, "Рыба запеченная");
    const state = { ...base, meals: [legacyMeal(fish)] };

    const repeated = repeatMealResult(state, "legacy-dinner", "2026-01-06");
    const moved = moveMealToDateResult(state, "legacy-dinner", "2026-01-06");

    expect(repeated).toMatchObject({ status: "blocked", reason: "hard_restriction" });
    expect(moved).toMatchObject({ status: "blocked", reason: "hard_restriction" });
    expect(repeated.state.meals).toEqual(state.meals);
    expect(moved.state.meals).toEqual(state.meals);
  });

  it("keeps fallback selection inside the safe pool", () => {
    const base = cloneDemoState();
    const fish = { ...namedDish(base, "Рыба запеченная"), cost: "low" as const };
    const chicken = { ...namedDish(base, "Курица запеченная"), cost: "high" as const };
    const state = withMainCandidates(withKnownFishRestriction(base), [fish, chicken]);
    const dishes = state.dishes.map((dish) => dish.id === fish.id ? fish : dish.id === chicken.id ? chicken : dish);

    const result = generateWeekResult({ ...state, dishes }, "cheap");
    const dinnerMainIds = result.meals
      .filter((meal) => meal.kind === "dinner")
      .map((meal) => meal.components.find((component) => component.slot === "main")?.dishId);

    expect(dinnerMainIds).toEqual(Array(7).fill(chicken.id));
  });

  it("keeps dislikes soft when no hard restriction exists", () => {
    const base = cloneDemoState();
    const fish = namedDish(base, "Рыба запеченная");
    const state = withMainCandidates({
      ...base,
      family: base.family.map((member, index) => ({ ...member, restrictions: [], dislikes: index === 0 ? ["рыба"] : [] })),
    }, [fish]);

    const result = generateWeekResult(state);
    const dinnerMainIds = result.meals
      .filter((meal) => meal.kind === "dinner")
      .map((meal) => meal.components.find((component) => component.slot === "main")?.dishId);

    expect(dinnerMainIds).toEqual(Array(7).fill(fish.id));
  });

  it("fails closed when a restriction cannot be checked with current dish knowledge", () => {
    const base = cloneDemoState();
    const chicken = namedDish(base, "Курица запеченная");
    const state = {
      ...base,
      family: base.family.map((member, index) => index === 0 ? { ...member, restrictions: ["только проверенный производитель"] } : { ...member, restrictions: [] }),
    };

    const validation = validateDishRestrictions(state, chicken);

    expect(validation.status).toBe("unknown");
    if (validation.status !== "unknown") throw new Error("Unknown restriction must fail closed");
    expect(validation.reason).toBe("restriction_needs_clarification");
    expect(planDishForDateResult(state, chicken.id, "2026-01-06")).toMatchObject({ status: "blocked", reason: "restriction_needs_clarification" });
  });

  it("blocks linked recipe and imported recipe menu paths", () => {
    const state = withKnownFishRestriction(cloneDemoState());
    const fish = namedDish(state, "Рыба запеченная");
    const linkedRecipe = state.recipes.find((recipe) => recipe.linkedDishIds?.includes(fish.id));
    if (!linkedRecipe) throw new Error("Fixture requires a linked fish recipe");
    const importedRecipe: RecipeEntry = {
      id: "imported-fish",
      title: "Импортированная рыба",
      categories: ["импорт"],
      servings: 4,
      rating: 3,
      favorite: false,
      likedBy: [],
      dislikedBy: [],
      ingredients: [{ name: "рыба", amount: 500, unit: "г", category: "рыба" }],
      steps: ["Приготовить"],
      status: "ready",
    };

    expect(addRecipeToNextMenuResult(state, linkedRecipe)).toMatchObject({ status: "blocked", reason: "hard_restriction" });
    expect(planRecipeForMealResult(state, importedRecipe, "2026-01-06", "dinner")).toMatchObject({ status: "blocked", reason: "hard_restriction" });
  });
});
