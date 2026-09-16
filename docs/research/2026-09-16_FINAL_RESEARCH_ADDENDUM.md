# Final Research Addendum — decisions to add after the deep research

Date: 2026-09-16

This addendum does not replace the main research. It records several implementation and product decisions that should be added before Codex starts executing the roadmap.

## 1. Add validation gates inside the roadmap

Do not wait eight weeks to learn whether the core loop is useful.

Introduce explicit gates:

### Gate A — after A3 Today/Menu/Shopping prototype

Test with real household data before persistence work expands.

Pass if a user can:

- understand today's meals immediately;
- replace/move a meal without explanation;
- generate and use a shopping list;
- complete the core flow without needing AI.

### Gate B — after shared household persistence

Pass if two adults can use the same household without confusing sync failures or lost changes.

### Gate C — after Smart Pantry v0

Pass if pantry questions reduce work instead of creating a new chore.

Measure:

- questions per week;
- correction rate;
- ignored questions;
- shopping-list edits caused by wrong stock assumptions.

### Gate D — before serious AI / Saver investment

Require repeated weekly usage over several weeks. AI, stores and pricing should not be used to rescue a core loop that users do not repeat.

## 2. Minimal offline shopping is important; full offline CRDT is not

The research correctly rejects full offline sync complexity for MVP. However, shopping is a special case because mobile connectivity inside stores can be unreliable.

Target behavior:

- latest shopping list remains readable offline;
- check/uncheck can update optimistically on-device;
- mutations carry a `client_mutation_id` for idempotency;
- reconnect performs item-level reconciliation;
- never overwrite the whole shopping list from one stale client snapshot.

This is much smaller than a general CRDT/offline-first architecture and gives disproportionate practical value.

## 3. Define shared-list conflict semantics now

Two household members may edit the same list at the same time.

Use item-level mutations, not full-list replacement.

Each mutable record should have at least:

- `id`;
- `updated_at`;
- optional `version`;
- `updated_by`;
- idempotency key for external/queued mutations where appropriate.

Examples:

- checking milk should not erase a newly added bread item;
- two people checking the same item should converge harmlessly;
- manual user labels must survive normalization.

## 4. Make household-friendly quantity rounding a first-class domain problem

Competitor feedback shows that a mathematically correct list can still be useless if it asks the user to buy awkward values such as “354 g cabbage”.

Separate three concepts:

- recipe quantity;
- aggregated required quantity;
- shopping quantity / practical rounded quantity.

Normalize units deterministically:

- mass: g / kg;
- volume: ml / l;
- count: piece;
- kitchen units can remain in the recipe raw representation when needed.

Later package/SKU data can improve rounding, but MVP already needs household-friendly rules such as sensible rounding bands and “approximately” labels.

Preserve both `raw_text` and normalized values.

## 5. Promote “cook once, eat twice” from a leftover feature to a planning primitive

Leftovers should not be only a separate storage screen.

Meal planning should understand planned carry-over.

Useful fields/concepts:

- `planned_servings`;
- `expected_leftover_servings`;
- `source_meal_id` for a leftover meal;
- `consume_leftover` meal type/reason;
- expiration/use-by date when known.

Example:

`Monday dinner: cook 6 servings → family eats 4 → Tuesday lunch consumes expected 2 servings.`

This directly reduces cooking effort and makes the planner more realistic.

## 6. Store planner reason codes

Every generated/recommended meal should optionally carry machine-readable reasons, for example:

- `family_favorite`;
- `not_cooked_recently`;
- `uses_freezer_item`;
- `uses_leftovers`;
- `quick_weekday`;
- `budget_fit`;
- `variety`;
- `new_dish_experiment`.

Why:

- the UI can explain a suggestion briefly;
- debugging the planner becomes much easier;
- analytics can reveal why users reject suggestions;
- later AI can explain the plan without inventing reasons.

The planner remains deterministic; explanation is derived from stored reason codes.

