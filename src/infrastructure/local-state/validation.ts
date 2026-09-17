import type {
  AppState,
  CookingSession,
  DishComponent,
  DishRole,
  FamilyMember,
  FreezerItem,
  IngredientNeed,
  InventoryItem,
  Leftover,
  MealComponent,
  MealFeedback,
  MealKind,
  MealPlan,
  RecipeEntry,
  ShoppingCategory,
  ShoppingItem,
  StoragePlace,
} from "../../lib/types";

export interface ValidationIssue {
  path: string;
  message: string;
}

export type ValidationResult<T> =
  | { success: true; value: T }
  | { success: false; issues: ValidationIssue[] };

const dishRoles = new Set<DishRole>(["breakfast_base", "breakfast_addon", "main", "side", "salad", "kids_vegetables", "soup", "dessert", "snack", "leftover_based", "freezer_item"]);
const mealKinds = new Set<MealKind>(["breakfast", "lunch", "dinner", "snack"]);
const mealSlots = new Set<MealComponent["slot"]>(["base", "addon", "drink", "main", "side", "salad", "kidsVegetables", "soup", "dessert"]);
const shoppingCategories = new Set<ShoppingCategory>(["овощи и фрукты", "мясо и птица", "рыба", "молочные", "хлеб", "крупы и макароны", "бакалея", "заморозка", "специи", "сладкое", "бытовое"]);
const storagePlaces = new Set<StoragePlace>(["fridge", "freezer", "pantry"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown) {
  return typeof value === "string";
}

function nonEmptyString(value: unknown) {
  return stringValue(value) && value.trim().length > 0;
}

function finiteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value);
}

function booleanValue(value: unknown) {
  return typeof value === "boolean";
}

function stringArray(value: unknown) {
  return Array.isArray(value) && value.every(stringValue);
}

function optional(value: unknown, validator: (candidate: unknown) => boolean) {
  return value === undefined || validator(value);
}

function enumValue<T extends string>(value: unknown, allowed: Set<T>): value is T {
  return typeof value === "string" && allowed.has(value as T);
}

function issue(issues: ValidationIssue[], path: string, message: string) {
  issues.push({ path, message });
}

function validateIngredient(value: unknown, path: string, issues: ValidationIssue[]): value is IngredientNeed {
  if (!isRecord(value)) {
    issue(issues, path, "must be an object");
    return false;
  }
  if (!nonEmptyString(value.name)) issue(issues, `${path}.name`, "must be a non-empty string");
  if (!finiteNumber(value.amount)) issue(issues, `${path}.amount`, "must be a finite number");
  if (!nonEmptyString(value.unit)) issue(issues, `${path}.unit`, "must be a non-empty string");
  if (!enumValue(value.category, shoppingCategories)) issue(issues, `${path}.category`, "is not a supported shopping category");
  if (!optional(value.rawQuantity, stringValue)) issue(issues, `${path}.rawQuantity`, "must be a string when present");
  if (value.quantityStatus !== undefined && value.quantityStatus !== "unresolved") issue(issues, `${path}.quantityStatus`, "must be unresolved when present");
  return true;
}

function validateFamilyMember(value: unknown, path: string, issues: ValidationIssue[]): value is FamilyMember {
  if (!isRecord(value)) {
    issue(issues, path, "must be an object");
    return false;
  }
  if (!nonEmptyString(value.id)) issue(issues, `${path}.id`, "must be a non-empty string");
  if (!nonEmptyString(value.name)) issue(issues, `${path}.name`, "must be a non-empty string");
  if (!finiteNumber(value.age) || (typeof value.age === "number" && value.age < 0)) issue(issues, `${path}.age`, "must be a non-negative finite number");
  if (value.role !== "adult" && value.role !== "teen" && value.role !== "child") issue(issues, `${path}.role`, "is not a supported family role");
  for (const field of ["dislikes", "likes", "favoriteDishes", "restrictions"] as const) {
    if (!optional(value[field], stringArray)) issue(issues, `${path}.${field}`, "must be an array of strings when present");
  }
  if (!optional(value.notes, stringValue)) issue(issues, `${path}.notes`, "must be a string when present");
  return true;
}

