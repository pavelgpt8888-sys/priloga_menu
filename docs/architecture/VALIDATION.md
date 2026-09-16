# Validation and release gates

Status: architecture-stage evidence and future verification contract. No production behavior was changed.

## Baseline provenance

- Functional code audited at `b9a2a18195f28c4046049e08d4295cb9035e6734`; later `origin/main` commits through `9663df09fa6ec74d0d70ca55bf63a83b509cca1e` add documentation only.
- Design reference audited at `origin/design/three-ui-concepts` commit `0969a865e22ae6c3459c94b5fdbef26fd7a73271`; branch is not merged.
- Production URL was viewed, but deployment metadata was not available, so exact production SHA is unverified.
- Real browser localStorage, credentials and family data were not exported or included in fixtures.

## Read-only defects reproduced during audit

These are evidence for the first regression tests, not claims that fixes exist:

1. `1 kg` rice + `500 g` rice becomes `501 kg` in current aggregation.
2. Hard restrictions are scoring penalties; when all breakfast candidates are restricted, the fallback still produces seven breakfasts.
3. An empty soup candidate pool can throw while reading `id` from `undefined`.
4. Rebuilding shopping after a menu change loses a manual shopping item.
5. Nested objects are mutated by recipe-to-shopping and checked-to-inventory paths, so Undo can capture already-mutated state.
6. A “maximum 30 minutes” query can return weekend dishes around 75 minutes because time is a score, not a gate.
7. Recipe edits can leave the linked dish stale; manually created recipe “add to menu” can be a silent no-op.
8. Servings/family size do not scale shopping quantities.
9. Feedback does not affect the next generated plan.
10. Weekend logic is based on array position from today, not the actual weekday.

The full code-path inventory is in `CURRENT_STATE_AUDIT.md`.

## Required test layers

### Domain unit tests

Fast deterministic tests for quantities, constraints, scoring, dates, plan transitions, shopping reconciliation, history and pantry projection. They must not depend on current date, random global state, network or an LLM.

### State/migration tests

Fixtures for every supported schema version, malformed/corrupt data, legacy import, idempotent repeat, read-back comparison and rollback. Fixtures use synthetic household data only.

### Component/integration tests

Test user jobs and states, not implementation structure: selected day changes real meals, one slot changes locally, shopping check/manual add survive recalculation, blocked rule is explained.

### Browser smoke tests

Keep a small critical set:

- open current valid state and exercise the corruption/recovery path;
- Today → select date → view three meals;
- Menu → replace/move/repeat with the actions available at that stage, without changing unrelated slots;
- Shopping → add/check/recalculate/transfer;
- download and read back a complete JSON backup; full restore/import preview only when the relevant migration task exists;
- mobile 390×844 and representative desktop viewport.

### Security/authorization tests when cloud exists

Anonymous, cross-household, removed-member, forged household ID, direct Data API write, replayed mutation and stale revision must fail. Positive UI tests do not replace these negatives.

### AI evaluation when AI exists

Versioned phrases with expected structured output, deterministic validation result and “no mutation” failure cases. Model/network tests use recorded mocks in the local test suite and in remote CI if it is later justified; live evaluation is a separate controlled check.

## Gates

### Gate 0 — before first behavior fix

- local `npm ci → lint → typecheck → test → build` preflight is reproducible;
- four priority bug fixtures exist;
- current mobile/desktop critical flows are captured;
- export/backup plan exists before schema migration.

## Dogfood milestones

### Milestone A — Correctness, after `TASK-001`–`006`

- use the existing UI with household-like synthetic/current local data;
- verify quantity arithmetic, hard-rule blocking, shopping preservation and Undo;
- log focused defects immediately rather than waiting for the completed Initial Build.

### Milestone B — Consumer UX, after the approved `TASK-009`–`016` sequence

- navigate Today/Menu/Shopping/More comfortably on a real phone viewport;
- complete a selected-day change, week adjustment and store check-off flow;
- validate the approved design specs, not A2 assumptions invented by Codex.

### Milestone C — Family Core, after `TASK-017`, `018`, `019`, `021`, `022`

- build and adjust a week from the family's repertoire and serving needs;
- inspect reasons/blocked constraints;
- use it as a family before adding history intelligence.

### Milestone D — Learning Loop, after `TASK-020`, `023`, `024`, `025`

- run one/two weeks of plan → shopping → cooked/skipped/replaced feedback;
- verify provenance, planned leftovers and ranking changes;
- feed the evidence into the formal Initial Build release gate.

### Initial Build release gate (`TASK-026`)

- one family can use the full weekly loop for two consecutive weeks;
- no data loss, hard-rule violation or unexplained missing purchase;
- quantities and serving changes are traceable;
- Today/Menu/Shopping need no AI to work;
- backup/read-back, documented recovery path and release rollback rehearsed.

### Household release gate (`TASK-031`)

- two authenticated adults use one household with no lost scripted conflict;
- RLS/auth negative matrix passes;
- offline Shopping behavior and pending mutations are explicit;
- server is the one authority after cutover.

### Pantry release gate (`TASK-035`)

- inferred stock reduces work rather than hiding needed goods;
- likely/unknown never silently subtracts by default;
- question count, ignored rate and correction rate are measured;
- evidence projection can rebuild under a new rule version.

### Expansion release gate — before serious AI or retail

- repeated weekly use is demonstrated over the agreed pilot period;
- core problems are not being “rescued” by AI;
- specific adapter/source has user value, cost, privacy and rollback criteria;
- retail work has an approved legal/commercial source.

## PR evidence template

Every implementation PR should report:

- task ID and user-visible change;
- changed files and explicit out-of-scope;
- automated commands/results;
- before/after fixture or screenshot for behavior/UX changes;
- data migration and backup result, if any;
- rollback method and last compatible schema;
- unresolved risk and manual check.

“Build passed” is not sufficient proof for a planner, shopping or authorization change.
