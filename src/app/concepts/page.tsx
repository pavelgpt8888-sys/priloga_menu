"use client";

import { useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Heart,
  Home,
  LayoutGrid,
  List,
  Mic,
  MoreHorizontal,
  Package,
  Plus,
  Search,
  Settings2,
  ShoppingCart,
  Snowflake,
  Sparkles,
  Users,
  UtensilsCrossed,
} from "lucide-react";

const week = [
  { day: "Пн", meal: "Плов" },
  { day: "Вт", meal: "Курица" },
  { day: "Ср", meal: "Паста" },
  { day: "Чт", meal: "Остатки" },
  { day: "Пт", meal: "Пицца" },
  { day: "Сб", meal: "Сырники" },
  { day: "Вс", meal: "Суп" },
];

const groceryTiles = [
  { emoji: "🥛", name: "Молоко", qty: "2 л", tone: "bg-[#EAF3FF]" },
  { emoji: "🥚", name: "Яйца", qty: "10 шт", tone: "bg-[#FFF3D6]" },
  { emoji: "🍅", name: "Томаты", qty: "800 г", tone: "bg-[#FFE9E6]" },
  { emoji: "🧀", name: "Сыр", qty: "400 г", tone: "bg-[#FFF2C8]" },
];

function PhoneShell({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="mx-auto w-full max-w-[390px]">
      <div className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </div>
      <div className="overflow-hidden rounded-[34px] border border-black/10 bg-white shadow-[0_28px_80px_rgba(0,0,0,0.12)]">
        <div className="flex h-7 items-end justify-center bg-white pb-1">
          <div className="h-1.5 w-20 rounded-full bg-zinc-900" />
        </div>
        <div className="min-h-[760px]">{children}</div>
      </div>
    </div>
  );
}

