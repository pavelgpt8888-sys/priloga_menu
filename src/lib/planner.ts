import type { AppState, DishComponent, DishRole, MealComponent, MealKind, MealPlan, RecipeEntry, ShoppingItem } from "./types";

const dayMs = 24 * 60 * 60 * 1000;
const iso = (date: Date) => date.toISOString().slice(0, 10);

export function startOfToday() {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  return date;
}

export function nextSevenDays() {
  const start = startOfToday();
  return Array.from({ length: 7 }, (_, index) => iso(new Date(start.getTime() + index * dayMs)));
}

export function byId(dishes: DishComponent[]) {
  return new Map(dishes.map((dish) => [dish.id, dish]));
}

function pick(pool: DishComponent[], seed: number, used: Set<string>, fallbackPool = pool) {
  const available = pool.filter((dish) => !used.has(dish.id));
  const source = available.length ? available : fallbackPool;
  return source[Math.abs(seed) % source.length];
}

function role(dishes: DishComponent[], dishRole: DishRole, banned: string[], filters: Partial<DishComponent> = {}) {
  return dishes.filter((dish) => {
    if (dish.role !== dishRole || banned.includes(dish.id)) return false;
    if (filters.effort && dish.effort !== filters.effort) return false;
    if (filters.cost && dish.cost !== filters.cost) return false;
    if (filters.kidsFriendly !== undefined && dish.kidsFriendly !== filters.kidsFriendly) return false;
    if (filters.leftoverFriendly !== undefined && dish.leftoverFriendly !== filters.leftoverFriendly) return false;
    if (filters.freezerFriendly !== undefined && dish.freezerFriendly !== filters.freezerFriendly) return false;
    return true;
  });
}

function textHas(dish: DishComponent, words: string[]) {
  const text = `${dish.name} ${dish.ingredients.map((item) => item.name).join(" ")}`.toLowerCase();
  return words.some((word) => text.includes(word.toLowerCase()));
}

function breakfastAddonPool(base: DishComponent, addons: DishComponent[]) {
  if (textHas(base, ["каша", "овсян", "греч", "рисов", "пшен"])) {
    return addons.filter((dish) => textHas(dish, ["яблок", "банан", "орех", "мед", "огур", "помид"]));
  }
  if (textHas(base, ["блины", "сырники", "творог", "запеканка", "вареники"])) {
    return addons.filter((dish) => textHas(dish, ["варенье", "мед", "ягод", "банан", "яблок"]));
  }
  if (textHas(base, ["омлет", "яичница", "тосты", "бутерброды"])) {
    return addons.filter((dish) => textHas(dish, ["огур", "помид", "сыр", "яблок"]));
  }
  return addons.filter((dish) => !dish.sweetPastry);
}

function breakfastDrinkPool(base: DishComponent, addons: DishComponent[]) {
  const drinks = addons.filter((dish) => textHas(dish, ["чай", "какао"]));
  if (textHas(base, ["каша", "греч", "рисов", "пшен"])) {
    return drinks.filter((dish) => textHas(dish, ["чай"]));
  }
  return drinks.length ? drinks : addons;
}

