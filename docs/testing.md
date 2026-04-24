# Testing

**Status:** Living spec · reflects codebase as of `main` on 2026-04-24
**Scope:** What tests exist, what the strategy is, what the gaps are

> This file exists to be **honest about the current state**: the repo has a handful of unit tests, no integration suite, no e2e, no CI. Adding tests is a valid and welcome PR category.

---

## 1. Current state

### 1.1 What exists

A small set of Vitest unit tests — ~5 files. Find them via:

```
src/**/*.test.ts
src/**/*.test.tsx
```

As of 2026-04-24, the known test files:
- `src/schemas/accountingSchema.test.ts`
- `src/schemas/pspSettlementSchema.test.ts`
- `src/schemas/reconciliationSchema.test.ts`
- `src/schemas/transferSchema.test.ts`
- `src/lib/csvImport/validateRows.test.ts`

These cover **Zod schemas and CSV parsing** — the edges where user input lands. No tests for:
- React components (no Testing Library suite).
- Hooks (no mocking of React Query / Supabase).
- RPCs (no DB fixtures).
- Edge Functions (no Deno test runner config).
- Full page flows (no Playwright / Cypress).

### 1.2 Runner

Vitest. Config: [`vitest.config.ts`](../vitest.config.ts). Run:

```bash
npm run test       # watch mode
npm run test:run   # single run
```

### 1.3 Coverage

No coverage thresholds enforced. `.coveragerc` / Istanbul config not set up beyond Vitest defaults. See [feedback_repo_cleanliness.md](../~/.claude/projects/.../memory/feedback_repo_cleanliness.md) — the user doesn't want coverage reports committed.

## 2. What the strategy should be

Not mandated, but a reasonable progression:

### 2.1 Tier A (high-value, low-cost)

1. **Schema tests** (Zod) — already started; extend to every schema.
2. **Pure-function tests** for business logic:
   - `computeTransfer` in `src/hooks/useTransfers.ts` — commission / net / amount_try / amount_usd math.
   - `computeDaySummary` in `src/pages/transfers/transfersTableUtils.ts`.
   - `calcAutoBonus` in `src/hooks/queries/useTransfersQuery.ts`.
   - Prorated salary / absence divisors in `src/pages/hr/utils/`.
3. **CSV parsing tests** — already started; extend to every import path.

### 2.2 Tier B (medium effort)

4. **Hook tests** with React Query test utilities + a mocked Supabase client.
5. **Component tests** for complex DS primitives (e.g. `DatePicker` preset behavior, `Grid` breakpoint collapse).
6. **RLS tests** — a SQL fixture seeding users with different roles, exercising each table's read/write policies.

### 2.3 Tier C (high effort, high value)

7. **Integration tests** end-to-end through the Supabase client against a local Supabase project. Migration → seed → query → assert.
8. **E2E** Playwright flows covering the golden paths: login, create a transfer, create a settlement, close a month.

## 3. Conventions (when tests exist)

### 3.1 File placement

Co-locate: `foo.ts` → `foo.test.ts` in the same folder. Don't nest under `__tests__/`.

### 3.2 Naming

- `describe('computeTransfer', () => …)` — one describe per function.
- `it('applies commission only to deposits', () => …)` — present-tense behavior description.

### 3.3 Structure

Arrange / Act / Assert. Prefer fixture objects over magic numbers.

### 3.4 Mocking

- React Query: `QueryClientProvider` + a test-scoped `QueryClient` with retries disabled.
- Supabase: mock the client via `vi.mock('@/lib/supabase')`.
- i18n: tests should pass regardless of locale; use `'en'` explicitly if the locale matters.

### 3.5 What not to test

- Don't snapshot-test whole components. Test behavior, not layout.
- Don't test React internals or third-party library behavior.
- Don't test styling directly (design tokens are already the contract).

## 4. Running tests

```bash
# Run all
npm run test:run

# Watch a file
npm run test -- src/schemas/transferSchema.test.ts

# Debug
npm run test -- --inspect-brk
```

## 5. CI

**None today.** PRs are not tested automatically. Adding a GitHub Actions workflow that runs `npm run lint && npm run build && npm run test:run` would close this gap with minimal setup.

## 6. Quality checks that *do* run

### 6.1 Pre-commit

Husky hook → ESLint on changed files. Catches unused imports, obvious lint errors. See [CONTRIBUTING.md §3](../CONTRIBUTING.md#3-pre-commit-hook).

### 6.2 TypeScript

`tsc --noEmit` via `npm run typecheck` (if set up). Enforced locally; not enforced in CI.

### 6.3 Build

`npm run build` catches type errors + Vite build errors. Run locally before pushing.

## 7. Known gaps

- **No CI.** Everything above is locally-run. A GitHub Action is the quickest fix.
- **No RLS tests.** The security model relies on RLS; no automated verification that a given role can/can't read/write a given table. A Python or shell script with role-switched Supabase clients could seed this.
- **No regression tests for past bugs.**
  - The USD/USDT incident (migration 140) would have been caught by a test asserting `get_monthly_summary` returns the same `total_usdt_volume` for equivalent inputs regardless of DB currency label.
  - The TL/TRY drift (migration 141) would be caught by a test asserting `currency_split` has one entry per *currency semantic group*, not one per label.
  - Add regression tests retroactively.
- **No Edge Function tests.** `supabase/functions/*/index.ts` has no test harness. Deno has a test runner; we haven't configured it.
- **No RPC contract tests.** Changes to `get_monthly_summary` output shape can break the frontend silently — there's no contract pinning the JSON structure.
- **No visual regression tests.** Dark mode / light mode / responsive breakpoints aren't visually verified. Chromatic / Percy would close this.
- **No accessibility tests.** No axe-core or similar in the build.
- **No performance tests.** No Lighthouse CI, no bundle-size tracking.
- **No migration tests.** Nothing runs 001 → latest on an empty DB to verify the sequence applies cleanly.
- **Coverage target undefined.** Tier A alone would get us to maybe 20% coverage; still useful, but we should pick a target (e.g. "80% on `src/hooks/` pure functions").

## 8. If you're about to add tests

Start with **Tier A** and pick one module at a time. Don't try to boil the ocean. Each test file should:

1. Live next to the code it tests.
2. Run in < 100ms.
3. Have no external dependencies (no real Supabase, no real network).
4. Fail loudly and clearly when the underlying code changes behavior.

Update this doc's [§1.1 known tests list](#11-what-exists) as you add files so the inventory stays honest.
