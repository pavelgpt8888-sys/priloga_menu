"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CalendarDays, ChefHat, Heart, Home, IceCreamBowl, ListChecks, Plus, RotateCcw, Settings, ShoppingBasket, Snowflake, Soup, Star, Users, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { initialState } from "@/lib/demo-data";
import { addManualShoppingItem, addRecipeToNextMenu, addRecipeToShopping, applyQuickScenario, banDish, buildShoppingList, byId, generateWeek, mealLabel, parseCommand, removeComponent, replaceComponent, replacementOptions, replaceComponentWithDish, startOfToday } from "@/lib/planner";
import type { AppState, CookingSession, DishComponent, FamilyMember, MealComponent, MealPlan, RecipeEntry, ShoppingItem } from "@/lib/types";

const storageKey = "family-meal-planner-state-v1";
const sections = [
  ["Сегодня", Home], ["Меню", CalendarDays], ["Блюда", Soup], ["Семья", Users], ["Кухня", ChefHat],
  ["Остатки", IceCreamBowl], ["Морозилка", Snowflake], ["Запасы", Warehouse], ["Покупки", ShoppingBasket], ["Настройки", Settings],
] as const;
const quick = ["Нет времени", "Использовать остатки", "Дети это не едят", "Сделать проще", "Сделать дешевле", "Добавить овощи", "Из того, что есть", "Из морозилки"];
const slotLabels: Record<MealComponent["slot"], string> = {
  base: "основа", addon: "дополнение", drink: "напиток/фрукт/овощи", main: "основное", side: "гарнир", salad: "салат взрослым", kidsVegetables: "овощи детям", soup: "суп", dessert: "десерт",
};

const foodPhotos: Record<string, string> = {
  breakfast_base: "https://images.unsplash.com/photo-1517673400267-0251440c45dc?auto=format&fit=crop&w=520&q=78",
  breakfast_addon: "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?auto=format&fit=crop&w=520&q=78",
  main: "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=520&q=78",
  side: "https://images.unsplash.com/photo-1516684669134-de6f7c473a2a?auto=format&fit=crop&w=520&q=78",
  salad: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=520&q=78",
  kids_vegetables: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=520&q=78",
  soup: "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=520&q=78",
  dessert: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=520&q=78",
  snack: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=520&q=78",
  leftover_based: "https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=520&q=78",
  freezer_item: "https://images.unsplash.com/photo-1601599963565-b7ba29c8e056?auto=format&fit=crop&w=520&q=78",
};

function photoForDish(dish: DishComponent) {
  const name = dish.name.toLowerCase();
  if (name.includes("каша") || name.includes("овсян")) return "https://images.unsplash.com/photo-1517673400267-0251440c45dc?auto=format&fit=crop&w=520&q=78";
  if (name.includes("сыр") || name.includes("творог")) return "https://images.unsplash.com/photo-1452195100486-9cc805987862?auto=format&fit=crop&w=520&q=78";
  if (name.includes("чай") || name.includes("какао")) return "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=520&q=78";
  if (name.includes("банан") || name.includes("яблок")) return "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?auto=format&fit=crop&w=520&q=78";
  if (name.includes("кур")) return "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=520&q=78";
  if (name.includes("рис")) return "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?auto=format&fit=crop&w=520&q=78";
  return foodPhotos[dish.role];
}

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

  return {
    ...initialState,
    ...value,
    family: value.family?.length ? value.family : initialState.family,
    dishes: value.dishes?.length ? value.dishes : initialState.dishes,
    inventory: value.inventory ?? initialState.inventory,
    leftovers: value.leftovers ?? initialState.leftovers,
    freezer: value.freezer ?? initialState.freezer,
    meals: value.meals?.length ? value.meals : generateWeek(initialState),
    shopping: value.shopping ?? [],
    recipes,
    bannedDishIds: value.bannedDishIds ?? [],
  };
}