## 7. Treat `pantry_items` as derived state, not source of truth

`inventory_events` should be the evidence ledger. `pantry_items` should be a recalculable snapshot/cache.

Add:

- `rule_version`;
- `computed_at`;
- `evidence_count`;
- `last_evidence_at`.

When inference rules change, pantry snapshots can be rebuilt from events instead of corrupting historical evidence.

This is “event-derived state”, not a requirement to build a full event-sourced system.

## 8. Make onboarding progressive and repertoire bootstrapping fast

Do not ask a new family to manually create 50–100 dishes before the app becomes useful.

Initial onboarding should capture only:

- household members;
- hard restrictions/allergies;
- a small set of strong dislikes/favorites;
- roughly 10–20 familiar dishes, selected or added quickly.

Then grow the repertoire through usage:

- add a meal the family actually cooked;
- repeat a favorite;
- import/add recipes later;
- learn accepted/rejected suggestions.

Time-to-first-week is more important than completeness of profile.

## 9. Add an explicit input-adapter boundary

The same household command should be callable from multiple interfaces later:

`App / PWA / Telegram / Siri Shortcut / future Android voice → command API → deterministic validation → domain service`

Do not implement Siri now, but keep commands transport-independent.

Examples:

- `add_shopping_item`;
- `mark_product_out`;
- `move_meal`;
- `replace_meal`;
- `get_today_menu`.

This allows voice and Telegram to stay thin adapters rather than duplicate business logic.

## 10. Add AI evaluation before AI rollout

Before enabling an LLM for household commands, build a small versioned evaluation corpus from real phrases.

Examples:

- “молоко закончилось”;
- “перенеси плов на пятницу”;
- “на следующей неделе попроще”;
- “дети рыбу не будут”;
- “это больше не предлагай”.

For each example store expected structured output and validation result.

AI rollout sequence:

1. deterministic parser;
2. unknown-intent fallback in shadow/logging mode;
3. compare against expected output;
4. enable user-visible suggestions;
5. only then allow validated state mutations.

## 11. Public sharing needs its own security rules

A shared menu link must never expose household-private data by accident.

Share-token rules:

- random high-entropy token;
- read-only by default;
- explicit revocation;
- optional expiration;
- only whitelisted menu/recipe fields are serialized;
- no household member IDs, notes, pantry state or private preferences unless intentionally included.

“Copy menu” creates a new independent copy in the recipient household.

## 12. Add lightweight operational observability

Before beta users, add simple structured error/event logging around critical workflows:

- auth/bootstrap;
- menu generation;
- shopping aggregation;
- sync/reconciliation;
- pantry inference;
- AI adapter later.

Each failure should have:

- stable error code;
- correlation/request id where useful;
- household pseudonymous id;
- no sensitive raw payload by default.

This is enough for MVP; no heavy observability platform is required.

## 13. Recommended priority impact

These additions do not change the product direction. They sharpen implementation order.

### Must be included before/inside MVP

- validation gates;
- shared-list conflict/idempotency rules;
- household-friendly quantity rounding;
- cook-once/eat-twice planning;
- progressive onboarding;
- planner reason codes;
- pantry evidence → derived snapshot model;
- public-share security if sharing ships.

### Important but can follow the first core-flow prototype

- minimal offline shopping mutation queue;
- generic input-adapter boundary;
- AI evaluation corpus;
- structured operational logging.

### Still explicitly deferred

- retailer integrations;
- SKU matching;
- checkout;
- promotions;
- full offline CRDT;
- vector DB/RAG;
- separate Python service;
- native mobile rewrite.

## Bottom line

The deep research is strong enough to stop broad architecture exploration. The biggest remaining risk is not missing another feature; it is overbuilding before the weekly household loop proves itself.

The implementation principle should now be:

`make the weekly loop excellent → test it with real households → add persistence/shared use → make pantry inference useful → only then expand AI/growth/commerce.`
