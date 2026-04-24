# Contributing

**Status:** Living spec · reflects workflow as of 2026-04-24
**Audience:** Human contributors and AI assistants (Claude Code in particular)

---

## Read first

Before making any non-trivial change, read the relevant spec in [`docs/`](./docs/):

| Touching | Read |
|---|---|
| `src/design-system/` | [docs/design-system/](./docs/design-system/README.md) |
| Transfers page / table / hooks | [docs/features/transfers.md](./docs/features/transfers.md) |
| Accounting page / entries / registers | [docs/features/accounting.md](./docs/features/accounting.md) |
| HR tables / payroll / bonus | [docs/features/hr.md](./docs/features/hr.md) |
| PSPs / commission rates / settlements | [docs/features/psp.md](./docs/features/psp.md) |
| IB partners / commissions / payments | [docs/features/ib-partners.md](./docs/features/ib-partners.md) |
| AI chat / tools / streaming | [docs/features/ai-assistant.md](./docs/features/ai-assistant.md) |
| New DB tables / columns / enums | [docs/data-model/](./docs/data-model/README.md) + [docs/migrations.md](./docs/migrations.md) |
| New RPC / Edge Function | [docs/api/README.md](./docs/api/README.md) |
| Auth / RBAC / RLS / invites | [docs/auth/](./docs/auth/README.md) |

Specs are the **contract**. If code disagrees, fix one or the other — don't silently fork.

## The golden rule

> Update the spec in the same PR as the behavior change.

A PR that changes a feature without updating its spec will drift over time and the spec becomes a lie. Catch this in review.

## Workflow

### 1. Branch

Branch from `main`. Naming convention is loose — descriptive kebab-case (`fix-transfers-usd-pill`, `add-ib-commission-override`).

### 2. Commit style

Look at recent `git log` for the current style. Summary:

- First line: concise, imperative mood (`Fix TRY/TL drift in transfers`).
- Body: *why* the change, not just *what*. Reference migration numbers and spec sections.
- No enforced prefix (Conventional Commits not required).
- Commits are squashed on merge — err toward a clean final-state message.

### 3. Pre-commit hook

Husky runs ESLint on changed files. **Unused imports fail the commit** — remove them before committing. See the [`feedback_precommit_hooks`](./~/.claude/projects/.../memory/feedback_precommit_hooks.md) memory note.

### 4. Tests

There's no test suite today ([testing.md](./docs/testing.md#1-current-state)). Ad-hoc manual testing in the browser + SQL editor spot-checks. When you add tests, document the pattern in `docs/testing.md`.

### 5. TypeScript

Strict mode. No `any` without a comment explaining why. No `@ts-ignore` without a comment explaining why. `as never` casts are acceptable for RPC returns until the types are regenerated.

### 6. DB changes

Follow [docs/migrations.md](./docs/migrations.md). Before a PR with a new migration:

- [ ] Spec file updated (migrations timeline section).
- [ ] `RAISE NOTICE` on data changes.
- [ ] Wrapped in `BEGIN / COMMIT` if multi-statement.
- [ ] Known-gaps entries added if you found drift you're not fixing.

### 7. Review

Self-review diff before opening the PR. Check:

- [ ] No `console.log` left behind.
- [ ] No `TODO` without a linked issue or owner.
- [ ] No hard-coded strings in user-facing locations (use i18n).
- [ ] No hard-coded colors (use design tokens).
- [ ] No fixed pixel widths on translated text.
- [ ] Spec updated in the same diff.

## Communication conventions

### With the team

Ask when confused. CLAUDE.md explicitly endorses this: "We question each other during sessions for more clarity."

### With AI (Claude Code)

- Specs in `docs/` are authoritative for AI too. The `reference_docs_folder.md` memory points future sessions here.
- When AI updates a spec, it should cite file paths + line numbers and include a "Known gaps" section. See [`feedback_spec_writing_style.md`](./~/.claude/projects/.../memory/feedback_spec_writing_style.md).

## Code style

### Frontend

- React 19 + TypeScript 5.9 strict.
- Tailwind CSS v4 with `@theme` tokens. Use design system tokens, not raw hex.
- Functional components. Hooks for state, not classes.
- `@ds` for UI primitives. `@/` for the rest of `src/`.
- Barrel imports (`from '@ds'`) — never sub-path imports.
- React Query for server state. No Redux / Zustand for data fetching.
- React Hook Form + Zod for form state.
- Prefer composition over configuration.

### Backend

- Supabase SQL as primary data layer.
- RPCs (`public.*`) for domain operations with business logic.
- Helpers in `private.*` for RLS primitives.
- Edge Functions (Deno) for integrations and streaming.
- Never trust client-sent role / auth claims — always re-derive server-side.

### Naming

- SQL identifiers: `snake_case`.
- TypeScript identifiers: `camelCase` (`PascalCase` for components / types).
- Files: match the dominant export's casing.
- Translation keys: `camelCase` within dot-separated namespaces.

### Comments

Per [CLAUDE.md](./CLAUDE.md) and the project's default: **write fewer comments, not more**. Code should be readable. Comments explain *why* (intent, constraint, non-obvious invariant), not *what*. Multi-paragraph docstrings are almost always wrong — prefer a one-liner or no comment at all.

## Do not

- Don't push to `main` directly. Always PR.
- Don't skip pre-commit hooks with `--no-verify`. Fix the lint error instead.
- Don't run destructive `git` operations (`reset --hard`, `push --force`) without explicit authorization.
- Don't commit secrets or `.env` files.
- Don't commit build output, `node_modules/`, `dist/`, coverage reports.
- Don't add a new dependency without justifying it in the PR description.
- Don't modify shared configs (ESLint, Prettier, Tailwind) without team discussion.

## Doing Claude Code sessions

When working with AI assistants in this repo:

- Specs are context. Start with `docs/README.md`.
- Memory at `~/.claude/projects/c--Users-ACER-Desktop-PipLineProV2/memory/` carries preferences + project context.
- Auto mode is fine for contained changes; confirm before destructive or cross-cutting work.
- Always update the spec when behavior changes. AI sessions should assume this rule.

## Known gaps

- **No CI** (lint, typecheck, build, test on PR). GitHub Actions would cover this.
- **No PR template.** Could standardize "spec updated?" / "migration reviewed?" checkboxes.
- **No code owners.** All files reviewed by all.
- **No release notes / changelog.** Git log is the only record.
- **No staging environment.** PRs go from local to production Supabase via manual migration paste.