export default function HomePage() {
  const [state, setState] = useState<AppState>(() => {
    if (typeof window === "undefined") return seededState();
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return seededState();
    try {
      return hydrateState(JSON.parse(raw) as AppState);
    } catch {
      return seededState();
    }
  });
  const [active, setActive] = useState<(typeof sections)[number][0]>("Сегодня");
  const [toast, setToast] = useState("Готово: меню на неделю собрано из демо-данных.");
  const [undo, setUndo] = useState<AppState | null>(null);
  const [command, setCommand] = useState("");
  const [manualProduct, setManualProduct] = useState("");
  const [replaceRequest, setReplaceRequest] = useState<{ meal: MealPlan; slot: MealComponent["slot"] } | null>(null);

  const dishMap = useMemo(() => byId(state.dishes), [state.dishes]);
  const today = startOfToday().toISOString().slice(0, 10);
  const todayMeals = state.meals.filter((meal) => meal.date === today);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(state));
  }, [state]);

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
          <header className="relative overflow-hidden rounded-[1.8rem] border border-[#DCCDB8] bg-[#FFFDF6]/95 p-4 shadow-[0_18px_55px_rgba(63,93,66,0.13)] sm:p-6">
            <div className="pointer-events-none absolute right-0 top-0 h-full w-72 bg-[radial-gradient(circle_at_70%_30%,rgba(228,179,90,0.28),transparent_34%),linear-gradient(135deg,transparent,#edf7ed)]" />
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-sm font-semibold text-[#4F7C5D]">Сегодня дома · {new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}</p>
                <h1 className="mt-1 text-3xl font-black tracking-normal sm:text-4xl">Что готовим, что осталось и что купить</h1>
              </div>
              <div className="flex flex-wrap gap-2">
                {state.family.map((member) => <span key={member.id} className="rounded-full border border-[#dccdb8] bg-[#fffdf6] px-3 py-2 text-sm font-semibold text-[#40504A] shadow-sm">{member.name}, {member.age}</span>)}
                <Button variant="soft" onClick={() => setActive("Покупки")}><ShoppingBasket size={17} />Открыть покупки · {state.shopping.length}</Button>
              </div>
            </div>
            <form onSubmit={handleCommand} className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Input value={command} onChange={(event) => setCommand(event.target.value)} placeholder="Напишите, что изменить: например, замени завтра гречку на картошку" />
              <Button type="submit" size="lg">Применить</Button>
            </form>
          </header>

          {toast && <div className="flex flex-col gap-3 rounded-2xl border border-[#b9d6b8] bg-[#edf7ed] p-4 text-sm font-semibold text-[#285f3b] shadow-[0_12px_30px_rgba(63,125,82,0.10)] sm:flex-row sm:items-center sm:justify-between"><span>{toast}</span>{undo && <Button variant="outline" size="sm" onClick={() => { setState(undo); setUndo(null); setToast("Отменено. Вернули предыдущее состояние."); }}><RotateCcw size={16} />Отменить</Button>}</div>}

          {active === "Сегодня" && <TodayView meals={todayMeals} shopping={state.shopping} dishMap={dishMap} onOpenShopping={() => setActive("Покупки")} onReplace={(meal, slot) => setReplaceRequest({ meal, slot })} onRemove={(meal, slot) => commit(removeComponent(state, meal.id, slot), `Убрали ${slotLabels[slot]}.`)} onMove={moveMeal} onRepeat={repeatMeal} onShop={addMealToShopping} onBan={(dish) => commit(banDish(state, dish.id), `${dish.name}: пока не предлагаем.`)} onCook={startCooking} onQuick={handleQuick} />}
          {active === "Меню" && <MenuView meals={state.meals} dishMap={dishMap} regenerate={regenerate} onReplace={(meal, slot) => setReplaceRequest({ meal, slot })} />}
          {active === "Блюда" && <DishesView state={state} setState={setState} dishMap={dishMap} onBan={(dish) => commit(banDish(state, dish.id), `${dish.name}: скрыто из предложений.`)} onRecipeToMenu={(recipe) => commit(addRecipeToNextMenu(state, recipe), `${recipe.title}: добавлено в меню на завтра.`)} onRecipeToShopping={(recipe) => commit(addRecipeToShopping(state, recipe), `${recipe.title}: ингредиенты добавлены в покупки.`)} />}
          {active === "Семья" && <FamilyView state={state} setState={setState} />}
          {active === "Кухня" && <KitchenView state={state} dishMap={dishMap} commit={commit} />}
          {active === "Остатки" && <LeftoversView state={state} />}
          {active === "Морозилка" && <FreezerView state={state} />}
          {active === "Запасы" && <InventoryView state={state} />}
          {active === "Покупки" && <ShoppingView state={state} setState={setState} commit={commit} manualProduct={manualProduct} setManualProduct={setManualProduct} />}
          {active === "Настройки" && <SettingsView state={state} reset={() => commit(seededState(), "Демо-данные восстановлены.")} />}
        </section>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 gap-1 border-t border-border bg-[#FFFDF8]/95 p-2 backdrop-blur lg:hidden">
        {sections.slice(0, 10).map(([name, Icon]) => <button key={name} onClick={() => setActive(name)} className={`flex min-h-12 flex-col items-center justify-center rounded-xl text-[11px] font-bold ${active === name ? "bg-primary text-white" : "text-[#40504A]"}`}><Icon size={17} /><span className="max-w-full truncate">{name}</span></button>)}
      </nav>
      {replaceRequest && <ReplaceDialog state={state} request={replaceRequest} onClose={() => setReplaceRequest(null)} onPick={(dishId) => { commit(replaceComponentWithDish(state, replaceRequest.meal.id, replaceRequest.slot, dishId), `Заменили ${slotLabels[replaceRequest.slot]} вручную.`); setReplaceRequest(null); }} onAuto={() => { commit(replaceComponent(state, replaceRequest.meal.id, replaceRequest.slot), `Подобрали замену для ${slotLabels[replaceRequest.slot]}.`); setReplaceRequest(null); }} />}
    </main>
  );
}

