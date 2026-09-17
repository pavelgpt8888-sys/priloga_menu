# Known defect register — current behavior fixtures

Unresolved rows are intentionally **not** failing tests. The linked characterization tests pass by asserting what the application does today. A resolved row links to its corrected regression assertion.

| ID | Reproduction fixture / current behavior | Desired future assertion | Planned task |
|---|---|---|---|
| `mixed-units` | Resolved: `mixedUnitState()` now produces one `Мука` item with `1.5 кг` from `1 кг + 500 г`. | Regression assertion lives in `planner.characterization.test.ts`. | Resolved by TASK-003 |
| `restriction-bypass` | Resolved: `restrictionBypassState()` now leaves dinner main empty when restricted fish is the only candidate. | Regression assertion verifies typed `no_safe_candidate` and an empty unsafe slot in `planner.characterization.test.ts`. | Resolved by TASK-004 |
| `shopping-state-loss` | Resolved: `manualAndCheckedShoppingState()` preserves both manual and checked items after `replaceComponent()` recalculates shopping. | Regression assertion lives in `planner.characterization.test.ts`; focused reconciliation cases live in `shopping-reconciliation.test.ts`. | Resolved by TASK-005 |
| `undo-nested-mutation` | Resolved: `addRecipeToShopping()` leaves `nestedMutationState()` and its nested shopping item unchanged. | Characterization and command-boundary regression assertions verify immutable input and exact Undo restoration. | Resolved by TASK-006 |
