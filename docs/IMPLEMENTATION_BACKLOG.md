# Implementation backlog — one task, one small PR

Status: proposal for approval, 2026-09-16. No implementation task has started.

This is the executable layer under `docs/MASTER_ROADMAP.md`. Product phases remain summarized in `docs/ROADMAP.md`; this file defines the order, dependencies, acceptance, tests and rollback for each PR.

## Rules for every task

- One PR implements only one `TASK-NNN`; incidental cleanup is out of scope.
- Preserve existing behavior unless the task names the behavior change and includes a before/after fixture.
- No PR may silently rewrite `family-meal-planner-state-v1`; data-format changes require backup, versioned reader and rollback notes.
- `lint`, `build`, targeted unit/integration tests and affected mobile smoke paths must pass.
- A PR that grows beyond roughly two engineering days, touches a second migration or needs a second product decision is split before merge.
- No LLM, cloud persistence, Smart Pantry inference or retail integration is a dependency of the Initial Build.
- Default rollback for code-only tasks is revert of that PR. State-changing tasks specify an additional data rollback below.

## Phase I — Initial Build: reliable local family loop

Initial Build ends after `TASK-026`. It proves:

`family preferences/restrictions → repertoire → week menu → selected day → recipes → shopping → actual history/feedback`

It explicitly excludes mandatory LLM, voice, OCR/vision, photo-fridge recognition, stores, real SKU, promotions, price comparison, checkout, Python, microservices, vector databases, queues and an event bus.

### TASK-001 — Reproducible baseline and CI guardrail

- Goal/value: make every later PR comparable to a known working baseline.
- Scope/files: pin direct package ranges consistently with the lockfile; add `typecheck` and `test` placeholders/scripts; add one GitHub Actions workflow for install, lint, typecheck and build. Expected files: `package.json`, lockfile only if required, `.github/workflows/ci.yml`.
- Depends on: none.
- Acceptance: clean checkout installs with `npm ci`; current UI and demo state are unchanged; CI uses one supported Node version and caches only dependencies.
- Tests: `npm ci`, `npm run lint`, `npm run typecheck`, `npm run build`.
- Risk/rollback: dependency drift or CI-only failure. Revert the PR; no user data changes. No framework/package-manager upgrade.

### TASK-002 — Characterization tests for existing core behavior

- Goal/value: protect current workflows before changing algorithms or moving UI code.
- Scope/files: add Vitest and a small fixture factory; capture current menu generation, replacement, recipe-to-shopping and local state round-trip behavior, including known-bug fixtures in a separate failing-case register with the desired future assertion. Expected files: `vitest.config.ts`, `src/lib/__tests__/*`, `test/fixtures/*`, package files.
- Depends on: `TASK-001`.
- Acceptance: deterministic tests do not depend on wall-clock date or random global state; fixtures contain synthetic, non-personal data; the four high-priority bugs have reproducible tests.
- Tests: unit suite plus existing lint/typecheck/build.
- Risk/rollback: tests accidentally canonize a defect. Each known-bug case names the desired future assertion; revert test-only PR if it blocks valid work.

### TASK-003 — Unit-safe quantity arithmetic

- Goal/value: prevent wrong shopping quantities such as `1 kg + 500 g = 501 kg`.
- Scope/files: introduce a minimal quantity type and deterministic conversions for `g/kg`, `ml/l` and compatible counts; retain raw recipe text for unresolved units. Expected files: `src/lib/quantity.ts`, focused changes in `planner.ts`/types, tests.
- Depends on: `TASK-002`.
- Acceptance: compatible units normalize before summation; incompatible or unknown units remain separate/reviewable; no floating-point display noise; existing recipe text remains visible.
- Tests: `1 kg + 500 g = 1.5 kg`; `750 ml + 0.5 l = 1.25 l`; incompatible units do not merge; zero/negative/decimal parsing cases.
- Risk/rollback: over-normalizing household units. Revert calculation PR; state schema remains readable because normalized fields are not persisted yet.

### TASK-004 — Hard restrictions as a fail-closed invariant

- Goal/value: allergies and hard family restrictions can never be outweighed by preference score or fallback.
- Scope/files: separate hard exclusions from soft preferences; apply the same validator to generation, manual add, replace, repeat and import-to-menu paths; return an explicit “no safe candidate” result. Expected files: planner/domain validation module and tests.
- Depends on: `TASK-002`; can run after `TASK-003` but does not require it.
- Acceptance: every meal mutation validates the intended eaters; empty safe pool does not crash or choose a forbidden dish; UI receives a typed blocked reason.
- Tests: all candidates restricted; one safe candidate; conflicting member restrictions; manual/repeat/replace bypass attempts; empty soup pool.
- Risk/rollback: existing permissive plans may become blocked. Roll back only the UI integration if needed; never restore an unsafe fallback. Viewing/editing/export remain available.

