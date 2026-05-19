"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CalendarDays, ChefHat, ClipboardList, Home, IceCreamBowl, ListChecks, RotateCcw, Settings, ShoppingBasket, Snowflake, Soup, Users, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { initialState } from "@/lib/demo-data";
import { addManualShoppingItem, applyQuickScenario, banDish, buildShoppingList, byId, generateWeek, mealLabel, parseCommand, removeComponent, replaceComponent, startOfToday } from "@/lib/planner";
import type { AppState, CookingSession, DishComponent, MealComponent, MealPlan, ShoppingItem } from "@/lib/types";

const storageKey = "family-meal-planner-state-v1";
const sections = [
  ["Сегодня", Home], ["Меню", CalendarDays], ["Блюда", Soup], ["Семья", Users], ["Кухня", ChefHat],
  ["Остатки", IceCreamBowl], ["Морозилка", Snowflake], ["Запасы", Warehouse], ["Покупки", ShoppingBasket], ["Настройки", Settings],
] as const;
const quick = ["Нет времени", "Использовать остатки", "Дети это не едят", "Сделать проще", "Сделать дешевле", "Добавить овощи", "Из того, что есть", "Из морозилки"];
const slotLabels: Record<MealComponent["slot"], string> = {
  base: "основа", addon: "дополнение", drink: "напиток/фрукт/овощи", main: "основное", side: "гарнир", salad: "салат взрослым", kidsVegetables: "овощи детям", soup: "суп", dessert: "десерт",
};

function seededState(): AppState {
  const base = { ...initialState, meals: generateWeek(initialState) };
  return { ...base, shopping: buildShoppingList(base) };
}

export default function HomePage() {
  const [state, setState] = useState<AppState>(() => seededState());
  const [active, setActive] = useState<(typeof sections)[number][0]>("Сегодня");
  const [toast, setToast] = useState("Готово: меню на неделю собрано из демо-данных.");
  const [undo, setUndo] = useState<AppState | null>(null);
  const [command, setCommand] = useState("");
  const [manualProduct, setManualProduct] = useState("");

  const dishMap = useMemo(() => byId(state.dishes), [state.dishes]);
  const today = startOfToday().toISOString().slice(0, 10);
  const todayMeals = state.meals.filter((meal) => meal.date === today);

  useEffect(() => {
    const raw = localStorage.getItem(storageKey);
    if (raw) setState(JSON.parse(raw) as AppState);
  }, []);

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

          {active === "Сегодня" && <TodayView meals={todayMeals} shopping={state.shopping} dishMap={dishMap} onOpenShopping={() => setActive("Покупки")} onReplace={(meal, slot) => commit(replaceComponent(state, meal.id, slot), `Заменили ${slotLabels[slot]}.`)} onRemove={(meal, slot) => commit(removeComponent(state, meal.id, slot), `Убрали ${slotLabels[slot]}.`)} onMove={moveMeal} onRepeat={repeatMeal} onShop={addMealToShopping} onBan={(dish) => commit(banDish(state, dish.id), `${dish.name}: пока не предлагаем.`)} onCook={startCooking} onQuick={handleQuick} />}
          {active === "Меню" && <MenuView meals={state.meals} dishMap={dishMap} regenerate={regenerate} onReplace={(meal, slot) => commit(replaceComponent(state, meal.id, slot), `Заменили ${slotLabels[slot]} в календаре.`)} />}
          {active === "Блюда" && <DishesView dishes={state.dishes} onBan={(dish) => commit(banDish(state, dish.id), `${dish.name}: скрыто из предложений.`)} />}
          {active === "Семья" && <FamilyView state={state} />}
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
            <div><p className="text-xs font-bold uppercase tracking-wide text-[#5F6B66]">{slotLabels[component.slot]}</p><p className="text-lg font-black">{dish.name}</p><p className="text-sm text-muted-foreground">{dish.effort === "easy" ? "быстро" : dish.effort === "weekend" ? "лучше на выходные" : "обычно"} · {dish.cost === "low" ? "недорого" : "средняя цена"}</p></div>
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

function DishesView({ dishes, onBan }: { dishes: DishComponent[]; onBan: (dish: DishComponent) => void }) {
  const grouped = Object.groupBy(dishes, (dish) => dish.role);
  return <div className="grid gap-4 xl:grid-cols-2">{Object.entries(grouped).map(([role, items]) => <Card key={role}><CardHeader><CardTitle>{role} · {items?.length ?? 0}</CardTitle></CardHeader><CardContent className="grid gap-2">{items?.map((dish) => <div key={dish.id} className="flex items-center justify-between gap-3 rounded-xl bg-white p-3"><span className="font-semibold">{dish.name}</span><Button variant="ghost" size="sm" onClick={() => onBan(dish)}>Не предлагать</Button></div>)}</CardContent></Card>)}</div>;
}

function FamilyView({ state }: { state: AppState }) { return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{state.family.map((member) => <Card key={member.id}><CardHeader><CardTitle>{member.name}</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">{member.age} лет · {member.role === "adult" ? "взрослый" : member.role === "teen" ? "подросток" : "ребенок"}</p><p className="mt-3 rounded-xl bg-[#FFF3D6] p-3 text-sm">{member.dislikes?.length ? `Не любит: ${member.dislikes.join(", ")}` : "Без особых ограничений"}</p></CardContent></Card>)}</div>; }

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

function SettingsView({ state, reset }: { state: AppState; reset: () => void }) { return <div className="grid gap-4 xl:grid-cols-2"><Card><CardHeader><CardTitle>Настройки MVP</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-muted-foreground">Данные хранятся локально в браузере. Supabase-поля и модели подготовлены для следующего этапа.</p><Button variant="outline" onClick={reset}>Сбросить демо-данные</Button><details className="rounded-xl border border-border bg-white p-4"><summary className="cursor-pointer font-bold">Настроить подробнее</summary><p className="mt-3 text-sm text-muted-foreground">Позже здесь будут профили питания, лимиты бюджета, синхронизация и AI-фото холодильника.</p></details></CardContent></Card><Card><CardHeader><CardTitle>Импорт рецепта по ссылке</CardTitle></CardHeader><CardContent className="space-y-3"><Input placeholder="Ссылка на рецепт" defaultValue={state.recipes[0]?.url} /><Input placeholder="Название черновика" defaultValue={state.recipes[0]?.title} /><Textarea placeholder="Ингредиенты вручную. Позже сюда подключится schema.org Recipe parser." /><Textarea placeholder="Шаги приготовления" /><Button variant="soft">Сохранить черновик</Button></CardContent></Card></div>; }

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

function InfoCard({ title, items, tone = "default" }: { title: string; items: string[]; tone?: "default" | "tip" | "success" }) { return <Card className={tone === "tip" ? "border-[#e2bf6b] bg-gradient-to-br from-[#fff1c9] to-[#fff9e9]" : tone === "success" ? "border-[#b9d6b8] bg-gradient-to-br from-[#edf7ed] to-[#f8fff5]" : ""}><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent><ul className="space-y-2 text-sm text-[#40504A]">{items.map((item) => <li key={item} className="flex gap-2"><ListChecks className="mt-0.5 size-4 shrink-0 text-primary" />{item}</li>)}</ul></CardContent></Card>; }