function TodayView(props: { meals: MealPlan[]; shopping: ShoppingItem[]; dishMap: Map<string, DishComponent>; onOpenShopping: () => void; onReplace: (meal: MealPlan, slot: MealComponent["slot"]) => void; onRemove: (meal: MealPlan, slot: MealComponent["slot"]) => void; onMove: (meal: MealPlan) => void; onRepeat: (meal: MealPlan) => void; onShop: (meal: MealPlan) => void; onBan: (dish: DishComponent) => void; onCook: (meal: MealPlan) => void; onQuick: (label: string) => void; }) {
  return <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{quick.map((label) => <Button key={label} variant="soft" className="justify-start" onClick={() => props.onQuick(label)}>{label}</Button>)}</div>
      {props.meals.map((meal) => <MealCard key={meal.id} meal={meal} {...props} />)}
    </div>
    <div className="space-y-5">
      <InfoCard title="Срочно использовать" items={["яйца до 24 мая", "огурцы сегодня-завтра", "пюре превратить в зразы"]} tone="tip" />
      <ShoppingPreview items={props.shopping} onOpen={props.onOpenShopping} />
      <InfoCard title="AI-фото холодильника" items={["Распознать продукты по фото", "MVP: место в интерфейсе готово", "позже: фото → подтверждение → запасы"]} tone="success" />
    </div>
  </div>;
}