export function generateWeek(state: AppState, mode: "balanced" | "simple" | "cheap" | "leftovers" | "freezer" = "balanced"): MealPlan[] {
  const used = new Set<string>();
  const dates = nextSevenDays();
  const meals: MealPlan[] = [];

  dates.forEach((date, index) => {
    const weekend = index >= 5;
    const simple = mode === "simple" || (!weekend && index % 2 === 1);
    const cheap = mode === "cheap";
    const breakfastBasePool = role(state.dishes, "breakfast_base", state.bannedDishIds, simple ? { effort: "easy" } : {});
    const addonPool = role(state.dishes, "breakfast_addon", state.bannedDishIds);
    const mainPool = mode === "leftovers"
      ? role(state.dishes, "leftover_based", state.bannedDishIds)
      : mode === "freezer"
        ? role(state.dishes, "freezer_item", state.bannedDishIds)
        : role(state.dishes, "main", state.bannedDishIds, cheap ? { cost: "low" } : simple ? { effort: "easy" } : {});
    const sidePool = role(state.dishes, "side", state.bannedDishIds);
    const saladPool = role(state.dishes, "salad", state.bannedDishIds, weekend ? {} : { effort: "easy" });
    const kidsVegPool = role(state.dishes, "kids_vegetables", state.bannedDishIds);
    const soupPool = role(state.dishes, "soup", state.bannedDishIds);

    const base = pick(breakfastBasePool, index + 1, used);
    const addonChoices = breakfastAddonPool(base, addonPool);
    const addon = pick(addonChoices.length ? addonChoices : addonPool.filter((dish) => !dish.sweetPastry), index + 4, used, addonPool);
    const drink = pick(breakfastDrinkPool(base, addonPool), index + 9, used, addonPool);
    used.add(base.id); used.add(addon.id);

    meals.push({
      id: `${date}-breakfast`, date, kind: "breakfast", title: "Завтрак", source: "generated",
      components: [{ slot: "base", dishId: base.id }, { slot: "addon", dishId: addon.id }, { slot: "drink", dishId: drink.id }],
      notes: "Основа + дополнение + напиток/фрукт/овощи. Сладкая выпечка только как добавка.",
    });

    if (index % 2 === 0) {
      const soup = pick(soupPool, index + 2, used);
      used.add(soup.id);
      meals.push({ id: `${date}-lunch`, date, kind: "lunch", title: "Обед", source: "generated", components: [{ slot: "soup", dishId: soup.id }], notes: "Простой семейный обед." });
    }

    const main = pick(mainPool.length ? mainPool : role(state.dishes, "main", state.bannedDishIds), index + 12, used);
    const side = pick(sidePool, index + 20, used);
    const salad = pick(saladPool, index + 30, used);
    const kidsVeg = pick(kidsVegPool, index + 40, used);
    [main, side, salad, kidsVeg].forEach((dish) => used.add(dish.id));
    meals.push({
      id: `${date}-dinner`, date, kind: "dinner", title: "Ужин", source: "generated",
      components: [
        { slot: "main", dishId: main.id }, { slot: "side", dishId: side.id },
        { slot: "salad", dishId: salad.id }, { slot: "kidsVegetables", dishId: kidsVeg.id },
      ],
      notes: "Взрослым салат, детям простые овощи.",
    });
  });

  return meals;
}

export function replaceComponent(state: AppState, mealId: string, slot: MealComponent["slot"], prefer?: DishRole): AppState {
  const dishMap = byId(state.dishes);
  const meals = state.meals.map((meal) => {
    if (meal.id !== mealId) return meal;
    const current = meal.components.find((component) => component.slot === slot);
    const roleToUse = prefer ?? (current ? dishMap.get(current.dishId)?.role : undefined);
    if (!roleToUse) return meal;
    const candidates = role(state.dishes, roleToUse, state.bannedDishIds).filter((dish) => dish.id !== current?.dishId);
    const next = candidates[0] ?? state.dishes.find((dish) => dish.role === roleToUse);
    if (!next) return meal;
    return { ...meal, components: meal.components.map((component) => component.slot === slot ? { ...component, dishId: next.id } : component) };
  });
  return { ...state, meals, shopping: buildShoppingList({ ...state, meals }) };
}

export function replacementOptions(state: AppState, mealId: string, slot: MealComponent["slot"]): DishComponent[] {
  const meal = state.meals.find((item) => item.id === mealId);
  const current = meal?.components.find((component) => component.slot === slot);
  const currentDish = current ? state.dishes.find((dish) => dish.id === current.dishId) : undefined;
  const roleToUse = currentDish?.role;
  if (!roleToUse) return [];
  let candidates = role(state.dishes, roleToUse, state.bannedDishIds).filter((dish) => dish.id !== currentDish.id);
  if (meal?.kind === "breakfast" && slot === "addon") {
    const baseId = meal.components.find((component) => component.slot === "base")?.dishId;
    const base = state.dishes.find((dish) => dish.id === baseId);
    if (base) candidates = breakfastAddonPool(base, candidates);
  }
  if (meal?.kind === "breakfast" && slot === "drink") {
    const baseId = meal.components.find((component) => component.slot === "base")?.dishId;
    const base = state.dishes.find((dish) => dish.id === baseId);
    if (base) candidates = breakfastDrinkPool(base, candidates);
  }
  return candidates.slice(0, 12);
}

