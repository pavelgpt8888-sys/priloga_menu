# Product Vision — Family Food Manager

Status: 2026-09-16

## 1. Product thesis

`priloga_menu` evolves from a local family meal-planning demo into a **Family Food Manager**: a household system that turns family preferences into a practical weekly menu, recipes, shopping needs and, later, approximate knowledge of what is already at home.

The product is not a generic recipe catalog and not a household ERP. The main promise is:

> The family explains its habits once; the app prepares a sensible week, adapts to real choices, builds the shopping list and asks only when it is genuinely uncertain.

North-star principle: **minimum user actions per successfully planned week**.

## 2. Final product picture

Target flow:

`Household → preferences/restrictions → repertoire → week menu → recipes → leftovers/freezer → probable stock → shopping needs → optional AI assistance → later prices/offers/SKU → cart`

Core modules:

- Household / family members / roles.
- Family preferences, dislikes, favorites and hard restrictions.
- Family repertoire: 50–100 dishes the family actually eats.
- Weekly menu with breakfast/lunch/dinner, quick replacement, pinning and moving meals.
- Recipe/dish model with portions, ingredients, time, effort, cost, leftovers/freezer suitability.
- Leftovers + freezer as first-class food sources.
- Shopping list automatically derived from menu and available food.
- Smart Pantry: probabilistic stock, not mandatory manual accounting.
- History / learning loop: proposed, accepted, replaced, cooked, skipped, repeated.
- Shared household backend for web/PWA and future Telegram Family Assistant.
- Later bounded Saver module for offers, retailer SKU and basket optimization.

## 3. Product priorities

1. **Menu + recipes + shopping** — the product core.
2. **Low-friction household learning** — reduce repeated setup and corrections.
3. **Smart Pantry** — infer likely stock instead of forcing exact inventory maintenance.
4. **Family Assistant integration** — Telegram/voice/text as fast input into the same household model.
5. **Saver / retailer integrations** — only after the core weekly loop is useful and sticky.

## 4. What stays deterministic

Hard rules do not depend on an LLM:

- allergies and hard dietary restrictions;
- household permissions;
- quantities and units;
- shopping state and deduplication;
- inventory evidence/confidence updates;
- meal history and acceptance signals;
- critical calculations and validation;
- future checkout/cart state.

AI is an assistant layer, not the source of truth.

## 5. AI role later

High-value AI tasks:

- parse natural-language weekly requests;
- understand voice/text commands;
- parse/import recipe text;
- fuzzy ingredient normalization;
- propose substitutions/explanations;
- interpret receipt/photo where deterministic parsing is insufficient.

Do not use AI first for logic that TypeScript can handle reliably.

## 6. Smart Pantry principle

The app should not require the user to “serve the database”. Stock is represented as evidence + confidence:

- checked-off purchases increase confidence;
- planned/cooked meals consume probable ingredients;
- explicit “ran out” resets confidence;
- recurring purchase intervals create forecasts;
- staples decay slowly;
- rare/menu-specific items decay faster;
- leftovers/freezer are tracked separately and explicitly;
- receipt/barcode/photo can refresh evidence.

The system asks only when the answer materially changes the current menu/shopping decision.

Conceptual ask score:

`ask_score = uncertainty × cost_or_importance × relevance_to_current_plan`

Cheap low-impact items should rarely trigger questions.

## 7. Family repertoire

The menu should mostly come from dishes the family really eats, not random AI recipes.

For each dish track, over time:

- likes/dislikes/restrictions per person;
- favorite flag;
- last cooked;
- frequency / repetition history;
- weekday fit;
- time / effort / cost;
- kids-friendly signal;
- leftovers/freezer suitability;
- season;
- accepted/replaced/cooked/skipped history.

Initial target mix for weekly planning can be approximately:

- ~60% familiar favorites;
- ~20% familiar but not recently used;
- ~10% dishes that consume leftovers/current stock;
- ~10% new or experimental.

Percentages are product tuning parameters, not fixed business rules.

## 8. UX principle

The product should feel like a mature consumer app, not an AI dashboard.

Primary mobile navigation target:

- Today
- Menu
- Shopping
- More

Secondary screens under More / contextual navigation:

- Recipes/Dishes
- Smart Pantry
- Leftovers
- Freezer
- Family
- Settings

Opening Today should show the selected day immediately: breakfast, lunch and dinner for that day, not a week overview.

## 9. Technology direction

Preferred evolution: **modular full-stack Next.js + TypeScript + PostgreSQL/Supabase**, unless a concrete requirement later proves otherwise.

Avoid by default:

- microservices;
- separate Python backend;
- queues/event bus;
- vector DB;
- MCP as an application dependency;
- multiple persistence systems.

Architecture should remain a modular monolith with domain boundaries and a shared command/API layer.

## 10. Shared backend / Family Assistant

PWA/web and future Telegram Family Assistant must use one Household model and one business-logic layer.

Telegram is a fast interaction surface, not a second product database.

Examples of future commands:

- “What are we eating tonight?”
- “Move tomorrow’s dinner to Friday.”
- “Milk ran out.”
- “Add apples to shopping.”
- “Make next week cheaper and no fish.”

## 11. Future monetization hypothesis

Do not optimize MVP around monetization yet.

Possible later tiers:

- **Core / Free**: household, menu, recipes, shared shopping.
- **Smart**: learning, Smart Pantry, voice, natural-language planning.
- **Saver**: promotions, price comparison, basket optimization.
- **B2B / Retail media later**: only after meaningful audience scale.

Bring! is a useful business-model reference because it combines a free consumer product, Premium in-app purchases and B2B commerce-media/retailer advertising around purchase intent. This is a future reference, not a launch requirement.

## 12. Role of Codex

Codex is implementation labor, not product owner.

Decision flow:

`Research + ChatGPT + product decision → small task → Codex implementation → tests → review → next task`

Codex should not independently redesign product scope, architecture or UX unless explicitly asked to propose alternatives.
