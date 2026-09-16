# Open-source and tooling audit

Checked: 2026-09-16. Purpose: distinguish reusable dependencies from reference-only products. This is an engineering policy record, not legal advice; the exact repository/file/dependency license must be rechecked at the commit actually reused.

## Decision labels

- **USE PACKAGE** — add the published dependency in a dedicated PR when the backlog reaches it.
- **ADAPT PATTERN** — reproduce a general product/domain pattern in our own code; do not copy implementation.
- **REFERENCE ONLY** — inspect public behavior/architecture, no code/assets copied.
- **REJECT NOW** — unnecessary for the current product stage or incompatible with the minimal architecture.

## Product references

| Project | Verified license signal | Valuable evidence | Decision now |
|---|---|---|---|
| [KitchenOwl](https://github.com/TomBursch/kitchenowl) | Repository states AGPL-3.0 | shared grocery flows, partial offline, recipe → list, household sync | **REFERENCE ONLY / ADAPT PATTERN**. Do not copy code unless the project deliberately accepts AGPL obligations. Its Flask/Flutter/RabbitMQ-capable architecture is not a reason to add Python, Flutter or queues here. |
| [Mealie](https://github.com/mealie-recipes/mealie) | Repository states AGPL-3.0 | recipe model/import, planner → shopping, API boundary | **REFERENCE ONLY / ADAPT PATTERN**. No code copy into this product under the current licensing posture. Its Python/Vue stack is not our target stack. |
| [Grocy](https://github.com/grocy/grocy) | [MIT license](https://github.com/grocy/grocy/blob/master/LICENSE.md) | units, stock/consumption events, barcodes, inventory API concepts | **ADAPT PATTERN**; possible code reuse only after file/dependency/license review and attribution. Product warning: Grocy is intentionally ERP-like; our UX must not require exact daily inventory. |
| [RecipeSage](https://github.com/julianpoy/RecipeSage) | README says AGPL-3.0 for non-commercial use and separate commercial licensing | import review, scaling/units, offline family planning and shopping | **REFERENCE ONLY** unless a commercial license is intentionally obtained. Do not copy code/assets. |
| Bring!, AnyList, Mealime, Paprika, Samsung Food | Proprietary consumer products | native interaction, list density, household jobs | **REFERENCE ONLY** from public behavior. Do not clone screens, branding, copy or assets. |
| `design/three-ui-concepts` A2 | Our internal Git branch, not production | selected-day Today, meal hierarchy, Shopping/Home context, four-tab mobile direction, Tomato experiment | **DESIGN REFERENCE ONLY**. No merge or code transplant without a separate task. Production is functional source of truth. |

## Candidate implementation packages

No package is added during this documentation stage.

| Package | License checked | When it earns a dependency | Decision |
|---|---|---|---|
| [Vitest](https://github.com/vitest-dev/vitest/blob/main/LICENSE) | MIT | `TASK-002`, pure domain characterization/regression tests | **USE PACKAGE** unless a simpler already-present runner exists at implementation time. |
| [Playwright](https://github.com/microsoft/playwright/blob/main/LICENSE) | Apache-2.0 | after stable screen contracts, for a few critical mobile/browser journeys | **USE PACKAGE LATER**, not as a substitute for unit tests. |
| [Zod](https://github.com/colinhacks/zod/blob/main/LICENSE) | MIT | runtime validation of persisted/imported/AI command data (`TASK-007`, `TASK-036`) | **USE PACKAGE** if explicit handwritten validators would be larger/less clear. One schema library only. |
| Supabase JS | verify exact version/license when `TASK-028` starts | shared Household after Initial Build | **CONDITIONAL USE**. Not needed for local Initial Build. |

## Explicitly rejected for the current stages

- Forking KitchenOwl, Mealie, RecipeSage or Grocy as the new application.
- Adding a Python/FastAPI service because reference products use Python.
- RabbitMQ/queues, event bus, vector database, Kubernetes, separate search service or MCP runtime.
- Instacart/retailer plugins as an MVP dependency. The retail phase begins only at `TASK-042` with a real source and business requirement.
- Copying A2 or a competitor screen verbatim. UX patterns are evidence; the approved screen specification controls implementation.

## Reuse checklist for a future task

Before copying any external code or asset, the PR must record:

1. exact repository URL and commit/tag;
2. exact file/package and its license, including nested dependencies/assets;
3. whether the use is code, data, design asset or only a general pattern;
4. required notice/attribution and where it is stored;
5. why adding the dependency is smaller/safer than local code;
6. removal/rollback path.

Until that record exists, external projects remain references, not implementation sources.
