import { createElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { seededState } from "@/lib/local-state";
import { byId } from "@/lib/planner";
import type { MealComponent } from "@/lib/types";

import { MenuView, MenuViewContent, type MenuViewContentProps, type MenuViewProps } from "../menu-view";

const slotLabels: Record<MealComponent["slot"], string> = {
  base: "основа",
  addon: "дополнение",
  drink: "напиток/фрукт/овощи",
  main: "основное",
  side: "гарнир",
  salad: "салат взрослым",
  kidsVegetables: "овощи детям",
  soup: "суп",
  dessert: "десерт",
};

function fixedProps(): MenuViewProps {
  const state = seededState();
  return {
    meals: state.meals.slice(0, 2).map((meal) => ({ ...meal, date: "2026-01-15" })),
    recipes: state.recipes,
    dishMap: byId(state.dishes),
    todayIso: "2026-01-15",
    defaultPlanDate: "2026-01-15",
    estimatedCost: 123,
    slotLabels,
    regenerate: vi.fn(),
    onReplace: vi.fn(),
    onPlanMeal: vi.fn(),
    onMoveMealToDate: vi.fn(),
    onOpenShopping: vi.fn(),
  };
}

function contentProps(overrides: Partial<MenuViewContentProps> = {}): MenuViewContentProps {
  const props = fixedProps();
  const breakfast = props.recipes.find((recipe) => recipe.categories.includes("завтраки")) ?? props.recipes[0];
  const lunch = props.recipes.find((recipe) => recipe.categories.includes("супы")) ?? props.recipes[0];
  const dinner = props.recipes.find((recipe) => recipe.categories.includes("ужины")) ?? props.recipes[0];
  return {
    ...props,
    calendarMode: "week",
    selectedDate: "2026-01-15",
    breakfastId: breakfast.id,
    lunchId: lunch.id,
    dinnerId: dinner.id,
    budgetLimit: "180",
    onCalendarModeChange: vi.fn(),
    onSelectedDateChange: vi.fn(),
    onBreakfastIdChange: vi.fn(),
    onLunchIdChange: vi.fn(),
    onDinnerIdChange: vi.fn(),
    onBudgetLimitChange: vi.fn(),
    ...overrides,
  };
}

function elementText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(elementText).join("");
  if (!isValidElement<Record<string, unknown>>(node)) return "";
  return elementText(node.props.children as ReactNode);
}

function visitElements(node: ReactNode, visit: (element: ReactElement<Record<string, unknown>>) => void) {
  if (Array.isArray(node)) {
    node.forEach((child) => visitElements(child, visit));
    return;
  }
  if (!isValidElement<Record<string, unknown>>(node)) return;
  visit(node);
  visitElements(node.props.children as ReactNode, visit);
}

function clickButton(tree: ReactNode, label: string) {
  let action: (() => void) | undefined;
  visitElements(tree, (element) => {
    if (elementText(element) === label && typeof element.props.onClick === "function") {
      action = element.props.onClick as () => void;
    }
  });
  expect(action, `button ${label}`).toBeTypeOf("function");
  action?.();
}

describe("MenuView extraction contract", () => {
  it("renders the unchanged default week mode from a fixed date", () => {
    const markup = renderToStaticMarkup(createElement(MenuView, fixedProps()));

    expect(markup).toContain("План конкретного дня");
    expect(markup).toContain("Экономный план недели");
    expect(markup).toContain("Календарь меню");
    expect(markup).toContain("Перенести на выбранную дату");
    expect(markup).toContain("около 123 BYN");
  });

  it.each([
    ["day", "четверг, 15 января"],
    ["week", "Перенести на выбранную дату"],
    ["month", "пн"],
  ] as const)("renders %s calendar mode", (calendarMode, expectedText) => {
    const markup = renderToStaticMarkup(createElement(MenuViewContent, contentProps({ calendarMode })));
    expect(markup).toContain(expectedText);
  });

  it("keeps the selected day explicitly empty when it has no meals", () => {
    const markup = renderToStaticMarkup(createElement(MenuViewContent, contentProps({ calendarMode: "day", selectedDate: "2026-01-20" })));

    expect(markup).toContain("На выбранный день пока ничего не запланировано");
    expect(markup).toContain("На этот день меню пока не запланировано");
  });

  it("selects a month date and switches to day mode", () => {
    const props = contentProps({ calendarMode: "month" });
    const tree = MenuViewContent(props);
    let dayAction: (() => void) | undefined;
    visitElements(tree, (element) => {
      if (elementText(element).includes("15 янв.") && typeof element.props.onClick === "function") {
        dayAction = element.props.onClick as () => void;
      }
    });

    expect(dayAction).toBeTypeOf("function");
    dayAction?.();
    expect(props.onSelectedDateChange).toHaveBeenCalledWith("2026-01-15");
    expect(props.onCalendarModeChange).toHaveBeenCalledWith("day");
  });

  it("forwards plan, replace, move and shopping actions with typed domain arguments", () => {
    const dayProps = contentProps({ calendarMode: "day" });
    const dayTree = MenuViewContent(dayProps);
    const breakfast = dayProps.recipes.find((recipe) => recipe.id === dayProps.breakfastId);
    const meal = dayProps.meals[0];
    const component = meal.components[0];

    clickButton(dayTree, "Поставить завтрак");
    expect(dayProps.onPlanMeal).toHaveBeenCalledWith(breakfast, "breakfast", "2026-01-15");

    clickButton(dayTree, `${slotLabels[component.slot]}: ${dayProps.dishMap.get(component.dishId)?.name}`);
    expect(dayProps.onReplace).toHaveBeenCalledWith(meal, component.slot);

    clickButton(dayTree, "Открыть общий список покупок");
    expect(dayProps.onOpenShopping).toHaveBeenCalledOnce();

    const weekProps = contentProps({ calendarMode: "week" });
    clickButton(MenuViewContent(weekProps), "Перенести на выбранную дату");
    expect(weekProps.onMoveMealToDate).toHaveBeenCalledWith(weekProps.meals.at(-1), "2026-01-15");
  });

  it("forwards every existing regeneration mode without changing it", () => {
    const props = contentProps({ budgetLimit: "100" });
    const tree = MenuViewContent(props);

    clickButton(tree, "Пересобрать неделю");
    clickButton(tree, "Сделать меню экономнее");
    clickButton(tree, "Сгенерировать неделю");
    clickButton(tree, "Будни проще");
    clickButton(tree, "Использовать остатки");
    clickButton(tree, "Взять из морозилки");

    expect(props.regenerate).toHaveBeenNthCalledWith(1, "balanced");
    expect(props.regenerate).toHaveBeenNthCalledWith(2, "cheap");
    expect(props.regenerate).toHaveBeenNthCalledWith(3, "balanced");
    expect(props.regenerate).toHaveBeenNthCalledWith(4, "simple");
    expect(props.regenerate).toHaveBeenNthCalledWith(5, "leftovers");
    expect(props.regenerate).toHaveBeenNthCalledWith(6, "freezer");
  });
});
