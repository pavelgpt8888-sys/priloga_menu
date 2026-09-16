# Roadmap — Family Food Manager

Status: 2026-09-16

This roadmap separates the **final product picture** from the **initial implementation block**. The goal is speed without a rewrite.

Execution note after the repository audit: this file remains the high-level product sequence. The authoritative small-PR order is `docs/MASTER_ROADMAP.md` + `docs/IMPLEMENTATION_BACKLOG.md`. In particular, `TASK-001`–`TASK-008` add regression protection and fix the four demonstrated correctness hazards (units, hard restrictions, shopping reconciliation and immutable Undo) **before** UI extraction/redesign. This corrects the earlier impression that broad componentization should be the first implementation move.

## Initial implementation block — build this first

For the first working stage, **do not add**:

- LLM/AI planning;
- voice recognition;
- photo/receipt recognition;
- automatic recipe reading/import by AI;
- store integrations;
- retailer SKU;
- promotions/price comparison;
- cart/checkout;
- exact Smart Pantry forecasting.

First prove the core weekly loop with deterministic logic and a better UX.

### Phase 0 — preserve behavior and prepare the codebase

Goal: improve structure without changing product behavior.

Tasks:

- keep existing working flows and local demo data;
- split the current large page into domain-oriented UI modules;
- extract design tokens/components instead of per-screen inline styling;
- define domain boundaries: household, repertoire, planning, shopping, kitchen/history;
- add targeted tests around planner/shopping invariants before larger changes.

Acceptance:

- current workflows still work;
- build/lint/tests pass;
- no large rewrite;
- each following change can be done in a small PR.

Rollback: revert individual refactor PRs; no data migration yet.

### Phase 1 — redesign the core UX

Goal: make the app feel like a real native family product.

Implement:

- bottom navigation: Today / Menu / Shopping / More;
- Today opens the selected day and shows breakfast/lunch/dinner immediately;
- compact hierarchy: current/important meal gets emphasis, other meals are lighter rows/cards;
- quick replacement, move, repeat, recipe and shopping actions are contextual;
- Menu/Week supports accept, replace one meal, pin meal, move day;
- Shopping becomes one-hand friendly, high-density checklist;
- Kitchen/Leftovers/Freezer/Family move to secondary navigation instead of equal top-level tabs;
- adopt a provisional Tomato visual direction, but keep palette configurable while UX stabilizes.

Acceptance:

- key weekly tasks need fewer taps than current UI;
- mobile works comfortably one-handed;
- no screen is built from a wall of identical rounded cards;
- desktop remains usable but mobile is the primary design target.

### Phase 2 — strengthen deterministic product logic

Goal: weekly planning becomes useful even without AI.

Implement:

- explicit dish/recipe distinction if needed;
- family hard restrictions vs soft preferences;
- favorite / dislike / temporary ban;
- `lastCookedAt`, frequency and repetition controls;
- meal actions: cooked / replaced / skipped / repeat;
- pin/lock a meal before regenerating the week;
- preserve manual shopping items;
- recompute only unbought shopping need after menu changes;
- recipe/menu snapshots so historical plans are not rewritten when a recipe later changes.

Acceptance:

- hard restrictions are never violated by planner code;
- repeating/regenerating does not duplicate shopping items;
- replacing one meal changes only affected unpurchased needs;
- bought/manual shopping survives plan edits.

### Phase 3 — persistence and household

Goal: move from browser demo state to real shared household data.

Preferred path: PostgreSQL/Supabase with the current Next.js/TypeScript app.

Implement:

- Household + HouseholdMember;
- authentication;
- server-side persistence;
- household-scoped repositories/services;
- migration/import from current localStorage state;
- export/backup of household data;
- keep localStorage only as migration/offline cache where useful.

Acceptance:

- two household members see the same menu/shopping state;
- data survives logout/browser/device change;
- every record is household-scoped;
- local demo can be imported without losing the original source copy.

### Phase 4 — family repertoire and learning signals

Goal: menu generation reflects this family rather than a generic recipe catalog.

Implement:

- repertoire of known dishes;
- preference score by family member;
- last cooked and repetition penalties;
- weekday/time/effort/cost fit;
- leftovers/freezer suitability;
- accepted/replaced/cooked/skipped events;
- deterministic week scoring and generation.

