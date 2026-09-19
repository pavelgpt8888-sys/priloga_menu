import { createElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { seededState } from "@/lib/local-state";
import { byId } from "@/lib/planner";
import type { MealComponent } from "@/lib/types";

import { TODAY_QUICK_SCENARIOS, TodayView, type TodayViewProps } from "../today-view";

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

function fixedProps(): TodayViewProps {
  const state = seededState();
  const meal = { ...state.meals[0], date: "2026-01-15" };
  return {
    meals: [meal],
    shopping: state.shopping.slice(0, 2),
    dishMap: byId(state.dishes),
    urgentItems: ["Молоко: использовать до 2026-01-16"],
    suggestionDate: "2026-01-16",
    slotLabels,
    onOpenShopping: vi.fn(),
    onReplace: vi.fn(),
    onRemove: vi.fn(),
    onMove: vi.fn(),
    onRepeat: vi.fn(),
    onShop: vi.fn(),
    onBan: vi.fn(),
    onCook: vi.fn(),
    onQuick: vi.fn(),
    onSuggestFromPantry: vi.fn(() => []),
    onPlanSuggested: vi.fn(),
  };
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

describe("TodayView extraction contract", () => {
  it("renders the fixed current-day content, shopping preview, pantry prompt and responsive quick actions", () => {
    const props = fixedProps();
    const mealDish = props.dishMap.get(props.meals[0].components[0].dishId);
    const markup = renderToStaticMarkup(createElement(TodayView, props));

    expect(markup).toContain("Завтрак · 15 янв.");
    expect(markup).toContain(mealDish?.name);
    expect(markup).toContain("Что приготовить из того, что есть");
    expect(markup).toContain("Молоко: использовать до 2026-01-16");
    expect(markup).toContain("Общий список покупок");
    expect(markup).toContain("Быстро изменить меню");
    expect(markup).toContain("xl:hidden");
    expect(markup).toContain("xl:grid");
    expect(TODAY_QUICK_SCENARIOS).toHaveLength(8);
  });

  it("forwards quick, replace and meal action callbacks without owning domain state", () => {
    const props = fixedProps();
    const tree = TodayView(props);
    let quickAction: (() => void) | undefined;
    let mealCardProps: Record<string, unknown> | undefined;

    visitElements(tree, (element) => {
      if (element.props.children === TODAY_QUICK_SCENARIOS[0] && typeof element.props.onClick === "function") {
        quickAction = element.props.onClick as () => void;
      }
      if (element.props.meal === props.meals[0]) mealCardProps = element.props;
    });

    expect(quickAction).toBeTypeOf("function");
    quickAction?.();
    expect(props.onQuick).toHaveBeenCalledWith("Нет времени");

    expect(mealCardProps).toBeDefined();
    (mealCardProps?.onReplace as TodayViewProps["onReplace"])(props.meals[0], props.meals[0].components[0].slot);
    (mealCardProps?.onMove as TodayViewProps["onMove"])(props.meals[0]);
    expect(props.onReplace).toHaveBeenCalledWith(props.meals[0], props.meals[0].components[0].slot);
    expect(props.onMove).toHaveBeenCalledWith(props.meals[0]);
  });
});