function BringFamily() {
  return (
    <div className="flex min-h-[760px] flex-col bg-[#F6F7F9] text-[#20242A]">
      <div className="px-5 pb-4 pt-4">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-500">Добрый вечер 👋</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Домашнее меню</h1>
          </div>
          <button className="grid h-11 w-11 place-items-center rounded-full bg-white shadow-sm" aria-label="Настройки">
            <Settings2 size={20} />
          </button>
        </div>

        <div className="mb-4 flex gap-2 overflow-hidden">
          {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day, i) => (
            <div
              key={day}
              className={`grid h-11 min-w-10 place-items-center rounded-2xl text-sm font-semibold ${
                i === 2 ? "bg-[#F05D52] text-white" : "bg-white text-zinc-500"
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        <div className="rounded-[26px] bg-[#F05D52] p-5 text-white shadow-[0_14px_28px_rgba(240,93,82,0.22)]">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-white/18 px-3 py-1 text-xs font-semibold">Сегодня · ужин</span>
            <Heart size={20} fill="currentColor" className="opacity-90" />
          </div>
          <div className="mt-6 text-3xl">🍝</div>
          <h2 className="mt-3 text-2xl font-bold">Паста болоньезе</h2>
          <div className="mt-2 flex items-center gap-4 text-sm text-white/85">
            <span className="flex items-center gap-1.5"><Clock3 size={15} /> 25 минут</span>
            <span>4 порции</span>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button className="h-11 rounded-2xl bg-white/16 text-sm font-semibold">Заменить</button>
            <button className="h-11 rounded-2xl bg-white text-sm font-bold text-[#D64E45]">Готовим</button>
          </div>
        </div>

        <div className="mt-4 rounded-[24px] bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Покупки</p>
              <h3 className="mt-1 text-lg font-bold">Осталось 8 продуктов</h3>
            </div>
            <ChevronRight className="text-zinc-400" size={20} />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {groceryTiles.map((item) => (
              <div key={item.name} className={`${item.tone} rounded-[18px] px-2 py-3 text-center`}>
                <div className="text-2xl">{item.emoji}</div>
                <div className="mt-2 truncate text-[11px] font-semibold">{item.name}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-white font-semibold shadow-sm">
            <Plus size={18} /> Блюдо
          </button>
          <button className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#20242A] font-semibold text-white">
            <Mic size={18} /> Сказать
          </button>
        </div>
      </div>

      <div className="mt-auto grid grid-cols-4 border-t border-black/5 bg-white px-2 pb-4 pt-2">
        {[
          [Home, "Сегодня", true],
          [CalendarDays, "Меню", false],
          [ShoppingCart, "Покупки", false],
          [MoreHorizontal, "Ещё", false],
        ].map(([Icon, text, active]) => {
          const I = Icon as typeof Home;
          return (
            <button key={String(text)} className={`flex flex-col items-center gap-1 py-2 text-[11px] font-semibold ${active ? "text-[#F05D52]" : "text-zinc-400"}`}>
              <I size={21} /> {String(text)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function NativeCalm() {
  return (
    <div className="flex min-h-[760px] flex-col bg-[#F5F6F7] text-[#17191C]">
      <div className="px-5 pb-4 pt-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-zinc-500">Среда, 16 сентября</p>
            <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.03em]">Сегодня</h1>
          </div>
          <button className="grid h-10 w-10 place-items-center rounded-full bg-[#ECEDEF]" aria-label="Меню">
            <MoreHorizontal size={20} />
          </button>
        </div>

        <section className="mt-7 border-b border-black/8 pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.13em] text-[#5D8C78]">Ужин</p>
          <div className="mt-3 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-[26px] font-semibold tracking-[-0.03em]">Паста болоньезе</h2>
              <p className="mt-2 text-sm text-zinc-500">25 мин · 4 порции · нравится всей семье</p>
            </div>
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#EAF3EF] text-3xl">🍝</div>
          </div>
          <button className="mt-5 flex h-11 items-center gap-2 rounded-full bg-[#E8F1ED] px-4 text-sm font-semibold text-[#356C59]">
            Изменить <ChevronRight size={16} />
          </button>
        </section>

        <section className="border-b border-black/8 py-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">На этой неделе</h3>
            <button className="text-sm font-medium text-[#497A67]">Открыть</button>
          </div>
          <div className="mt-4 space-y-3">
            {week.slice(0, 5).map((item, i) => (
              <div key={item.day} className="flex items-center gap-3">
                <div className={`grid h-8 w-8 place-items-center rounded-full text-xs font-semibold ${i === 2 ? "bg-[#437D68] text-white" : "bg-[#E9EAEC] text-zinc-500"}`}>
                  {item.day}
                </div>
                <span className={`text-[15px] ${i === 2 ? "font-semibold" : "text-zinc-600"}`}>{item.meal}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Покупки</h3>
              <p className="mt-1 text-sm text-zinc-500">8 осталось</p>
            </div>
            <button className="grid h-10 w-10 place-items-center rounded-full bg-[#E8F1ED] text-[#356C59]">
              <Plus size={19} />
            </button>
          </div>
          <div className="mt-4 divide-y divide-black/6 rounded-2xl bg-white px-4">
            {["Молоко", "Яйца", "Сыр", "Куриное филе"].map((item, i) => (
              <div key={item} className="flex h-12 items-center justify-between">
                <span className="text-[15px]">{item}</span>
                <span className="text-sm text-zinc-400">{["2 л", "10 шт", "400 г", "1.2 кг"][i]}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-auto grid grid-cols-4 border-t border-black/8 bg-[#FBFBFC] px-2 pb-4 pt-2">
        {[
          [Home, "Сегодня", true],
          [CalendarDays, "Меню", false],
          [ShoppingCart, "Покупки", false],
          [MoreHorizontal, "Ещё", false],
        ].map(([Icon, text, active]) => {
          const I = Icon as typeof Home;
          return (
            <button key={String(text)} className={`flex flex-col items-center gap-1 py-2 text-[11px] ${active ? "font-semibold text-[#356C59]" : "font-medium text-zinc-400"}`}>
              <I size={21} strokeWidth={active ? 2.4 : 2} /> {String(text)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FamilyOS() {
  return (
    <div className="flex min-h-[760px] flex-col bg-[#F4F5F8] text-[#17202A]">
      <div className="px-5 pb-4 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-500">Доброе утро ☀️</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Семья сегодня</h1>
          </div>
          <div className="flex -space-x-2">
            {["П", "М"].map((v, i) => (
              <div key={v} className={`grid h-10 w-10 place-items-center rounded-full border-2 border-[#F4F5F8] text-xs font-bold text-white ${i === 0 ? "bg-[#6575C8]" : "bg-[#E06B5C]"}`}>{v}</div>
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-[26px] bg-[#FFF0ED] p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#BC564A]"><UtensilsCrossed size={17} /> Сегодня на ужин</div>
            <ChevronRight size={19} className="text-[#BC564A]" />
          </div>
          <div className="mt-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Паста болоньезе</h2>
              <p className="mt-2 text-sm text-zinc-600">25 минут · всё нужное почти дома</p>
            </div>
            <div className="text-4xl">🍝</div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-[22px] bg-[#EAF2EC] p-4">
            <div className="flex items-center justify-between text-[#4D7B5A]"><ShoppingCart size={20} /><span className="text-xs font-bold">8</span></div>
            <h3 className="mt-5 font-bold">Покупки</h3>
            <p className="mt-1 text-xs text-zinc-500">осталось купить</p>
          </div>
          <div className="rounded-[22px] bg-[#EDF0FB] p-4">
            <div className="flex items-center justify-between text-[#6170B7]"><Package size={20} /><span className="text-xs font-bold">2 ?</span></div>
            <h3 className="mt-5 font-bold">Запасы</h3>
            <p className="mt-1 text-xs text-zinc-500">нужно уточнить</p>
          </div>
        </div>

        <div className="mt-3 rounded-[24px] bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Меню недели</p>
              <h3 className="mt-1 text-lg font-bold">5 из 7 дней готовы</h3>
            </div>
            <CalendarDays size={20} className="text-[#E06B5C]" />
          </div>
          <div className="mt-4 grid grid-cols-7 gap-1.5">
            {week.map((item, i) => (
              <div key={item.day} className={`rounded-xl px-1 py-2 text-center ${i === 2 ? "bg-[#17202A] text-white" : "bg-[#F3F4F6]"}`}>
                <div className="text-[10px] font-bold">{item.day}</div>
                <div className="mt-1 text-[13px]">{["🍚", "🍗", "🍝", "🥣", "🍕", "🥞", "🍲"][i]}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3 rounded-[24px] bg-[#F0EBFA] p-4">
          <div className="flex items-center gap-2 text-[#6F55A6]"><Sparkles size={18} /><span className="text-sm font-bold">Помощник</span></div>
          <p className="mt-3 text-[15px] font-medium leading-6">«В четверг поздно придём домой»</p>
          <div className="mt-4 flex gap-2">
            <button className="flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-white text-sm font-semibold text-[#6F55A6]"><Mic size={16} /> Сказать</button>
            <button className="grid h-10 w-10 place-items-center rounded-full bg-[#6F55A6] text-white"><ChevronRight size={17} /></button>
          </div>
        </div>
      </div>

      <div className="mt-auto grid grid-cols-4 border-t border-black/6 bg-white px-2 pb-4 pt-2">
        {[
          [Home, "Сегодня", true],
          [CalendarDays, "Меню", false],
          [ShoppingCart, "Покупки", false],
          [Users, "Семья", false],
        ].map(([Icon, text, active]) => {
          const I = Icon as typeof Home;
          return (
            <button key={String(text)} className={`flex flex-col items-center gap-1 py-2 text-[11px] font-semibold ${active ? "text-[#6575C8]" : "text-zinc-400"}`}>
              <I size={21} /> {String(text)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ShoppingPreview({ variant }: { variant: "bring" | "native" | "family" }) {
  const styles = {
    bring: { accent: "#F05D52", bg: "#F6F7F9", button: "bg-[#F05D52]" },
    native: { accent: "#356C59", bg: "#F5F6F7", button: "bg-[#356C59]" },
    family: { accent: "#6575C8", bg: "#F4F5F8", button: "bg-[#6575C8]" },
  }[variant];
  const [grid, setGrid] = useState(variant === "bring");
  const [checked, setChecked] = useState<string[]>([]);

  return (
    <div className="min-h-[760px] px-5 pb-24 pt-4" style={{ background: styles.bg }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-zinc-500">Список семьи</p>
          <h1 className="mt-1 text-2xl font-bold">Покупки · 12</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setGrid(false)} className={`grid h-10 w-10 place-items-center rounded-full ${!grid ? "text-white" : "bg-white text-zinc-500"}`} style={!grid ? { background: styles.accent } : undefined}><List size={18} /></button>
          <button onClick={() => setGrid(true)} className={`grid h-10 w-10 place-items-center rounded-full ${grid ? "text-white" : "bg-white text-zinc-500"}`} style={grid ? { background: styles.accent } : undefined}><LayoutGrid size={18} /></button>
        </div>
      </div>
      <div className="mt-4 flex h-12 items-center gap-3 rounded-2xl bg-white px-4 shadow-sm">
        <Search size={18} className="text-zinc-400" />
        <span className="text-sm text-zinc-400">Добавить продукт...</span>
        <Mic size={18} className="ml-auto" style={{ color: styles.accent }} />
      </div>
      <div className="mt-5">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-zinc-400">Нужно купить</p>
        <div className={grid ? "grid grid-cols-2 gap-3" : "space-y-2"}>
          {[...groceryTiles, { emoji: "🍗", name: "Куриное филе", qty: "1.2 кг", tone: "bg-[#FBEDE9]" }, { emoji: "🥒", name: "Огурцы", qty: "3 шт", tone: "bg-[#EAF4EA]" }].map((item) => {
            const done = checked.includes(item.name);
            return (
              <button
                key={item.name}
                onClick={() => setChecked((prev) => done ? prev.filter((x) => x !== item.name) : [...prev, item.name])}
                className={`${grid ? "rounded-[20px] p-4 text-left" : "flex h-14 w-full items-center gap-3 rounded-2xl px-4 text-left"} ${done ? "bg-zinc-200 opacity-55" : grid && variant === "bring" ? item.tone : "bg-white"}`}
              >
                <span className={grid ? "text-3xl" : "text-xl"}>{item.emoji}</span>
                <span className={grid ? "mt-4 block" : "flex-1"}>
                  <span className={`block font-semibold ${done ? "line-through" : ""}`}>{item.name}</span>
                  <span className="mt-1 block text-xs text-zinc-500">{item.qty}</span>
                </span>
                {done && <Check size={18} className="ml-auto" />}
              </button>
            );
          })}
        </div>
      </div>
      <button className={`fixed bottom-6 left-1/2 flex h-13 -translate-x-1/2 items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white shadow-xl ${styles.button}`}>
        <Plus size={18} /> Добавить
      </button>
    </div>
  );
}

const conceptMeta = {
  bring: { name: "A · Bring Family", note: "Яркий, быстрый, плитки и категории" },
  native: { name: "B · Native Calm", note: "Спокойный, нативный, минимум шума" },
  family: { name: "C · Family OS", note: "Еда как часть будущего семейного ассистента" },
} as const;

type ConceptKey = keyof typeof conceptMeta;

function Concept({ type }: { type: ConceptKey }) {
  if (type === "bring") return <BringFamily />;
  if (type === "native") return <NativeCalm />;
  return <FamilyOS />;
}

export default function ConceptsPage() {
  const [active, setActive] = useState<ConceptKey>("bring");
  const [screen, setScreen] = useState<"home" | "shopping">("home");

  return (
    <main className="min-h-screen bg-[#ECEEF2] px-3 py-6 text-zinc-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1380px]">
        <div className="mb-7 rounded-[26px] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">Design playground · не production</p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Три направления для «Домашнего диспетчера еды»</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">Одинаковый семейный сценарий показан в трёх дизайн-системах. На телефоне переключай варианты сверху; на компьютере все три видны рядом.</p>
            </div>
            <div className="flex rounded-2xl bg-[#F2F3F5] p-1">
              <button onClick={() => setScreen("home")} className={`rounded-xl px-4 py-2 text-sm font-semibold ${screen === "home" ? "bg-white shadow-sm" : "text-zinc-500"}`}>Сегодня</button>
              <button onClick={() => setScreen("shopping")} className={`rounded-xl px-4 py-2 text-sm font-semibold ${screen === "shopping" ? "bg-white shadow-sm" : "text-zinc-500"}`}>Покупки</button>
            </div>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-3 gap-2 lg:hidden">
          {(Object.keys(conceptMeta) as ConceptKey[]).map((key) => (
            <button key={key} onClick={() => setActive(key)} className={`rounded-2xl px-2 py-3 text-center text-xs font-bold ${active === key ? "bg-zinc-900 text-white" : "bg-white text-zinc-500"}`}>
              {key === "bring" ? "A · Bring" : key === "native" ? "B · Native" : "C · Family OS"}
            </button>
          ))}
        </div>

        <div className="lg:hidden">
          <div className="mb-3 text-center">
            <h2 className="font-bold">{conceptMeta[active].name}</h2>
            <p className="mt-1 text-xs text-zinc-500">{conceptMeta[active].note}</p>
          </div>
          <PhoneShell label={screen === "home" ? "Главный экран" : "Экран покупок"}>
            {screen === "home" ? <Concept type={active} /> : <ShoppingPreview variant={active} />}
          </PhoneShell>
        </div>

        <div className="hidden grid-cols-3 gap-5 lg:grid">
          {(Object.keys(conceptMeta) as ConceptKey[]).map((key) => (
            <div key={key}>
              <div className="mb-4 text-center">
                <h2 className="text-lg font-bold">{conceptMeta[key].name}</h2>
                <p className="mt-1 text-xs text-zinc-500">{conceptMeta[key].note}</p>
              </div>
              <PhoneShell label={screen === "home" ? "Главный экран" : "Экран покупок"}>
                {screen === "home" ? <Concept type={key} /> : <ShoppingPreview variant={key} />}
              </PhoneShell>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-8 max-w-4xl rounded-[24px] bg-white p-5 text-sm leading-6 text-zinc-600 shadow-sm">
          <div className="flex gap-3">
            <Sparkles className="mt-0.5 shrink-0 text-violet-500" size={19} />
            <p><strong className="text-zinc-900">Что смотреть:</strong> скорость считывания экрана, комфорт цвета, понятность основных действий, насколько хочется пользоваться каждый день и насколько естественно экран «Покупки» ощущается в магазине. Кнопки плитка/список и отметка покупок интерактивны.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
