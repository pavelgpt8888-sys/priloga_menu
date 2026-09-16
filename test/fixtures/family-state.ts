import { initialState } from "../../src/lib/demo-data";
import { buildShoppingList, generateWeek } from "../../src/lib/planner";
import type { AppState, DishComponent, MealPlan, RecipeEntry, ShoppingItem } from "../../src/lib/types";

export const fixedNow = new Date("2026-01-05T12:00:00.000Z");

export function cloneDemoState(): AppState {
  return JSON.parse(JSON.stringify(initialState)) as AppState;
}

export function generatedDemoState(): AppState {
  const state = cloneDemoState();
  const meals = generateWeek(state);
  return { ...state, meals, shopping: buildShoppingList({ ...state, meals }) };
}

function fixtureDish(id: string, name: string, amount: number, unit: string): DishComponent {
  return {
    id,
    name,
    role: "main",
    effort: "easy",
    cost: "low",
    kidsFriendly: true,
    ingredients: [{ name: "Мука", amount, unit, category: "бакалея" }],
  };
}

export function mixedUnitState(): AppState {
  const state = cloneDemoState();
  const kilo = fixtureDish("fixture-flour-kilo", "Мука килограмм", 1, "кг");
  const grams = fixtureDish("fixture-flour-grams", "Мука граммы", 500, "г");
  const meals: MealPlan[] = [
    { id: "fixture-unit-one", date: "2026-01-05", kind: "dinner", title: "Ужин", source: "manual", components: [{ slot: "main", dishId: kilo.id }] },
    { id: "fixture-unit-two", date: "2026-01-06", kind: "dinner", title: "Ужин", source: "manual", components: [{ slot: "main", dishId: grams.id }] },
  ];
  return { ...state, dishes: [...state.dishes, kilo, grams], meals, inventory: [], leftovers: [], freezer: [], shopping: [] };
}

export function restrictionBypassState(): AppState {
  const state = cloneDemoState();
  const fish = state.dishes.find((dish) => dish.name === "Рыба запеченная");
  if (!fish) throw new Error("Fixture requires Рыба запеченная from demo data");
  return {
    ...state,
    family: state.family.map((member, index) => index === 0 ? { ...member, restrictions: ["рыба"] } : member),
    dishes: state.dishes.filter((dish) => dish.role !== "main" || dish.id === fish.id),
    meals: [],
    shopping: [],
  };
}

export function manualAndCheckedShoppingState(): AppState {
  const state = generatedDemoState();
  const manual: ShoppingItem = { id: "fixture-manual", product: "Тестовый ручной товар", amount: 2, unit: "шт", category: "бакалея", checked: false, alreadyAtHome: false, manuallyAdded: true };
  const checked: ShoppingItem = { id: "fixture-checked", product: "Тестовый отмеченный товар", amount: 1, unit: "шт", category: "бакалея", checked: true, alreadyAtHome: false };
  return { ...state, shopping: [...state.shopping, manual, checked] };
}

export function recipeFixture(): RecipeEntry {
  return {
    id: "fixture-recipe",
    title: "Тестовый рецепт",
    source: "test fixture",
    categories: ["test"],
    servings: 4,
    rating: 3,
    favorite: false,
    likedBy: [],
    dislikedBy: [],
    ingredients: [{ name: "Тестовая крупа", amount: 2, unit: "пач", category: "крупы и макароны" }],
    steps: ["Проверить добавление в покупки"],
    status: "ready",
  };
}

export function nestedMutationState(): AppState {
  const state = cloneDemoState();
  const shopping: ShoppingItem[] = [{ id: "fixture-mutable", product: "Тестовая крупа", amount: 2, unit: "пач", category: "крупы и макароны", checked: false, alreadyAtHome: false, manuallyAdded: true }];
  return { ...state, shopping };
}

export function mergingRecipeFixture(): RecipeEntry {
  return { ...recipeFixture(), ingredients: [{ name: "Тестовая крупа", amount: 3, unit: "пач", category: "крупы и макароны" }] };
}
