# Known defect register — current behavior fixtures

Unresolved rows are intentionally **not** failing tests. The linked characterization tests pass by asserting what the application does today. A resolved row links to its corrected regression assertion.

| ID | Reproduction fixture / current behavior | Desired future assertion | Planned task |
|---|---|---|---|
| `mixed-units` | Resolved: `mixedUnitState()` now produces one `Мука` item with `1.5 кг` from `1 кг + 500 г`. | Regression assertion lives in `planner.characterization.test.ts`. | Resolved by TASK-003 |
| `restriction-bypass` | `restrictionBypassState()` generates `Рыба запеченная` when it is the only main candidate despite `рыба` restriction. | Hard restrictions must fail closed: do not generate a forbidden dish; return an explicit blocked/no-plan result instead. | TASK-004 |
| `shopping-state-loss` | `manualAndCheckedShoppingState()` loses both manual and checked items after `replaceComponent()` recalculates shopping. | Recalculation must reconcile generated items while preserving manual and checked state. | TASK-005 |
| `undo-nested-mutation` | `nestedMutationState()` is mutated by `addRecipeToShopping()` before the page can snapshot Undo. | Domain transitions must not mutate nested prior state; Undo must restore the exact prior snapshot. | TASK-006 |