export function replaceComponentWithDish(state: AppState, mealId: string, slot: MealComponent["slot"], dishId: string): AppState {
  const meals = state.meals.map((meal) => meal.id === mealId ? {
    ...meal,
    components: meal.components.map((component) => component.slot === slot ? { ...component, dishId } : component),
  } : meal);
  return { ...state, meals, shopping: buildShoppingList({ ...state, meals }) };
}

export function removeComponent(state: AppState, mealId: string, slot: MealComponent["slot"]): AppState {
  const meals = state.meals.map((meal) => meal.id === mealId ? { ...meal, components: meal.components.filter((component) => component.slot !== slot) } : meal);
  return { ...state, meals, shopping: buildShoppingList({ ...state, meals }) };
}

export function banDish(state: AppState, dishId: string): AppState {
  return { ...state, bannedDishIds: Array.from(new Set([...state.bannedDishIds, dishId])) };
}

export function buildShoppingList(state: AppState): ShoppingItem[] {
  const dishMap = byId(state.dishes);
  const needs = new Map<string, ShoppingItem>();
  const available = new Map<string, number>();
  [...state.inventory.map((item) => ({ name: item.product, amount: item.amount })), ...state.leftovers.map((item) => ({ name: item.name, amount: 1 })), ...state.freezer.map((item) => ({ name: item.name, amount: 1 }))].forEach((item) => {
    available.set(item.name.toLowerCase(), (available.get(item.name.toLowerCase()) ?? 0) + item.amount);
  });

  state.meals.forEach((meal) => meal.components.forEach((component) => {
    const dish = dishMap.get(component.dishId);
    dish?.ingredients.forEach((ingredient) => {
      const key = ingredient.name.toLowerCase();
      const atHome = available.get(key) ?? 0;
      const missing = Math.max(0, ingredient.amount - atHome);
      if (missing <= 0) return;
      const existing = needs.get(key);
      if (existing) existing.amount += missing;
      else needs.set(key, { id: `shop-${key}`, product: ingredient.name, amount: missing, unit: ingredient.unit, category: ingredient.category, checked: false, alreadyAtHome: false });
    });
  }));

  return Array.from(needs.values()).sort((a, b) => a.category.localeCompare(b.category, "ru") || a.product.localeCompare(b.product, "ru"));
}

export function addManualShoppingItem(state: AppState, product: string): AppState {
  if (!product.trim()) return state;
  return { ...state, shopping: [...state.shopping, { id: `manual-${Date.now()}`, product: product.trim(), amount: 1, unit: "шт", category: "бакалея", checked: false, alreadyAtHome: false, manuallyAdded: true }] };
}

export function addRecipeToShopping(state: AppState, recipe: RecipeEntry): AppState {
  const shopping = [...state.shopping];
  recipe.ingredients.forEach((ingredient) => {
    const existing = shopping.find((item) =>
      item.product.toLowerCase() === ingredient.name.toLowerCase()
      && item.unit === ingredient.unit
      && item.category === ingredient.category
      && !item.checked
      && !item.alreadyAtHome
    );
    if (existing) existing.amount += ingredient.amount;
    else shopping.push({
      id: `recipe-${recipe.id}-${ingredient.name.toLowerCase()}-${Date.now()}`,
      product: ingredient.name,
      amount: ingredient.amount,
      unit: ingredient.unit,
      category: ingredient.category,
      checked: false,
      alreadyAtHome: false,
      manuallyAdded: true,
    });
  });
  return { ...state, shopping };
}