### TASK-005 — Preserve manual and checked shopping state on recalculation

- Goal/value: changing one meal must not erase the family’s manual groceries or completed work.
- Scope/files: add a minimal reconciliation function between newly derived needs and existing shopping rows; preserve stable row IDs, source=`manual`, checked quantity and user labels. Expected files: shopping domain helper, planner call sites, tests.
- Depends on: `TASK-002`, `TASK-003`.
- Acceptance: menu replacement changes only affected unpurchased derived quantities; manual rows survive; checked quantity remains fulfilled when need changes; an intentionally empty list stays empty.
- Tests: manual item survives regeneration; checked `1 l` against new `2 l` leaves `1 l` outstanding; reduced need does not erase purchase fact; duplicate recalculation is idempotent.
- Risk/rollback: reconciliation could duplicate lines. Revert code-only PR; no schema change; keep a fixture of the pre-change list for comparison.

### TASK-006 — Immutable state transitions and trustworthy Undo

- Goal/value: one action produces one reversible state change without hidden nested mutation.
- Scope/files: make shopping/inventory functions pure; route all existing state changes through one local `applyCommand` boundary and immutable snapshot creation; do not redesign screens. Expected files: `src/lib/commands.ts`, planner helpers, narrow changes in `page.tsx`, tests.
- Depends on: `TASK-002`, `TASK-005`.
- Acceptance: input objects are unchanged; Undo restores the exact prior domain state; retrying an idempotent command does not double-add; direct setters are inventoried and removed from domain mutations.
- Tests: deep-freeze mutation tests; add recipe to shopping then undo; move checked purchase then undo; repeated command ID.
- Risk/rollback: broad callback churn. Split by command family if needed; revert PR returns to existing behavior with no data migration.

### TASK-007 — Versioned local-state envelope and runtime validation

- Goal/value: corrupted or old browser data must not be silently replaced by demo state.
- Scope/files: wrap persisted state in `schemaVersion`, `savedAt` and payload; add runtime validation with a small schema library or explicit validators; keep reading the legacy key. Expected files: `src/infrastructure/local-state/*`, types, tests.
- Depends on: `TASK-006`.
- Acceptance: valid legacy state loads; invalid state enters a recoverable error/backup flow; seed data is not merged into user collections without an explicit migration; write/quota errors are visible.
- Tests: valid v1, malformed JSON, missing references, future version, storage quota/write failure, round trip.
- Risk/rollback: migration blocks launch. Keep legacy bytes untouched and old reader available for one release; rollback switches reader, not stored data.

### TASK-008 — Export, validate and restore backup

- Goal/value: the family can recover its local data before any larger migration.
- Scope/files: add JSON export/import with schema/version summary and a preview before replacement; no cloud upload. Expected files: local-state service, Settings UI, tests.
- Depends on: `TASK-007`.
- Acceptance: export contains all domain state but no secrets; import validates first, reports counts/unresolved references and requires confirmation; failed import leaves current and source files unchanged.
- Tests: export/import equivalence; invalid version; duplicate IDs; cancelled preview; restoration after simulated corruption.
- Risk/rollback: destructive import. Write to a new versioned key, verify read-back, then switch marker; revert UI while retaining both copies.

### TASK-009 — Extract AppShell without behavior change

- Goal/value: reduce risk of later UX work while preserving the current application.
- Scope/files: extract desktop sidebar, mobile navigation, top-level section state and shared layout from `page.tsx`; no new routes or visual direction. Expected files: `src/features/shell/*`, `page.tsx`.
- Depends on: `TASK-002`, preferably `TASK-006`.
- Acceptance: every current section remains reachable with the same labels, focus order and responsive breakpoints; production data/state paths are unchanged.
- Tests: component render/navigation tests; mobile and desktop screenshots/smoke; lint/build.
- Risk/rollback: responsive regression. Revert component extraction; no state migration.

### TASK-010 — Extract Today screen without behavior change

