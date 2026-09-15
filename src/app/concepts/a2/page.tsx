"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronRight,
  Clock3,
  Home,
  Mic,
  MoreHorizontal,
  PackageCheck,
  Plus,
  RotateCcw,
  Settings2,
  ShoppingCart,
  Soup,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";

type PaletteKey = "terracotta" | "tomato" | "sage";

type Palette = {
  name: string;
  note: string;
  accent: string;
  accentDark: string;
  accentSoft: string;
  background: string;
  surface: string;
  text: string;
  muted: string;
  green: string;
  greenSoft: string;
  gold: string;
  goldSoft: string;
};

const palettes: Record<PaletteKey, Palette> = {
  terracotta: {
    name: "Терракота",
    note: "тёплый, домашний, аппетитный",
    accent: "#C65F49",
    accentDark: "#A64836",
    accentSoft: "#F7E6E1",
    background: "#F7F5F1",
    surface: "#FFFFFF",
    text: "#202521",
    muted: "#727872",
    green: "#67836C",
    greenSoft: "#E8F0E9",
    gold: "#B88B3E",
    goldSoft: "#F6EEDC",
  },
  tomato: {
    name: "Томат",
    note: "ярче, энергичнее, ближе к Bring",
    accent: "#E35D4F",
    accentDark: "#C5463B",
    accentSoft: "#FBE5E2",
    background: "#F8F7F4",
    surface: "#FFFFFF",
    text: "#222523",
    muted: "#727673",
    green: "#64846D",
    greenSoft: "#E7F0E9",
    gold: "#C09342",
    goldSoft: "#F8EFDB",
  },
  sage: {
    name: "Шалфей",
    note: "спокойнее, натуральнее, менее «ресторанный»",
    accent: "#798C69",
    accentDark: "#607154",
    accentSoft: "#E8EEE3",
    background: "#F5F5F0",
    surface: "#FFFFFF",
    text: "#222720",
    muted: "#73796F",
    green: "#798C69",
    greenSoft: "#E8EEE3",
    gold: "#B9894D",
    goldSoft: "#F3EBDD",
  },
};

const days = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const meals = [
  {
    id: "breakfast",
    label: "Завтрак",
    title: "Сырники со сметаной",
    meta: "15 мин · 4 порции",
    status: "готово по плану",
    emoji: "🥞",
    current: false,
  },
  {
    id: "lunch",
    label: "Обед",
    title: "Куриный суп",
    meta: "остатки со вчера · хватит на всех",
    status: "уже дома",
    emoji: "🍲",
    current: false,
  },
  {
    id: "dinner",
    label: "Ужин",
    title: "Паста болоньезе",
    meta: "25 мин · 4 порции",
    status: "следующий приём пищи",
    emoji: "🍝",
    current: true,
  },
];

function NavItem({ icon: Icon, label, active, accent }: { icon: typeof Home; label: string; active?: boolean; accent: string }) {
  return (
    <button
      className="flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-semibold"
      style={{ color: active ? accent : "#9A9F9A" }}
    >
      <Icon size={21} strokeWidth={active ? 2.4 : 2} />
      {label}
    </button>
  );
}

