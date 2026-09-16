# Known defect register — current behavior fixtures

These are intentionally **not** failing tests. The linked characterization tests pass by asserting what the application does today. The "desired future assertion" column is a change target for the named later task; do not enable it as a passing assertion until that task is implemented.

| ID | Reproduction fixture / current behavior | Desired future assertion | Planned task |
|---|---|---|---|
| `mixed-units` | `mixedUnitState()` produces one `Мука` item with `501 кг` from `1 кг + 500 г`. | Convert compatible units before aggregation and preserve an explicit canonical unit. | TASK-003 |
| `restriction-bypass` | `restrictionBypassState()` generates `Рыба запеченная` when it is the only main candidate despite `рыба` restriction. | Hard restrictions must fail closed: do not generate a forbidden dish; return an explicit blocked/no-plan result instead. | TASK-004 |
| `shopping-state-loss` | `manualAndCheckedShoppingState()` loses both manual and checked items after `replaceComponent()` recalculates shopping. | Recalculation must reconcile generated items while preserving manual and checked state. | TASK-005 |
| `undo-nested-mutation` | `nestedMutationState()` is mutated by `addRecipeToShopping()` before the page can snapshot Undo. | Domain transitions must not mutate nested prior state; Undo must restore the exact prior snapshot. | TASK-006 |
