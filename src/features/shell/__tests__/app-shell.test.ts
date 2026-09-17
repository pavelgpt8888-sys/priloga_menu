import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  APP_SECTION_NAMES,
  AppShell,
  MOBILE_MORE_SECTION_NAMES,
  MOBILE_PRIMARY_SECTION_NAMES,
} from "../app-shell";

describe("AppShell navigation contract", () => {
  it("preserves the existing section labels and order", () => {
    expect(APP_SECTION_NAMES).toEqual([
      "Сегодня",
      "Меню",
      "Блюда",
      "Семья",
      "Кухня",
      "Остатки",
      "Морозилка",
      "Запасы",
      "Покупки",
      "Настройки",
    ]);
  });

  it("keeps every section reachable from the existing mobile navigation", () => {
    const reachable = [...MOBILE_PRIMARY_SECTION_NAMES, ...MOBILE_MORE_SECTION_NAMES];

    expect(new Set(reachable).size).toBe(APP_SECTION_NAMES.length);
    expect(reachable.toSorted()).toEqual([...APP_SECTION_NAMES].toSorted());
    expect(MOBILE_PRIMARY_SECTION_NAMES).toEqual(["Сегодня", "Меню", "Покупки", "Кухня"]);
    expect(MOBILE_MORE_SECTION_NAMES).toEqual(["Блюда", "Семья", "Остатки", "Морозилка", "Запасы", "Настройки"]);
  });

  it("renders the initial section, desktop and mobile navigation, and shopping count", () => {
    // createElement needs the render-prop function in props because functions are not ReactNode children.
    // eslint-disable-next-line react/no-children-prop
    const markup = renderToStaticMarkup(createElement(AppShell, {
      shoppingCount: 3,
      children: ({ active }) => createElement("p", null, `active:${active}`),
    }));

    expect(markup).toContain("active:Сегодня");
    expect(markup).toContain('aria-label="Основная навигация"');
    expect(markup).toContain('aria-label="Мобильная навигация"');
    expect(markup).toContain('aria-current="page"');
    expect(markup).toContain("Настройки");
    expect(markup).toContain(">3</span>");
  });
});
