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
4. `IMPLEMENTATION_BACKLOG.md` — 44 small ordered PR tasks.
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
| Correctness guardrails | 001–008 | reproducible baseline, units, restrictions, shopping, Undo, protected local data | known defects have regression coverage; backup works |
| Safe modularization | 009–012 | AppShell/Today/Menu/Shopping isolated without behavior change | current flows/screens remain reachable |
| Core UX | 013–016 | provisional four-tab IA, selected-day Today, native Shopping, local Menu actions | fewer taps, no lost functionality, approved screen specs |
| Deterministic family core | 017–025 | recipe revisions, servings, dates, provenance, repertoire, plan/history, leftovers and learning | complete local weekly loop with explainable results |
| Initial Build pilot | 026 | one-family two-week correctness test | Gate A |
| Shared Household | 027–031 | one command boundary, Auth/RLS, migration, conflicts/offline shopping | Gate B; only if two-device pilot is required |
| Smart Pantry | 032–035 | evidence, derived estimate, purchase/consumption signals, high-value questions | Gate C |
| AI/adapters | 036–040 | schemas/evals, text, voice, import, Telegram | Gate D and separate security/privacy approvals |
| Pricing/retail | 041–044 | honest reference prices, one source, matching, eventual reviewed checkout | proven retention + commercial/legal approval |

## First PRs after approval

1. `TASK-001` — reproducible baseline and CI guardrail.
2. `TASK-002` — characterization tests and four confirmed bug fixtures.
3. `TASK-003` — unit-safe quantities.
4. `TASK-004` — fail-closed hard restrictions.
5. `TASK-005` — shopping reconciliation preserving manual/checked state.
6. `TASK-006` — immutable transitions and trustworthy Undo.

This order deliberately puts correctness before visual refactoring. UI extraction begins only after tests/state commands protect behavior; A2-informed changes begin only after extraction and an approved screen mini-spec.

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

## Stop condition

This branch contains documentation only. Do not start `TASK-001` until Pavel approves the architecture, contested decisions and implementation order. The exact next instruction is recorded in `architecture/HANDOFF.md`.