function MealCard({ meal, dishMap, onReplace, onRemove, onMove, onRepeat, onShop, onBan, onCook }: { meal: MealPlan; dishMap: Map<string, DishComponent>; onReplace: (meal: MealPlan, slot: MealComponent["slot"]) => void; onRemove: (meal: MealPlan, slot: MealComponent["slot"]) => void; onMove: (meal: MealPlan) => void; onRepeat: (meal: MealPlan) => void; onShop: (meal: MealPlan) => void; onBan: (dish: DishComponent) => void; onCook: (meal: MealPlan) => void; }) {
  return <Card>
    <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div><CardTitle>{mealLabel(meal.kind)} · {new Date(meal.date).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}</CardTitle><p className="text-sm text-muted-foreground">{meal.notes}</p></div>
      <Button onClick={() => onCook(meal)}><ChefHat size={17} />Готовлю сейчас</Button>
    </CardHeader>
    <CardContent className="space-y-3">
      {meal.components.map((component) => {
        const dish = dishMap.get(component.dishId);
        if (!dish) return null;
        return <div key={`${meal.id}-${component.slot}`} className="rounded-2xl border border-[#e2d6c4] bg-[#fffdf6] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <img src={photoForDish(dish)} alt="" className="h-20 w-24 shrink-0 rounded-2xl object-cover shadow-[0_8px_20px_rgba(129,83,43,0.16)]" />
              <div><p className="text-xs font-bold uppercase tracking-wide text-[#5F6B66]">{slotLabels[component.slot]}</p><p className="text-lg font-black">{dish.name}</p><p className="text-sm text-muted-foreground">{dish.effort === "easy" ? "быстро" : dish.effort === "weekend" ? "лучше на выходные" : "обычно"} · {dish.cost === "low" ? "недорого" : "средняя цена"}</p></div>
            </div>
            <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => onReplace(meal, component.slot)}>Заменить</Button><Button variant="ghost" size="sm" onClick={() => onRemove(meal, component.slot)}>Убрать</Button><Button variant="ghost" size="sm" onClick={() => onBan(dish)}>Не предлагать пока</Button></div>
          </div>
        </div>;
      })}
      <div className="flex flex-wrap gap-2 pt-1"><Button variant="outline" onClick={() => onMove(meal)}>Перенести</Button><Button variant="outline" onClick={() => onRepeat(meal)}>Повторить блюдо</Button><Button variant="outline" onClick={() => onShop(meal)}>Добавить в покупки</Button></div>
    </CardContent>
  </Card>;
}

function MenuView({ meals, dishMap, regenerate, onReplace }: { meals: MealPlan[]; dishMap: Map<string, DishComponent>; regenerate: (mode?: Parameters<typeof generateWeek>[1]) => void; onReplace: (meal: MealPlan, slot: MealComponent["slot"]) => void; }) {
  const grouped = Object.groupBy(meals, (meal) => meal.date);
  return <div className="space-y-4"><div className="flex flex-wrap gap-2"><Button onClick={() => regenerate("balanced")}>Сгенерировать неделю</Button><Button variant="soft" onClick={() => regenerate("simple")}>Будни проще</Button><Button variant="soft" onClick={() => regenerate("leftovers")}>Использовать остатки</Button><Button variant="soft" onClick={() => regenerate("freezer")}>Взять из морозилки</Button></div><div className="grid gap-4 xl:grid-cols-2">{Object.entries(grouped).map(([date, dayMeals]) => <Card key={date}><CardHeader><CardTitle>{new Date(date).toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}</CardTitle></CardHeader><CardContent className="space-y-3">{dayMeals?.map((meal) => <div key={meal.id} className="rounded-2xl bg-white p-4"><p className="font-black">{mealLabel(meal.kind)}</p>{meal.components.map((component) => <button key={component.slot} onClick={() => onReplace(meal, component.slot)} className="mt-2 block w-full rounded-xl border border-border px-3 py-2 text-left text-sm hover:bg-[#FFF3D6]"><b>{slotLabels[component.slot]}:</b> {dishMap.get(component.dishId)?.name}</button>)}</div>)}</CardContent></Card>)}</div></div>;
}

