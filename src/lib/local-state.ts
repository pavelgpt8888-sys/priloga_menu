import { initialState } from "./demo-data";
import { buildShoppingList, generateWeek } from "./planner";
import type { AppState, MealKind, RecipeEntry } from "./types";

export function seededState(): AppState {
  const base = { ...initialState, meals: generateWeek(initialState) };
  return { ...base, shopping: buildShoppingList(base) };
}

export function hydrateState(value: AppState): AppState {
  const hasStoredShopping = Array.isArray(value.shopping);
  const storedRecipes = Array.isArray(value.recipes) ? value.recipes : [];
  const usableRecipes = storedRecipes.filter((recipe): recipe is RecipeEntry => {
    const maybeRecipe = recipe as Partial<RecipeEntry>;
    return Boolean(maybeRecipe.id && maybeRecipe.title && Array.isArray(maybeRecipe.ingredients) && Array.isArray(maybeRecipe.steps));
  });
  const recipeIds = new Set(usableRecipes.map((recipe) => recipe.id));
  const recipes = [...usableRecipes, ...initialState.recipes.filter((recipe) => !recipeIds.has(recipe.id))];

  const hydrated: AppState = {
    ...initialState,
    ...value,
    family: value.family?.length ? value.family : initialState.family,
    dishes: value.dishes?.length ? value.dishes : initialState.dishes,
    inventory: value.inventory ?? initialState.inventory,
    leftovers: value.leftovers ?? initialState.leftovers,
    freezer: value.freezer ?? initialState.freezer,
    meals: value.meals?.length ? value.meals : [],
    shopping: value.shopping ?? [],
    recipes,
    bannedDishIds: value.bannedDishIds ?? [],
    feedback: value.feedback ?? [],
  };
  const generatedMeals = generateWeek(hydrated);
  const savedMeals = hydrated.meals.length ? hydrated.meals : generatedMeals;
  const missingLunches = generatedMeals.filter((meal) =>
    meal.kind === "lunch" && !savedMeals.some((saved) => saved.date === meal.date && saved.kind === "lunch"),
  );
  const order: MealKind[] = ["breakfast", "lunch", "dinner", "snack"];
  const meals = [...savedMeals, ...missingLunches].sort((first, second) =>
    first.date.localeCompare(second.date) || order.indexOf(first.kind) - order.indexOf(second.kind),
  );
  const shopping = hasStoredShopping ? hydrated.shopping : buildShoppingList({ ...hydrated, meals });
  return { ...hydrated, meals, shopping };
}
