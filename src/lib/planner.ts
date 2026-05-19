import type { AppState, DishComponent, DishRole, MealComponent, MealKind, MealPlan, ShoppingItem } from "./types";

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
    const addon = pick(addonPool.filter((dish) => !dish.sweetPastry || base.role === "breakfast_base"), index + 4, used, addonPool);
    used.add(base.id); used.add(addon.id);

    meals.push({
      id: `${date}-breakfast`, date, kind: "breakfast", title: "Завтрак", source: "generated",
      components: [{ slot: "base", dishId: base.id }, { slot: "addon", dishId: addon.id }, { slot: "drink", dishId: pick(addonPool, index + 9, used, addonPool).id }],
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