- Goal/value: isolate the highest-frequency screen before changing its hierarchy.
- Scope/files: move Today rendering and callbacks to `src/features/today/*`; keep all current content and actions.
- Depends on: `TASK-009`.
- Acceptance: selected day/current meals, quick scenarios, shopping preview and pantry prompts behave as before; no business logic is copied into the component.
- Tests: characterization render with fixed state; replace/action callbacks; mobile smoke.
- Risk/rollback: lost callback/state coupling. Revert extraction; no schema change.

### TASK-011 — Extract Menu screen without behavior change

- Goal/value: make week planning independently testable before model/UX changes.
- Scope/files: move day/week/month menu views and actions to `src/features/menu/*`; retain planner calls through existing command boundary.
- Depends on: `TASK-009`, `TASK-006`.
- Acceptance: date selection, generate, replace, repeat and move remain available; no new plan semantics yet.
- Tests: render each mode; fixed-date move/replace/repeat callbacks; mobile/desktop smoke.
- Risk/rollback: calendar edge regressions. Revert extraction; data remains unchanged.

### TASK-012 — Extract Shopping screen without behavior change

- Goal/value: isolate store-mode interaction before list reconciliation and visual density changes expand.
- Scope/files: move period filters, rows, check/uncheck, manual add and inventory transfer to `src/features/shopping/*`.
- Depends on: `TASK-009`, `TASK-005`, `TASK-006`.
- Acceptance: existing periods/actions and row state remain functional; reconciliation stays in the domain layer, not UI.
- Tests: render/filter/check/add/transfer flows; narrow mobile viewport; keyboard accessibility smoke.
- Risk/rollback: store workflow regression. Revert extraction; no schema change.

### TASK-013 — Provisional four-tab mobile information architecture

- Goal/value: place the weekly loop at thumb reach without deleting secondary workflows.
- Scope/files: change mobile top-level navigation to Today / Menu / Shopping / More; place Recipes, Kitchen, Family, Leftovers, Freezer, Inventory and Settings under More/context links. A2 is reference only; desktop sidebar stays until separately reviewed.
- Depends on: `TASK-009`–`TASK-012`; explicit approval of the provisional IA.
- Acceptance: every existing screen/action is still reachable; back/focus behavior is predictable; no design-branch code is copied; current functionality remains source of truth.
- Tests: navigation reachability matrix at mobile widths; keyboard/focus smoke; desktop regression.
- Risk/rollback: discoverability loss. Revert navigation PR; extracted screens remain reusable.

### TASK-014 — Today as one selected day

- Goal/value: the family immediately sees breakfast, lunch and dinner for the chosen date.
- Scope/files: apply the approved A2 hierarchy to `features/today`: compact date/day selector, meal order, one contextual emphasis, short Shopping/Home context; reduce duplicate cards/pills/emoji rather than clone the prototype.
- Depends on: `TASK-010`, `TASK-013`; approved screen spec and states.
- Acceptance: choosing a day changes real meal content and heading; missing/loading/error/empty states are defined; current actions remain available contextually; Tomato is tokenized, not hard-coded throughout.
- Tests: fixed-date content switching; three meal states; empty slot; restriction block; responsive/a11y visual checks.
- Risk/rollback: visual change hides actions. Keep old Today component until acceptance, then delete in a later cleanup; rollback selects old component without data change.

### TASK-015 — Native, one-hand Shopping presentation

- Goal/value: make check-off and quick add faster in a store.
- Scope/files: redesign extracted Shopping as grouped list rows with large targets, de-emphasized completed items and bottom-reachable add; tile/list choice only if user testing justifies both.
- Depends on: `TASK-012`, `TASK-005`, approved Shopping spec.
- Acceptance: check/add/quantity work one-handed; manual and derived origin is understandable without clutter; AI never interrupts store mode; loading/offline/stale state is visible.
- Tests: tap-target/a11y checks; check/uncheck/add at 390px; 100-row performance smoke; reconciliation integration.
- Risk/rollback: density reduces clarity. Revert view component; shopping domain/state unchanged.

### TASK-016 — Menu/Week hierarchy and local actions

- Goal/value: approve and adjust a week without regenerating everything.
- Scope/files: redesign extracted Menu around week acceptance, replace one slot, pin/unpin, move and regenerate only unlocked slots; preserve day/week/month views only where useful.
- Depends on: `TASK-011`, `TASK-013`; command semantics from `TASK-006`.
- Acceptance: local change affects only the selected slot or unlocked set; action provenance is visible; no AI dependency.
- Tests: pin then regenerate; replace one; move collision preview; undo; responsive/a11y checks.
- Risk/rollback: UI gets ahead of model semantics. Hide/omit actions not yet supported; revert view without touching plan data.