function slotForDishRole(roleToUse: DishRole): MealComponent["slot"] {
  if (roleToUse === "breakfast_base") return "base";
  if (roleToUse === "breakfast_addon") return "addon";
  if (roleToUse === "side") return "side";
  if (roleToUse === "salad") return "salad";
  if (roleToUse === "kids_vegetables") return "kidsVegetables";
  if (roleToUse === "soup") return "soup";
  if (roleToUse === "dessert") return "dessert";
  return "main";
}

function slotForMealKind(kind: MealKind, roleToUse: DishRole): MealComponent["slot"] {
  if (kind === "breakfast") return roleToUse === "breakfast_addon" ? "addon" : "base";
  if (kind === "lunch") return roleToUse === "soup" ? "soup" : "main";
  return slotForDishRole(roleToUse);
}

function dishRoleForMealKind(kind: MealKind): DishRole {
  if (kind === "breakfast") return "breakfast_base";
  if (kind === "lunch") return "soup";
  return "main";
}

function ensureDishForRecipe(state: AppState, recipe: RecipeEntry, kind: MealKind): { state: AppState; dish: DishComponent; recipe: RecipeEntry } {
  const linkedDish = recipe.linkedDishIds?.map((id) => state.dishes.find((dish) => dish.id === id)).find(Boolean);
  if (linkedDish) return { state, dish: linkedDish, recipe };

  const dish: DishComponent = {
    id: `dish-${recipe.id}`,
    name: recipe.title,
    role: dishRoleForMealKind(kind),
    effort: (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0) > 50 ? "weekend" : "medium",
    cost: "medium",
    kidsFriendly: true,
    ingredients: recipe.ingredients,
    steps: recipe.steps,
  };
  const updatedRecipe = { ...recipe, linkedDishIds: [dish.id], status: "ready" as const };
  const recipes = state.recipes.map((item) => item.id === recipe.id ? updatedRecipe : item);
  return { state: { ...state, dishes: [...state.dishes, dish], recipes }, dish, recipe: updatedRecipe };
}

export function planRecipeForMeal(state: AppState, recipe: RecipeEntry, date: string, kind: MealKind): AppState {
  const prepared = ensureDishForRecipe(state, recipe, kind);
  const dish = prepared.dish;
  const slot = slotForMealKind(kind, dish.role);
  const mealTitle = mealLabel(kind);
  const existing = prepared.state.meals.find((meal) => meal.date === date && meal.kind === kind);
  let meals: MealPlan[];

  if (existing) {
    meals = prepared.state.meals.map((meal) => {
      if (meal.id !== existing.id) return meal;
      const hasSlot = meal.components.some((component) => component.slot === slot);
      const components = hasSlot
        ? meal.components.map((component) => component.slot === slot ? { ...component, dishId: dish.id } : component)
        : [{ slot, dishId: dish.id }, ...meal.components];
      return { ...meal, title: mealTitle, source: "manual", notes: `${mealTitle} обновлен из рецептов.`, components };
    });
  } else {
    meals = [...prepared.state.meals, {
      id: `${date}-${kind}-manual-${Date.now()}`,
      date,
      kind,
      title: mealTitle,
      source: "manual",
      notes: `${mealTitle} добавлен из рецептов.`,
      components: [{ slot, dishId: dish.id }],
    }];
  }

  return { ...prepared.state, meals, shopping: buildShoppingList({ ...prepared.state, meals }) };
}

export function addRecipeToNextMenu(state: AppState, recipe: RecipeEntry): AppState {
  const dishId = recipe.linkedDishIds?.find((id) => state.dishes.some((dish) => dish.id === id));
  if (!dishId) return state;
  const dish = state.dishes.find((item) => item.id === dishId);
  if (!dish) return state;

  const date = new Date(startOfToday());
  date.setDate(date.getDate() + 1);
  const kind: MealKind = dish.role === "breakfast_base" || dish.role === "breakfast_addon" ? "breakfast" : dish.role === "soup" ? "lunch" : "dinner";
  const meal: MealPlan = {
    id: `${iso(date)}-${kind}-recipe-${Date.now()}`,
    date: iso(date),
    kind,
    title: recipe.title,
    source: "manual",
    notes: "Добавлено из рецептов вручную.",
    components: [{ slot: slotForDishRole(dish.role), dishId }],
  };
  const meals = [...state.meals, meal];
  return { ...state, meals, shopping: buildShoppingList({ ...state, meals }) };
}

