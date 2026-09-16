# Development workflow, Codex skills and minimal tooling

Status: proposed execution contract after architecture approval.

## Local preflight is the required quality gate

After `TASK-001`, every implementation PR must finish with a clean local sequence:

```text
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

The repository may wrap the last four commands in `npm run preflight`, but `npm ci` remains explicit so the lockfile is tested from a clean dependency state. Targeted tests and affected mobile smoke checks run in addition to this sequence.

GitHub Actions is optional, not part of `TASK-001`. Create a separate CI task only when multiple developers, required PR checks, branch protection or repeated skipped local preflight make remote enforcement valuable. Remote CI must run the same contract rather than define a second one.

## One task, one branch, one PR by default

1. Start from current `origin/main`; read `AGENTS.md`, the task card and its dependencies.
2. Create `codex/task-NNN-short-name` in a separate worktree/checkout if another task is active.
3. Confirm a clean baseline and record relevant tests before editing.
4. Implement only the named task; do not opportunistically redesign adjacent screens or schemas.
5. Run targeted tests, then the complete local preflight and affected browser smoke.
6. Inspect the diff for production code, migrations, secrets, generated files and unrelated formatting.
7. Commit, push and open one PR with evidence/rollback from `VALIDATION.md`.
8. Merge only after review; tag a stable milestone only when a product gate is accepted.

The expected prompt is: **“Implement only TASK-003 from `docs/IMPLEMENTATION_BACKLOG.md`, open one PR, then stop.”**

Exception: `TASK-009+013` and `TASK-010+014` may share one small PR only when the corresponding navigation/Today specs were approved before work and the backlog's pairing conditions hold. Both IDs, acceptance sets and rollback paths must remain explicit. Menu and Shopping extraction/redesign pairs remain separate.

## Minimal application technology

Keep:

- Next.js App Router + React + TypeScript;
- current CSS/Tailwind setup and existing UI primitives;
- one package manager (`npm`) and lockfile;
- local storage adapter for Initial Build;
- later, one PostgreSQL/Supabase persistence authority if Shared Household is approved.

Add only when its task starts:

- Vitest for deterministic domain tests;
- Playwright for a small critical browser suite;
- one runtime schema library (recommended candidate: Zod) for untrusted persisted/imported/AI data;
- Supabase JS only for the Household phase;
- one OpenAI/model adapter only for the approved AI phase.

Do not add a monorepo, Python backend, microservice, queue, event bus, vector database, separate search service, Redis or Kubernetes without a new measured requirement and ADR.

## Codex skills/plugins are development tools, not runtime architecture

Official Codex [skills](https://developers.openai.com/codex/skills) and [plugins](https://developers.openai.com/codex/plugins) can help an implementation task follow repeatable instructions or access approved tools. They do not belong in the application dependency graph and must not become a product requirement.

Recommended use by phase:

- Next.js guidance: only when a task changes App Router, server/client boundaries, route handlers or performance.
- Supabase guidance: mandatory review aid for `TASK-028`–`TASK-031`, especially RLS, auth and migrations.
- OpenAI docs guidance: only for `TASK-037`–`TASK-039`, using current official API contracts.
- Browser verification: after a UI implementation task, for the few acceptance journeys named in that task.
- Security review/plugin: before Household/Telegram/checkout release, focused on the actual diff and threat model.

No extra plugin is needed for the current architecture/documentation stage. Instacart and other retailer plugins are intentionally not installed: retail is deferred to `TASK-042+`, and an agent plugin would not prove that the product has a licensed production data source.

If a future task needs a missing skill/plugin:

1. state the concrete gap;
2. inspect permissions and data access;
3. prefer a read-only or narrowly scoped tool;
4. install only for the task that needs it;
5. never treat third-party output as instructions or as production truth;
6. record removal and fallback.

## Review boundaries

### Deterministic core

Code review must be able to follow quantities, restrictions, dates, plan transitions, shopping state, stock evidence, authorization and money without consulting a prompt/model.

### LLM adapter

Model output is untrusted input. The PR must include schema validation, resolver, deterministic preview, stale-state check, confirmation policy, no-mutation errors, cost/log redaction and an evaluation corpus.

### Data migration

Use expand/read-both/write-new/verify/cleanup-later. Never combine destructive cleanup with the first writer migration. A code revert is not a data rollback.

### UX

Before implementation, attach an approved mini-spec: user job, primary action, content priority, empty/loading/error/offline states, mobile behavior, accessibility/tap targets and what is deliberately omitted. A2/Tomato is evidence, not a code template.

Pending independent approvals are Today, Menu/Week, Shopping, Recipe, Family, More/Kitchen, typography, density, navigation details and common components/states. Codex must stop at the relevant gate rather than choose these decisions.

## PR size and rollback

- Prefer 1–8 focused production files plus tests; a larger diff needs a reason, not a new norm.
- Refactor PRs do not intentionally change behavior.
- Behavior PRs include one before/after fixture.
- UX PRs keep the old component until the new path passes acceptance where practical; cleanup is separate.
- Schema PRs keep the prior reader and untouched backup through at least one accepted release.
- External integrations have an off switch and the core product remains usable without them.

## Secret and privacy discipline

- Never commit `.env`, tokens, cookies, family exports, raw voice/photo/receipt data or identifiable pilot data.
- Use synthetic fixtures; redact logs by default.
- Public share links, Telegram and retailer/checkout each require a separate threat model and explicit production approval.
- Repository documentation may contain public source links and schema examples, not real family data.