### TASK-017 — Canonical dish/recipe identity and revision

- Goal/value: edited recipes must be the same source used by menu, cooking and shopping.
- Scope/files: define stable dish/recipe IDs, recipe revision and completeness; migrate linked seed/manual recipes without deleting originals; remove silent “add to menu succeeded but did nothing”.
- Depends on: `TASK-007`, `TASK-008`, `TASK-002`.
- Acceptance: editing ingredients creates/updates an explicit revision used by future plans; manual recipe can be scheduled; historical references do not silently change; incomplete recipes are clearly blocked from auto-shopping.
- Tests: edit linked recipe then plan/shop; manual recipe add; delete/archive; old revision snapshot; idempotent migration.
- Risk/rollback: broken links. Expand schema and read old/new; preserve original backup and mapping report; rollback uses old reader.

### TASK-018 — Serving scale and household-friendly shopping quantities

- Goal/value: quantities reflect who eats and remain practical rather than pseudo-precise.
- Scope/files: add planned eaters/servings and deterministic recipe scaling; keep recipe quantity, aggregated need and rounded shopping quantity separate; preserve raw text.
- Depends on: `TASK-003`, `TASK-017`.
- Acceptance: changing eaters/servings predictably changes need; rounding rules are explicit and reversible; “354 g cabbage” can display as an approximate practical amount without corrupting raw calculation.
- Tests: 2→4 servings, fractional values, count items, mixed known/unknown units, rounding boundaries.
- Risk/rollback: misleading rounding. Show exact aggregate alongside/behind approximate shopping value; revert rounding policy independently of stored raw need.

### TASK-019 — Calendar-safe meal slots and plan lifecycle

- Goal/value: dates, weekday rules and moved meals remain stable and explainable.
- Scope/files: introduce plan ID/revision/status and stable meal-slot ID with date, timezone and meal type; fix weekend calculation and collision behavior; draft/accepted/archived states only.
- Depends on: `TASK-007`, `TASK-017`.
- Acceptance: weekend derives from actual date; move cannot silently delete occupied target; accepted plan can be revised without rewriting history; timezone is explicit.
- Tests: Wednesday-start week, DST/timezone boundary, occupied target, repeat, archive/new week, migration from current IDs.
- Risk/rollback: ID migration. Store old→new mapping and legacy reader; failed migration leaves old plan authoritative.

### TASK-020 — Provenance-based shopping requirements

- Goal/value: the list explains why an item is needed and updates only the affected unmet quantity.
- Scope/files: represent derived requirements by plan/slot/recipe revision/servings; reconcile them with manual additions and fulfillment; persist selected period; exclude skipped/already-cooked slots correctly.
- Depends on: `TASK-005`, `TASK-017`–`TASK-019`.
- Acceptance: every derived quantity has provenance; replacing a meal removes only its unmet requirement; manual delete/have-at-home intent is retained for the list; repeated calculation is idempotent.
- Tests: replace/repeat/move; checked partial quantity; manual item; period persistence; cooked/skipped exclusion; undo.
- Risk/rollback: larger list model migration. Dual-read old/new for one release; keep export and migration report; revert writer while retaining new rows as ignored data.

### TASK-021 — Family repertoire and progressive onboarding

- Goal/value: planning starts from familiar family food without a long questionnaire.
- Scope/files: structure hard restrictions, soft likes/dislikes, favorite, “never suggest”, temporary ban and repertoire membership; bootstrap 10–20 familiar dishes from existing data and grow through use.
- Depends on: `TASK-004`, `TASK-017`.
- Acceptance: first week is possible after minimal profile/repertoire setup; temporary rules have explicit expiry/scope; unknown preference is neutral; existing family edits are preserved.
- Tests: onboarding with minimal fields; never-suggest; temporary ban expiry; conflicting family preferences; repertoire import from current seed.
- Risk/rollback: over-constraining the pool. UI exposes the blocking rules and manual correction; schema additions are optional/backward-readable.

### TASK-022 — Deterministic planner constraints, pins and reason codes