export function applyQuickScenario(state: AppState, scenario: string): { state: AppState; message: string } {
  if (scenario === "Нет времени" || scenario === "Сделать проще") return { state: { ...state, meals: generateWeek(state, "simple") }, message: "Меню упрощено: больше быстрых блюд на будни." };
  if (scenario === "Сделать дешевле") return { state: { ...state, meals: generateWeek(state, "cheap") }, message: "Меню стало дешевле: больше простых недорогих блюд." };
  if (scenario === "Использовать остатки") return { state: { ...state, meals: generateWeek(state, "leftovers") }, message: "Остатки встроены в ближайшие приемы пищи." };
  if (scenario === "Из морозилки") return { state: { ...state, meals: generateWeek(state, "freezer") }, message: "Добавлены варианты из морозилки." };
  if (scenario === "Дети это не едят") return { state: { ...state, bannedDishIds: [...state.bannedDishIds, ...state.dishes.filter((dish) => !dish.kidsFriendly).map((dish) => dish.id)] }, message: "Неподходящие детям блюда временно убраны из предложений." };
  if (scenario === "Добавить овощи") return { state, message: "К каждому ужину уже добавлены простые овощи детям и салат взрослым." };
  if (scenario === "Из того, что есть") return { state: { ...state, shopping: buildShoppingList(state).slice(0, 6) }, message: "Список покупок сокращен с учетом запасов дома." };
  return { state, message: "Сценарий применен." };
}

export function parseCommand(state: AppState, text: string): { state: AppState; message: string } {
  const lower = text.toLowerCase();
  if (!lower.trim()) return { state, message: "Напишите бытовую команду." };
  if (lower.includes("убери рыбу")) {
    const fish = state.dishes.filter((dish) => dish.ingredients.some((item) => item.category === "рыба")).map((dish) => dish.id);
    return { state: { ...state, bannedDishIds: Array.from(new Set([...state.bannedDishIds, ...fish])) }, message: "Рыба убрана из предложений на эту неделю." };
  }
  if (lower.includes("сделай меню проще")) return { state: { ...state, meals: generateWeek(state, "simple") }, message: "Меню стало проще." };
  if (lower.includes("остатки картофеля") || lower.includes("остатки картош")) return { state: { ...state, meals: generateWeek(state, "leftovers") }, message: "Остатки картофеля учтены в ближайших блюдах." };
  if (lower.includes("детям вместо салата") || lower.includes("дай огурцы")) return { state, message: "Для детей оставлены простые овощи: огурцы или морковные палочки." };
  if (lower.includes("гречку на картошку") || lower.includes("гречка на картош")) {
    const potato = state.dishes.find((dish) => dish.name.includes("Картофельное пюре") || dish.name.includes("Картофель запеченный"));
    if (!potato) return { state, message: "Не нашел картофельный гарнир." };
    const meals = state.meals.map((meal) => ({ ...meal, components: meal.components.map((component) => {
      const dish = state.dishes.find((item) => item.id === component.dishId);
      return dish?.name.toLowerCase().includes("греч") ? { ...component, dishId: potato.id } : component;
    }) }));
    return { state: { ...state, meals, shopping: buildShoppingList({ ...state, meals }) }, message: "Гречка заменена на картофельный гарнир." };
  }
  return { state, message: "Понял как заметку. В MVP работают команды про гречку, огурцы детям, остатки картофеля, рыбу и простое меню." };
}

export function mealLabel(kind: MealKind) {
  return kind === "breakfast" ? "Завтрак" : kind === "lunch" ? "Обед" : kind === "dinner" ? "Ужин" : "Перекус";
}