function validateDish(value: unknown, path: string, issues: ValidationIssue[]): value is DishComponent {
  if (!isRecord(value)) {
    issue(issues, path, "must be an object");
    return false;
  }
  if (!nonEmptyString(value.id)) issue(issues, `${path}.id`, "must be a non-empty string");
  if (!nonEmptyString(value.name)) issue(issues, `${path}.name`, "must be a non-empty string");
  if (!enumValue(value.role, dishRoles)) issue(issues, `${path}.role`, "is not a supported dish role");
  if (value.effort !== "easy" && value.effort !== "medium" && value.effort !== "weekend") issue(issues, `${path}.effort`, "is not a supported effort");
  if (value.cost !== "low" && value.cost !== "medium" && value.cost !== "high") issue(issues, `${path}.cost`, "is not a supported cost");
  if (!booleanValue(value.kidsFriendly)) issue(issues, `${path}.kidsFriendly`, "must be boolean");
  for (const field of ["leftoverFriendly", "freezerFriendly", "sweetPastry"] as const) {
    if (!optional(value[field], booleanValue)) issue(issues, `${path}.${field}`, "must be boolean when present");
  }
  if (!Array.isArray(value.ingredients)) issue(issues, `${path}.ingredients`, "must be an array");
  else value.ingredients.forEach((ingredient, index) => validateIngredient(ingredient, `${path}.ingredients[${index}]`, issues));
  if (!optional(value.steps, stringArray)) issue(issues, `${path}.steps`, "must be an array of strings when present");
  return true;
}

function validateMeal(value: unknown, path: string, issues: ValidationIssue[]): value is MealPlan {
  if (!isRecord(value)) {
    issue(issues, path, "must be an object");
    return false;
  }
  if (!nonEmptyString(value.id)) issue(issues, `${path}.id`, "must be a non-empty string");
  if (!nonEmptyString(value.date)) issue(issues, `${path}.date`, "must be a non-empty string");
  if (!enumValue(value.kind, mealKinds)) issue(issues, `${path}.kind`, "is not a supported meal kind");
  if (!nonEmptyString(value.title)) issue(issues, `${path}.title`, "must be a non-empty string");
  if (!Array.isArray(value.components)) issue(issues, `${path}.components`, "must be an array");
  else value.components.forEach((component, index) => {
    const componentPath = `${path}.components[${index}]`;
    if (!isRecord(component)) issue(issues, componentPath, "must be an object");
    else {
      if (!enumValue(component.slot, mealSlots)) issue(issues, `${componentPath}.slot`, "is not a supported meal slot");
      if (!nonEmptyString(component.dishId)) issue(issues, `${componentPath}.dishId`, "must be a non-empty string");
    }
  });
  if (!optional(value.notes, stringValue)) issue(issues, `${path}.notes`, "must be a string when present");
  if (value.source !== undefined && value.source !== "generated" && value.source !== "manual") issue(issues, `${path}.source`, "is not a supported meal source");
  return true;
}