Suggested menu scoring inputs:

- hard restriction gate;
- family preference score;
- repetition penalty;
- time/weekday fit;
- leftovers/stock bonus;
- effort/cost target;
- diversity score.

Acceptance:

- familiar meals dominate suggestions;
- repeated dishes are naturally spaced;
- user corrections change future ranking;
- learning is inspectable data, not hidden LLM memory.

### Phase 5 — Smart Pantry v1

Goal: useful stock awareness without forcing ERP-style inventory.

Start with evidence, not computer vision.

Implement:

- PantryEstimate / StockEvidence model;
- checked-off shopping creates positive stock evidence;
- explicit “ran out”/“have plenty” controls;
- planned/cooked dishes create consumption evidence;
- confidence + estimated quantity/range + last evidence;
- decay rules by product type;
- question engine based on uncertainty × importance × relevance;
- leftovers/freezer stay explicit, not probabilistic.

Acceptance:

- the app can decide “probably have / probably need / ask”;
- it asks only a few high-value questions for the current plan;
- a user can correct a wrong estimate in one tap;
- no requirement to maintain exact stock quantities every day.

### Phase 6 — AI assistance

Goal: add AI only where it saves meaningful user effort.

Implement in this order:

1. text command parser with structured output;
2. complex weekly natural-language constraints;
3. recipe text import/parsing;
4. fuzzy ingredient normalization;
5. voice as another input channel;
6. receipt/photo interpretation where useful.

Requirements:

- JSON/structured contracts;
- schema validation;
- deterministic fallback;
- cache/dedup repeated inputs;
- no AI authority over allergies, permissions, quantities, stock truth or shopping state.

Acceptance:

- failure of AI never corrupts household state;
- user sees/approves ambiguous interpretation;
- simple actions work without an expensive model.

### Phase 7 — Family Assistant integration

Goal: Telegram becomes a fast interface to the same household backend.

Implement:

- household command API;
- query current day/week/shopping;
- add shopping item;
- move/replace meal;
- record “ran out” / “cooked” signals;
- notifications/reminders later.

Do not duplicate business rules inside Telegram handlers.

### Phase 8 — Saver / retailer layer

Only after core retention is proven.

Future bounded model:

`IngredientNeed → ProductCanonical/Category → RetailerSKU → Offer → UnitPrice normalization → Basket optimizer`

Entities/interfaces may be reserved conceptually, but do not implement store integrations now unless a real pilot requires them.

Offer metadata later:

- `source_type`: official_api | partner_feed | public_catalog | scraper | manual;
- retailer/store/location scope;
- fetched_at;
- valid_from / valid_to;
- confidence;
- loyalty requirement;
- pack size / unit price.

Unofficial or stale promo data must never silently become checkout truth.

## Time-boxed view

### First day

- freeze product decisions in docs;
- map current UI/routes/functions to target domains;
- add tests for planner/shopping invariants;
- define design tokens and target navigation.

### First 3 days

- componentize the current monolithic page;
- implement new mobile navigation shell;
- build Today and Shopping in the new interaction model;
- preserve all existing data/logic.

### First week

- finish Menu/Week redesign;
- simplify More/secondary sections;
- add meal pin/move/replace/cooked/skipped history signals;
- stabilize responsive design and accessibility.

### First 2 weeks

- complete deterministic repertoire logic;
- add historical snapshots/invariants;
- prepare persistence schema and migration path;
- test with real family usage.

### First month

- shared household persistence/auth;
- real usage history;
- first Smart Pantry evidence/confidence model;
- only then decide which AI feature creates the most value first.

## What not to do now

- no rewrite to another framework;
- no Python service just because AI may appear later;
- no microservices;
- no vector database for structured household/catalog data;
- no exact pantry ERP UX;
- no retailer integrations before the core loop works;
- no social network/feed/comments;
- no generic “AI chatbot” as the main interface;
- no design system dominated by gradients, pills and repeated cards.

## Task rule for Codex

Every implementation task should contain:

- one clear scope;
- dependencies;
- acceptance criteria;
- targeted tests;
- rollback path;
- explicit out-of-scope list.

Codex completes one task/PR at a time and stops for review when product behavior or architecture could branch.