export default function A2ConceptPage() {
  const [paletteKey, setPaletteKey] = useState<PaletteKey>("terracotta");
  const [selectedDay, setSelectedDay] = useState(2);
  const [checked, setChecked] = useState<string[]>([]);
  const palette = palettes[paletteKey];

  const groceries = useMemo(
    () => [
      { id: "milk", emoji: "🥛", name: "Молоко", qty: "2 л" },
      { id: "eggs", emoji: "🥚", name: "Яйца", qty: "10 шт" },
      { id: "tomatoes", emoji: "🍅", name: "Томаты", qty: "800 г" },
      { id: "cheese", emoji: "🧀", name: "Сыр", qty: "400 г" },
    ],
    [],
  );

  const toggleChecked = (id: string) => {
    setChecked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <main className="min-h-screen px-4 py-6 md:py-10" style={{ background: "#ECEEEB" }}>
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">A2 · Bring Family Refined</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 md:text-3xl">Один интерфейс — три палитры</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
              Фокус — именно на сегодняшнем дне: завтрак, обед, ужин, покупки и минимум действий. Переключай палитры и смотри с телефона.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {(Object.keys(palettes) as PaletteKey[]).map((key) => {
              const item = palettes[key];
              const active = key === paletteKey;
              return (
                <button
                  key={key}
                  onClick={() => setPaletteKey(key)}
                  className="rounded-full border px-3 py-2 text-xs font-bold transition"
                  style={{
                    background: active ? item.accent : "white",
                    color: active ? "white" : "#4B514C",
                    borderColor: active ? item.accent : "#D6D9D5",
                  }}
                >
                  {item.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr] lg:items-start">
          <div className="mx-auto w-full max-w-[410px] overflow-hidden rounded-[36px] border border-black/10 bg-white shadow-[0_30px_80px_rgba(25,35,28,0.18)]">
            <div className="flex h-7 items-end justify-center pb-1" style={{ background: palette.background }}>
              <div className="h-1.5 w-20 rounded-full" style={{ background: palette.text }} />
            </div>

            <div className="flex min-h-[795px] flex-col" style={{ background: palette.background, color: palette.text }}>
              <div className="px-5 pb-4 pt-4">
                <header className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium" style={{ color: palette.muted }}>Среда, 16 сентября</p>
                    <h2 className="mt-1 text-[28px] font-extrabold tracking-[-0.04em]">Сегодня</h2>
                  </div>
                  <button
                    className="grid h-11 w-11 place-items-center rounded-full border"
                    style={{ background: palette.surface, borderColor: "rgba(0,0,0,.06)" }}
                    aria-label="Настройки"
                  >
                    <Settings2 size={19} />
                  </button>
                </header>

                <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
                  {days.map((day, index) => {
                    const active = selectedDay === index;
                    return (
                      <button
                        key={day}
                        onClick={() => setSelectedDay(index)}
                        className="grid h-12 min-w-11 place-items-center rounded-[17px] text-sm font-bold transition"
                        style={{
                          background: active ? palette.accent : palette.surface,
                          color: active ? "white" : palette.muted,
                          boxShadow: active ? `0 8px 18px ${palette.accent}2B` : "0 1px 2px rgba(0,0,0,.03)",
                        }}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>

                <section className="mt-5 space-y-2.5">
                  {meals.filter((meal) => !meal.current).map((meal) => (
                    <button
                      key={meal.id}
                      className="flex w-full items-center gap-3 rounded-[20px] border px-4 py-3.5 text-left"
                      style={{ background: palette.surface, borderColor: "rgba(0,0,0,.055)" }}
                    >
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-2xl" style={{ background: palette.goldSoft }}>
                        {meal.emoji}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-extrabold uppercase tracking-[0.12em]" style={{ color: palette.muted }}>{meal.label}</span>
                          <span className="h-1 w-1 rounded-full" style={{ background: palette.muted }} />
                          <span className="truncate text-[11px] font-semibold" style={{ color: palette.green }}>{meal.status}</span>
                        </div>
                        <div className="mt-1 truncate text-[15px] font-bold">{meal.title}</div>
                        <div className="mt-0.5 truncate text-xs" style={{ color: palette.muted }}>{meal.meta}</div>
                      </div>
                      <ChevronRight size={18} style={{ color: palette.muted }} />
                    </button>
                  ))}
                </section>

                <section
                  className="mt-3 rounded-[28px] p-5 text-white"
                  style={{
                    background: `linear-gradient(145deg, ${palette.accent} 0%, ${palette.accentDark} 100%)`,
                    boxShadow: `0 18px 34px ${palette.accent}33`,
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.11em] text-white/80">
                      <UtensilsCrossed size={15} /> Ужин · следующий
                    </div>
                    <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold">всё почти есть</span>
                  </div>

                  <div className="mt-5 flex items-end justify-between gap-4">
                    <div>
                      <div className="text-4xl">🍝</div>
                      <h3 className="mt-3 text-[25px] font-extrabold leading-tight tracking-[-0.03em]">Паста болоньезе</h3>
                      <div className="mt-2 flex flex-wrap gap-3 text-sm text-white/80">
                        <span className="flex items-center gap-1.5"><Clock3 size={15} /> 25 мин</span>
                        <span>4 порции</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-[1fr_1fr] gap-2">
                    <button className="h-11 rounded-2xl bg-white/13 text-sm font-bold">Заменить</button>
                    <button className="h-11 rounded-2xl bg-white text-sm font-extrabold" style={{ color: palette.accentDark }}>Рецепт</button>
                  </div>
                </section>

                <section className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    className="rounded-[22px] border p-4 text-left"
                    style={{ background: palette.surface, borderColor: "rgba(0,0,0,.055)" }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="grid h-9 w-9 place-items-center rounded-2xl" style={{ background: palette.greenSoft, color: palette.green }}>
                        <ShoppingCart size={18} />
                      </div>
                      <ChevronRight size={17} style={{ color: palette.muted }} />
                    </div>
                    <div className="mt-4 text-[11px] font-bold uppercase tracking-[0.11em]" style={{ color: palette.muted }}>Покупки</div>
                    <div className="mt-1 text-lg font-extrabold">7 осталось</div>
                  </button>

                  <button
                    className="rounded-[22px] border p-4 text-left"
                    style={{ background: palette.surface, borderColor: "rgba(0,0,0,.055)" }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="grid h-9 w-9 place-items-center rounded-2xl" style={{ background: palette.goldSoft, color: palette.gold }}>
                        <PackageCheck size={18} />
                      </div>
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-extrabold" style={{ background: palette.goldSoft, color: palette.gold }}>2 ?</span>
                    </div>
                    <div className="mt-4 text-[11px] font-bold uppercase tracking-[0.11em]" style={{ color: palette.muted }}>Дома</div>
                    <div className="mt-1 text-lg font-extrabold">Надо уточнить</div>
                  </button>
                </section>

                <section className="mt-4 rounded-[24px] border p-4" style={{ background: palette.surface, borderColor: "rgba(0,0,0,.055)" }}>
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-[0.11em]" style={{ color: palette.muted }}>Ближайшие покупки</div>
                      <div className="mt-1 text-base font-extrabold">Можно закрыть за один заход</div>
                    </div>
                    <ChevronRight size={18} style={{ color: palette.muted }} />
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {groceries.map((item) => {
                      const done = checked.includes(item.id);
                      return (
                        <button
                          key={item.id}
                          onClick={() => toggleChecked(item.id)}
                          className="rounded-[17px] px-2 py-2.5 text-center transition"
                          style={{
                            background: done ? palette.greenSoft : palette.accentSoft,
                            opacity: done ? 0.58 : 1,
                          }}
                        >
                          <div className="text-xl">{item.emoji}</div>
                          <div className="mt-1 truncate text-[10px] font-extrabold">{item.name}</div>
                          <div className="mt-0.5 text-[9px]" style={{ color: palette.muted }}>{item.qty}</div>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button className="flex h-12 items-center justify-center gap-2 rounded-2xl border bg-white text-sm font-bold" style={{ borderColor: "rgba(0,0,0,.07)" }}>
                    <Plus size={18} /> Добавить
                  </button>
                  <button className="flex h-12 items-center justify-center gap-2 rounded-2xl text-sm font-bold text-white" style={{ background: palette.text }}>
                    <Mic size={18} /> Сказать
                  </button>
                </div>
              </div>

              <nav className="mt-auto grid grid-cols-4 border-t px-2 pb-4 pt-1" style={{ background: palette.surface, borderColor: "rgba(0,0,0,.06)" }}>
                <NavItem icon={Home} label="Сегодня" active accent={palette.accent} />
                <NavItem icon={CalendarDays} label="Меню" accent={palette.accent} />
                <NavItem icon={ShoppingCart} label="Покупки" accent={palette.accent} />
                <NavItem icon={MoreHorizontal} label="Ещё" accent={palette.accent} />
              </nav>
            </div>
          </div>

          <aside className="rounded-[28px] bg-white p-5 shadow-sm md:p-6">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl" style={{ background: palette.accentSoft, color: palette.accent }}>
                <Sparkles size={19} />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-zinc-900">{palette.name}</h3>
                <p className="mt-1 text-sm text-zinc-500">{palette.note}</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-5 gap-2">
              {[palette.accent, palette.background, palette.surface, palette.green, palette.gold].map((color) => (
                <div key={color}>
                  <div className="h-12 rounded-2xl border border-black/5" style={{ background: color }} />
                  <div className="mt-1 text-center font-mono text-[9px] text-zinc-400">{color}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl bg-zinc-50 p-4">
              <div className="flex items-center gap-2 text-sm font-extrabold text-zinc-900"><Soup size={17} /> Что я изменил относительно A</div>
              <ul className="mt-3 space-y-2 text-sm leading-5 text-zinc-600">
                <li>• День — главный контекст. Никакой «недели списком» на главной.</li>
                <li>• Завтрак и обед видны сразу, но компактно; ужин — главный акцент.</li>
                <li>• Покупки и Smart Pantry ниже, как поддержка решения, а не как отдельный dashboard.</li>
                <li>• Эмодзи оставлены только как прототип содержимого; в финале их лучше заменить иконками/фото там, где это уместно.</li>
                <li>• Навигация сокращена до 4 верхнеуровневых разделов.</li>
              </ul>
            </div>

            <button
              onClick={() => {
                setSelectedDay(2);
                setChecked([]);
                setPaletteKey("terracotta");
              }}
              className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-zinc-900 text-sm font-bold text-white"
            >
              <RotateCcw size={16} /> Сбросить демо
            </button>
          </aside>
        </div>
      </div>
    </main>
  );
}