function validateInventory(value: unknown, path: string, issues: ValidationIssue[]): value is InventoryItem {
  if (!isRecord(value)) {
    issue(issues, path, "must be an object");
    return false;
  }
  if (!nonEmptyString(value.id)) issue(issues, `${path}.id`, "must be a non-empty string");
  if (!nonEmptyString(value.product)) issue(issues, `${path}.product`, "must be a non-empty string");
  if (!finiteNumber(value.amount)) issue(issues, `${path}.amount`, "must be a finite number");
  if (!nonEmptyString(value.unit)) issue(issues, `${path}.unit`, "must be a non-empty string");
  if (!enumValue(value.category, shoppingCategories)) issue(issues, `${path}.category`, "is not a supported shopping category");
  if (!enumValue(value.place, storagePlaces)) issue(issues, `${path}.place`, "is not a supported storage place");
  if (!optional(value.expiresAt, stringValue)) issue(issues, `${path}.expiresAt`, "must be a string when present");
  if (!optional(value.urgent, booleanValue)) issue(issues, `${path}.urgent`, "must be boolean when present");
  if (value.source !== "manual" && value.source !== "shopping" && value.source !== "future_ai_photo") issue(issues, `${path}.source`, "is not a supported inventory source");
  return true;
}

function validateLeftover(value: unknown, path: string, issues: ValidationIssue[]): value is Leftover {
  if (!isRecord(value)) {
    issue(issues, path, "must be an object");
    return false;
  }
  if (!nonEmptyString(value.id)) issue(issues, `${path}.id`, "must be a non-empty string");
  if (!nonEmptyString(value.name)) issue(issues, `${path}.name`, "must be a non-empty string");
  if (value.amount !== "мало" && value.amount !== "на 1 порцию" && value.amount !== "на 2 порции" && value.amount !== "много") issue(issues, `${path}.amount`, "is not a supported leftover amount");
  if (!nonEmptyString(value.cookedAt)) issue(issues, `${path}.cookedAt`, "must be a non-empty string");
  if (!nonEmptyString(value.useBy)) issue(issues, `${path}.useBy`, "must be a non-empty string");
  if (!stringArray(value.transformInto)) issue(issues, `${path}.transformInto`, "must be an array of strings");
  if (!optional(value.linkedDishIds, stringArray)) issue(issues, `${path}.linkedDishIds`, "must be an array of strings when present");
  return true;
}

function validateFreezerItem(value: unknown, path: string, issues: ValidationIssue[]): value is FreezerItem {
  if (!isRecord(value)) {
    issue(issues, path, "must be an object");
    return false;
  }
  if (!nonEmptyString(value.id)) issue(issues, `${path}.id`, "must be a non-empty string");
  if (!nonEmptyString(value.name)) issue(issues, `${path}.name`, "must be a non-empty string");
  if (!nonEmptyString(value.amount)) issue(issues, `${path}.amount`, "must be a non-empty string");
  if (!nonEmptyString(value.frozenAt)) issue(issues, `${path}.frozenAt`, "must be a non-empty string");
  if (!nonEmptyString(value.useBy)) issue(issues, `${path}.useBy`, "must be a non-empty string");
  if (!stringArray(value.serveWith)) issue(issues, `${path}.serveWith`, "must be an array of strings");
  if (!optional(value.linkedDishIds, stringArray)) issue(issues, `${path}.linkedDishIds`, "must be an array of strings when present");
  return true;
}

function validateShoppingItem(value: unknown, path: string, issues: ValidationIssue[]): value is ShoppingItem {
  if (!isRecord(value)) {
    issue(issues, path, "must be an object");
    return false;
  }
  if (!nonEmptyString(value.id)) issue(issues, `${path}.id`, "must be a non-empty string");
  if (!nonEmptyString(value.product)) issue(issues, `${path}.product`, "must be a non-empty string");
  if (!finiteNumber(value.amount)) issue(issues, `${path}.amount`, "must be a finite number");
  if (!nonEmptyString(value.unit)) issue(issues, `${path}.unit`, "must be a non-empty string");
  if (!enumValue(value.category, shoppingCategories)) issue(issues, `${path}.category`, "is not a supported shopping category");
  if (!booleanValue(value.checked)) issue(issues, `${path}.checked`, "must be boolean");
  if (!booleanValue(value.alreadyAtHome)) issue(issues, `${path}.alreadyAtHome`, "must be boolean");
  if (!optional(value.manuallyAdded, booleanValue)) issue(issues, `${path}.manuallyAdded`, "must be boolean when present");
  if (!optional(value.rawQuantity, stringValue)) issue(issues, `${path}.rawQuantity`, "must be a string when present");
  if (value.quantityStatus !== undefined && value.quantityStatus !== "unresolved") issue(issues, `${path}.quantityStatus`, "must be unresolved when present");
  return true;
}

