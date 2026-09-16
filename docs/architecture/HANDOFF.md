# Architecture handoff

Date: 2026-09-16. Status: stop point before implementation.

## Repository state used

- Remote fetched with prune before completion.
- `origin/main`: `9663df09fa6ec74d0d70ca55bf63a83b509cca1e` (`docs: add final research addendum`).
- Functional source baseline: `b9a2a18195f28c4046049e08d4295cb9035e6734`; commits after it on `main` are documentation-only at the time of audit.
- UX reference: `origin/design/three-ui-concepts` at `0969a865e22ae6c3459c94b5fdbef26fd7a73271`.
- Working documentation branch: `codex/family-food-master-roadmap`.
- Design branch was inspected with `git show`/diff only; it was not checked out, merged or copied.

## Agreed recommendation awaiting approval

Evolve the current application as a TypeScript modular monolith. First make the local family loop correct and testable; then improve the approved Today/Menu/Shopping experience; then record actual history. Shared Household, probabilistic pantry, AI adapters and retail each open only after their preceding gate.

Initial Build ends at `TASK-026`, but dogfood starts at Milestone A after `TASK-006`. The next instruction should be one task only, normally `TASK-001`.

## Final roadmap optimization

- `TASK-001`: GitHub Actions removed from scope; it creates the reproducible local `npm ci → lint → typecheck → test → build` preflight. CI is an unscheduled conditional task triggered only by collaboration/branch-protection evidence.
- `TASK-008`: simplified to previous versioned snapshot + downloadable/readable complete JSON backup. Full restore/import preview is deferred into `TASK-029` or the first migration that proves it is needed.
- `TASK-009+013`: pairing-eligible only with an approved navigation spec.
- `TASK-010+014`: pairing-eligible only with an approved Today spec and a small reviewable diff.
- `TASK-011→016` and `TASK-012→015`: remain separate; Menu/calendar and Shopping/state risks justify independently verified extraction.
- No task ID was removed or renumbered. All 44 tasks and the final target architecture remain.

Dogfood checkpoints: Milestone A after `001–006`; Milestone B after approved core UX work; Milestone C after `017,018,019,021,022`; Milestone D after `020,023,024,025`; `026` is the formal release gate.

## Product truths to preserve

- Existing production behavior and working flows are functional source of truth.
- No rewrite from scratch and no automatic merge of the design branch.
- Today is moving toward one selected day with breakfast/lunch/dinner.
- A2/Bring-like interaction and Tomato are provisional UX direction, not final components/brand.
- Manual operation remains complete without AI.
- Hard restrictions, quantities, shopping, history, stock and money remain deterministic.

## Unresolved production problems

Highest-risk confirmed issues:

1. unit aggregation can produce `501 kg` from `1 kg + 500 g`;
2. restrictions are not a hard gate and fallback can choose a forbidden candidate;
3. shopping recalculation can erase manual/checked intent;
4. nested mutation can invalidate Undo;
5. recipe edits/manual recipes can diverge from menu/shopping;
6. servings do not scale needs;
7. time/budget inputs are scoring heuristics, not enforced limits;
8. plan, cooked history and stock evidence are conflated/incomplete;
9. malformed local state can silently fall back toward demo data;
10. there is no real household sync/auth/backend yet.

These are documented, not fixed by this branch.

## Decisions needed from Pavel

1. Approve the milestone-driven Initial Build order recorded in the backlog rather than a blind numeric `001 → 026` sequence.
2. Approve the rule that hard restrictions fail closed, even when no plan can be generated.
3. Confirm conservative pantry behavior: only confirmed quantity reduces shopping automatically; likely/unknown remains visible and asks only when relevant.
4. Confirm Tomato as a test palette, not locked branding. Separately approve Today, Menu/Week, Shopping, Recipe, Family, More/Kitchen, typography, density, navigation details and component/state specs before their redesign tasks.
5. Decide whether the first pilot must support two devices. If not, defer `TASK-027+`; if yes, Shared Household follows Initial Build rather than running in parallel with core corrections.
6. Confirm whether a rough budget with explicit coverage is useful before live retailer prices; no promise of “under N BYN” with incomplete price data.
7. Confirm pilot scale: start with one family/two weeks for correctness, then 10–30 households/4–8 weeks for product validation.

## Suggested next command after approval

> Implement only TASK-001 from `docs/IMPLEMENTATION_BACKLOG.md`. Preserve current behavior and UX, run the listed checks, open one small PR with rollback notes, then stop.

Do not start `TASK-001` from this architecture task.

## Memory AI handoff candidates

The product task does not write the canonical vault. Candidate facts for the designated Memory AI writer:

- `priloga_menu` target is a family food manager, not a retailer/checkout MVP.
- Architecture choice: current Next.js/TypeScript modular monolith; Supabase only after local core gate; no Python/microservices/queues/vector DB/MCP runtime.
- AI boundary: language/voice/image interpretation may propose drafts; deterministic code validates and mutates critical state.
- UX direction: production functionality wins; A2 Bring-like/selected-day/4-tab/Tomato is provisional design evidence only.
- First four correctness guardrails: unit arithmetic, fail-closed restrictions, shopping reconciliation, immutable Undo.
- Execution starts with local preflight and early dogfood. One small PR per task remains the default; only the two explicitly gated UX pairs may share a PR.
