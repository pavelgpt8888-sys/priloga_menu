# AGENTS.md

## Project

This repository contains "Домашний диспетчер еды", a browser-first Next.js MVP for family meal planning, shopping lists, inventory, leftovers, freezer items, recipes, cooking mode, and future AI-assisted food input.

Production/test link: https://priloga-menu.vercel.app/
GitHub source of truth: https://github.com/pavelgpt8888-sys/priloga_menu

## Product Direction

- Build a practical family kitchen assistant, not a CRM or marketing site.
- Keep the first screen useful: today's meals, quick actions, urgent leftovers, freezer, and shopping needs.
- Prioritize mobile ergonomics while keeping desktop pleasant.
- Preserve the user-liked warm Vercel version unless the user explicitly asks for a redesign.
- Avoid sweeping rewrites. Improve the existing app in small, reviewable steps.
- Food images must match item names. If matching cannot be guaranteed, use a neutral placeholder or no image.
- Meal suggestions should feel believable for a Belarusian family with medium-high income: simple weekday meals, better weekend meals, realistic breakfasts, kids' preferences, leftovers, freezer, and pantry.
- Family profiles must support editable personal data, tastes, dislikes, restrictions, notes, and later voice/photo-based favorite dish capture.

## Engineering Workflow

- Read the relevant files before editing.
- Keep changes scoped to the requested behavior.
- Do not redesign unrelated screens during feature work.
- Use GitHub as the source of truth and Vercel as the public testing surface.
- Before commit/push, run the strongest practical checks for the change: usually `npm run lint` and `npm run build`.
- If a dev server is needed, run it locally and verify the app in the browser.
- Use tags/releases for stable checkpoints so we can roll back.
- Prefer `git revert` for rollback commits. Avoid destructive reset commands unless the user explicitly asks.

## Versioning Rules

- `main` should stay stable enough for Vercel deploys.
- Use small commits with clear imperative messages.
- Create tags for meaningful versions, for example `v0.2-family-profiles`.
- For risky UI experiments, use a branch like `experiment/mobile-redesign` and merge only after the user approves.
- When the user says "верни назад", first identify the liked commit/deployment, then revert only the unwanted changes.

## Current Architecture Notes

- Next.js App Router + TypeScript + Tailwind CSS.
- Current data layer is localStorage/demo state.
- Data models are Supabase-ready but there is no real database/auth yet.
- Family profile edits are saved only in the current browser until Supabase is added.
- Existing lint warnings about raw `<img>` may remain while the user prefers the current visual version.

## Communication With Pavel

- Answer in Russian unless the user asks otherwise.
- Be direct, practical, and do the work rather than only proposing it.
- Explain where the link is, what was pushed, and what can be tested.
- If something is only local, say so clearly.
- When making design decisions, think like a product designer, but avoid large visual pivots without confirmation.
