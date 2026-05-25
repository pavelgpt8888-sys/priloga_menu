"use client";

import { useEffect, useMemo, useState, useSyncExternalStore, type FormEvent } from "react";
import { CalendarDays, Camera, ChefHat, Heart, Home, IceCreamBowl, ListChecks, MoreHorizontal, Plus, RotateCcw, Settings, ShoppingBasket, Snowflake, Soup, Sparkles, Star, Upload, Users, Warehouse, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { initialState } from "@/lib/demo-data";
import { addManualShoppingItem, addRecipeToNextMenu, addRecipeToShopping, applyQuickScenario, banDish, buildShoppingList, byId, estimatedPlanCost, generateWeek, mealLabel, moveCheckedShoppingToInventory, moveMealToDate, parseCommand, planDishForDate, planRecipeForMeal, removeComponent, replaceComponent, replacementOptions, replaceComponentWithDish, startOfToday, suggestDishesFromPantry, type DishSuggestion } from "@/lib/planner";
import type { AppState, CookingSession, DishComponent, FamilyMember, FreezerItem, IngredientNeed, InventoryItem, Leftover, MealComponent, MealFeedback, MealKind, MealPlan, RecipeEntry, ShoppingCategory, ShoppingItem, StoragePlace } from "@/lib/types";

const storageKey = "family-meal-planner-state-v1";
const storageEvent = "family-meal-planner-change";
const sections = [
  ["Сегодня", Home], ["Меню", CalendarDays], ["Блюда", Soup], ["Семья", Users], ["Кухня", ChefHat],
  ["Остатки", IceCreamBowl], ["Морозилка", Snowflake], ["Запасы", Warehouse], ["Покупки", ShoppingBasket], ["Настройки", Settings],
] as const;
const mobilePrimarySections = [sections[0], sections[1], sections[8], sections[4]] as const;
const mobileMoreSections = [sections[2], sections[3], sections[5], sections[6], sections[7], sections[9]] as const;
const quick = ["Нет времени", "Использовать остатки", "Дети это не едят", "Сделать проще", "Сделать дешевле", "Добавить овощи", "Из того, что есть", "Из морозилки"];
const slotLabels: Record<MealComponent["slot"], string> = {
  base: "основа", addon: "дополнение", drink: "напиток/фрукт/овощи", main: "основное", side: "гарнир", salad: "салат взрослым", kidsVegetables: "овощи детям", soup: "суп", dessert: "десерт",
};

function seededState(): AppState {
  const base = { ...initialState, meals: generateWeek(initialState) };
  return { ...base, shopping: buildShoppingList(base) };
}

function hydrateState(value: AppState): AppState {
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
  const manualShopping = hydrated.shopping.filter((item) => item.manuallyAdded);
  const shopping = missingLunches.length
    ? [...buildShoppingList({ ...hydrated, meals }), ...manualShopping]
    : hydrated.shopping.length ? hydrated.shopping : buildShoppingList({ ...hydrated, meals });
  return { ...hydrated, meals, shopping };
}

function subscribeToStorage(onStoreChange: () => void) {
  window.addEventListener(storageEvent, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(storageEvent, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function readStorageSnapshot() {
  return localStorage.getItem(storageKey) ?? "";
}

function subscribeToBrowserReady() {
  return () => undefined;
}

export default function HomePage() {
  const storedSnapshot = useSyncExternalStore(subscribeToStorage, readStorageSnapshot, () => "");
  const browserReady = useSyncExternalStore(subscribeToBrowserReady, () => true, () => false);
  const activeSnapshot = browserReady ? storedSnapshot : "";
  const state = useMemo(() => {
    if (!activeSnapshot) return seededState();
    try {
      return hydrateState(JSON.parse(activeSnapshot) as AppState);
    } catch {
      return seededState();
    }
  }, [activeSnapshot]);
  const [active, setActive] = useState<(typeof sections)[number][0]>("Сегодня");
  const [toast, setToast] = useState("");
  const [undo, setUndo] = useState<AppState | null>(null);
  const [command, setCommand] = useState("");
  const [manualProduct, setManualProduct] = useState("");
  const [replaceRequest, setReplaceRequest] = useState<{ meal: MealPlan; slot: MealComponent["slot"] } | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);

  const dishMap = useMemo(() => byId(state.dishes), [state.dishes]);
  const today = startOfToday().toISOString().slice(0, 10);
  const todayMeals = state.meals.filter((meal) => meal.date === today);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [active]);

  function setState(next: AppState) {
    localStorage.setItem(storageKey, JSON.stringify(next));
    window.dispatchEvent(new Event(storageEvent));
  }

  function commit(next: AppState, message: string) {
    setUndo(state);
    const withShopping = { ...next, shopping: next.shopping.length ? next.shopping : buildShoppingList(next) };
    setState(withShopping);
    setToast(message);
  }

  function regenerate(mode: Parameters<typeof generateWeek>[1] = "balanced") {
    const meals = generateWeek(state, mode);
    commit({ ...state, meals, shopping: buildShoppingList({ ...state, meals }) }, "Меню на неделю пересобрано.");
  }

  function handleQuick(label: string) {
    const result = applyQuickScenario(state, label);
    commit({ ...result.state, shopping: buildShoppingList(result.state) }, result.message);
  }

  function handleCommand(event: FormEvent) {
    event.preventDefault();
    const result = parseCommand(state, command);
    commit({ ...result.state, shopping: buildShoppingList(result.state) }, result.message);
    setCommand("");
  }

  function startCooking(meal: MealPlan) {
    const session: CookingSession = { mealId: meal.id, doneSteps: [], timerSeconds: 0, eaters: state.family.map((member) => member.id) };
    commit({ ...state, cooking: session }, `Открыт режим готовки: ${meal.title.toLowerCase()}.`);
    setActive("Кухня");
    setMoreOpen(false);
  }

  function addMealToShopping(meal: MealPlan) {
    const products = meal.components.flatMap((component) => dishMap.get(component.dishId)?.ingredients ?? []);
    const extra = products.map((ingredient, index): ShoppingItem => ({ id: `meal-${meal.id}-${index}-${Date.now()}`, product: ingredient.name, amount: ingredient.amount, unit: ingredient.unit, category: ingredient.category, checked: false, alreadyAtHome: false, manuallyAdded: true }));
    commit({ ...state, shopping: [...state.shopping, ...extra] }, "Ингредиенты приема пищи добавлены в покупки.");
  }

  function moveMeal(meal: MealPlan) {
    const date = new Date(meal.date); date.setDate(date.getDate() + 1);
    const meals = state.meals.map((item) => item.id === meal.id ? { ...item, date: date.toISOString().slice(0, 10), id: `${date.toISOString().slice(0, 10)}-${item.kind}` } : item);
    commit({ ...state, meals }, "Прием пищи перенесен на следующий день.");
  }

  function repeatMeal(meal: MealPlan) {
    const date = new Date(meal.date); date.setDate(date.getDate() + 1);
    const copy = { ...meal, id: `${date.toISOString().slice(0, 10)}-${meal.kind}-repeat`, date: date.toISOString().slice(0, 10), source: "manual" as const };
    commit({ ...state, meals: [...state.meals, copy] }, "Блюдо повторено на следующий день.");
  }

  return (
    <main className="app-bg min-h-screen bg-background pb-24 text-foreground lg:pb-0">
      <div className="mx-auto flex max-w-[1500px] gap-5 p-3 sm:p-5">
        <aside className="sticky top-5 hidden h-[calc(100vh-40px)] w-64 shrink-0 overflow-hidden rounded-[1.7rem] border border-[#DCCDB8] bg-[#FFFDF6]/95 p-4 shadow-[0_24px_70px_rgba(63,93,66,0.16)] lg:block">
          <div className="mb-6 flex items-center gap-3 rounded-2xl bg-gradient-to-br from-[#fff1c9] to-[#edf7ed] p-3 ring-1 ring-[#e4d2a6]">
            <div className="grid size-11 place-items-center rounded-xl bg-[#e4b35a] text-[#24312b] shadow-inner"><ChefHat size={24} /></div>
            <div><p className="font-bold leading-tight">Домашний диспетчер еды</p><p className="text-sm text-muted-foreground">семейный помощник</p></div>
          </div>
          <nav className="grid gap-1">
            {sections.map(([name, Icon]) => <button key={name} onClick={() => setActive(name)} className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold transition ${active === name ? "bg-[#3f7d52] text-white shadow-[0_10px_22px_rgba(63,125,82,0.24)]" : "text-[#4c5c55] hover:bg-[#fff1c9]"}`}><Icon size={18} />{name}{name === "Покупки" && state.shopping.length > 0 ? <span className="ml-auto rounded-full bg-[#e4b35a] px-2 py-0.5 text-xs text-[#24312b]">{state.shopping.length}</span> : null}</button>)}
          </nav>
        </aside>

        <section className="min-w-0 flex-1 space-y-5">
          <header className="rounded-2xl border border-[#ead7bd] bg-[#fffdf6] p-4 shadow-[0_10px_28px_rgba(129,83,43,0.08)] lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-white"><ChefHat size={21} /></div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black">Домашний диспетчер еды</p>
                  <p className="text-xs text-muted-foreground">{new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}</p>
                </div>
              </div>
              <button onClick={() => { setActive("Покупки"); setMoreOpen(false); }} className="relative grid size-11 shrink-0 place-items-center rounded-xl border border-[#ead7bd] bg-white text-[#40504A]" aria-label="Покупки">
                <ShoppingBasket size={20} />
                {state.shopping.length > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">{state.shopping.length}</span>}
              </button>
            </div>
            {active === "Сегодня" && <div className="mt-4 flex flex-wrap gap-2">{state.family.map((member) => <span key={member.id} className="rounded-full bg-[#fff0dc] px-3 py-1.5 text-xs font-bold text-[#40504A]">{member.name}</span>)}</div>}
            <details className="mt-4 rounded-xl border border-[#ead7bd] bg-white px-3 py-2">
              <summary className="cursor-pointer text-sm font-semibold text-[#40504A]">Изменить меню текстом</summary>
              <form onSubmit={handleCommand} className="mt-3 grid gap-2">
                <Input value={command} onChange={(event) => setCommand(event.target.value)} placeholder="Например: замени завтра гречку" />
                <Button type="submit">Применить</Button>
              </form>
            </details>
          </header>
          <header className="relative hidden overflow-hidden rounded-[1.8rem] border border-[#DCCDB8] bg-[#FFFDF6]/95 p-4 shadow-[0_18px_55px_rgba(63,93,66,0.13)] sm:p-6 lg:block">
            <div className="pointer-events-none absolute right-0 top-0 h-full w-72 bg-[radial-gradient(circle_at_70%_30%,rgba(228,179,90,0.28),transparent_34%),linear-gradient(135deg,transparent,#edf7ed)]" />
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-sm font-semibold text-[#4F7C5D]">Сегодня дома · {new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}</p>
                <h1 className="mt-1 text-3xl font-black tracking-normal sm:text-4xl">Что готовим, что осталось и что купить</h1>
              </div>
              <div className="flex flex-wrap gap-2">
                {state.family.map((member) => <span key={member.id} className="rounded-full border border-[#dccdb8] bg-[#fffdf6] px-3 py-2 text-sm font-semibold text-[#40504A] shadow-sm">{member.name}, {member.age}</span>)}
                <Button variant="soft" onClick={() => { setActive("Покупки"); setMoreOpen(false); }}><ShoppingBasket size={17} />Открыть покупки · {state.shopping.length}</Button>
              </div>
            </div>
            <form onSubmit={handleCommand} className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Input value={command} onChange={(event) => setCommand(event.target.value)} placeholder="Напишите, что изменить: например, замени завтра гречку на картошку" />
              <Button type="submit" size="lg">Применить</Button>
            </form>
          </header>

          {toast && <div className="flex flex-col gap-3 rounded-2xl border border-[#b9d6b8] bg-[#edf7ed] p-4 text-sm font-semibold text-[#285f3b] shadow-[0_12px_30px_rgba(63,125,82,0.10)] sm:flex-row sm:items-center sm:justify-between"><span>{toast}</span>{undo && <Button variant="outline" size="sm" onClick={() => { setState(undo); setUndo(null); setToast("Отменено. Вернули предыдущее состояние."); }}><RotateCcw size={16} />Отменить</Button>}</div>}

          {active === "Сегодня" && <TodayView state={state} meals={todayMeals} shopping={state.shopping} dishMap={dishMap} onOpenShopping={() => setActive("Покупки")} onReplace={(meal, slot) => setReplaceRequest({ meal, slot })} onRemove={(meal, slot) => commit(removeComponent(state, meal.id, slot), `Убрали ${slotLabels[slot]}.`)} onMove={moveMeal} onRepeat={repeatMeal} onShop={addMealToShopping} onBan={(dish) => commit(banDish(state, dish.id), `${dish.name}: пока не предлагаем.`)} onCook={startCooking} onQuick={handleQuick} onPlanSuggested={(dishId, date) => commit(planDishForDate(state, dishId, date), "Подобранное блюдо поставлено на ужин, покупки пересчитаны.")} />}
          {active === "Меню" && <MenuView state={state} dishMap={dishMap} regenerate={regenerate} onReplace={(meal, slot) => setReplaceRequest({ meal, slot })} onPlanMeal={(recipe, kind, date) => {
            const planned = planRecipeForMeal(state, recipe, date, kind);
            commit(planned, `${mealLabel(kind)} на ${new Date(date).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}: ${recipe.title}.`);
          }} onMoveMealToDate={(meal, date) => commit(moveMealToDate(state, meal.id, date), `${mealLabel(meal.kind)} перенесен на ${new Date(date).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}.`)} onOpenShopping={() => setActive("Покупки")} />}
          {active === "Блюда" && <DishesView state={state} setState={setState} dishMap={dishMap} onBan={(dish) => commit(banDish(state, dish.id), `${dish.name}: скрыто из предложений.`)} onRecipeToMenu={(recipe) => commit(addRecipeToNextMenu(state, recipe), `${recipe.title}: добавлено в меню на завтра.`)} onRecipeToShopping={(recipe) => commit(addRecipeToShopping(state, recipe), `${recipe.title}: ингредиенты добавлены в покупки.`)} />}
          {active === "Семья" && <FamilyView state={state} setState={setState} onRebuild={() => regenerate("balanced")} />}
          {active === "Кухня" && <KitchenView state={state} dishMap={dishMap} commit={commit} />}
          {active === "Остатки" && <LeftoversView state={state} commit={commit} />}
          {active === "Морозилка" && <FreezerView state={state} commit={commit} />}
          {active === "Запасы" && <InventoryView state={state} setState={setState} commit={commit} />}
          {active === "Покупки" && <ShoppingView state={state} setState={setState} commit={commit} manualProduct={manualProduct} setManualProduct={setManualProduct} />}
          {active === "Настройки" && <SettingsView reset={() => commit(seededState(), "Демо-данные восстановлены.")} onNavigate={(section) => setActive(section)} />}
        </section>
      </div>

      {moreOpen && <div className="fixed inset-0 z-30 bg-[#2f2a24]/30 lg:hidden" onClick={() => setMoreOpen(false)}>
        <section className="absolute inset-x-0 bottom-[72px] rounded-t-3xl border border-[#ead7bd] bg-[#fffdf6] p-4 shadow-[0_-16px_40px_rgba(47,42,36,0.15)]" onClick={(event) => event.stopPropagation()}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-black">Еще</h2>
            <button className="grid size-10 place-items-center rounded-xl bg-white" aria-label="Закрыть" onClick={() => setMoreOpen(false)}><X size={18} /></button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {mobileMoreSections.map(([name, Icon]) => <button key={name} onClick={() => { setActive(name); setMoreOpen(false); }} className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl text-xs font-bold ${active === name ? "bg-[#fff0dc] text-primary" : "bg-white text-[#40504A]"}`}><Icon size={21} /><span>{name}</span></button>)}
          </div>
        </section>
      </div>}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 gap-1 border-t border-border bg-[#FFFDF8]/98 px-2 pb-2 pt-1 backdrop-blur lg:hidden">
        {mobilePrimarySections.map(([name, Icon]) => <button key={name} onClick={() => { setActive(name); setMoreOpen(false); }} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-bold ${active === name && !moreOpen ? "text-primary" : "text-[#40504A]"}`}><Icon size={19} /><span>{name}</span></button>)}
        <button onClick={() => setMoreOpen(!moreOpen)} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-bold ${moreOpen || mobileMoreSections.some(([name]) => active === name) ? "text-primary" : "text-[#40504A]"}`}><MoreHorizontal size={19} /><span>Еще</span></button>
      </nav>
      {replaceRequest && <ReplaceDialog state={state} request={replaceRequest} onClose={() => setReplaceRequest(null)} onPick={(dishId) => { commit(replaceComponentWithDish(state, replaceRequest.meal.id, replaceRequest.slot, dishId), `Заменили ${slotLabels[replaceRequest.slot]} вручную.`); setReplaceRequest(null); }} onAuto={() => { commit(replaceComponent(state, replaceRequest.meal.id, replaceRequest.slot), `Подобрали замену для ${slotLabels[replaceRequest.slot]}.`); setReplaceRequest(null); }} />}
    </main>
  );
}

function TodayView(props: { state: AppState; meals: MealPlan[]; shopping: ShoppingItem[]; dishMap: Map<string, DishComponent>; onOpenShopping: () => void; onReplace: (meal: MealPlan, slot: MealComponent["slot"]) => void; onRemove: (meal: MealPlan, slot: MealComponent["slot"]) => void; onMove: (meal: MealPlan) => void; onRepeat: (meal: MealPlan) => void; onShop: (meal: MealPlan) => void; onBan: (dish: DishComponent) => void; onCook: (meal: MealPlan) => void; onQuick: (label: string) => void; onPlanSuggested: (dishId: string, date: string) => void; }) {
  const urgent = [
    ...props.state.inventory.filter((item) => item.urgent || (item.expiresAt && item.expiresAt <= dateAfter(2))).map((item) => `${item.product}: использовать до ${item.expiresAt ?? "скорее"}`),
    ...props.state.leftovers.filter((item) => item.useBy <= dateAfter(2)).map((item) => `${item.name}: остатки до ${item.useBy}`),
  ].slice(0, 4);
  return <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
    <div className="space-y-5">
      <details className="rounded-xl border border-[#ead7bd] bg-[#fffdf6] p-3 xl:hidden">
        <summary className="cursor-pointer text-sm font-bold text-[#40504A]">Быстро изменить меню</summary>
        <div className="mt-3 grid grid-cols-2 gap-2">{quick.map((label) => <Button key={label} variant="outline" className="justify-start px-3" onClick={() => props.onQuick(label)}>{label}</Button>)}</div>
      </details>
      <div className="hidden gap-3 xl:grid xl:grid-cols-4">{quick.map((label) => <Button key={label} variant="soft" className="justify-start" onClick={() => props.onQuick(label)}>{label}</Button>)}</div>
      <PantryAssistant state={props.state} onPlanSuggested={props.onPlanSuggested} />
      {props.meals.map((meal) => <MealCard key={meal.id} meal={meal} {...props} />)}
    </div>
    <div className="space-y-5">
      <InfoCard title="Срочно использовать" items={urgent.length ? urgent : ["Нет продуктов с близким сроком."]} tone="tip" />
      <ShoppingPreview items={props.shopping} onOpen={props.onOpenShopping} />
      <InfoCard title="Импорт по фото" items={["Черновик рецепта доступен в разделе «Блюда»", "Фото → текст будет подключено вместе с AI", "Сейчас текст можно вставить и проверить вручную"]} tone="success" />
    </div>
  </div>;
}

function PantryAssistant({ state, onPlanSuggested }: { state: AppState; onPlanSuggested: (dishId: string, date: string) => void }) {
  const tomorrow = new Date(startOfToday());
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [products, setProducts] = useState("");
  const [date, setDate] = useState(tomorrow.toISOString().slice(0, 10));
  const [minutes, setMinutes] = useState("30");
  const [budget, setBudget] = useState<"balanced" | "economy">("balanced");
  const [suggestions, setSuggestions] = useState<DishSuggestion[]>([]);

  function findSuggestions(event: FormEvent) {
    event.preventDefault();
    setSuggestions(suggestDishesFromPantry(state, products, Number(minutes), budget));
  }

  return <Card className="border-[#ffd1b3] bg-gradient-to-br from-[#fff7ea] to-[#fffdf6]">
    <CardHeader>
      <CardTitle>Что приготовить из того, что есть</CardTitle>
      <p className="text-sm text-muted-foreground">Запасы и остатки уже учитываются. Допишите продукты, которые есть дома, и выберите условия.</p>
    </CardHeader>
    <CardContent className="space-y-3">
      <form className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-[1fr_112px_135px_145px_auto]" onSubmit={findSuggestions}>
        <Input className="sm:col-span-2 2xl:col-span-1" value={products} onChange={(event) => setProducts(event.target.value)} placeholder="Например: курица, сыр, гречка" />
        <select className="min-h-11 rounded-xl border border-input bg-white px-3 text-sm font-semibold" value={minutes} onChange={(event) => setMinutes(event.target.value)}>
          <option value="30">до 30 мин</option>
          <option value="50">до 50 мин</option>
          <option value="90">время есть</option>
        </select>
        <select className="min-h-11 rounded-xl border border-input bg-white px-3 text-sm font-semibold" value={budget} onChange={(event) => setBudget(event.target.value as "balanced" | "economy")}>
          <option value="balanced">обычно</option>
          <option value="economy">экономно</option>
        </select>
        <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        <Button className="sm:col-span-2 2xl:col-span-1" type="submit"><Sparkles size={16} />Подобрать</Button>
      </form>
      {suggestions.length > 0 && <div className="grid gap-2 pt-2 md:grid-cols-2">
        {suggestions.slice(0, 4).map((suggestion) => <div key={suggestion.dish.id} className="rounded-xl border border-[#ead7bd] bg-white p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-black">{suggestion.dish.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{suggestion.reason}</p>
            </div>
            <Button size="sm" variant="soft" onClick={() => onPlanSuggested(suggestion.dish.id, date)}>В меню</Button>
          </div>
        </div>)}
      </div>}
    </CardContent>
  </Card>;
}

function DishVisual({ dish, compact = false }: { dish: DishComponent; compact?: boolean }) {
  const tone = dish.role === "main" || dish.role === "freezer_item" ? "from-[#fff0d9] via-[#fffaf2] to-[#edf7ed]" : dish.role === "soup" ? "from-[#ffe8d7] via-[#fffaf2] to-[#fff3d6]" : dish.role === "salad" || dish.role === "kids_vegetables" ? "from-[#edf7ed] via-[#fffdf6] to-[#fff3d6]" : "from-[#fff3d6] via-[#fffdf6] to-[#edf7ed]";
  const ingredients = dish.ingredients.map((item) => item.name).slice(0, compact ? 2 : 4).join(" · ");
  return <div className={`relative grid shrink-0 place-items-center overflow-hidden rounded-2xl border border-[#ead7bd] bg-gradient-to-br ${tone} p-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] ${compact ? "size-14" : "h-44 w-full"}`}>
    <div className="relative space-y-1">
      <ChefHat className={`mx-auto text-[#f47b58] ${compact ? "size-6" : "size-5"}`} />
      {!compact && <><p className="text-base font-black leading-tight text-[#263238]">{dish.name}</p><p className="text-xs font-semibold text-[#5f6b66]">{ingredients}</p></>}
    </div>
  </div>;
}

function MealCard({ meal, dishMap, onReplace, onRemove, onMove, onRepeat, onShop, onBan, onCook }: { meal: MealPlan; dishMap: Map<string, DishComponent>; onReplace: (meal: MealPlan, slot: MealComponent["slot"]) => void; onRemove: (meal: MealPlan, slot: MealComponent["slot"]) => void; onMove: (meal: MealPlan) => void; onRepeat: (meal: MealPlan) => void; onShop: (meal: MealPlan) => void; onBan: (dish: DishComponent) => void; onCook: (meal: MealPlan) => void; }) {
  const [editing, setEditing] = useState(false);
  return <Card>
    <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div><CardTitle>{mealLabel(meal.kind)} · {new Date(meal.date).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}</CardTitle><p className="hidden text-sm text-muted-foreground sm:block">{meal.notes}</p></div>
      <div className="flex gap-2"><Button onClick={() => onCook(meal)}><ChefHat size={17} />Готовлю</Button><Button variant="outline" onClick={() => setEditing(!editing)}>{editing ? "Готово" : "Изменить"}</Button></div>
    </CardHeader>
    <CardContent className="space-y-3">
      {meal.components.map((component) => {
        const dish = dishMap.get(component.dishId);
        if (!dish) return null;
        return <div key={`${meal.id}-${component.slot}`} className="rounded-2xl border border-[#e2d6c4] bg-[#fffdf6] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <DishVisual dish={dish} compact />
              <div><p className="text-xs font-bold uppercase tracking-wide text-[#5F6B66]">{slotLabels[component.slot]}</p><p className="text-lg font-black">{dish.name}</p><p className="text-sm text-muted-foreground">{dish.effort === "easy" ? "быстро" : dish.effort === "weekend" ? "лучше на выходные" : "обычно"} · {dish.cost === "low" ? "недорого" : "средняя цена"}</p></div>
            </div>
            {editing && <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => onReplace(meal, component.slot)}>Заменить</Button><Button variant="ghost" size="sm" onClick={() => onRemove(meal, component.slot)}>Убрать</Button><Button variant="ghost" size="sm" onClick={() => onBan(dish)}>Не предлагать</Button></div>}
          </div>
        </div>;
      })}
      {editing && <div className="flex flex-wrap gap-2 pt-1"><Button variant="outline" onClick={() => onMove(meal)}>Перенести</Button><Button variant="outline" onClick={() => onRepeat(meal)}>Повторить</Button><Button variant="outline" onClick={() => onShop(meal)}>В покупки</Button></div>}
    </CardContent>
  </Card>;
}

function MenuView({ state, dishMap, regenerate, onReplace, onPlanMeal, onMoveMealToDate, onOpenShopping }: { state: AppState; dishMap: Map<string, DishComponent>; regenerate: (mode?: Parameters<typeof generateWeek>[1]) => void; onReplace: (meal: MealPlan, slot: MealComponent["slot"]) => void; onPlanMeal: (recipe: RecipeEntry, kind: MealKind, date: string) => void; onMoveMealToDate: (meal: MealPlan, date: string) => void; onOpenShopping: () => void; }) {
  const todayIso = startOfToday().toISOString().slice(0, 10);
  const defaultPlanDate = new Date(startOfToday());
  defaultPlanDate.setDate(defaultPlanDate.getDate() + 1);
  const [calendarMode, setCalendarMode] = useState<"day" | "week" | "month">("week");
  const [selectedDate, setSelectedDate] = useState(defaultPlanDate.toISOString().slice(0, 10));
  const [breakfastId, setBreakfastId] = useState(state.recipes.find((recipe) => recipe.categories.includes("завтраки"))?.id ?? state.recipes[0]?.id ?? "");
  const [lunchId, setLunchId] = useState(state.recipes.find((recipe) => recipe.categories.includes("супы"))?.id ?? state.recipes[0]?.id ?? "");
  const [dinnerId, setDinnerId] = useState(state.recipes.find((recipe) => recipe.categories.includes("ужины"))?.id ?? state.recipes[0]?.id ?? "");
  const [budgetLimit, setBudgetLimit] = useState("180");
  const grouped = Object.groupBy(state.meals, (meal) => meal.date);
  const selectedDayMeals = state.meals.filter((meal) => meal.date === selectedDate);
  const breakfastRecipes = state.recipes.filter((recipe) => recipe.categories.includes("завтраки") || recipe.title.toLowerCase().includes("сырник") || recipe.title.toLowerCase().includes("каша"));
  const lunchRecipes = state.recipes.filter((recipe) => recipe.categories.includes("супы"));
  const dinnerRecipes = state.recipes.filter((recipe) => recipe.categories.includes("ужины") || recipe.categories.includes("супы") || recipe.categories.includes("мои рецепты"));
  const selectedBreakfast = state.recipes.find((recipe) => recipe.id === breakfastId) ?? breakfastRecipes[0] ?? state.recipes[0];
  const selectedLunch = state.recipes.find((recipe) => recipe.id === lunchId) ?? lunchRecipes[0] ?? state.recipes[0];
  const selectedDinner = state.recipes.find((recipe) => recipe.id === dinnerId) ?? dinnerRecipes[0] ?? state.recipes[0];
  const estimatedCost = estimatedPlanCost(state);
  const monthStart = new Date(startOfToday());
  monthStart.setDate(1);
  const monthDays = Array.from({ length: new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate() }, (_, index) => {
    const date = new Date(monthStart);
    date.setDate(index + 1);
    return date.toISOString().slice(0, 10);
  });

  function mealNames(meal: MealPlan) {
    return meal.components.map((component) => dishMap.get(component.dishId)?.name).filter(Boolean).join(", ");
  }

  return <div className="space-y-4">
    <Card className="border-[#e2bf6b] bg-gradient-to-br from-[#fffaf0] to-[#edf7ed]">
      <CardHeader className="space-y-3">
        <div>
          <CardTitle>План конкретного дня</CardTitle>
          <p className="text-sm text-muted-foreground">Выберите дату, завтрак, обед и ужин из рецептов. После клика список покупок пересчитается.</p>
        </div>
        <div className="grid gap-3 2xl:grid-cols-[150px_1fr_1fr_1fr_auto]">
          <label className="grid gap-1 text-sm font-semibold">Дата
            <Input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-semibold">Завтрак
            <select className="min-h-12 rounded-xl border border-input bg-white px-4 text-sm shadow-sm" value={selectedBreakfast?.id ?? ""} onChange={(event) => setBreakfastId(event.target.value)}>
              {breakfastRecipes.map((recipe) => <option key={recipe.id} value={recipe.id}>{recipe.title}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold">Обед
            <select className="min-h-12 rounded-xl border border-input bg-white px-4 text-sm shadow-sm" value={selectedLunch?.id ?? ""} onChange={(event) => setLunchId(event.target.value)}>
              {lunchRecipes.map((recipe) => <option key={recipe.id} value={recipe.id}>{recipe.title}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold">Ужин
            <select className="min-h-12 rounded-xl border border-input bg-white px-4 text-sm shadow-sm" value={selectedDinner?.id ?? ""} onChange={(event) => setDinnerId(event.target.value)}>
              {dinnerRecipes.map((recipe) => <option key={recipe.id} value={recipe.id}>{recipe.title}</option>)}
            </select>
          </label>
          <div className="flex flex-col justify-end gap-2 sm:flex-row 2xl:flex-col">
            <Button onClick={() => selectedBreakfast && onPlanMeal(selectedBreakfast, "breakfast", selectedDate)}>Поставить завтрак</Button>
            <Button variant="soft" onClick={() => selectedLunch && onPlanMeal(selectedLunch, "lunch", selectedDate)}>Поставить обед</Button>
            <Button variant="soft" onClick={() => selectedDinner && onPlanMeal(selectedDinner, "dinner", selectedDate)}>Поставить ужин</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          {selectedDayMeals.length ? selectedDayMeals.map((meal) => <div key={meal.id} className="rounded-2xl bg-white/85 p-3">
            <p className="font-black">{mealLabel(meal.kind)}</p>
            <p className="mt-1 text-sm text-muted-foreground">{meal.components.map((component) => dishMap.get(component.dishId)?.name).filter(Boolean).join(", ")}</p>
          </div>) : <p className="rounded-2xl bg-white/85 p-3 text-sm text-muted-foreground">На выбранный день пока ничего не запланировано. Можно поставить завтрак или ужин выше.</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onOpenShopping}><ShoppingBasket size={16} />Открыть общий список покупок</Button>
          <Button variant="ghost" onClick={() => regenerate("balanced")}>Пересобрать неделю</Button>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="space-y-3">
        <div>
          <CardTitle>Экономный план недели</CardTitle>
          <p className="text-sm text-muted-foreground">Предварительная оценка текущего меню: около {estimatedCost} BYN. Пока это уровни стоимости блюд, не цены магазинов.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="grid gap-1 text-sm font-semibold">Лимит, BYN
            <Input type="number" min={20} value={budgetLimit} onChange={(event) => setBudgetLimit(event.target.value)} />
          </label>
          <Button variant="soft" onClick={() => regenerate(Number(budgetLimit) < estimatedCost ? "cheap" : "balanced")}>Сделать меню экономнее</Button>
        </div>
      </CardHeader>
    </Card>

    <div className="flex flex-wrap gap-2"><Button onClick={() => regenerate("balanced")}>Сгенерировать неделю</Button><Button variant="soft" onClick={() => regenerate("simple")}>Будни проще</Button><Button variant="soft" onClick={() => regenerate("leftovers")}>Использовать остатки</Button><Button variant="soft" onClick={() => regenerate("freezer")}>Взять из морозилки</Button></div>

    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Календарь меню</CardTitle>
            <p className="text-sm text-muted-foreground">Как в Paprika: день, неделя и месяц. Пока без перетаскивания, но уже с обзором.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 rounded-2xl bg-[#fffaf2] p-1">
            {(["day", "week", "month"] as const).map((mode) => <button key={mode} onClick={() => setCalendarMode(mode)} className={`rounded-xl px-3 py-2 text-sm font-black ${calendarMode === mode ? "bg-[#4F7C5D] text-white shadow-sm" : "text-[#40504A] hover:bg-white"}`}>{mode === "day" ? "День" : mode === "week" ? "Неделя" : "Месяц"}</button>)}
          </div>
        </div>
        {calendarMode === "day" && <label className="grid max-w-xs gap-1 text-sm font-semibold">Дата
          <Input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
        </label>}
      </CardHeader>
      <CardContent>
        {calendarMode === "day" && <div className="space-y-3">
          <h3 className="text-xl font-black">{new Date(selectedDate).toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}</h3>
          {selectedDayMeals.length ? selectedDayMeals.map((meal) => <div key={meal.id} className="rounded-2xl bg-white p-4"><p className="font-black">{mealLabel(meal.kind)}</p>{meal.components.map((component) => <button key={component.slot} onClick={() => onReplace(meal, component.slot)} className="mt-2 block w-full rounded-xl border border-border px-3 py-2 text-left text-sm hover:bg-[#FFF3D6]"><b>{slotLabels[component.slot]}:</b> {dishMap.get(component.dishId)?.name}</button>)}</div>) : <p className="rounded-2xl bg-[#fffaf2] p-4 text-sm text-muted-foreground">На этот день меню пока не запланировано.</p>}
        </div>}

        {calendarMode === "week" && <div className="grid gap-4 xl:grid-cols-2">{Object.entries(grouped).map(([date, dayMeals]) => <Card key={date}><CardHeader><CardTitle>{new Date(date).toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}</CardTitle></CardHeader><CardContent className="space-y-3">{dayMeals?.map((meal) => <div key={meal.id} className="rounded-2xl bg-white p-4"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><p className="font-black">{mealLabel(meal.kind)}</p><Button variant="outline" size="sm" onClick={() => onMoveMealToDate(meal, selectedDate)}>Перенести на выбранную дату</Button></div>{meal.components.map((component) => <button key={component.slot} onClick={() => onReplace(meal, component.slot)} className="mt-2 block w-full rounded-xl border border-border px-3 py-2 text-left text-sm hover:bg-[#FFF3D6]"><b>{slotLabels[component.slot]}:</b> {dishMap.get(component.dishId)?.name}</button>)}</div>)}</CardContent></Card>)}</div>}

        {calendarMode === "month" && <div className="space-y-3">
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-black uppercase text-[#5F6B66]">
            {["пн", "вт", "ср", "чт", "пт", "сб", "вс"].map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-7">
            {monthDays.map((date) => {
              const meals = grouped[date] ?? [];
              return <button key={date} onClick={() => { setSelectedDate(date); setCalendarMode("day"); }} className={`min-h-32 rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-[0_12px_26px_rgba(129,83,43,0.10)] ${date === todayIso ? "border-[#4F7C5D] bg-[#edf7ed]" : "border-[#ead7bd] bg-[#fffdf6]"}`}>
                <p className="font-black">{new Date(date).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}</p>
                <div className="mt-2 space-y-1">
                  {meals.length ? meals.slice(0, 3).map((meal) => <p key={meal.id} className="line-clamp-2 rounded-lg bg-white/85 px-2 py-1 text-xs"><b>{mealLabel(meal.kind)}:</b> {mealNames(meal)}</p>) : <p className="text-xs text-muted-foreground">пусто</p>}
                </div>
              </button>;
            })}
          </div>
        </div>}
      </CardContent>
    </Card>
  </div>;
}

function DishesView({ state, setState, dishMap, onBan, onRecipeToMenu, onRecipeToShopping }: { state: AppState; setState: (state: AppState) => void; dishMap: Map<string, DishComponent>; onBan: (dish: DishComponent) => void; onRecipeToMenu: (recipe: RecipeEntry) => void; onRecipeToShopping: (recipe: RecipeEntry) => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("все");
  const [quickFilter, setQuickFilter] = useState("все");
  const [selectedId, setSelectedId] = useState(state.recipes[0]?.id ?? "");
  const [editing, setEditing] = useState(false);
  const [photoFileName, setPhotoFileName] = useState("");
  const [photoDraftText, setPhotoDraftText] = useState("");
  const categories = ["все", ...Array.from(new Set(state.recipes.flatMap((recipe) => recipe.categories))).sort((a, b) => a.localeCompare(b, "ru"))];
  const filteredRecipes = state.recipes.filter((recipe) => {
    const text = `${recipe.title} ${recipe.categories.join(" ")} ${recipe.ingredients.map((item) => item.name).join(" ")}`.toLowerCase();
    const dish = recipe.linkedDishIds?.map((id) => dishMap.get(id)).find(Boolean);
    const matchesQuick = quickFilter === "все"
      || (quickFilter === "избранное" && recipe.favorite)
      || (quickFilter === "детям" && dish?.kidsFriendly)
      || (quickFilter === "быстро" && ((recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0) <= 35))
      || (quickFilter === "черновики" && recipe.status === "draft");
    return matchesQuick && (category === "все" || recipe.categories.includes(category)) && text.includes(query.toLowerCase());
  });
  const selected = state.recipes.find((recipe) => recipe.id === selectedId) ?? filteredRecipes[0] ?? state.recipes[0];
  const selectedDish = selected?.linkedDishIds?.map((id) => dishMap.get(id)).find(Boolean);
  const grouped = Object.groupBy(state.dishes, (dish) => dish.role);

  function updateRecipe(recipeId: string, patch: Partial<RecipeEntry>) {
    setState({ ...state, recipes: state.recipes.map((recipe) => recipe.id === recipeId ? { ...recipe, ...patch } : recipe) });
  }

  function createRecipe() {
    const recipe: RecipeEntry = {
      id: `recipe-manual-${Date.now()}`,
      title: "Новый семейный рецепт",
      source: "ручной ввод",
      categories: ["мои рецепты"],
      servings: 4,
      prepMinutes: 10,
      cookMinutes: 30,
      rating: 3,
      favorite: false,
      likedBy: [],
      dislikedBy: [],
      notes: "Заполните рецепт и отметьте, кому он нравится.",
      ingredients: [{ name: "продукт", amount: 1, unit: "шт", category: "бакалея" }],
      steps: ["Описать первый шаг"],
      status: "draft",
    };
    setState({ ...state, recipes: [recipe, ...state.recipes] });
    setSelectedId(recipe.id);
    setEditing(true);
  }

  function createRecipeFromPhotoDraft() {
    const parsed = parseRecipeDraftText(photoDraftText);
    const recipe: RecipeEntry = {
      id: `recipe-photo-${Date.now()}`,
      title: parsed.title,
      source: photoFileName ? `фото: ${photoFileName}` : "фото-рецепт",
      categories: ["мои рецепты", "из фото"],
      servings: 4,
      prepMinutes: 10,
      cookMinutes: 30,
      rating: 3,
      favorite: false,
      likedBy: [],
      dislikedBy: [],
      notes: "Черновик из фото. В MVP текст вставляется вручную; позже сюда подключим OCR/AI распознавание.",
      ingredients: parsed.ingredients,
      steps: parsed.steps,
      status: "draft",
    };
    setState({ ...state, recipes: [recipe, ...state.recipes] });
    setSelectedId(recipe.id);
    setEditing(true);
    setPhotoDraftText("");
    setPhotoFileName("");
  }

  function deleteRecipe(recipeId: string) {
    if (state.recipes.length <= 1) return;
    const recipes = state.recipes.filter((recipe) => recipe.id !== recipeId);
    setState({ ...state, recipes });
    setSelectedId(recipes[0]?.id ?? "");
    setEditing(false);
  }

  function toggleMember(recipe: RecipeEntry, memberId: string, field: "likedBy" | "dislikedBy") {
    const otherField = field === "likedBy" ? "dislikedBy" : "likedBy";
    const current = new Set(recipe[field]);
    const other = new Set(recipe[otherField]);
    if (current.has(memberId)) current.delete(memberId);
    else {
      current.add(memberId);
      other.delete(memberId);
    }
    updateRecipe(recipe.id, { [field]: Array.from(current), [otherField]: Array.from(other) });
  }

  return <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
    <div className="space-y-4">
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Рецепты</CardTitle>
              <p className="text-sm text-muted-foreground">Первое ядро как в Paprika: категории, ингредиенты, шаги, рейтинг, избранное и семейные реакции.</p>
            </div>
            <Button variant="soft" onClick={createRecipe}><Plus size={16} />Новый рецепт</Button>
          </div>
          <div className="grid gap-3 rounded-2xl border border-[#ead7bd] bg-[#fffaf2] p-3 lg:grid-cols-[220px_1fr_auto] lg:items-center">
            <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#d9a441] bg-white px-4 text-center text-sm font-bold text-[#6f4b16]">
              <Camera size={24} />
              <Upload size={16} />
              {photoFileName || "Фото рецепта"}
              <input className="sr-only" type="file" accept="image/*" onChange={(event) => setPhotoFileName(event.target.files?.[0]?.name ?? "")} />
            </label>
            <Textarea className="min-h-28" value={photoDraftText} onChange={(event) => setPhotoDraftText(event.target.value)} placeholder={"Вставьте распознанный текст или надиктовку рецепта.\nНапример:\nСырники\nИнгредиенты: творог 500 г, яйцо 1 шт, мука 3 ст.л.\nШаги: смешать, сформировать, обжарить."} />
            <div className="flex flex-col gap-2">
              <Button variant="soft" onClick={createRecipeFromPhotoDraft} disabled={!photoDraftText.trim()}><Sparkles size={16} />Создать черновик</Button>
              <p className="max-w-48 text-xs text-muted-foreground">AI/OCR подключим позже: сейчас это безопасный черновик без отправки фото наружу.</p>
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-[1fr_180px]">
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти рецепт: сырники, курица, суп, салат" />
            <select className="min-h-11 rounded-xl border border-input bg-white px-4 text-sm font-semibold shadow-sm" value={category} onChange={(event) => setCategory(event.target.value)}>
              {categories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            {["все", "избранное", "детям", "быстро", "черновики"].map((item) => <Button key={item} type="button" variant={quickFilter === item ? "soft" : "outline"} size="sm" onClick={() => setQuickFilter(item)}>{item}</Button>)}
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {filteredRecipes.map((recipe) => {
          const dish = recipe.linkedDishIds?.map((id) => dishMap.get(id)).find(Boolean);
          const likedNames = state.family.filter((member) => recipe.likedBy.includes(member.id)).map((member) => member.name);
          return <button key={recipe.id} onClick={() => setSelectedId(recipe.id)} className={`rounded-2xl border bg-[#fffdf6] p-4 text-left shadow-[0_12px_30px_rgba(129,83,43,0.08)] transition hover:-translate-y-0.5 ${selected?.id === recipe.id ? "border-[#4F7C5D] ring-2 ring-[#cfe6d3]" : "border-[#e2d6c4]"}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase text-[#4F7C5D]">{recipe.categories.slice(0, 2).join(" · ")}</p>
                <h3 className="mt-1 text-lg font-black">{recipe.title}</h3>
              </div>
              <span className="flex items-center gap-1 rounded-full bg-[#fff1c9] px-2 py-1 text-sm font-black text-[#6f4b16]"><Star size={14} />{recipe.rating}</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{recipe.servings} порции · {recipe.prepMinutes ?? 0}+{recipe.cookMinutes ?? 0} мин · {dish?.kidsFriendly ? "детям ок" : "лучше взрослым"}</p>
            <p className="mt-3 line-clamp-2 text-sm text-[#40504A]">{recipe.ingredients.map((item) => item.name).slice(0, 5).join(", ")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {recipe.favorite && <span className="rounded-full bg-[#edf7ed] px-2 py-1 text-xs font-bold text-[#285f3b]">избранное</span>}
              {likedNames.slice(0, 2).map((name) => <span key={name} className="rounded-full border border-[#ead7bd] bg-white px-2 py-1 text-xs font-bold text-[#40504A]">{name} любит</span>)}
            </div>
          </button>;
        })}
      </div>

      <details className="rounded-2xl border border-[#e2d6c4] bg-[#fffdf6] p-4">
        <summary className="cursor-pointer font-black">Компоненты меню: старый список блюд</summary>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {Object.entries(grouped).map(([role, items]) => <Card key={role}><CardHeader><CardTitle>{role} · {items?.length ?? 0}</CardTitle></CardHeader><CardContent className="grid gap-2">{items?.map((dish) => <div key={dish.id} className="flex items-center justify-between gap-3 rounded-xl bg-white p-3"><span className="font-semibold">{dish.name}</span><Button variant="ghost" size="sm" onClick={() => onBan(dish)}>Не предлагать</Button></div>)}</CardContent></Card>)}
        </div>
      </details>
    </div>

    {selected && <Card className="xl:sticky xl:top-5 xl:self-start">
      <CardHeader className="space-y-3">
        {selectedDish && <DishVisual dish={selectedDish} />}
        <div>
          <div className="flex items-start justify-between gap-3">
            <CardTitle>{selected.title}</CardTitle>
            <Button variant={selected.favorite ? "soft" : "outline"} size="sm" onClick={() => updateRecipe(selected.id, { favorite: !selected.favorite })}><Heart size={15} />{selected.favorite ? "Любимое" : "В любимые"}</Button>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{selected.source ?? "семейная база"} · {selected.categories.join(", ")}</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div className="rounded-xl bg-[#fff1c9] p-2"><b>{selected.servings}</b><br />порции</div>
          <div className="rounded-xl bg-[#edf7ed] p-2"><b>{(selected.prepMinutes ?? 0) + (selected.cookMinutes ?? 0)}</b><br />мин</div>
          <div className="rounded-xl bg-white p-2"><b>{selected.rating}/5</b><br />рейтинг</div>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <Button onClick={() => onRecipeToMenu(selected)}><Plus size={16} />В меню</Button>
          <Button variant="outline" onClick={() => onRecipeToShopping(selected)}><ShoppingBasket size={16} />В покупки</Button>
          <Button variant="soft" onClick={() => setEditing(!editing)}>{editing ? "Готово" : "Править"}</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {editing && <section className="space-y-3 rounded-2xl border border-[#ead7bd] bg-[#fffaf2] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-black">Редактор рецепта</h3>
              <p className="text-sm text-muted-foreground">Формат ингредиента: название | количество | единица | категория.</p>
            </div>
            <Button variant="danger" size="sm" onClick={() => deleteRecipe(selected.id)} disabled={state.recipes.length <= 1}>Удалить</Button>
          </div>
          <label className="grid gap-1 text-sm font-semibold">Название
            <Input value={selected.title} onChange={(event) => updateRecipe(selected.id, { title: event.target.value })} />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="grid gap-1 text-sm font-semibold">Порции
              <Input type="number" min={1} value={selected.servings} onChange={(event) => updateRecipe(selected.id, { servings: Number(event.target.value) || 1 })} />
            </label>
            <label className="grid gap-1 text-sm font-semibold">Подготовка, мин
              <Input type="number" min={0} value={selected.prepMinutes ?? 0} onChange={(event) => updateRecipe(selected.id, { prepMinutes: Number(event.target.value) || 0 })} />
            </label>
            <label className="grid gap-1 text-sm font-semibold">Готовка, мин
              <Input type="number" min={0} value={selected.cookMinutes ?? 0} onChange={(event) => updateRecipe(selected.id, { cookMinutes: Number(event.target.value) || 0 })} />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_110px]">
            <label className="grid gap-1 text-sm font-semibold">Категории
              <Input value={listToText(selected.categories)} onChange={(event) => updateRecipe(selected.id, { categories: textToList(event.target.value) })} placeholder="завтраки, будни, детям" />
            </label>
            <label className="grid gap-1 text-sm font-semibold">Рейтинг
              <Input type="number" min={1} max={5} value={selected.rating} onChange={(event) => updateRecipe(selected.id, { rating: Math.min(5, Math.max(1, Number(event.target.value) || 1)) })} />
            </label>
          </div>
          <label className="grid gap-1 text-sm font-semibold">Источник или ссылка
            <Input value={selected.url ?? selected.source ?? ""} onChange={(event) => updateRecipe(selected.id, { url: event.target.value, source: event.target.value ? "ссылка/заметка" : "ручной ввод" })} placeholder="ссылка на рецепт или семейная заметка" />
          </label>
          <label className="grid gap-1 text-sm font-semibold">Ингредиенты
            <Textarea className="min-h-36 font-mono text-xs" value={ingredientsToText(selected.ingredients)} onChange={(event) => updateRecipe(selected.id, { ingredients: textToIngredients(event.target.value) })} />
          </label>
          <label className="grid gap-1 text-sm font-semibold">Шаги
            <Textarea className="min-h-32" value={selected.steps.join("\n")} onChange={(event) => updateRecipe(selected.id, { steps: event.target.value.split("\n").map((step) => step.trim()).filter(Boolean) })} />
          </label>
          <label className="grid gap-1 text-sm font-semibold">Заметки
            <Textarea value={selected.notes ?? ""} onChange={(event) => updateRecipe(selected.id, { notes: event.target.value })} placeholder="Например: детям без лука, подавать со сметаной, хорошо идет на выходных." />
          </label>
        </section>}
        <section>
          <h3 className="font-black">Кто любит</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {state.family.map((member) => <button key={member.id} onClick={() => toggleMember(selected, member.id, "likedBy")} className={`rounded-full border px-3 py-2 text-sm font-bold ${selected.likedBy.includes(member.id) ? "border-[#4F7C5D] bg-[#edf7ed] text-[#285f3b]" : "border-[#e2d6c4] bg-white text-[#40504A]"}`}>{member.name}</button>)}
          </div>
        </section>
        <section>
          <h3 className="font-black">Кому не зашло</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {state.family.map((member) => <button key={member.id} onClick={() => toggleMember(selected, member.id, "dislikedBy")} className={`rounded-full border px-3 py-2 text-sm font-bold ${selected.dislikedBy.includes(member.id) ? "border-[#c56a4a] bg-[#fff1c9] text-[#9b4329]" : "border-[#e2d6c4] bg-white text-[#40504A]"}`}>{member.name}</button>)}
          </div>
        </section>
        <section>
          <h3 className="font-black">Ингредиенты</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {selected.ingredients.map((item) => <li key={`${selected.id}-${item.name}`} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2"><span className="font-semibold">{item.name}</span><span className="text-muted-foreground">{item.amount} {item.unit}</span></li>)}
          </ul>
        </section>
        <section>
          <h3 className="font-black">Шаги</h3>
          <ol className="mt-2 space-y-2 text-sm">
            {selected.steps.map((step, index) => <li key={`${selected.id}-${step}`} className="rounded-xl border border-[#ead7bd] bg-[#fffdf6] p-3"><b>{index + 1}.</b> {step}</li>)}
          </ol>
        </section>
        {selected.notes && <p className="rounded-xl bg-[#FFF3D6] p-3 text-sm">{selected.notes}</p>}
      </CardContent>
    </Card>}
  </div>;
}

const listToText = (items?: string[]) => items?.join(", ") ?? "";
const textToList = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);
const knownCategories: ShoppingCategory[] = ["овощи и фрукты", "мясо и птица", "рыба", "молочные", "хлеб", "крупы и макароны", "бакалея", "заморозка", "специи", "сладкое", "бытовое"];

function ingredientsToText(items: IngredientNeed[]) {
  return items.map((item) => `${item.name} | ${item.amount} | ${item.unit} | ${item.category}`).join("\n");
}

function textToIngredients(value: string): IngredientNeed[] {
  return value.split("\n").map((line) => {
    const [name = "", amount = "1", unit = "шт", category = "бакалея"] = line.split("|").map((item) => item.trim());
    const safeCategory = knownCategories.includes(category as ShoppingCategory) ? category as ShoppingCategory : "бакалея";
    return { name, amount: Number(amount.replace(",", ".")) || 1, unit: unit || "шт", category: safeCategory };
  }).filter((item) => item.name);
}

function categoryForIngredient(name: string): ShoppingCategory {
  const lower = name.toLowerCase();
  if (["огур", "помид", "карто", "морков", "лук", "яблок", "банан", "зелень"].some((word) => lower.includes(word))) return "овощи и фрукты";
  if (["кур", "фарш", "говяд", "свин", "мяс"].some((word) => lower.includes(word))) return "мясо и птица";
  if (["рыб", "лосось", "хек"].some((word) => lower.includes(word))) return "рыба";
  if (["молоко", "сыр", "творог", "сметан", "йогурт", "яйц"].some((word) => lower.includes(word))) return "молочные";
  if (["хлеб", "батон", "лаваш"].some((word) => lower.includes(word))) return "хлеб";
  if (["рис", "греч", "макарон", "пшено", "овсян"].some((word) => lower.includes(word))) return "крупы и макароны";
  if (["ягод", "заморож"].some((word) => lower.includes(word))) return "заморозка";
  if (["соль", "перец", "паприк", "укроп", "приправа"].some((word) => lower.includes(word))) return "специи";
  if (["сахар", "мед", "варенье", "какао", "шоколад"].some((word) => lower.includes(word))) return "сладкое";
  return "бакалея";
}

function ingredientFromPlainText(value: string): IngredientNeed {
  const amountMatch = value.match(/(\d+(?:[,.]\d+)?)\s*(кг|г|л|мл|шт|ст\.?\s*л\.?|ч\.?\s*л\.?|пач|банка|банки)?/i);
  const amount = amountMatch ? Number(amountMatch[1].replace(",", ".")) || 1 : 1;
  const unit = amountMatch?.[2]?.replace(/\s+/g, " ") ?? "шт";
  const name = value.replace(amountMatch?.[0] ?? "", "").replace(/^[-•\s,.:]+/, "").trim() || value.trim();
  return { name, amount, unit, category: categoryForIngredient(name) };
}

function parseRecipeDraftText(value: string): Pick<RecipeEntry, "title" | "ingredients" | "steps"> {
  const lines = value.split("\n").map((line) => line.trim()).filter(Boolean);
  const title = lines[0]?.replace(/^название[:\s-]*/i, "") || "Рецепт из фото";
  const ingredientLines: string[] = [];
  const stepLines: string[] = [];
  let mode: "ingredients" | "steps" | "none" = "none";

  lines.slice(1).forEach((line) => {
    const lower = line.toLowerCase();
    if (lower.startsWith("ингредиент")) {
      mode = "ingredients";
      const rest = line.replace(/^ингредиенты?[:\s-]*/i, "");
      if (rest) ingredientLines.push(...rest.split(/[,;]/).map((item) => item.trim()).filter(Boolean));
      return;
    }
    if (lower.startsWith("шаг") || lower.startsWith("приготов")) {
      mode = "steps";
      const rest = line.replace(/^(шаги|приготовление)[:\s-]*/i, "");
      if (rest) stepLines.push(...rest.split(/;\s*/).map((item) => item.trim()).filter(Boolean));
      return;
    }
    if (mode === "ingredients") ingredientLines.push(...line.split(/[,;]/).map((item) => item.trim()).filter(Boolean));
    else if (mode === "steps") stepLines.push(line.replace(/^\d+[).]\s*/, ""));
  });

  return {
    title,
    ingredients: ingredientLines.length ? ingredientLines.map(ingredientFromPlainText) : [{ name: "продукт", amount: 1, unit: "шт", category: "бакалея" }],
    steps: stepLines.length ? stepLines : ["Проверить текст с фото", "Уточнить ингредиенты", "Описать приготовление"],
  };
}

function FamilyView({ state, setState, onRebuild }: { state: AppState; setState: (state: AppState) => void; onRebuild: () => void }) {
  function updateMember(memberId: string, patch: Partial<FamilyMember>) {
    setState({ ...state, family: state.family.map((member) => member.id === memberId ? { ...member, ...patch } : member) });
  }

  function addMember() {
    const nextIndex = state.family.length + 1;
    const member: FamilyMember = {
      id: `family-${Date.now()}`,
      name: `Участник ${nextIndex}`,
      age: 18,
      role: "adult",
      dislikes: [],
      likes: [],
      favoriteDishes: [],
      restrictions: [],
      notes: "",
    };
    setState({ ...state, family: [...state.family, member] });
  }

  function removeMember(memberId: string) {
    if (state.family.length <= 1) return;
    setState({ ...state, family: state.family.filter((member) => member.id !== memberId) });
  }

  return <div className="space-y-4">
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Профили семьи</CardTitle>
          <p className="text-sm text-muted-foreground">Личные данные, вкусы и ограничения сохраняются в этом браузере автоматически.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onRebuild}>Пересобрать меню по профилям</Button>
          <Button variant="soft" onClick={addMember}>Добавить участника</Button>
        </div>
      </CardHeader>
    </Card>
    <div className="grid gap-4 xl:grid-cols-2">
      {state.family.map((member) => <Card key={member.id}>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>{member.name || "Без имени"}</CardTitle>
            <p className="text-sm text-muted-foreground">{member.age || 0} лет · {member.role === "adult" ? "взрослый" : member.role === "teen" ? "подросток" : "ребенок"}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => removeMember(member.id)} disabled={state.family.length <= 1}>Удалить</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_110px]">
            <label className="grid gap-1 text-sm font-semibold">Имя<Input value={member.name} onChange={(event) => updateMember(member.id, { name: event.target.value })} /></label>
            <label className="grid gap-1 text-sm font-semibold">Возраст<Input type="number" min={0} max={120} value={member.age} onChange={(event) => updateMember(member.id, { age: Number(event.target.value) || 0 })} /></label>
          </div>
          <label className="grid gap-1 text-sm font-semibold">Роль
            <select className="min-h-11 rounded-xl border border-input bg-white px-4 text-sm shadow-sm" value={member.role} onChange={(event) => updateMember(member.id, { role: event.target.value as FamilyMember["role"] })}>
              <option value="adult">Взрослый</option>
              <option value="teen">Подросток</option>
              <option value="child">Ребенок</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold">Любит есть
            <Input value={listToText(member.likes)} onChange={(event) => updateMember(member.id, { likes: textToList(event.target.value) })} placeholder="сырники, курица, овощи" />
          </label>
          <label className="grid gap-1 text-sm font-semibold">Любимые блюда
            <Input value={listToText(member.favoriteDishes)} onChange={(event) => updateMember(member.id, { favoriteDishes: textToList(event.target.value) })} placeholder="драники, плов, борщ" />
          </label>
          <label className="grid gap-1 text-sm font-semibold">Не любит
            <Input value={listToText(member.dislikes)} onChange={(event) => updateMember(member.id, { dislikes: textToList(event.target.value) })} placeholder="лук, рыба, сложные салаты" />
          </label>
          <label className="grid gap-1 text-sm font-semibold">Ограничения
            <Input value={listToText(member.restrictions)} onChange={(event) => updateMember(member.id, { restrictions: textToList(event.target.value) })} placeholder="без острого, меньше сахара, аллергия" />
          </label>
          <label className="grid gap-1 text-sm font-semibold">Заметки
            <Textarea value={member.notes ?? ""} onChange={(event) => updateMember(member.id, { notes: event.target.value })} placeholder="Например: на завтрак лучше без сладкого, овощи отдельно, суп ест только куриный." />
          </label>
        </CardContent>
      </Card>)}
    </div>
  </div>;
}

const leftoverAmounts: Leftover["amount"][] = ["мало", "на 1 порцию", "на 2 порции", "много"];

function dateAfter(days: number) {
  const date = new Date(startOfToday());
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function KitchenView({ state, dishMap, commit }: { state: AppState; dishMap: Map<string, DishComponent>; commit: (next: AppState, message: string) => void }) {
  const session = state.cooking;
  const meal = session ? state.meals.find((item) => item.id === session.mealId) : undefined;
  const dishes = meal?.components.map((component) => dishMap.get(component.dishId)).filter(Boolean) as DishComponent[] | undefined;
  const [amount, setAmount] = useState<Leftover["amount"]>("на 1 порцию");
  const [destination, setDestination] = useState<MealFeedback["storedAs"]>("fridge");
  const [note, setNote] = useState("");
  const feedback = state.feedback.slice(0, 3);

  function updateSession(patch: Partial<CookingSession>, message: string) {
    if (!session) return;
    commit({ ...state, cooking: { ...session, ...patch } }, message);
  }

  function finishCooking() {
    if (!session || !meal || !dishes) return;
    const preparedName = dishes.map((dish) => dish.name).join(" + ");
    const feedbackId = `feedback-${meal.id}-${state.feedback.length + 1}`;
    const result: MealFeedback = {
      id: feedbackId,
      mealId: meal.id,
      mealDate: meal.date,
      eaterIds: session.eaters,
      liked: session.liked ?? "mixed",
      leftoversNote: note.trim() || undefined,
      storedAs: destination,
    };
    const next: AppState = { ...state, feedback: [result, ...state.feedback], cooking: undefined };

    if (destination === "fridge") {
      const leftover: Leftover = {
        id: `left-${feedbackId}`,
        name: preparedName,
        amount,
        cookedAt: meal.date,
        useBy: dateAfter(2),
        transformInto: ["Разогреть на обед", "Добавить к гарниру"],
      };
      next.leftovers = [leftover, ...next.leftovers];
    }
    if (destination === "freezer") {
      const frozen: FreezerItem = {
        id: `fr-${feedbackId}`,
        name: preparedName,
        amount,
        frozenAt: meal.date,
        useBy: dateAfter(30),
        serveWith: ["Разогреть для быстрого ужина"],
      };
      next.freezer = [frozen, ...next.freezer];
    }
    commit(next, destination === "none" ? "Готовку завершили, отзыв сохранен." : "Готовку завершили, остатки сохранены.");
  }

  if (!session || !meal) {
    return <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
      <Card><CardHeader><CardTitle>Готовлю сейчас</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">Откройте прием пищи на экране “Сегодня” и нажмите “Готовлю сейчас”.</p></CardContent></Card>
      <CookingHistory feedback={feedback} family={state.family} />
    </div>;
  }

  return <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
    <Card>
      <CardHeader><CardTitle>Готовлю сейчас</CardTitle><p className="text-sm text-muted-foreground">Ингредиенты, шаги, отметки и итог после готовки.</p></CardHeader>
      <CardContent className="space-y-4">
        {dishes?.map((dish) => <div key={dish.id} className="rounded-2xl bg-white p-4">
          <h3 className="font-black">{dish.name}</h3>
          <p className="mt-2 text-sm text-muted-foreground">Ингредиенты: {dish.ingredients.map((item) => `${item.name} ${item.amount} ${item.unit}`).join(", ")}</p>
          {dish.steps?.map((step, index) => <label key={step} className="mt-3 flex items-center gap-3 rounded-xl border border-border p-3"><input type="checkbox" checked={session.doneSteps.includes(index)} onChange={() => updateSession({ doneSteps: session.doneSteps.includes(index) ? session.doneSteps.filter((item) => item !== index) : [...session.doneSteps, index] }, "Шаг обновлен.")} />{step}</label>)}
        </div>)}
      </CardContent>
    </Card>
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>После готовки</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <section>
            <p className="mb-2 text-sm font-bold">Кто ел</p>
            <div className="flex flex-wrap gap-2">{state.family.map((member) => <Button key={member.id} variant={session.eaters.includes(member.id) ? "soft" : "outline"} size="sm" onClick={() => updateSession({ eaters: session.eaters.includes(member.id) ? session.eaters.filter((id) => id !== member.id) : [...session.eaters, member.id] }, "Участники приема пищи обновлены.")}>{member.name}</Button>)}</div>
          </section>
          <section>
            <p className="mb-2 text-sm font-bold">Понравилось?</p>
            <div className="grid grid-cols-3 gap-2">
              {([["yes", "Да"], ["mixed", "Нормально"], ["no", "Нет"]] as const).map(([value, label]) => <Button key={value} variant={session.liked === value ? "soft" : "outline"} size="sm" onClick={() => updateSession({ liked: value }, "Оценка блюда сохранена.")}>{label}</Button>)}
            </div>
          </section>
          <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Что запомнить: дети не ели лук, в следующий раз меньше соли..." />
          <div className="grid gap-2 sm:grid-cols-2">
            <select className="min-h-11 rounded-xl border border-input bg-white px-3 text-sm font-semibold" value={amount} onChange={(event) => setAmount(event.target.value as Leftover["amount"])}>
              {leftoverAmounts.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select className="min-h-11 rounded-xl border border-input bg-white px-3 text-sm font-semibold" value={destination} onChange={(event) => setDestination(event.target.value as MealFeedback["storedAs"])}>
              <option value="fridge">В холодильник</option>
              <option value="freezer">В морозилку</option>
              <option value="none">Ничего не осталось</option>
            </select>
          </div>
          <Button className="w-full" onClick={finishCooking}>Завершить готовку</Button>
        </CardContent>
      </Card>
      <CookingHistory feedback={feedback} family={state.family} />
    </div>
  </div>;
}

function CookingHistory({ feedback, family }: { feedback: MealFeedback[]; family: FamilyMember[] }) {
  return <Card>
    <CardHeader><CardTitle>Последние отзывы</CardTitle></CardHeader>
    <CardContent className="space-y-2">
      {feedback.length === 0 && <p className="text-sm text-muted-foreground">После первой готовки здесь появится история.</p>}
      {feedback.map((item) => <div key={item.id} className="rounded-xl border border-border bg-white p-3 text-sm">
        <p className="font-bold">{item.mealDate} · {item.liked === "yes" ? "понравилось" : item.liked === "no" ? "не зашло" : "нормально"}</p>
        <p className="text-muted-foreground">{family.filter((member) => item.eaterIds.includes(member.id)).map((member) => member.name).join(", ") || "Не указано, кто ел"}</p>
      </div>)}
    </CardContent>
  </Card>;
}

function LeftoversView({ state, commit }: { state: AppState; commit: (next: AppState, message: string) => void }) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState<Leftover["amount"]>("на 1 порцию");
  const [useBy, setUseBy] = useState(dateAfter(2));
  const [ideas, setIdeas] = useState("Разогреть на обед");

  function addLeftover(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    const leftover: Leftover = { id: `left-manual-${Date.now()}`, name: name.trim(), amount, cookedAt: dateAfter(0), useBy, transformInto: textToList(ideas) };
    commit({ ...state, leftovers: [leftover, ...state.leftovers] }, `${leftover.name}: добавили в остатки.`);
    setName("");
  }

  function moveToFreezer(item: Leftover) {
    const frozen: FreezerItem = { id: `fr-from-${item.id}`, name: item.name, amount: item.amount, frozenAt: dateAfter(0), useBy: dateAfter(30), serveWith: item.transformInto };
    commit({ ...state, leftovers: state.leftovers.filter((entry) => entry.id !== item.id), freezer: [frozen, ...state.freezer] }, `${item.name}: убрали в морозилку.`);
  }

  return <div className="space-y-4">
    <Card><CardHeader><CardTitle>Остатки в холодильнике</CardTitle></CardHeader><CardContent>
      <form className="grid gap-2 lg:grid-cols-[1fr_150px_170px_1fr_auto]" onSubmit={addLeftover}>
        <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Что осталось" />
        <select className="min-h-11 rounded-xl border border-input bg-white px-3 text-sm font-semibold" value={amount} onChange={(event) => setAmount(event.target.value as Leftover["amount"])}>
          {leftoverAmounts.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <Input type="date" value={useBy} onChange={(event) => setUseBy(event.target.value)} />
        <Input value={ideas} onChange={(event) => setIdeas(event.target.value)} placeholder="Во что превратить" />
        <Button type="submit">Добавить</Button>
      </form>
    </CardContent></Card>
    <div className="grid gap-4 md:grid-cols-2">
      {state.leftovers.map((item) => <Card key={item.id}><CardHeader><CardTitle>{item.name}</CardTitle></CardHeader><CardContent className="space-y-3">
        <p className="font-bold">{item.amount}</p>
        <p className="text-sm text-muted-foreground">Готовили {item.cookedAt}, использовать до {item.useBy}</p>
        <p className="rounded-xl bg-[#FFF3D6] p-3 text-sm">Во что превратить: {item.transformInto.join(", ") || "решить позже"}</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="soft" size="sm" onClick={() => moveToFreezer(item)}>В морозилку</Button>
          <Button variant="danger" size="sm" onClick={() => commit({ ...state, leftovers: state.leftovers.filter((entry) => entry.id !== item.id) }, `${item.name}: использовали.`)}>Использовали</Button>
        </div>
      </CardContent></Card>)}
    </div>
  </div>;
}

function FreezerView({ state, commit }: { state: AppState; commit: (next: AppState, message: string) => void }) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("1 порция");
  const [useBy, setUseBy] = useState(dateAfter(30));
  const [serveWith, setServeWith] = useState("Разогреть на ужин");

  function addFrozen(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    const frozen: FreezerItem = { id: `fr-manual-${Date.now()}`, name: name.trim(), amount: amount.trim() || "1 порция", frozenAt: dateAfter(0), useBy, serveWith: textToList(serveWith) };
    commit({ ...state, freezer: [frozen, ...state.freezer] }, `${frozen.name}: добавили в морозилку.`);
    setName("");
  }

  function thaw(item: FreezerItem) {
    const leftover: Leftover = { id: `left-from-${item.id}`, name: item.name, amount: "на 1 порцию", cookedAt: dateAfter(0), useBy: dateAfter(1), transformInto: item.serveWith };
    commit({ ...state, freezer: state.freezer.filter((entry) => entry.id !== item.id), leftovers: [leftover, ...state.leftovers] }, `${item.name}: достали размораживаться.`);
  }

  return <div className="space-y-4">
    <Card><CardHeader><CardTitle>Морозилка</CardTitle></CardHeader><CardContent>
      <form className="grid gap-2 lg:grid-cols-[1fr_120px_170px_1fr_auto]" onSubmit={addFrozen}>
        <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Что заморозили" />
        <Input value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Количество" />
        <Input type="date" value={useBy} onChange={(event) => setUseBy(event.target.value)} />
        <Input value={serveWith} onChange={(event) => setServeWith(event.target.value)} placeholder="Как использовать" />
        <Button type="submit">Добавить</Button>
      </form>
    </CardContent></Card>
    <div className="grid gap-4 md:grid-cols-2">
      {state.freezer.map((item) => <Card key={item.id}><CardHeader><CardTitle>{item.name}</CardTitle></CardHeader><CardContent className="space-y-3">
        <p className="font-bold">{item.amount}</p>
        <p className="text-sm text-muted-foreground">Заморожено {item.frozenAt}, использовать до {item.useBy}</p>
        <p className="rounded-xl bg-[#EAF4EC] p-3 text-sm">Подать с: {item.serveWith.join(", ") || "решить позже"}</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="soft" size="sm" onClick={() => thaw(item)}>Разморозить</Button>
          <Button variant="danger" size="sm" onClick={() => commit({ ...state, freezer: state.freezer.filter((entry) => entry.id !== item.id) }, `${item.name}: убрали из морозилки.`)}>Удалить</Button>
        </div>
      </CardContent></Card>)}
    </div>
  </div>;
}
function InventoryView({ state, setState, commit }: { state: AppState; setState: (state: AppState) => void; commit: (next: AppState, message: string) => void }) {
  const [product, setProduct] = useState("");
  const [amount, setAmount] = useState("1");
  const [unit, setUnit] = useState("шт");
  const [category, setCategory] = useState<ShoppingCategory>("бакалея");
  const [place, setPlace] = useState<StoragePlace>("fridge");
  const [expiresAt, setExpiresAt] = useState("");
  const placeLabel: Record<StoragePlace, string> = { fridge: "холодильник", freezer: "морозилка", pantry: "шкаф" };
  const update = (item: InventoryItem, patch: Partial<InventoryItem>) => setState({ ...state, inventory: state.inventory.map((entry) => entry.id === item.id ? { ...entry, ...patch } : entry) });
  const addInventory = (event: FormEvent) => {
    event.preventDefault();
    const cleanProduct = product.trim();
    if (!cleanProduct) return;
    const numericAmount = Math.max(0.1, Number(amount.replace(",", ".")) || 1);
    const nextItem: InventoryItem = { id: `inv-manual-${Date.now()}`, product: cleanProduct, amount: numericAmount, unit: unit.trim() || "шт", category, place, expiresAt: expiresAt || undefined, urgent: Boolean(expiresAt && expiresAt <= dateAfter(2)), source: "manual" };
    commit({ ...state, inventory: [nextItem, ...state.inventory] }, `${cleanProduct}: добавили в запасы.`);
    setProduct("");
    setAmount("1");
    setExpiresAt("");
  };

  return <div className="space-y-4">
    <Card>
      <CardHeader><CardTitle>Холодильник и запасы</CardTitle></CardHeader>
      <CardContent>
        <form className="grid gap-2 md:grid-cols-[minmax(160px,1fr)_76px_76px_145px_130px_155px_auto]" onSubmit={addInventory}>
          <Input value={product} onChange={(event) => setProduct(event.target.value)} placeholder="Продукт: молоко, яйца, рис" />
          <Input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder="Кол-во" />
          <Input value={unit} onChange={(event) => setUnit(event.target.value)} placeholder="ед." />
          <select className="min-h-11 rounded-xl border border-input bg-white px-3 text-sm font-semibold shadow-sm" value={category} onChange={(event) => setCategory(event.target.value as ShoppingCategory)}>
            {knownCategories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select className="min-h-11 rounded-xl border border-input bg-white px-3 text-sm font-semibold shadow-sm" value={place} onChange={(event) => setPlace(event.target.value as StoragePlace)}>
            {Object.entries(placeLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <Input type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} aria-label="Годен до" />
          <Button type="submit">Добавить</Button>
        </form>
      </CardContent>
    </Card>

    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {state.inventory.map((item) => {
        const urgent = item.urgent || Boolean(item.expiresAt && item.expiresAt <= dateAfter(2));
        return <Card key={item.id}>
        <CardHeader><CardTitle>{item.product}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-lg font-black">{item.amount} {item.unit}</p>
          <p className="text-sm text-muted-foreground">{item.category} · {placeLabel[item.place]}</p>
          <label className="grid gap-1 text-xs font-bold text-muted-foreground">Годен до
            <Input type="date" value={item.expiresAt ?? ""} onChange={(event) => update(item, { expiresAt: event.target.value || undefined, urgent: Boolean(event.target.value && event.target.value <= dateAfter(2)) })} />
          </label>
          {urgent && <p className="rounded-xl bg-[#FFF3D6] p-3 text-sm font-semibold">Использовать срочно</p>}
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={() => update(item, { amount: Math.max(0.1, Number((item.amount - 1).toFixed(1))) })}>Меньше</Button>
            <Button variant="ghost" size="sm" onClick={() => update(item, { amount: Number((item.amount + 1).toFixed(1)) })}>Больше</Button>
            <Button variant="outline" size="sm" onClick={() => update(item, { urgent: !item.urgent })}>{item.urgent ? "Не срочно" : "Срочно"}</Button>
            <Button variant="danger" size="sm" onClick={() => setState({ ...state, inventory: state.inventory.filter((entry) => entry.id !== item.id) })}>Удалить</Button>
          </div>
        </CardContent>
      </Card>;
      })}
    </div>
  </div>;
}

function ShoppingView({ state, setState, commit, manualProduct, setManualProduct }: { state: AppState; setState: (state: AppState) => void; commit: (next: AppState, message: string) => void; manualProduct: string; setManualProduct: (value: string) => void }) {
  const grouped = Object.groupBy(state.shopping, (item) => item.category);
  const checkedCount = state.shopping.filter((item) => item.checked && !item.alreadyAtHome).length;
  const update = (item: ShoppingItem, patch: Partial<ShoppingItem>) => setState({ ...state, shopping: state.shopping.map((entry) => entry.id === item.id ? { ...entry, ...patch } : entry) });
  function rebuildFor(meals: MealPlan[], label: string) {
    const manual = state.shopping.filter((item) => item.manuallyAdded);
    commit({ ...state, shopping: [...buildShoppingList({ ...state, meals }), ...manual] }, `Список покупок пересчитан: ${label}.`);
  }
  const today = startOfToday().toISOString().slice(0, 10);
  const weekEnd = new Date(startOfToday());
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekEndIso = weekEnd.toISOString().slice(0, 10);
  return <div className="space-y-4"><Card><CardHeader className="space-y-3"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle>Общий список покупок</CardTitle><p className="text-sm text-muted-foreground">Как в Plan to Eat: создайте список из выбранного периода меню, а купленное перенесите в запасы.</p></div><Button variant="soft" disabled={!checkedCount} onClick={() => commit(moveCheckedShoppingToInventory(state), `Купленное перенесено в запасы: ${checkedCount} поз.`)}>Купленное в запасы</Button></div><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => rebuildFor(state.meals.filter((meal) => meal.date === today), "сегодня")}>Из меню сегодня</Button><Button variant="outline" size="sm" onClick={() => rebuildFor(state.meals.filter((meal) => meal.date >= today && meal.date <= weekEndIso), "7 дней")}>Из меню на 7 дней</Button><Button variant="outline" size="sm" onClick={() => rebuildFor(state.meals, "все запланированное")}>Из всего меню</Button></div></CardHeader></Card><form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); commit(addManualShoppingItem(state, manualProduct), "Добавили вручную в покупки."); setManualProduct(""); }}><Input value={manualProduct} onChange={(event) => setManualProduct(event.target.value)} placeholder="Добавить вручную: молоко, хлеб, салфетки" /><Button>Добавить</Button></form>{Object.entries(grouped).map(([category, items]) => <Card key={category}><CardHeader><CardTitle>{category}</CardTitle></CardHeader><CardContent className="space-y-2">{items?.map((item) => <div key={item.id} className="flex flex-col gap-3 rounded-xl bg-white p-3 sm:flex-row sm:items-center sm:justify-between"><label className="flex items-center gap-3 font-semibold"><input type="checkbox" checked={item.checked} onChange={(event) => update(item, { checked: event.target.checked })} />{item.product} · {item.amount} {item.unit}</label><div className="flex flex-wrap gap-2"><Button variant="ghost" size="sm" onClick={() => update(item, { alreadyAtHome: !item.alreadyAtHome })}>{item.alreadyAtHome ? "Уже есть" : "Есть дома"}</Button><Button variant="ghost" size="sm" onClick={() => update(item, { amount: Math.max(0.5, item.amount - 1) })}>Меньше</Button><Button variant="ghost" size="sm" onClick={() => update(item, { amount: item.amount + 1 })}>Больше</Button><Button variant="danger" size="sm" onClick={() => setState({ ...state, shopping: state.shopping.filter((entry) => entry.id !== item.id) })}>Удалить</Button></div></div>)}</CardContent></Card>)}</div>;
}

function SettingsView({ reset, onNavigate }: { reset: () => void; onNavigate: (section: (typeof sections)[number][0]) => void }) { return <div className="grid gap-4 xl:grid-cols-2"><Card><CardHeader><CardTitle>Настройки MVP</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-muted-foreground">Данные хранятся локально в браузере. Синхронизацию между семьями подключим через облачную базу на следующем этапе.</p><Button variant="outline" onClick={reset}>Сбросить демо-данные</Button></CardContent></Card><Card><CardHeader><CardTitle>Вкусы и ограничения</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm text-muted-foreground">Любимые блюда, запреты и заметки уже редактируются в профилях семьи и влияют на новое меню.</p><Button variant="soft" onClick={() => onNavigate("Семья")}><Users size={16} />Открыть профили семьи</Button></CardContent></Card><Card><CardHeader><CardTitle>Импорт рецепта</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm text-muted-foreground">В разделе «Блюда» работает ручной рецепт и черновик из вставленного текста со снимка. Настоящее распознавание изображения подключим вместе с AI.</p><Button variant="soft" onClick={() => onNavigate("Блюда")}><Camera size={16} />Открыть рецепты и импорт</Button><Button variant="outline" disabled><Sparkles size={16} />AI-распознавание: позже</Button></CardContent></Card></div>; }

function ShoppingPreview({ items, onOpen }: { items: ShoppingItem[]; onOpen: () => void }) {
  const visible = items.filter((item) => !item.checked && !item.alreadyAtHome).slice(0, 6);
  return <Card className="border-[#e2bf6b] bg-gradient-to-br from-[#fff1c9] to-[#fff9e9]">
    <CardHeader className="flex flex-row items-center justify-between gap-3">
      <div>
        <CardTitle>Общий список покупок</CardTitle>
        <p className="text-sm text-[#5F6B66]">Что взять в магазине по меню</p>
      </div>
      <Button variant="outline" size="sm" onClick={onOpen}>Открыть</Button>
    </CardHeader>
    <CardContent>
      {visible.length ? <ul className="space-y-2 text-sm text-[#40504A]">
        {visible.map((item) => <li key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-[#fffdf6]/85 px-3 py-2">
          <span className="font-semibold">{item.product}</span>
          <span className="text-[#5F6B66]">{item.amount} {item.unit}</span>
        </li>)}
      </ul> : <p className="rounded-xl bg-[#fffdf6]/85 p-3 text-sm text-[#5F6B66]">Пока все есть дома или список пуст.</p>}
      {items.length > visible.length ? <p className="mt-3 text-sm font-semibold text-[#4F7C5D]">Еще позиций: {items.length - visible.length}</p> : null}
    </CardContent>
  </Card>;
}

function ReplaceDialog({ state, request, onClose, onPick, onAuto }: { state: AppState; request: { meal: MealPlan; slot: MealComponent["slot"] }; onClose: () => void; onPick: (dishId: string) => void; onAuto: () => void }) {
  const options = replacementOptions(state, request.meal.id, request.slot);
  return <div className="fixed inset-0 z-40 grid place-items-center bg-[#2f2a24]/45 p-4 backdrop-blur-sm">
    <Card className="max-h-[86vh] w-full max-w-4xl overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-[#ead7bd] bg-[#fff4e6]">
        <div>
          <CardTitle>Выбрать замену: {slotLabels[request.slot]}</CardTitle>
          <p className="text-sm text-muted-foreground">Показываю варианты той же роли и с учетом завтрака/ужина.</p>
        </div>
        <div className="flex gap-2"><Button variant="soft" size="sm" onClick={onAuto}>Подобрать само</Button><Button variant="outline" size="sm" onClick={onClose}>Закрыть</Button></div>
      </CardHeader>
      <CardContent className="max-h-[68vh] overflow-y-auto pt-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {options.map((dish) => <button key={dish.id} onClick={() => onPick(dish.id)} className="rounded-2xl border border-[#ead7bd] bg-[#fffaf2] p-3 text-left transition hover:-translate-y-0.5 hover:border-[#f47b58] hover:shadow-[0_14px_28px_rgba(129,83,43,0.13)]">
            <DishVisual dish={dish} />
            <p className="font-black">{dish.name}</p>
            <p className="text-sm text-muted-foreground">{dish.effort === "easy" ? "быстро" : dish.effort === "weekend" ? "на выходные" : "обычно"} · {dish.kidsFriendly ? "детям ок" : "скорее взрослым"}</p>
          </button>)}
        </div>
      </CardContent>
    </Card>
  </div>;
}

function InfoCard({ title, items, tone = "default" }: { title: string; items: string[]; tone?: "default" | "tip" | "success" }) { return <Card className={tone === "tip" ? "border-[#e2bf6b] bg-gradient-to-br from-[#fff1c9] to-[#fff9e9]" : tone === "success" ? "border-[#b9d6b8] bg-gradient-to-br from-[#edf7ed] to-[#f8fff5]" : ""}><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent><ul className="space-y-2 text-sm text-[#40504A]">{items.map((item) => <li key={item} className="flex gap-2"><ListChecks className="mt-0.5 size-4 shrink-0 text-primary" />{item}</li>)}</ul></CardContent></Card>; }
