# Development Workflow

## Principle

GitHub stores the code. Vercel shows the app to testers. Codex changes only the needed parts of the code and keeps rollback easy.

## Normal Change Flow

1. Read the current code and understand the existing pattern.
2. Make a small scoped change.
3. Run `npm run lint`.
4. Run `npm run build`.
5. Test the changed screen locally when relevant.
6. Commit with a clear message.
7. Push to GitHub.
8. Let Vercel deploy from `main`.
9. If the version is good, create a git tag.

## Branches

- `main`: stable branch that deploys to Vercel.
- `feature/name`: normal feature work.
- `fix/name`: bug fixes.
- `experiment/name`: risky design or architecture experiments.

## Commits

Use short imperative messages:

- `Add editable family profiles`
- `Fix shopping list totals`
- `Improve mobile meal cards`
- `Revert cyberpunk palette experiment`

## Stable Versions

Create tags for versions Pavel may want to restore:

```powershell
git tag v0.2-family-profiles
git push origin v0.2-family-profiles
```

Use a tag when:

- Pavel likes the deployed version.
- A major feature starts working.
- A design direction is approved.

## Rollback

Fast public rollback:

- Use Vercel Deployment history and promote a previous good deployment.

Code rollback:

```powershell
git revert <commit>
git push origin main
```

Restore from a tagged version for new work:

```powershell
git checkout -b restore-v0.2-family-profiles v0.2-family-profiles
```

Avoid `git reset --hard` unless Pavel explicitly asks for it and understands that it can discard local changes.

## Definition Of Done

A change is done when:

- The requested behavior is implemented.
- The change is scoped and does not rewrite unrelated areas.
- Lint/build pass, or any failure is clearly explained.
- The result is committed and pushed when Pavel wants the public version updated.
- The final answer says what changed, where to test, and any remaining limitations.

## Design Guardrails

- Do not make broad palette or layout pivots without explicit approval.
- Preserve the currently preferred warm Vercel direction unless asked otherwise.
- Keep mobile navigation and large tap targets.
- Make shopping and meal replacement obvious.
- Images must correspond to food names or be removed/replaced with neutral placeholders.