- Goal/value: generated weeks obey rules and can explain each suggestion.
- Scope/files: planner pipeline `hard gate → candidate score → deterministic tie-break → validation`; implement max time as a real gate when duration is known, pins, diversity/repetition, effort/cost estimate and machine-readable reason codes.
- Depends on: `TASK-004`, `TASK-018`, `TASK-019`, `TASK-021`.
- Acceptance: hard limits are never converted into score penalties; unknown time/price is reported, not assumed; locked slots do not change; same input/seed yields same output and reasons.
- Tests: ≤30-minute request; unknown duration; all candidates blocked; pin/regenerate; repeat limits; deterministic snapshot; budget result `within_estimate/exceeds_estimate/insufficient_data`.
- Risk/rollback: smaller candidate pool. Return typed “cannot satisfy” with alternatives to relax; never fall back across a hard rule.

### TASK-023 — Actual meal history and immutable snapshots

- Goal/value: proposed, accepted, replaced, cooked and skipped are different facts that future planning can learn from.
- Scope/files: add append-only domain events and meal/recipe snapshots for acceptance, replacement, cooking, skip and feedback; keep events simple records, not an event bus or full event-sourced architecture.
- Depends on: `TASK-017`, `TASK-019`, `TASK-006`.
- Acceptance: editing a recipe later does not rewrite what was planned/cooked; no feedback is not a dislike; duplicate command ID does not duplicate an event; history is inspectable/exportable.
- Tests: event transitions; recipe edit after cook; retry idempotency; undo policy; migration from existing feedback.
- Risk/rollback: duplicate/incomplete history. Events carry source/command ID/schema version; projection can rebuild; old UI can ignore new events.

### TASK-024 — Cook once, eat twice as a planning primitive

- Goal/value: intentionally reuse prepared food and reduce family cooking effort.
- Scope/files: add planned servings, expected leftover servings and source-meal link; allow a later slot to consume a prepared batch; keep leftovers/freezer explicit.
- Depends on: `TASK-018`, `TASK-019`, `TASK-023`.
- Acceptance: Monday cook-6/eat-4 can supply Tuesday lunch-2; source and remaining portions are visible; moving/freezing does not duplicate amount; expiration is respected as a block/question.
- Tests: planned carry-over, partial use, move to freezer, expiration, cancellation of source meal, no double-count in shopping.
- Risk/rollback: false assumptions about consumption. Only confirmed cooking creates actual batch; planned carry-over remains plan state; revert projection without deleting recorded facts.

### TASK-025 — Transparent learning from family choices

- Goal/value: future menus improve from real actions without hidden LLM memory.
- Scope/files: incorporate accepted/replaced/cooked/skipped/repeated/never-suggest and `lastCookedAt` into deterministic scoring; provide a compact explanation/debug view.
- Depends on: `TASK-021`–`TASK-024`.
- Acceptance: repeated rejection lowers rank but does not become a hard ban; favorites/recent repetition behave predictably; score contributions and rule versions are inspectable.
- Tests: golden ranking fixtures; no-feedback neutrality; family-member disagreement; rule-version rebuild; deterministic output.
- Risk/rollback: overfitting one week. Use bounded weights/config and retain raw events; rollback changes scoring version, not history.

### TASK-026 — Initial Build release gate and one-family pilot

- Goal/value: prove the weekly loop before cloud, pantry or AI expansion.
- Scope/files: add minimal structured product/error events with no sensitive payload, a release checklist and synthetic/one-family pilot protocol; no analytics platform required.
- Depends on: `TASK-001`–`TASK-025` and approved UX screens.
- Acceptance: two consecutive weeks can be planned, adjusted, shopped and recorded without data loss, hard-rule violation or unexplained missing item; backup restore is rehearsed; known limitations are listed.
- Tests: full browser journey on mobile and desktop; corrupted-state recovery; quantity/restriction/shopping/undo regression suite; manual accessibility pass.
- Risk/rollback: pilot exposes blocking correctness issue. Stop at Initial Build, fix with a new small task; do not add AI or infrastructure to mask the failure.

## Phase H — Shared Household, only after Initial Build

### TASK-027 — Transport-independent household command boundary

- Goal/value: web, future Telegram and other inputs execute the same validated business rules.
- Scope/files: formalize command/result schemas, actor/context, expected revision and repository ports around the local command layer; keep the current local adapter.
- Depends on: `TASK-006`, `TASK-023`, Initial Build gate.
- Acceptance: UI no longer needs direct storage writes; commands are deterministic and serializable; authorization context is required but cloud auth is not yet implemented.
- Tests: command contract, stale revision, idempotency, unauthorized/missing actor at boundary.
- Risk/rollback: unnecessary abstraction. Limit to commands already used; revert ports while local implementation remains.