function DishesView({ state, setState, dishMap, onBan, onRecipeToMenu, onRecipeToShopping }: { state: AppState; setState: (state: AppState) => void; dishMap: Map<string, DishComponent>; onBan: (dish: DishComponent) => void; onRecipeToMenu: (recipe: RecipeEntry) => void; onRecipeToShopping: (recipe: RecipeEntry) => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("все");
  const [selectedId, setSelectedId] = useState(state.recipes[0]?.id ?? "");
  const categories = ["все", ...Array.from(new Set(state.recipes.flatMap((recipe) => recipe.categories))).sort((a, b) => a.localeCompare(b, "ru"))];
  const filteredRecipes = state.recipes.filter((recipe) => {
    const text = `${recipe.title} ${recipe.categories.join(" ")} ${recipe.ingredients.map((item) => item.name).join(" ")}`.toLowerCase();
    return (category === "все" || recipe.categories.includes(category)) && text.includes(query.toLowerCase());
  });
  const selected = state.recipes.find((recipe) => recipe.id === selectedId) ?? filteredRecipes[0] ?? state.recipes[0];
  const selectedDish = selected?.linkedDishIds?.map((id) => dishMap.get(id)).find(Boolean);
  const grouped = Object.groupBy(state.dishes, (dish) => dish.role);

  function updateRecipe(recipeId: string, patch: Partial<RecipeEntry>) {
    setState({ ...state, recipes: state.recipes.map((recipe) => recipe.id === recipeId ? { ...recipe, ...patch } : recipe) });
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
          <div>
            <CardTitle>Рецепты</CardTitle>
            <p className="text-sm text-muted-foreground">Первое ядро как в Paprika: категории, ингредиенты, шаги, рейтинг, избранное и семейные реакции.</p>
          </div>
          <div className="grid gap-2 md:grid-cols-[1fr_180px]">
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти рецепт: сырники, курица, суп, салат" />
            <select className="min-h-11 rounded-xl border border-input bg-white px-4 text-sm font-semibold shadow-sm" value={category} onChange={(event) => setCategory(event.target.value)}>
              {categories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
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
        {selectedDish && <img src={photoForDish(selectedDish)} alt="" className="h-44 w-full rounded-2xl object-cover shadow-[0_12px_30px_rgba(129,83,43,0.12)]" />}
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
        <div className="grid gap-2 sm:grid-cols-2">
          <Button onClick={() => onRecipeToMenu(selected)}><Plus size={16} />В меню</Button>
          <Button variant="outline" onClick={() => onRecipeToShopping(selected)}><ShoppingBasket size={16} />В покупки</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
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

function FamilyView({ state, setState }: { state: AppState; setState: (state: AppState) => void }) {
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
        <Button variant="soft" onClick={addMember}>Добавить участника</Button>
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

function KitchenView({ state, dishMap, commit }: { state: AppState; dishMap: Map<string, DishComponent>; commit: (next: AppState, message: string) => void }) {
  const session = state.cooking;
  const meal = session ? state.meals.find((item) => item.id === session.mealId) : state.meals[0];
  const dishes = meal?.components.map((component) => dishMap.get(component.dishId)).filter(Boolean) as DishComponent[] | undefined;
  return <div className="grid gap-5 xl:grid-cols-[1fr_380px]"><Card><CardHeader><CardTitle>Готовлю сейчас</CardTitle><p className="text-sm text-muted-foreground">Ингредиенты, шаги, отметки и итог после готовки.</p></CardHeader><CardContent className="space-y-4">{dishes?.map((dish) => <div key={dish.id} className="rounded-2xl bg-white p-4"><h3 className="font-black">{dish.name}</h3><p className="mt-2 text-sm text-muted-foreground">Ингредиенты: {dish.ingredients.map((item) => `${item.name} ${item.amount} ${item.unit}`).join(", ")}</p>{dish.steps?.map((step, index) => <label key={step} className="mt-3 flex items-center gap-3 rounded-xl border border-border p-3"><input type="checkbox" checked={session?.doneSteps.includes(index) ?? false} onChange={() => session && commit({ ...state, cooking: { ...session, doneSteps: session.doneSteps.includes(index) ? session.doneSteps.filter((item) => item !== index) : [...session.doneSteps, index] } }, "Шаг обновлен.")} />{step}</label>)}</div>)}</CardContent></Card><Card><CardHeader><CardTitle>После готовки</CardTitle></CardHeader><CardContent className="space-y-3"><p className="rounded-xl bg-[#FFF3D6] p-3 text-sm">Кто ел, понравилось ли и что осталось — пока сохраняем как заметку сессии.</p><Button variant="soft" onClick={() => meal && commit({ ...state, leftovers: [...state.leftovers, { id: `left-${Date.now()}`, name: `остатки: ${meal.title}`, amount: "на 1 порцию", cookedAt: meal.date, useBy: meal.date, transformInto: ["Запеканка", "Суп", "Зразы"] }] }, "Остатки после готовки добавлены.")}>Записать остатки</Button><Button variant="outline">Таймер 10 минут</Button></CardContent></Card></div>;
}

function LeftoversView({ state }: { state: AppState }) { return <div className="grid gap-4 md:grid-cols-2">{state.leftovers.map((item) => <Card key={item.id}><CardHeader><CardTitle>{item.name}</CardTitle></CardHeader><CardContent><p>{item.amount}</p><p className="text-sm text-muted-foreground">Готовили {item.cookedAt}, использовать до {item.useBy}</p><p className="mt-3 rounded-xl bg-[#FFF3D6] p-3 text-sm">Во что превратить: {item.transformInto.join(", ")}</p></CardContent></Card>)}</div>; }
function FreezerView({ state }: { state: AppState }) { return <div className="grid gap-4 md:grid-cols-2">{state.freezer.map((item) => <Card key={item.id}><CardHeader><CardTitle>{item.name}</CardTitle></CardHeader><CardContent><p>{item.amount}</p><p className="text-sm text-muted-foreground">Заморожено {item.frozenAt}, использовать до {item.useBy}</p><p className="mt-3 rounded-xl bg-[#EAF4EC] p-3 text-sm">Подать с: {item.serveWith.join(", ")}</p></CardContent></Card>)}</div>; }
function InventoryView({ state }: { state: AppState }) { return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{state.inventory.map((item) => <Card key={item.id}><CardHeader><CardTitle>{item.product}</CardTitle></CardHeader><CardContent><p>{item.amount} {item.unit}</p><p className="text-sm text-muted-foreground">{item.category} · {item.place === "fridge" ? "холодильник" : item.place === "freezer" ? "морозилка" : "шкаф"}</p>{item.urgent && <p className="mt-3 rounded-xl bg-[#FFF3D6] p-3 text-sm font-semibold">Использовать срочно</p>}</CardContent></Card>)}</div>; }

function ShoppingView({ state, setState, commit, manualProduct, setManualProduct }: { state: AppState; setState: (state: AppState) => void; commit: (next: AppState, message: string) => void; manualProduct: string; setManualProduct: (value: string) => void }) {
  const grouped = Object.groupBy(state.shopping, (item) => item.category);
  const update = (item: ShoppingItem, patch: Partial<ShoppingItem>) => setState({ ...state, shopping: state.shopping.map((entry) => entry.id === item.id ? { ...entry, ...patch } : entry) });
  return <div className="space-y-4"><form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); commit(addManualShoppingItem(state, manualProduct), "Добавили вручную в покупки."); setManualProduct(""); }}><Input value={manualProduct} onChange={(event) => setManualProduct(event.target.value)} placeholder="Добавить вручную: молоко, хлеб, салфетки" /><Button>Добавить</Button></form>{Object.entries(grouped).map(([category, items]) => <Card key={category}><CardHeader><CardTitle>{category}</CardTitle></CardHeader><CardContent className="space-y-2">{items?.map((item) => <div key={item.id} className="flex flex-col gap-3 rounded-xl bg-white p-3 sm:flex-row sm:items-center sm:justify-between"><label className="flex items-center gap-3 font-semibold"><input type="checkbox" checked={item.checked} onChange={(event) => update(item, { checked: event.target.checked })} />{item.product} · {item.amount} {item.unit}</label><div className="flex flex-wrap gap-2"><Button variant="ghost" size="sm" onClick={() => update(item, { alreadyAtHome: !item.alreadyAtHome })}>{item.alreadyAtHome ? "Уже есть" : "Есть дома"}</Button><Button variant="ghost" size="sm" onClick={() => update(item, { amount: Math.max(0.5, item.amount - 1) })}>Меньше</Button><Button variant="ghost" size="sm" onClick={() => update(item, { amount: item.amount + 1 })}>Больше</Button><Button variant="danger" size="sm" onClick={() => setState({ ...state, shopping: state.shopping.filter((entry) => entry.id !== item.id) })}>Удалить</Button></div></div>)}</CardContent></Card>)}</div>;
}

function SettingsView({ state, reset }: { state: AppState; reset: () => void }) { return <div className="grid gap-4 xl:grid-cols-2"><Card><CardHeader><CardTitle>Настройки MVP</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-muted-foreground">Данные хранятся локально в браузере. Supabase-поля и модели подготовлены для следующего этапа.</p><Button variant="outline" onClick={reset}>Сбросить демо-данные</Button><details className="rounded-xl border border-border bg-white p-4"><summary className="cursor-pointer font-bold">Настроить подробнее</summary><p className="mt-3 text-sm text-muted-foreground">Позже здесь будут профили питания, лимиты бюджета, синхронизация и AI-фото холодильника.</p></details></CardContent></Card><Card><CardHeader><CardTitle>Мои вкусы и любимые блюда</CardTitle></CardHeader><CardContent className="space-y-3"><Textarea placeholder="Надиктуйте или напишите: что любите, что дети не едят, какие завтраки нормальные, какие блюда хочется чаще. Например: люблю сырники, курицу в духовке, салат огурцы-помидоры; не ставь какао к гречневой каше." /><div className="grid gap-2 sm:grid-cols-2"><Button variant="soft">🎙️ Надиктовать вкусы</Button><Button variant="outline">📷 Добавить блюдо по фото</Button></div><p className="text-sm text-muted-foreground">MVP сохраняет это как будущий сценарий. Следующий этап: голос → текст → вкусовой профиль; фото блюда → подтверждение → любимые блюда.</p></CardContent></Card><Card><CardHeader><CardTitle>Импорт рецепта по ссылке</CardTitle></CardHeader><CardContent className="space-y-3"><Input placeholder="Ссылка на рецепт" defaultValue={state.recipes[0]?.url} /><Input placeholder="Название черновика" defaultValue={state.recipes[0]?.title} /><Textarea placeholder="Ингредиенты вручную. Позже сюда подключится schema.org Recipe parser." /><Textarea placeholder="Шаги приготовления" /><Button variant="soft">Сохранить черновик</Button></CardContent></Card></div>; }

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
            <img src={photoForDish(dish)} alt="" className="mb-3 h-28 w-full rounded-xl object-cover" />
            <p className="font-black">{dish.name}</p>
            <p className="text-sm text-muted-foreground">{dish.effort === "easy" ? "быстро" : dish.effort === "weekend" ? "на выходные" : "обычно"} · {dish.kidsFriendly ? "детям ок" : "скорее взрослым"}</p>
          </button>)}
        </div>
      </CardContent>
    </Card>
  </div>;
}

function InfoCard({ title, items, tone = "default" }: { title: string; items: string[]; tone?: "default" | "tip" | "success" }) { return <Card className={tone === "tip" ? "border-[#e2bf6b] bg-gradient-to-br from-[#fff1c9] to-[#fff9e9]" : tone === "success" ? "border-[#b9d6b8] bg-gradient-to-br from-[#edf7ed] to-[#f8fff5]" : ""}><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent><ul className="space-y-2 text-sm text-[#40504A]">{items.map((item) => <li key={item} className="flex gap-2"><ListChecks className="mt-0.5 size-4 shrink-0 text-primary" />{item}</li>)}</ul></CardContent></Card>; }
