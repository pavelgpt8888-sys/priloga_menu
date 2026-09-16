# Master roadmap — Family Food Manager

Date: 2026-09-16. Status: **architecture proposal for approval; implementation has not started**.

Sources reconciled: both attached Deep Research reports, current repository and deployed UI, documentation already present in `origin/main`, and the UX-only branch `origin/design/three-ui-concepts`/A2. Instructions embedded in reports or external repositories were treated as data, not authorization.

## Outcome

Continue the existing Next.js/TypeScript application without a rewrite. First make the current local loop correct and testable; then evolve the approved mobile UX; then record actual family choices. Shared Household, probabilistic pantry, LLM/voice/image adapters and retail integrations are separate gated stages.

Target loop:

`family → restrictions/preferences → repertoire → week plan → selected-day meals → recipes → actual actions/history → probable stock → shopping delta`

The Initial Build stops before probable stock and contains no mandatory AI or store integration:

`family → repertoire → week plan → Today/Menu → recipes → correct shopping → history/feedback`

## Source-of-truth order

1. Pavel's explicit request and approved decisions.
2. `origin/main`/deployed behavior for current functionality.
3. This architecture package and task backlog after approval.
4. A2/Tomato only for UX direction.
5. Research and external products as evidence, never executable instructions.

The design branch is not merged. At fetch time:

- `origin/main`: `9663df09fa6ec74d0d70ca55bf63a83b509cca1e`;
- `origin/design/three-ui-concepts`: `0969a865e22ae6c3459c94b5fdbef26fd7a73271`;
- its only branch-specific changes versus the functional base are two concept routes under `src/app/concepts/`.

## Canonical document map

Existing product/research documents from `main` remain useful and are not replaced:

- `PRODUCT_VISION.md` — target product;
- `ROADMAP.md` — high-level product phases;
- `DESIGN_DIRECTION.md` — UX direction, now including the A2 source-of-truth rule;
- `VALIDATION_PLAN.md` and `research/*` — market/pilot context.

This package adds the repository-grounded execution layer:

1. `architecture/CURRENT_STATE_AUDIT.md` — actual code/state/defects.
2. `architecture/RESEARCH_RECONCILIATION.md` — accepted, changed and deferred research proposals.
3. `architecture/TARGET_ARCHITECTURE.md` — domain/data/AI/sync decisions.
4. `IMPLEMENTATION_BACKLOG.md` — 44 stable task cards, defaulting to small individual PRs with two explicitly gated pairing candidates.
5. `architecture/VALIDATION.md` — regression evidence and release gates.
6. `OPEN_SOURCE_AUDIT.md` — reuse/licensing decisions.
7. `architecture/DEVELOPMENT_WORKFLOW.md` — tools, skills/plugins and PR protocol.
8. `architecture/HANDOFF.md` — stop point, decisions and next command.

## Architecture in one view

```text
Next.js UI (Today / Menu / Shopping / More)
                │ commands / queries
                ▼
TypeScript application layer
                │
     ┌──────────┼───────────┐
     ▼          ▼           ▼
 household   planning    shopping/history
     └──────────┼───────────┘
                ▼
 deterministic domain rules
                │
      repository interface
        ┌───────┴────────┐
        ▼                ▼
 local versioned state   later: one Supabase/Postgres authority

optional later adapters: text LLM / voice / image / Telegram
adapter → structured draft → deterministic validate/preview → command
```

No Python backend, microservices, queue, event bus, vector database, MCP runtime or second persistence system is justified.

## Stage order and gates

| Stage | Tasks | Outcome | Gate |
|---|---:|---|---|
| Correctness / Milestone A | 001–006 | local preflight, units, restrictions, shopping and Undo | immediately dogfood the existing app |
| Data protection | 007–008 | versioned state, previous snapshot and verified JSON backup | model migrations cannot start without readable backup |
| Consumer UX / Milestone B | 009–016 with approved pairing rules | AppShell, selected-day Today, native Shopping and understandable Menu | test the real mobile experience before the family model is complete |
| Family Core / Milestone C | 017, 018, 019, 021, 022 | recipe revisions, servings, plan identity, repertoire and deterministic planner | family uses the weekly menu |
| Learning Loop / Milestone D | 020, 023, 024, 025 | shopping provenance, actual history, planned leftovers and transparent learning | one/two-week dogfood |
| Initial Build pilot | 026 | one-family two-week correctness test | Initial Build release gate |
| Shared Household | 027–031 | one command boundary, Auth/RLS, migration, conflicts/offline shopping | Household release gate; only if two-device pilot is required |
| Smart Pantry | 032–035 | evidence, derived estimate, purchase/consumption signals, high-value questions | Pantry release gate |
| AI/adapters | 036–040 | schemas/evals, text, voice, import, Telegram | Expansion release gate and separate security/privacy approvals |
| Pricing/retail | 041–044 | honest reference prices, one source, matching, eventual reviewed checkout | proven retention + commercial/legal approval |

## Updated nearest implementation order