### TASK-028 — Supabase Household schema, Auth and RLS

- Goal/value: two authenticated household members can safely address one household state.
- Scope/files: add Supabase only now; minimal `households`, memberships, versioned household state/records and command receipts; server-only write path; RLS denies cross-household access. No Realtime by default.
- Depends on: `TASK-027`; explicit approval to create/use the Supabase project.
- Acceptance: anonymous/cross-household/direct snapshot writes fail; server command validates membership; migrations are documented and reversible by forward migration.
- Tests: local Supabase or isolated test project RLS matrix; forged household ID; removed member; service-role boundary; schema migration smoke.
- Risk/rollback: auth/RLS exposure. Feature remains disabled until negative tests pass; rollback deployment keeps local mode and does not drop cloud data.

### TASK-029 — Previewed local-to-cloud import and authority cutover

- Goal/value: existing family data moves without becoming two divergent sources of truth.
- Scope/files: authenticate, select/create household, upload validated export with import ID, read back and compare, then mark server authoritative; local copy becomes backup/cache.
- Depends on: `TASK-008`, `TASK-028`.
- Acceptance: import into empty household is idempotent; non-empty target requires conflict preview; counts/IDs/hash match; legacy local bytes remain downloadable.
- Tests: success, retry, interrupted upload, non-empty conflict, read-back mismatch, rollback export.
- Risk/rollback: split brain/data loss. Never dual-write independently; failed cutover leaves local authoritative; post-cutover rollback starts from fresh server export.

### TASK-030 — Shared mutations, conflicts and minimal offline shopping

- Goal/value: simultaneous household use does not erase edits, and a shop list remains usable with poor connectivity.
- Scope/files: item-level shopping commands, expected revision/version, `clientMutationId`, optimistic local check/uncheck queue for Shopping only, refetch/reconcile on reconnect; no general CRDT.
- Depends on: `TASK-029`, `TASK-020`.
- Acceptance: checking milk cannot erase newly added bread; duplicate checks converge; stale full-list overwrite is impossible; cached list is readable offline and pending status is explicit.
- Tests: two-client concurrency; duplicate/reordered mutations; offline/reconnect; removed item; stale revision; failed retry.
- Risk/rollback: sync ambiguity. Disable offline mutation queue while keeping read cache/server commands; retain receipts for audit.

### TASK-031 — Shared Household Gate B

- Goal/value: confirm that two adults can use the same household reliably before marketing sharing.
- Scope/files: two-device acceptance protocol, structured error codes and operational checklist; add Realtime only in a separate future task if bounded polling/refetch misses the target.
- Depends on: `TASK-028`–`TASK-030`.
- Acceptance: two accounts see updates within the agreed online target, no lost mutation in scripted conflicts, membership removal takes effect, backup/export works.
- Tests: browser matrix with two sessions; offline/online store scenario; auth/RLS negatives; recovery rehearsal.
- Risk/rollback: unreliable sync. Keep feature private/disabled and return pilot to local authority via current server export; do not add queues/services as a reflex.

## Phase P — Smart Pantry after stable menu → shopping → history

### TASK-032 — Stock evidence ledger and derived estimate model

- Goal/value: represent “probably have” without pretending exact inventory.
- Scope/files: add `StockEvidence` and recalculable `PantryEstimate` with quantity/range, qualitative availability, confidence class, last evidence, rule version and decay profile; leftovers/freezer remain explicit.
- Depends on: `TASK-023`, and `TASK-031` if cloud mode is in use.
- Acceptance: estimates rebuild from evidence; explicit correction outranks inference; a numeric probability is not shown without calibration; unknown remains unknown.
- Tests: projection rebuild, evidence ordering, rule version, correction boundary, staple/perishable decay fixtures.
- Risk/rollback: inference hides uncertainty. Run projection read-only/shadow first; disable derived deductions without deleting evidence.

### TASK-033 — Purchased items as idempotent stock evidence

- Goal/value: checked-and-confirmed purchases improve stock knowledge without double counting.
- Scope/files: confirm actual purchased quantity before transfer; one command writes purchase fact, fulfillment and stock evidence; pending checkmark alone is not exact stock.
- Depends on: `TASK-020`, `TASK-032`.
- Acceptance: retry/reload cannot add stock twice; changed actual pack quantity is recorded; shopping fulfillment is not also subtracted as a second stock source.
- Tests: duplicate command, partial purchase, edited quantity, undo/compensation after later consumption.
- Risk/rollback: inflated stock. Gate projection use behind setting; raw receipt/fact remains correctable and rebuildable.

