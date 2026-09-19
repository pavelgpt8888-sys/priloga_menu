"use client";

import { useState, type FormEvent } from "react";
import { ChefHat, ListChecks, Sparkles } from "lucide-react";

import { DishVisual } from "@/components/dish-visual";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { mealLabel, type DishSuggestion } from "@/lib/planner";
import { formatIngredientQuantity } from "@/lib/quantity";
import type { DishComponent, MealComponent, MealPlan, ShoppingItem } from "@/lib/types";

export const TODAY_QUICK_SCENARIOS = ["Нет времени", "Использовать остатки", "Дети это не едят", "Сделать проще", "Сделать дешевле", "Добавить овощи", "Из того, что есть", "Из морозилки"] as const;

export interface TodayViewProps {
  meals: MealPlan[];
  shopping: ShoppingItem[];
  dishMap: Map<string, DishComponent>;
  urgentItems: string[];
  suggestionDate: string;
  slotLabels: Record<MealComponent["slot"], string>;
  onOpenShopping: () => void;
  onReplace: (meal: MealPlan, slot: MealComponent["slot"]) => void;
  onRemove: (meal: MealPlan, slot: MealComponent["slot"]) => void;
  onMove: (meal: MealPlan) => void;
  onRepeat: (meal: MealPlan) => void;
  onShop: (meal: MealPlan) => void;
  onBan: (dish: DishComponent) => void;
  onCook: (meal: MealPlan) => void;
  onQuick: (label: string) => void;
  onSuggestFromPantry: (products: string, minutes: number, budget: "balanced" | "economy") => DishSuggestion[];
  onPlanSuggested: (dishId: string, date: string) => void;
}

export function TodayView(props: TodayViewProps) {
  return <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
    <div className="space-y-5">
      <details className="rounded-xl border border-[#ead7bd] bg-[#fffdf6] p-3 xl:hidden">
        <summary className="cursor-pointer text-sm font-bold text-[#40504A]">Быстро изменить меню</summary>
        <div className="mt-3 grid grid-cols-2 gap-2">{TODAY_QUICK_SCENARIOS.map((label) => <Button key={label} variant="outline" className="justify-start px-3" onClick={() => props.onQuick(label)}>{label}</Button>)}</div>
      </details>
      <div className="hidden gap-3 xl:grid xl:grid-cols-4">{TODAY_QUICK_SCENARIOS.map((label) => <Button key={label} variant="soft" className="justify-start" onClick={() => props.onQuick(label)}>{label}</Button>)}</div>
      <PantryAssistant suggestionDate={props.suggestionDate} onSuggest={props.onSuggestFromPantry} onPlanSuggested={props.onPlanSuggested} />
      {props.meals.map((meal) => <MealCard key={meal.id} meal={meal} dishMap={props.dishMap} slotLabels={props.slotLabels} onReplace={props.onReplace} onRemove={props.onRemove} onMove={props.onMove} onRepeat={props.onRepeat} onShop={props.onShop} onBan={props.onBan} onCook={props.onCook} />)}
    </div>
    <div className="space-y-5">
      <InfoCard title="Срочно использовать" items={props.urgentItems.length ? props.urgentItems : ["Нет продуктов с близким сроком."]} tone="tip" />
      <ShoppingPreview items={props.shopping} onOpen={props.onOpenShopping} />
      <InfoCard title="Импорт по фото" items={["Черновик рецепта доступен в разделе «Блюда»", "Фото → текст будет подключено вместе с AI", "Сейчас текст можно вставить и проверить вручную"]} tone="success" />
    </div>
  </div>;
}

function PantryAssistant({ suggestionDate, onSuggest, onPlanSuggested }: {
  suggestionDate: string;
  onSuggest: TodayViewProps["onSuggestFromPantry"];
  onPlanSuggested: TodayViewProps["onPlanSuggested"];
}) {
  const [products, setProducts] = useState("");
  const [date, setDate] = useState(suggestionDate);
  const [minutes, setMinutes] = useState("30");
  const [budget, setBudget] = useState<"balanced" | "economy">("balanced");
  const [suggestions, setSuggestions] = useState<DishSuggestion[]>([]);

  function findSuggestions(event: FormEvent) {
    event.preventDefault();
    setSuggestions(onSuggest(products, Number(minutes), budget));
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

function MealCard({ meal, dishMap, slotLabels, onReplace, onRemove, onMove, onRepeat, onShop, onBan, onCook }: Pick<TodayViewProps, "dishMap" | "slotLabels" | "onReplace" | "onRemove" | "onMove" | "onRepeat" | "onShop" | "onBan" | "onCook"> & { meal: MealPlan }) {
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
          <span className="text-right text-[#5F6B66]">{formatIngredientQuantity(item)}{item.quantityStatus === "unresolved" && <span className="block text-xs font-bold text-[#6f4b16]">Уточнить количество</span>}</span>
        </li>)}
      </ul> : <p className="rounded-xl bg-[#fffdf6]/85 p-3 text-sm text-[#5F6B66]">Пока все есть дома или список пуст.</p>}
      {items.length > visible.length ? <p className="mt-3 text-sm font-semibold text-[#4F7C5D]">Еще позиций: {items.length - visible.length}</p> : null}
    </CardContent>
  </Card>;
}

function InfoCard({ title, items, tone = "default" }: { title: string; items: string[]; tone?: "default" | "tip" | "success" }) {
  return <Card className={tone === "tip" ? "border-[#e2bf6b] bg-gradient-to-br from-[#fff1c9] to-[#fff9e9]" : tone === "success" ? "border-[#b9d6b8] bg-gradient-to-br from-[#edf7ed] to-[#f8fff5]" : ""}><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent><ul className="space-y-2 text-sm text-[#40504A]">{items.map((item) => <li key={item} className="flex gap-2"><ListChecks className="mt-0.5 size-4 shrink-0 text-primary" />{item}</li>)}</ul></CardContent></Card>;
}
