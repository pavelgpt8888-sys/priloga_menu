"use client";

import { useEffect, useState, type ReactNode } from "react";
import { CalendarDays, ChefHat, Home, IceCreamBowl, MoreHorizontal, Settings, ShoppingBasket, Snowflake, Soup, Users, Warehouse, X, type LucideIcon } from "lucide-react";

export const APP_SECTION_NAMES = [
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
] as const;

export type AppSection = (typeof APP_SECTION_NAMES)[number];

const sectionIcons: Record<AppSection, LucideIcon> = {
  Сегодня: Home,
  Меню: CalendarDays,
  Блюда: Soup,
  Семья: Users,
  Кухня: ChefHat,
  Остатки: IceCreamBowl,
  Морозилка: Snowflake,
  Запасы: Warehouse,
  Покупки: ShoppingBasket,
  Настройки: Settings,
};

export const MOBILE_PRIMARY_SECTION_NAMES = ["Сегодня", "Меню", "Покупки", "Кухня"] as const satisfies readonly AppSection[];
export const MOBILE_MORE_SECTION_NAMES = ["Блюда", "Семья", "Остатки", "Морозилка", "Запасы", "Настройки"] as const satisfies readonly AppSection[];

export interface AppShellNavigation {
  active: AppSection;
  navigate: (section: AppSection) => void;
}

interface AppShellProps {
  shoppingCount: number;
  children: (navigation: AppShellNavigation) => ReactNode;
  overlay?: ReactNode;
}

export function AppShell({ shoppingCount, children, overlay }: AppShellProps) {
  const [active, setActive] = useState<AppSection>("Сегодня");
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [active]);

  function navigate(section: AppSection) {
    setActive(section);
    setMoreOpen(false);
  }

  return <main className="app-bg min-h-screen bg-background pb-24 text-foreground lg:pb-0">
    <div className="mx-auto flex max-w-[1500px] gap-5 p-3 sm:p-5">
      <aside className="sticky top-5 hidden h-[calc(100vh-40px)] w-64 shrink-0 overflow-hidden rounded-[1.7rem] border border-[#DCCDB8] bg-[#FFFDF6]/95 p-4 shadow-[0_24px_70px_rgba(63,93,66,0.16)] lg:block">
        <div className="mb-6 flex items-center gap-3 rounded-2xl bg-gradient-to-br from-[#fff1c9] to-[#edf7ed] p-3 ring-1 ring-[#e4d2a6]">
          <div className="grid size-11 place-items-center rounded-xl bg-[#e4b35a] text-[#24312b] shadow-inner"><ChefHat size={24} /></div>
          <div><p className="font-bold leading-tight">Домашний диспетчер еды</p><p className="text-sm text-muted-foreground">семейный помощник</p></div>
        </div>
        <nav className="grid gap-1" aria-label="Основная навигация">
          {APP_SECTION_NAMES.map((name) => {
            const Icon = sectionIcons[name];
            return <button key={name} onClick={() => navigate(name)} aria-current={active === name ? "page" : undefined} className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold transition ${active === name ? "bg-[#3f7d52] text-white shadow-[0_10px_22px_rgba(63,125,82,0.24)]" : "text-[#4c5c55] hover:bg-[#fff1c9]"}`}><Icon size={18} />{name}{name === "Покупки" && shoppingCount > 0 ? <span className="ml-auto rounded-full bg-[#e4b35a] px-2 py-0.5 text-xs text-[#24312b]">{shoppingCount}</span> : null}</button>;
          })}
        </nav>
      </aside>

      <section className="min-w-0 flex-1 space-y-5">
        {children({ active, navigate })}
      </section>
    </div>

    {moreOpen && <div className="fixed inset-0 z-30 bg-[#2f2a24]/30 lg:hidden" onClick={() => setMoreOpen(false)}>
      <section className="absolute inset-x-0 bottom-[72px] rounded-t-3xl border border-[#ead7bd] bg-[#fffdf6] p-4 shadow-[0_-16px_40px_rgba(47,42,36,0.15)]" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-black">Еще</h2>
          <button className="grid size-10 place-items-center rounded-xl bg-white" aria-label="Закрыть" onClick={() => setMoreOpen(false)}><X size={18} /></button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {MOBILE_MORE_SECTION_NAMES.map((name) => {
            const Icon = sectionIcons[name];
            return <button key={name} onClick={() => navigate(name)} aria-current={active === name ? "page" : undefined} className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl text-xs font-bold ${active === name ? "bg-[#fff0dc] text-primary" : "bg-white text-[#40504A]"}`}><Icon size={21} /><span>{name}</span></button>;
          })}
        </div>
      </section>
    </div>}
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 gap-1 border-t border-border bg-[#FFFDF8]/98 px-2 pb-2 pt-1 backdrop-blur lg:hidden" aria-label="Мобильная навигация">
      {MOBILE_PRIMARY_SECTION_NAMES.map((name) => {
        const Icon = sectionIcons[name];
        return <button key={name} onClick={() => navigate(name)} aria-current={active === name && !moreOpen ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-bold ${active === name && !moreOpen ? "text-primary" : "text-[#40504A]"}`}><Icon size={19} /><span>{name}</span></button>;
      })}
      <button onClick={() => setMoreOpen(!moreOpen)} aria-expanded={moreOpen} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-bold ${moreOpen || MOBILE_MORE_SECTION_NAMES.some((name) => name === active) ? "text-primary" : "text-[#40504A]"}`}><MoreHorizontal size={19} /><span>Еще</span></button>
    </nav>
    {overlay}
  </main>;
}