### TASK-034 — Cooking consumption, corrections and decay

- Goal/value: confirmed cooking reduces probable ingredients while the user can correct wrong assumptions.
- Scope/files: map confirmed meal snapshot/servings to consumption evidence; add “have / low / ran out / correct amount”; clamp range with explicit discrepancy rather than silently hiding it.
- Depends on: `TASK-024`, `TASK-032`, `TASK-033`.
- Acceptance: plans alone do not consume stock; confirmed cooking does; manual correction creates a new reference point; expired items are not automatically counted as safe/available.
- Tests: planned vs cooked, partial servings, correction after purchase, negative discrepancy, expiry, duplicate cooking command.
- Risk/rollback: recipe inaccuracies distort stock. Keep consumption estimate reversible and visibly inferred; disable automatic allocation while retaining events.

### TASK-035 — Decision-relevant pantry questions and Gate C

- Goal/value: ask only when an answer changes the current shopping decision.
- Scope/files: deterministic ask score from uncertainty, decision relevance and optional cost/importance; cap questions; one-tap correction; measure ignored/corrected questions.
- Depends on: `TASK-032`–`TASK-034`.
- Acceptance: likely/unknown stock never silently removes a needed item by default; confirmed quantity can reduce need; question cap and cooldown work; salt-like low-impact uncertainty rarely interrupts.
- Tests: confirmed vs likely allocation; cap/cooldown; high-cost key item; no-price fallback; correction rate fixtures.
- Risk/rollback: questions create a new chore. Disable prompts and fall back to conservative shopping; evidence/history remain intact.

## Phase A — Optional AI and input adapters

### TASK-036 — Structured command schemas and evaluation corpus

- Goal/value: define exactly what natural-language input may propose before connecting a model.
- Scope/files: versioned JSON schemas for supported intents, resolver/validator, preview diff and a synthetic/approved phrase corpus; deterministic parser remains first path.
- Depends on: `TASK-027`; AI gate explicitly opened.
- Acceptance: unsupported/ambiguous input produces “not applied”; confirmation policy comes from code; expected structured outputs are reviewable; no model dependency yet.
- Tests: corpus for Russian commands, ambiguous currency/date/person, injection text in recipe, stale preview revision.
- Risk/rollback: schema too broad. Start with read/add/move/replace/out-of-stock commands; remove intent without data migration.

### TASK-037 — Text LLM adapter, preview-only first

- Goal/value: understand complex phrases while deterministic code remains authoritative.
- Scope/files: one server-side model adapter with structured output, timeout/cost/request ID, minimal household context and preview; shadow/eval before user-visible apply.
- Depends on: `TASK-036` and passing eval threshold chosen in that PR.
- Acceptance: model cannot write state directly; hard restrictions/quantities/budget are revalidated; invalid/timeout response makes no mutation; user confirms ambiguous changes.
- Tests: recorded contract mocks, invalid JSON, timeout, prompt injection, stale state, deterministic validation rejection, cost/log redaction.
- Risk/rollback: cost/quality/privacy. Disable adapter by configuration; all buttons and deterministic parser continue to work.

### TASK-038 — Voice as an input adapter

- Goal/value: capture a household command hands-free without creating a second business path.
- Scope/files: speech-to-text input feeds exactly the `TASK-036` command preview; no raw audio retention by default.
- Depends on: `TASK-036`, optionally `TASK-037`.
- Acceptance: transcript is editable; preview/confirmation rules match text; failure leaves state unchanged; permissions and retention are explained.
- Tests: mocked transcript, denial/no-audio/error, correction before apply, duplicate submission.
- Risk/rollback: transcription mistakes. Disable voice control; text/manual UI remains complete.

### TASK-039 — Reviewable recipe text/image import

- Goal/value: reduce recipe entry effort without trusting OCR/LLM quantities blindly.
- Scope/files: deterministic JSON-LD/text parser first; optional OCR/vision creates a draft with raw source, confidence/unknown fields and mandatory review before save.
- Depends on: `TASK-017`, `TASK-018`, `TASK-036`; separate approval for image provider/storage.
- Acceptance: import never directly changes menu/shopping; unknown quantity/unit is explicit; prompt injection/source instructions are treated as data; duplicate import is detected.
- Tests: schema.org fixture, Russian decimals, image/OCR mock, malicious text, partial recipe, duplicate URL/content.
- Risk/rollback: bad recipe corrupts downstream calculations. Draft remains isolated until validated; disable importer, preserving manually approved recipes.