function validateRecipe(value: unknown, path: string, issues: ValidationIssue[]): value is RecipeEntry {
  if (!isRecord(value)) {
    issue(issues, path, "must be an object");
    return false;
  }
  if (!nonEmptyString(value.id)) issue(issues, `${path}.id`, "must be a non-empty string");
  if (!nonEmptyString(value.title)) issue(issues, `${path}.title`, "must be a non-empty string");
  for (const field of ["url", "source", "photoUrl", "notes"] as const) {
    if (!optional(value[field], stringValue)) issue(issues, `${path}.${field}`, "must be a string when present");
  }
  if (!stringArray(value.categories)) issue(issues, `${path}.categories`, "must be an array of strings");
  if (!finiteNumber(value.servings)) issue(issues, `${path}.servings`, "must be a finite number");
  if (!optional(value.prepMinutes, finiteNumber)) issue(issues, `${path}.prepMinutes`, "must be a finite number when present");
  if (!optional(value.cookMinutes, finiteNumber)) issue(issues, `${path}.cookMinutes`, "must be a finite number when present");
  if (!finiteNumber(value.rating)) issue(issues, `${path}.rating`, "must be a finite number");
  if (!booleanValue(value.favorite)) issue(issues, `${path}.favorite`, "must be boolean");
  if (!stringArray(value.likedBy)) issue(issues, `${path}.likedBy`, "must be an array of strings");
  if (!stringArray(value.dislikedBy)) issue(issues, `${path}.dislikedBy`, "must be an array of strings");
  if (!Array.isArray(value.ingredients)) issue(issues, `${path}.ingredients`, "must be an array");
  else value.ingredients.forEach((ingredient, index) => validateIngredient(ingredient, `${path}.ingredients[${index}]`, issues));
  if (!stringArray(value.steps)) issue(issues, `${path}.steps`, "must be an array of strings");
  if (!optional(value.linkedDishIds, stringArray)) issue(issues, `${path}.linkedDishIds`, "must be an array of strings when present");
  if (value.status !== "draft" && value.status !== "ready" && value.status !== "ready_for_parser") issue(issues, `${path}.status`, "is not a supported recipe status");
  return true;
}

function validateCooking(value: unknown, path: string, issues: ValidationIssue[]): value is CookingSession {
  if (!isRecord(value)) {
    issue(issues, path, "must be an object");
    return false;
  }
  if (!nonEmptyString(value.mealId)) issue(issues, `${path}.mealId`, "must be a non-empty string");
  if (!Array.isArray(value.doneSteps) || !value.doneSteps.every(finiteNumber)) issue(issues, `${path}.doneSteps`, "must be an array of finite numbers");
  if (!finiteNumber(value.timerSeconds)) issue(issues, `${path}.timerSeconds`, "must be a finite number");
  if (!stringArray(value.eaters)) issue(issues, `${path}.eaters`, "must be an array of strings");
  if (value.liked !== undefined && value.liked !== "yes" && value.liked !== "mixed" && value.liked !== "no") issue(issues, `${path}.liked`, "is not a supported feedback value");
  if (!optional(value.leftoversNote, stringValue)) issue(issues, `${path}.leftoversNote`, "must be a string when present");
  return true;
}