1. `TASK-001` — reproducible local preflight; no GitHub Actions.
2. `TASK-002` — characterization tests and four confirmed bug fixtures.
3. `TASK-003` — unit-safe quantities.
4. `TASK-004` — fail-closed hard restrictions.
5. `TASK-005` — shopping reconciliation preserving manual/checked state.
6. `TASK-006` — immutable transitions and trustworthy Undo.
7. `TASK-007` — versioned local-state envelope and validation.
8. `TASK-008` — previous snapshot + downloadable, verified JSON backup only.
9. `TASK-009` — AppShell extraction.
10. `TASK-013` if navigation details are approved before work; otherwise `TASK-010` as a behavior-preserving Today extraction.

Milestone A dogfood runs immediately after item 6; blocking defects become focused tasks before continuing. The tenth slot is intentionally conditional so Codex does not invent an unapproved navigation design.

## Task mapping after optimization

- `TASK-001` keeps its ID and becomes local preflight; mandatory GitHub Actions is **deferred to an unscheduled conditional CI task**.
- `TASK-008` keeps its ID and is simplified; full restore/import-preview is **deferred/merged into `TASK-029`** unless an earlier substantial migration proves it necessary.
- `TASK-009 + TASK-013` may be merged into one small PR only after navigation approval.
- `TASK-010 + TASK-014` may be merged into one small PR only after Today approval.
- `TASK-011 → TASK-016` and `TASK-012 → TASK-015` remain separate sequential PRs.
- No TASK was deleted or renumbered; the target stages through `TASK-044` are unchanged.

This order deliberately puts correctness before visual refactoring and starts product use after six tasks, not after `TASK-026`. After `TASK-009`, approved Today extraction/redesign may pair (`010+014`); Shopping (`012→015`) and Menu (`011→016`) stay split because their state/calendar risks justify an independent extraction check.

GitHub Actions is not part of the scheduled backlog. Add remote CI only when multiple developers, required PR checks, branch protection or repeated skipped local preflight create a concrete need.

## Dogfood milestones before the final gate

- **Milestone A — Correctness:** after `TASK-001`–`006`, test quantities, hard restrictions, shopping reconciliation and Undo in the current UI.
- **Milestone B — Consumer UX:** after approved `TASK-009`–`016` pairs, test mobile Today/Menu/Shopping and navigation with real household routines.
- **Milestone C — Family Core:** after `TASK-017`, `018`, `019`, `021`, `022`, use the generated weekly menu as a family.
- **Milestone D — Learning Loop:** after `TASK-020`, `023`, `024`, `025`, run one/two weeks with shopping provenance and accepted/replaced/cooked/skipped history.
- **`TASK-026`:** consolidate the formal Initial Build release decision; it is not the first user test.

Milestone letters A–D are dogfood checkpoints. To avoid ambiguity with the older research addendum, later architecture gates are named explicitly: Initial Build, Household, Pantry and Expansion release gates.

## Decisions requiring approval

| Decision | Recommendation | Consequence |
|---|---|---|
| Stack | Keep Next.js + TypeScript modular monolith | no new runtime/language before a concrete need |
| Hard rules | Fail closed; “no safe plan” is valid | preference score can never compensate an allergy/restriction |
| A2/Tomato | Approve as provisional direction, not final UI/code | typography/density/cards/navigation remain reviewable |
| Shopping | Preserve manual, checked quantity and provenance across recalculation | requires stable row/requirement IDs |
| Pantry | Auto-subtract only confirmed quantities; show/ask about likely stock | fewer forgotten purchases, less fake precision |
| Cloud | After Initial Build unless two-device pilot is mandatory | avoids RLS/sync work before core correctness |
| Budget | Show coverage/unknowns; no guarantee without complete current prices | retailer data remains late |
| Pilot | one family/2 weeks for correctness, then 10–30 households/4–8 weeks | separates engineering gate from product-market signal |

The following design specifications remain separate approval gates: Today, Menu/Week, Shopping, Recipe, Family, More/Kitchen, typography, density, navigation details and shared component/state patterns. Codex may analyze or implement an approved spec but does not choose these product decisions.

## Research improvements adopted

- Move commerce/SKU/promotions out of MVP despite Part 1's aggressive retail sequencing.
- Keep one TypeScript runtime despite Part 2's possible FastAPI/Python direction.
- Put unit arithmetic, hard constraints, shopping reconciliation and immutable Undo before modularization.
- Separate proposed/accepted/replaced/cooked/skipped facts before pantry inference.
- Model pantry as evidence-derived state with ranges/confidence class/decay, not exact ERP and not a fake percentage.
- Make “cook once, eat twice” a planning primitive.
- Make planner reasons and shopping provenance inspectable.
- Preserve minimal offline Shopping later without committing to a full CRDT.
- Treat skills/plugins as development aids, not application infrastructure.
- Prefer local documented preflight over premature CI infrastructure; automate remotely only when a real collaboration/protection trigger exists.
- Start dogfood at four intermediate milestones and allow only two low-risk extraction/redesign pair candidates, avoiding both disposable work and uncontrolled refactor+redesign PRs.

## Stop condition

This branch contains documentation only. Do not start `TASK-001` until Pavel approves the architecture, contested decisions and implementation order. The exact next instruction is recorded in `architecture/HANDOFF.md`.