### TASK-040 — Telegram Family Assistant adapter

- Goal/value: fast family input/query through the same household backend.
- Scope/files: authenticated thin adapter for a small approved command set; reuse command schemas/services; no Telegram-owned database or copied rules.
- Depends on: `TASK-027`–`TASK-031`, `TASK-036`; separate security/release approval.
- Acceptance: signed identity maps to household membership; unauthorized/forged requests fail; state mutations use preview/confirmation where required; app remains primary recovery UI.
- Tests: auth negatives, membership removal, replay/idempotency, command parity, outage fallback.
- Risk/rollback: account-link/security error. Disable adapter token/webhook; household backend and app remain available.

## Phase L — Later pricing, retailers and checkout

### TASK-041 — Honest reference-price budget coverage

- Goal/value: estimate a shopping budget without pretending to know live store prices.
- Scope/files: manual/receipt reference price with quantity, currency, observed date and freshness; result includes known subtotal, coverage and unknown/stale rows.
- Depends on: `TASK-018`, `TASK-020`; product gate after repeated weekly use.
- Acceptance: incomplete coverage cannot claim “within 300”; currency/scope are explicit; calculations use integer minor units and normalized quantity.
- Tests: full/partial/no coverage, stale prices, mixed currency rejection, package conversion.
- Risk/rollback: false precision. Label as estimate; disable budget card while retaining price observations.

### TASK-042 — One official retailer/offer pilot source

- Goal/value: validate whether real offers improve one bounded shopping decision.
- Scope/files: one documented official API/partner feed/public catalog with retailer/store/location, validity, fetched time, loyalty and provenance; no scraper or multi-retailer platform by default.
- Depends on: `TASK-041`, explicit partner/source approval and validation Gate D.
- Acceptance: stale/unofficial data never becomes checkout truth; source outage leaves core list usable; data retention/licensing is documented.
- Tests: expired offer, wrong location, missing loyalty, duplicate feed item, provider outage, provenance display.
- Risk/rollback: unstable/legal source. Disable adapter and delete cached offer projection per policy; household shopping data remains independent.

### TASK-043 — Ingredient-to-SKU matching with review

- Goal/value: connect a small set of ingredient needs to real packs only after a retailer source exists.
- Scope/files: deterministic exact/category candidates first; optional fuzzy/LLM ranking produces reviewed suggestions; preserve pack size/unit price and unmatched need.
- Depends on: `TASK-042`.
- Acceptance: allergies/requirements are never inferred from SKU marketing text alone; uncertain match is not auto-selected; unit-price comparison is deterministic.
- Tests: exact/ambiguous/no match, pack conversion, allergen metadata absent, stale catalog, ranking fallback.
- Risk/rollback: wrong product substitution. Disable matching suggestions; ingredient list remains authoritative.

### TASK-044 — Draft basket and checkout integration

- Goal/value: only after proven retailer value, create a reviewable retailer basket without losing user control.
- Scope/files: draft cart, explicit substitutions/unavailable items, final user review and retailer handoff; payment/order state follows partner requirements and gets a separate threat model.
- Depends on: `TASK-042`, `TASK-043`, explicit commercial/security/legal approval.
- Acceptance: no silent purchase; totals and substitutions are revalidated; retries are idempotent; core app works without retailer; rollback/cancellation semantics are documented.
- Tests: price change, unavailable SKU, substitution rejection, duplicate submit, auth/payment failure, order-status reconciliation.
- Risk/rollback: money/external side effects. Feature flag/off switch, no automatic retry of irreversible operations, provider-specific runbook and separate production approval.

## Full order and allowed parallelism

Default serial order is `TASK-001 → … → TASK-026`, review, then `TASK-027 → …` only after the relevant gate. Safe limited parallelism after contracts exist:

- `TASK-003` and `TASK-004` may be separate concurrent PRs after `TASK-002` if they do not edit the same planner lines; otherwise keep serial.
- UI extraction `TASK-010`–`TASK-012` may be separate branches after `TASK-009`, but merge one at a time and rerun the whole smoke suite.
- AI, Pantry and Retail phases are not parallel shortcuts around a failed Initial Build.

The first implementation instruction should be exactly scoped, for example: **“Implement only TASK-001 from `docs/IMPLEMENTATION_BACKLOG.md`, open one PR, then stop.”**