function validateFeedback(value: unknown, path: string, issues: ValidationIssue[]): value is MealFeedback {
  if (!isRecord(value)) {
    issue(issues, path, "must be an object");
    return false;
  }
  if (!nonEmptyString(value.id)) issue(issues, `${path}.id`, "must be a non-empty string");
  if (!nonEmptyString(value.mealId)) issue(issues, `${path}.mealId`, "must be a non-empty string");
  if (!nonEmptyString(value.mealDate)) issue(issues, `${path}.mealDate`, "must be a non-empty string");
  if (!stringArray(value.eaterIds)) issue(issues, `${path}.eaterIds`, "must be an array of strings");
  if (value.liked !== "yes" && value.liked !== "mixed" && value.liked !== "no") issue(issues, `${path}.liked`, "is not a supported feedback value");
  if (!optional(value.leftoversNote, stringValue)) issue(issues, `${path}.leftoversNote`, "must be a string when present");
  if (value.storedAs !== "fridge" && value.storedAs !== "freezer" && value.storedAs !== "none") issue(issues, `${path}.storedAs`, "is not a supported storage result");
  return true;
}

function validateReferences(state: AppState, issues: ValidationIssue[]) {
  const dishIds = new Set(state.dishes.map((dish) => dish.id));
  const mealIds = new Set(state.meals.map((meal) => meal.id));
  const familyIds = new Set(state.family.map((member) => member.id));

  state.meals.forEach((meal, mealIndex) => meal.components.forEach((component, componentIndex) => {
    if (!dishIds.has(component.dishId)) issue(issues, `payload.meals[${mealIndex}].components[${componentIndex}].dishId`, "references a missing dish");
  }));
  if (state.cooking) {
    if (!mealIds.has(state.cooking.mealId)) issue(issues, "payload.cooking.mealId", "references a missing meal");
    state.cooking.eaters.forEach((memberId, index) => {
      if (!familyIds.has(memberId)) issue(issues, `payload.cooking.eaters[${index}]`, "references a missing family member");
    });
  }
  // Recipe, feedback, leftover and freezer links may be historical snapshots;
  // their strings are validated above without requiring a current catalogue row.
}

export function validateAppState(value: unknown): ValidationResult<AppState> {
  const issues: ValidationIssue[] = [];
  if (!isRecord(value)) return { success: false, issues: [{ path: "payload", message: "must be an object" }] };

  const collections = ["family", "dishes", "meals", "inventory", "leftovers", "freezer", "shopping", "recipes", "bannedDishIds", "feedback"] as const;
  collections.forEach((field) => {
    if (!Array.isArray(value[field])) issue(issues, `payload.${field}`, "must be an array");
  });
  if (issues.length) return { success: false, issues };

  const candidate = value as unknown as AppState;
  candidate.family.forEach((entry, index) => validateFamilyMember(entry, `payload.family[${index}]`, issues));
  candidate.dishes.forEach((entry, index) => validateDish(entry, `payload.dishes[${index}]`, issues));
  candidate.meals.forEach((entry, index) => validateMeal(entry, `payload.meals[${index}]`, issues));
  candidate.inventory.forEach((entry, index) => validateInventory(entry, `payload.inventory[${index}]`, issues));
  candidate.leftovers.forEach((entry, index) => validateLeftover(entry, `payload.leftovers[${index}]`, issues));
  candidate.freezer.forEach((entry, index) => validateFreezerItem(entry, `payload.freezer[${index}]`, issues));
  candidate.shopping.forEach((entry, index) => validateShoppingItem(entry, `payload.shopping[${index}]`, issues));
  candidate.recipes.forEach((entry, index) => validateRecipe(entry, `payload.recipes[${index}]`, issues));
  if (!candidate.bannedDishIds.every(stringValue)) issue(issues, "payload.bannedDishIds", "must contain only strings");
  candidate.feedback.forEach((entry, index) => validateFeedback(entry, `payload.feedback[${index}]`, issues));
  if (candidate.cooking !== undefined) validateCooking(candidate.cooking, "payload.cooking", issues);

  if (!issues.length) validateReferences(candidate, issues);

  return issues.length ? { success: false, issues } : { success: true, value: structuredClone(candidate) };
}
