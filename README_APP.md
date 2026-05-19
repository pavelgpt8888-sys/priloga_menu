# Домашний диспетчер еды

Браузерный MVP семейного планировщика еды: меню на неделю, остатки, морозилка, холодильник и запасы, покупки, режим готовки и черновик импорта рецепта.

## Что внутри

- Next.js App Router + TypeScript + Tailwind CSS.
- shadcn/ui-ready структура: `components.json`, `src/components/ui/*`, `cn()` helper.
- Local/demo data layer через `localStorage`.
- Supabase-ready типы: семья, блюда, меню, остатки, морозилка, запасы, покупки, черновики рецептов, готовка.
- PWA-ready manifest и SVG-иконка.
- Более 100 домашних блюд и компонентов, типичных для семьи в Беларуси.

## Локальный запуск

```bash
npm install
npm run dev
```

Откройте `http://localhost:3000`.

## Проверки

```bash
npm run lint
npm run build
```

## Деплой на Vercel

1. Импортируйте репозиторий в Vercel.
2. Framework preset: Next.js.
3. Build command: `npm run build`.
4. Output directory оставьте пустым/default.
5. Для MVP переменные окружения не нужны.

## Supabase позже

`.env.example` уже содержит будущие ключи:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Сейчас приложение не требует Supabase и хранит демо-состояние в браузере.
