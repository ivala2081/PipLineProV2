# PipLinePro V2

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20RLS-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![PWA](https://img.shields.io/badge/PWA-Installable-5A0FC8)](https://web.dev/progressive-web-apps/)
[![License](https://img.shields.io/badge/License-Private-lightgrey)](#license)

Multi-tenant financial operations platform for online trading organizations. Centralizes transfer tracking, accounting, payroll, PSP management, and introducing-broker commissions behind a single role-based interface with per-org data isolation.

---

## Overview

PipLinePro V2 is a production web application that replaces a patchwork of spreadsheets, CRM tabs, and manual reconciliations with a single source of truth for financial operations. It supports multiple independent organizations sharing one deployment, with row-level security enforcing tenant isolation end-to-end.

The system is built around five core domains:

| Domain | Purpose |
|---|---|
| **Transfers** | Record every customer deposit and withdrawal, attribute to PSPs and employees, compute commission on deposits, produce daily and monthly summaries. |
| **Accounting** | General ledger across cash, bank, and crypto registers. Auto-posts entries from PSP settlements, IB payments, and HR payroll. |
| **HR / Payroll** | Employee master, attendance, leaves, QR-code check-in, salary calculation with insured/uninsured splits, and automatic performance-based bonuses wired to transfer activity. |
| **PSPs** | Payment service providers with dated commission rates, settlement tracking, blocked-transfer resolution, and UniPayment integration. |
| **IB Partners** | Introducing brokers with multi-type agreements (salary / CPA / lot rebate / revenue share / hybrid), commission calculation, and payment lifecycle. |

An AI Assistant (powered by Claude) answers natural-language questions about org data with role-gated tool access.

## Features

- **Multi-tenant** — one database, multiple organizations, per-row RLS enforcement.
- **Role-based access** — five-tier hierarchy: `god` → `admin` → `manager` → `ik` → `operation`, with configurable per-org permission overrides.
- **Bilingual** — English and Turkish, with locale-aware number and date formatting.
- **Installable PWA** — offline fallback page, service worker, mobile-first bottom navigation.
- **Real-time** — Supabase subscriptions update connected clients on data changes.
- **Audit trails** — transfer-level, org-level, and god-level audit logs for every mutation.
- **Import / export** — CSV and XLSX import/export for transfers and accounting ledger.
- **Integrations** — UniPayment, Tatum (crypto wallet balances), Anthropic (AI Assistant), Resend (email).
- **Security** — bcrypt-hashed per-org PINs, device-fingerprint rate limiting, JWT custom claims, Sentry error monitoring.

## Tech stack

### Frontend

- [**React 19**](https://react.dev) + [**TypeScript 5.9**](https://www.typescriptlang.org) in strict mode
- [**Vite 6**](https://vitejs.dev) with [`vite-plugin-pwa`](https://github.com/vite-pwa/vite-plugin-pwa) (Workbox service worker)
- [**Tailwind CSS v4**](https://tailwindcss.com) via `@tailwindcss/vite` with `@theme` tokens
- [**Radix UI**](https://www.radix-ui.com) primitives wrapped by a proprietary design system (`@ds`)
- [**Phosphor Icons**](https://phosphoricons.com)
- [**TanStack Query**](https://tanstack.com/query) + [**React Hook Form**](https://react-hook-form.com) + [**Zod**](https://zod.dev)
- [**React Router v7**](https://reactrouter.com)
- [**i18next**](https://www.i18next.com) + `i18next-browser-languagedetector`
- [**Recharts**](https://recharts.org) for data visualization

### Backend

- [**Supabase**](https://supabase.com) — Postgres database, Auth, Storage, Realtime, Edge Functions (Deno)
- Row-level security policies on every table with `private.*` helper functions
- Custom JWT claim injection via `custom_access_token_hook`
- Edge Functions for AI chat streaming, wallet snapshots, webhook delivery, and third-party API proxying

### Tooling

- [**ESLint 9**](https://eslint.org) (flat config) + [**Prettier**](https://prettier.io)
- [**Husky**](https://typicode.github.io/husky/) + [`lint-staged`](https://github.com/okonet/lint-staged) pre-commit hook
- [**Vitest**](https://vitest.dev) with [**Testing Library**](https://testing-library.com)
- [**Sentry**](https://sentry.io) for error monitoring

## Getting started

### Prerequisites

- Node.js 20 or later
- npm (ships with Node)
- A Supabase project — [create one at supabase.com](https://supabase.com/dashboard)

### Installation

```bash
git clone https://github.com/ivala2081/PipLineProV2.git
cd PipLineProV2
npm install
```

### Environment variables

Copy the example file and fill in your Supabase credentials:

```bash
cp .env.example .env
```

Required frontend variables (all `VITE_*` are bundled into the client):

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Public anon key (safe to expose — RLS enforces access server-side) |
| `VITE_HCAPTCHA_SITE_KEY` | hCaptcha site key for login bot protection |
| `VITE_SENTRY_DSN` | *(optional)* Sentry DSN for error monitoring |

Server-side secrets (**never** commit these — set in Supabase Dashboard → Edge Functions → Secrets):

| Secret | Used by |
|---|---|
| `ANTHROPIC_API_KEY` | AI Assistant |
| `TATUM_API_KEY` | Wallet balance snapshots |
| `GEMINI_API_KEY`, `EXCHANGE_RATE_API_KEY` | Third-party API proxy |
| `RESEND_API_KEY` | Transactional email |
| UniPayment OAuth credentials | UniPayment integration |
| `SB_MANAGEMENT_TOKEN` | God-only secret rotation |

### Database setup

The project maintains SQL migrations in [`supabase/migrations/`](./supabase/migrations) numbered `001`–`141` as of this writing. On a fresh Supabase project:

1. Paste migrations **in order** (`001`, `002`, …) into the Supabase SQL Editor.
2. Enable the JWT custom-claim hook: Dashboard → Authentication → Hooks → select `public.custom_access_token_hook`.
3. Promote your first user to god admin:
   ```sql
   UPDATE profiles SET system_role = 'god' WHERE id = '<your-auth-uid>';
   ```
4. Sign out and back in so the JWT picks up the new claim.

See [`docs/migrations.md`](./docs/migrations.md) for the full deploy process and conventions.

### Running locally

```bash
npm run dev              # start the Vite dev server at http://localhost:5173
npm run test             # run unit tests in watch mode
npm run test:run         # run unit tests once
npm run lint             # ESLint
npm run type-check       # TypeScript without emitting
npm run build            # production build
npm run preview          # preview the production build locally
npm run i18n:check       # verify locale files are in sync
```

## Project structure

```
PipLineProV2/
├── src/
│   ├── app/              # app-level providers (Auth, Organization, Theme)
│   ├── design-system/    # @ds — reusable UI components, tokens, hooks
│   ├── hooks/            # global hooks and React Query wrappers
│   ├── lib/              # utilities, Supabase client, i18n setup, schemas
│   ├── locales/          # i18n JSON (en/, tr/)
│   ├── pages/            # route components, grouped by feature
│   ├── schemas/          # Zod schemas for forms and validation
│   └── styles/           # global CSS (index.css holds @theme tokens)
├── supabase/
│   ├── functions/        # Edge Functions (ai-chat, daily-wallet-snapshot, ...)
│   └── migrations/       # Numbered SQL migrations
├── scripts/              # Build-time helpers (CSV import, i18n check)
├── public/               # Static assets (PWA icons, offline.html)
└── docs/                 # Architecture and feature specifications
```

## Documentation

Comprehensive documentation lives in [`docs/`](./docs) — this is the authoritative reference for both human contributors and AI coding assistants.

### Foundations

- [**Design System**](./docs/design-system/README.md) — tokens, theming, every UI component, composed patterns, accessibility
- [**Data Model**](./docs/data-model/README.md) — every `public.*` table by domain, relationships, enum semantics
- [**Authentication & RBAC**](./docs/auth/README.md) — roles, RLS helpers, JWT, invite flow, PIN gate
- [**API Reference**](./docs/api/README.md) — every PostgREST RPC and Edge Function with calling conventions

### Features

- [**Transfers**](./docs/features/transfers.md) — commission rules, blocked/payment types, daily summary formulas, CSV import
- [**Accounting**](./docs/features/accounting.md) — ledger, registers, categories, opening balances, auto-entries
- [**HR / Payroll**](./docs/features/hr.md) — employees, salary calculation, auto-bonus, barem, QR check-in, bulk payments
- [**PSPs**](./docs/features/psp.md) — commission rate history, settlements, blocked resolutions, UniPayment
- [**IB Partners**](./docs/features/ib-partners.md) — referrals, multi-type agreements, commission lifecycle
- [**AI Assistant**](./docs/features/ai-assistant.md) — tool loop, role enforcement, SSE streaming contract

### Cross-cutting

- [**Internationalization**](./docs/i18n.md) — locales, namespaces, formatting, string-length budget
- [**PWA & Mobile**](./docs/pwa.md) — service worker, manifest, mobile layout conventions
- [**Migrations**](./docs/migrations.md) — naming, conventions, deploy process, review checklist
- [**Observability**](./docs/observability.md) — audit logs, alerts, webhooks, presence tracking
- [**Security**](./docs/security.md) — threat model, rate limiting, secrets, data isolation
- [**Testing**](./docs/testing.md) — current state and recommended tier progression

Every spec ends with a **Known gaps** section that enumerates what is *not* specified — treat silence as absence, not coverage.

## Contributing

See [**CONTRIBUTING.md**](./CONTRIBUTING.md) for the workflow, commit style, pre-commit hook, and the golden rule:

> Update the spec in the same PR as the behavior change.

Quick checklist before opening a PR:

- [ ] Relevant spec in `docs/` is updated.
- [ ] No `console.log` / `TODO` left behind.
- [ ] ESLint passes (`npm run lint`).
- [ ] TypeScript compiles (`npm run type-check`).
- [ ] Build succeeds (`npm run build`).
- [ ] If the change includes a migration, follow [`docs/migrations.md`](./docs/migrations.md).

## Roadmap

The spec initiative completed its full roadmap on 2026-04-24. Current focus areas:

- Closing the **Known gaps** called out at the bottom of each spec (currency CHECK alignment, audit retention, soft-delete gaps, RLS tightening, etc.).
- Adding a test tier — the existing suite covers schemas and CSV parsing only; see [`docs/testing.md`](./docs/testing.md).
- CI pipeline: lint, typecheck, build, test on every PR.

## License

Private and proprietary. All rights reserved. This repository is not open-source and is not licensed for redistribution or external use.

---

<sub>Built with care by the Brokztech team. Repository: [github.com/ivala2081/PipLineProV2](https://github.com/ivala2081/PipLineProV2).</sub>
