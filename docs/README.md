# PipLinePro V2 — Documentation

Spec-first documentation for humans and AI assistants working on this repo. Source-of-truth specs live here; auto-generated artifacts (types, API schemas) are elsewhere.

## Index

### Shipped

- **[design-system/](./design-system/README.md)** — full spec for the UI component library at `@ds`. Covers tokens, theming, every component, composed patterns, and accessibility.
- **[features/transfers.md](./features/transfers.md)** — the Transfers feature end-to-end: domain vocabulary, data model, commission rules, blocked/payment-type handling, currency & USDT semantics, daily-summary formulas, `get_monthly_summary` RPC contract, UI architecture, HR auto-bonus integration, PIN gate, import pipeline, RLS, and full migration timeline.

### Proposed (see [Next specs](#next-specs) below)

Remaining items from the priority list — data model, auth, RPC contract, and the other feature specs.

---

# Next specs

Prioritized by *how often confusion about this area has cost time in practice*. The top group should be written before the bottom.

## Tier 1 — High leverage, low effort (do next)

### 1. Data model & RLS reference

**Why:** we've already hit bugs rooted in "what does this column actually mean" (the `currency='USD'` vs `'USDT'` incident from 2026-04-24 is a textbook example). Writing this down prevents a repeat.

**Contents:**
- Every table with every column: type, constraint, FK, description.
- Every domain enum (`system_role`, org `role`, transfer `currency`, `direction`, `register`, etc.) with its allowed values *and their meaning*.
- RLS policy per table: who can select/insert/update/delete, and the `private.*` helpers it calls.
- Computed columns / triggers: `amount_try`, `amount_usd`, `transfer_audit_log`, `log_god_action`, `custom_access_token_hook`.
- Migration conventions (file naming, the `045b`/`069b`/`117` dup note, post-migration manual steps).

**Location:** `docs/data-model/README.md` (+ optional per-table pages if size warrants).

### 2. RPC / API contract

**Why:** RPCs like `get_monthly_summary`, `get_psp_ledger`, `get_accounting_summary` are consumed by frontend hooks *and* the AI edge function. Their output shape is load-bearing; nothing documents it.

**Contents:**
- Every `CREATE OR REPLACE FUNCTION` in `supabase/migrations/` that returns data.
- For each: SQL signature, permissions (SECURITY DEFINER? invoker?), input params, JSON/row output shape, which hook(s) call it.
- The "what `currency='USDT'` means in the `total_usdt_volume` output" type of contract — i.e. semantic meaning of fields, not just types.
- Edge functions: `ai-chat` (tool list, role gating, streaming event shape).

**Location:** `docs/api/README.md`.

### 3. Auth & RBAC

**Why:** the hierarchy is non-trivial (`god > admin > manager > operation`), the god-hiding rules are subtle (RLS excludes god from non-god selects), and the JWT hook must be enabled manually in Supabase. New developers burn hours learning this.

