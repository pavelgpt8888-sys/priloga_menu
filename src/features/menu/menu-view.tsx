"use client";

import { useState } from "react";
import { ShoppingBasket } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { mealLabel } from "@/lib/planner";
import type { DishComponent, MealComponent, MealKind, MealPlan, RecipeEntry } from "@/lib/types";

export type MenuCalendarMode = "day" | "week" | "month";
export type MenuRegenerationMode = "balanced" | "simple" | "cheap" | "leftovers" | "freezer";

export interface MenuViewProps {
  meals: MealPlan[];
  recipes: RecipeEntry[];
  dishMap: Map<string, DishComponent>;
  todayIso: string;
  defaultPlanDate: string;
  estimatedCost: number;
  slotLabels: Record<MealComponent["slot"], string>;
  regenerate: (mode?: MenuRegenerationMode) => void;
  onReplace: (meal: MealPlan, slot: MealComponent["slot"]) => void;
  onPlanMeal: (recipe: RecipeEntry, kind: MealKind, date: string) => void;
  onMoveMealToDate: (meal: MealPlan, date: string) => void;
  onOpenShopping: () => void;
}

export function MenuView(props: MenuViewProps) {
  const [calendarMode, setCalendarMode] = useState<MenuCalendarMode>("week");
  const [selectedDate, setSelectedDate] = useState(props.defaultPlanDate);
  const [breakfastId, setBreakfastId] = useState(props.recipes.find((recipe) => recipe.categories.includes("завтраки"))?.id ?? props.recipes[0]?.id ?? "");
  const [lunchId, setLunchId] = useState(props.recipes.find((recipe) => recipe.categories.includes("супы"))?.id ?? props.recipes[0]?.id ?? "");
  const [dinnerId, setDinnerId] = useState(props.recipes.find((recipe) => recipe.categories.includes("ужины"))?.id ?? props.recipes[0]?.id ?? "");
  const [budgetLimit, setBudgetLimit] = useState("180");

  return <MenuViewContent
    {...props}
    calendarMode={calendarMode}
    selectedDate={selectedDate}
    breakfastId={breakfastId}
    lunchId={lunchId}
    dinnerId={dinnerId}
    budgetLimit={budgetLimit}
    onCalendarModeChange={setCalendarMode}
    onSelectedDateChange={setSelectedDate}
    onBreakfastIdChange={setBreakfastId}
    onLunchIdChange={setLunchId}
    onDinnerIdChange={setDinnerId}
    onBudgetLimitChange={setBudgetLimit}
  />;
}

export interface MenuViewContentProps extends MenuViewProps {
  calendarMode: MenuCalendarMode;
  selectedDate: string;
  breakfastId: string;
  lunchId: string;
  dinnerId: string;
  budgetLimit: string;
  onCalendarModeChange: (mode: MenuCalendarMode) => void;
  onSelectedDateChange: (date: string) => void;
  onBreakfastIdChange: (recipeId: string) => void;
  onLunchIdChange: (recipeId: string) => void;
  onDinnerIdChange: (recipeId: string) => void;
  onBudgetLimitChange: (value: string) => void;
}

export function MenuViewContent({
  meals,
  recipes,
  dishMap,
  todayIso,
  estimatedCost,
  slotLabels,
  regenerate,
  onReplace,
  onPlanMeal,
  onMoveMealToDate,
  onOpenShopping,
  calendarMode,
  selectedDate,
  breakfastId,
  lunchId,
  dinnerId,
  budgetLimit,
  onCalendarModeChange,
  onSelectedDateChange,
  onBreakfastIdChange,
  onLunchIdChange,
  onDinnerIdChange,
  onBudgetLimitChange,
}: MenuViewContentProps) {
  const grouped = Object.groupBy(meals, (meal) => meal.date);
  const selectedDayMeals = meals.filter((meal) => meal.date === selectedDate);
  const breakfastRecipes = recipes.filter((recipe) => recipe.categories.includes("завтраки") || recipe.title.toLowerCase().includes("сырник") || recipe.title.toLowerCase().includes("каша"));
  const lunchRecipes = recipes.filter((recipe) => recipe.categories.includes("супы"));
  const dinnerRecipes = recipes.filter((recipe) => recipe.categories.includes("ужины") || recipe.categories.includes("супы") || recipe.categories.includes("мои рецепты"));
  const selectedBreakfast = recipes.find((recipe) => recipe.id === breakfastId) ?? breakfastRecipes[0] ?? recipes[0];
  const selectedLunch = recipes.find((recipe) => recipe.id === lunchId) ?? lunchRecipes[0] ?? recipes[0];
  const selectedDinner = recipes.find((recipe) => recipe.id === dinnerId) ?? dinnerRecipes[0] ?? recipes[0];
  const monthStart = new Date(`${todayIso}T00:00:00`);
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
            <Input type="date" value={selectedDate} onChange={(event) => onSelectedDateChange(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-semibold">Завтрак
            <select className="min-h-12 rounded-xl border border-input bg-white px-4 text-sm shadow-sm" value={selectedBreakfast?.id ?? ""} onChange={(event) => onBreakfastIdChange(event.target.value)}>
              {breakfastRecipes.map((recipe) => <option key={recipe.id} value={recipe.id}>{recipe.title}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold">Обед
            <select className="min-h-12 rounded-xl border border-input bg-white px-4 text-sm shadow-sm" value={selectedLunch?.id ?? ""} onChange={(event) => onLunchIdChange(event.target.value)}>
              {lunchRecipes.map((recipe) => <option key={recipe.id} value={recipe.id}>{recipe.title}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold">Ужин
            <select className="min-h-12 rounded-xl border border-input bg-white px-4 text-sm shadow-sm" value={selectedDinner?.id ?? ""} onChange={(event) => onDinnerIdChange(event.target.value)}>
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
            <Input type="number" min={20} value={budgetLimit} onChange={(event) => onBudgetLimitChange(event.target.value)} />
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
            {(["day", "week", "month"] as const).map((mode) => <button key={mode} onClick={() => onCalendarModeChange(mode)} className={`rounded-xl px-3 py-2 text-sm font-black ${calendarMode === mode ? "bg-[#4F7C5D] text-white shadow-sm" : "text-[#40504A] hover:bg-white"}`}>{mode === "day" ? "День" : mode === "week" ? "Неделя" : "Месяц"}</button>)}
          </div>
        </div>
        {calendarMode === "day" && <label className="grid max-w-xs gap-1 text-sm font-semibold">Дата
          <Input type="date" value={selectedDate} onChange={(event) => onSelectedDateChange(event.target.value)} />
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
              const dayMeals = grouped[date] ?? [];
              return <button key={date} onClick={() => { onSelectedDateChange(date); onCalendarModeChange("day"); }} className={`min-h-32 rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-[0_12px_26px_rgba(129,83,43,0.10)] ${date === todayIso ? "border-[#4F7C5D] bg-[#edf7ed]" : "border-[#ead7bd] bg-[#fffdf6]"}`}>
                <p className="font-black">{new Date(date).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}</p>
                <div className="mt-2 space-y-1">
                  {dayMeals.length ? dayMeals.slice(0, 3).map((meal) => <p key={meal.id} className="line-clamp-2 rounded-lg bg-white/85 px-2 py-1 text-xs"><b>{mealLabel(meal.kind)}:</b> {mealNames(meal)}</p>) : <p className="text-xs text-muted-foreground">пусто</p>}
                </div>
              </button>;
            })}
          </div>
        </div>}
      </CardContent>
    </Card>
  </div>;
}