**Contents:**
- Role hierarchy and exact capabilities (who can create orgs, assign roles, see what).
- How `system_role` (profiles) differs from `role` (organization_members).
- RLS helpers: `private.is_god()`, `private.get_user_org_ids()`, `private.is_org_admin(org_id)` — what each returns, when to use.
- JWT custom claim flow: hook enablement, claim name, client-side usage via `AuthProvider`.
- Invite flow end to end (God/admin creates invitation → user signs up → auto-accept trigger → organization_members row).
- PIN system (`verify_org_pin`, rate limiting, when it's required).

**Location:** `docs/auth/README.md`.

## Tier 2 — Feature specs (do as you touch them)

One spec per major product area. Each is a *living* document — update it in the same PR that changes behavior.

### 4. Transfers

Largest feature by surface area, biggest risk for spec drift.

**Contents:**
- Domain vocabulary: transfer, transfer type, transfer category, payment method, PSP, blocked, payment-type (ödeme), commission, net, exchange rate, amount_try/amount_usd.
- Business rules:
  - Commission applies to **deposits only** (not withdrawals).
  - Blocked transfers are excluded from every total (`is_excluded` flag).
  - Payment-type transfers are split into their own section.
  - USDT transfers (`currency='USDT'`) are aggregated in USD; TL transfers use `amount_try`.
  - Daily summary formulas: Net Cash (USDT) = `bank_usd + usdt_net - commission_usd`.
- UI spec: filter drawer (8 filters), bulk ops, load-more vs paginate, daily group header, daily summary dialog fields.
- Import pipeline: CSV format, `import-transfers-2026.mjs` conventions.
- Related migrations: 008, 080, 084, 110, 112, 113, 124, 136, 140.

**Location:** `docs/features/transfers.md`.

### 5. Accounting

**Contents:**
- Ledger entries (`accounting_entries`): `ODEME` vs `TRANSFER`, direction `in`/`out`, which registers.
- Registers: USDT, NAKIT_TL, NAKIT_USD, TRX — balances, opening balances (migration 123), snapshots.
- Wallet management via Tatum: supported chains, API key env var, snapshot cadence.
- `get_accounting_summary` and `get_category_breakdown` RPC contracts.
- IB integration (migration 130), PSP settlement integration (migration 131).

**Location:** `docs/features/accounting.md`.

### 6. HR / Payroll

**Contents:**
- Employee model, salary currency (`TL` / `USD` — real USD), supplement, insured bank.
- Barem system: targets, failures, roles setting.
- Bulk payments flow (migration 103).
- Check-in feature: QR, time casts, actual status (migrations 136/137/138/139).
- Salary payment entries — which register do they hit (NAKIT_TL vs NAKIT_USD)?
- Exit date + auto-reassign of IB partners (migration 133).

**Location:** `docs/features/hr.md`.

### 7. PSP management

**Contents:**
- PSP scope: global vs org-specific (migration 067 unipayment, 124 IB partner link).
- Commission rate model: base rate vs per-period rates (`psp_commission_rates`), effective_from semantics.
- Settlement model (`psp_settlements`, opening balance note).
- `get_psp_summary`, `get_psp_ledger`, `get_psp_monthly_summary` contracts.
- Internal PSPs (`is_internal`), currency (`TL` / `USDT`).

**Location:** `docs/features/psp.md`.

### 8. IB Partner management

Recent major addition (migrations 117, 119, 124–135).

**Contents:**
- Partner lifecycle, agreement types (multi, migration 125), CPA / revenue share (129).
- `managed_by` assignment (126), secondary employee (128), open-write to all org members (134), cascade SET NULL on delete (135).
- Commission flow to accounting (130).
- RLS / ownership rules.

**Location:** `docs/features/ib-partners.md`.

### 9. AI Assistant

**Contents:**
- Edge function architecture (`supabase/functions/ai-chat/index.ts`): Anthropic SSE streaming, agentic tool loop.
- Tool list with inputs/outputs, per-role gating (`ADMIN_ONLY_TOOLS` from the 2026-04-20 auth change).
- Frontend streaming consumer pattern (`response.body.getReader()`).
- Required secrets: `ANTHROPIC_API_KEY`.
- Model choice + migration path when upgrading.

**Location:** `docs/features/ai-assistant.md`.

## Tier 3 — Cross-cutting, lower urgency

### 10. i18n

**Contents:**
- Namespaces (`common`, `components`, `pages`), when to use which.
- Key naming conventions (dot-separated, feature-scoped).
- Fallback policy, detection order (`localStorage → navigator → 'en'`).
- String-length budget (TR is 30–40% longer than EN — affects layout).
- RTL readiness rules (prefer logical properties).

**Location:** `docs/i18n.md`.

### 11. PWA & offline

**Contents:**
- `vite-plugin-pwa` config (registerType, workbox options).
- Manifest: name, display, icons, scope.
- Service worker strategy (runtime caching rules).
- Update prompt (`PwaUpdatePrompt.tsx`) + `pwaUpdateController` wiring.
- Offline fallback page contract.
- Safe-area + standalone-mode considerations (already in design-system/accessibility.md — cross-link).

**Location:** `docs/pwa.md`.

### 12. Observability & audit logging

**Contents:**
- `god_audit_log` table contract + what triggers write to it.
- `audit_organization_changes`, `audit_org_member_changes` triggers (migration 112 BUG-06 — DELETE returns OLD).
- Transfer audit trail (`transfers_audit_log`, migration 118).
- What to do when investigating "who changed this": query path.

**Location:** `docs/observability.md`.

### 13. Security model

**Contents:**
- RLS guarantees per table (cross-reference with data-model spec).
- `organization_pins` hashing (bcrypt via `pgcrypto`).
- Rate limiting: `login_attempts`, `should_rate_limit_device` (migration 112 BUG-13).
- What's server-side enforced vs frontend-only (UX hint): e.g. role checks, PIN gates.
- Secrets management (env vars, Supabase Edge Function secrets).

**Location:** `docs/security.md`.

### 14. Migrations process

**Contents:**
- Naming (3-digit prefix, kebab-case).
- Known duplicates (`117`, `136` — see `supabase/migrations/README.md`).
- Manual steps after paste (JWT hook enablement, god promotion).
- Backup strategy (many migrations create `*_backup_*` tables before destructive changes — codify this).
- How to write a reversible data migration.

**Location:** `docs/migrations.md` (supersedes or cross-links `supabase/migrations/README.md`).

## Tier 4 — Process

### 15. Contribution guide

Writing conventions, PR expectations, commit message style, when to use CLAUDE.md vs specs vs memory.

**Location:** `CONTRIBUTING.md` at repo root.

### 16. Testing strategy

What tests exist today (unit via Vitest? integration? e2e?), what coverage looks like, where new tests should live. **Gap:** no tests visible in the current repo tree — if this is intentional, say so; if it's a gap, plan one.

**Location:** `docs/testing.md`.

---

# Recommended order of writing

If we do this sequentially, I'd go:

1. **Design system** ✓ (done)
2. **Data model & RLS** (Tier 1 #1) — underpins everything else
3. **Auth & RBAC** (Tier 1 #3) — unblocks tiers 2 + 3
4. **Transfers** (Tier 2 #4) — largest feature, biggest payoff
5. **RPC / API** (Tier 1 #2) — after transfers so we have worked examples
6. ...everything else as touched

Tiers 1 and 2 are the load-bearing docs. Tiers 3 and 4 can be stubbed as "TODO" pages and filled in when someone touches the relevant area.

---

# Meta: conventions for writing specs here

To keep the specs coherent with each other:

- **Lead with the contract, then the why.** What's guaranteed > how it's implemented > why it was designed this way.
- **Cite file paths + line numbers.** Markdown links: `[Button.tsx:40](../src/design-system/components/Button/Button.tsx#L40)`.
- **Use tables liberally.** Props, variants, tokens, enum values — all look better as a table than prose.
- **Call out gaps.** Every spec has a "Known gaps" section so future readers see what's *not* covered and don't trust silence.
- **Date decisions.** When a rule is a judgment call, note the date and, if relevant, the issue/commit that drove it.
- **Don't duplicate code.** Link to the source, quote the relevant lines — but don't copy large blocks that will rot.
- **Own the narrative.** If a spec disagrees with a CLAUDE.md line, fix the conflict. CLAUDE.md is for AI context; this folder is for humans and AI.
