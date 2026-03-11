# PipLinePro V2 — Project Brain

> **Purpose**: Living document for brainstorming with AI models. Contains everything about the project architecture, patterns, and business logic.
> **Last updated**: 2026-03-10

---

## 1. Project Overview

**PipLinePro V2** is a multi-tenant SaaS platform for managing financial transfers, payroll (HR), accounting, payment service providers (PSPs), and crypto wallets. Built for operations teams with role-based access, real-time collaboration, and an AI assistant.

| Item | Value |
|------|-------|
| **Stack** | React 19 + TypeScript 5.9 + Vite 7.3 |
| **Styling** | Tailwind CSS v4 (`@tailwindcss/vite`), Radix UI, CVA |
| **Backend** | Supabase (Auth + DB + RLS + Edge Functions + Realtime) |
| **i18n** | react-i18next (English + Turkish) |
| **PWA** | vite-plugin-pwa, Workbox, offline fallback |
| **Charts** | Recharts 3.7 |
| **Forms** | React Hook Form + Zod |
| **Data** | Tanstack React Query 5.90 |
| **Icons** | Phosphor Icons |

---

## 2. Full Directory Structure

```
PipLineProV2/
├── public/                          # Static assets
│   ├── logo/                        # Brand logos (light/dark variants)
│   ├── pwa-*.png                    # PWA icons (192, 512)
│   ├── apple-touch-icon-*.png       # Apple favicon
│   ├── favicon-*.png                # Browser favicons
│   ├── error-handler.js             # Global error handler
│   ├── offline.html                 # Offline fallback page
│   └── .htaccess                    # Apache server config
│
├── src/
│   ├── main.tsx                     # App entry point (PWA registration)
│   ├── app/
│   │   ├── App.tsx                  # Routes + Provider setup
│   │   ├── components/
│   │   │   └── RoleRoute.tsx        # Page-level access control
│   │   └── providers/
│   │       ├── AuthProvider.tsx     # Session, profile, roles
│   │       ├── OrganizationProvider.tsx  # Org selection, membership
│   │       └── ThemeProvider.tsx    # Dark/light theme
│   │
│   ├── design-system/               # 22 Radix-based UI components
│   │   ├── components/
│   │   │   ├── Avatar/             # Avatar display + upload
│   │   │   ├── Badge/              # Semantic badges
│   │   │   ├── Breadcrumb/         # Navigation breadcrumbs
│   │   │   ├── Button/             # Button variations (CVA)
│   │   │   ├── Calendar/           # Date picker calendar
│   │   │   ├── Card/               # Card containers
│   │   │   ├── DateInput/          # Date input field
│   │   │   ├── DatePicker/         # Date range picker
│   │   │   ├── Dialog/             # Modal dialog (Radix)
│   │   │   ├── DropdownMenu/       # Dropdown menus
│   │   │   ├── EmptyState/         # Empty state UI
│   │   │   ├── Form/               # React Hook Form wrapper
│   │   │   ├── Grid/               # CSS Grid layout
│   │   │   ├── Input/              # Text input field
│   │   │   ├── Label/              # Form labels (Radix)
│   │   │   ├── Link/               # Navigation link
│   │   │   ├── ManagerPinDialog/   # PIN entry dialog
│   │   │   ├── PageHeader/         # Page header with breadcrumb
│   │   │   ├── Pagination/         # Table pagination
│   │   │   ├── Popover/            # Popover (Radix)
│   │   │   ├── Select/             # Select dropdown (Radix)
│   │   │   ├── Separator/          # Visual separator
│   │   │   ├── Sheet/              # Slide-out panel
│   │   │   ├── Sidebar/            # Sidebar navigation
│   │   │   ├── Skeleton/           # Loading skeleton
│   │   │   ├── StatCard/           # Metric card
│   │   │   ├── Table/              # Data table + VirtualTableBody
│   │   │   ├── Tabs/               # Tab navigation (Radix)
│   │   │   ├── Tag/                # Tag/chip component
│   │   │   ├── Text/               # Typography
│   │   │   ├── Toaster/            # Toast container (Radix)
│   │   │   └── Tooltip/            # Tooltip (Radix)
│   │   ├── hooks/
│   │   │   ├── useTheme.tsx        # Theme switching
│   │   │   ├── useLocale.ts        # Current locale
│   │   │   └── useIsMobile.ts      # Mobile detection
│   │   ├── tokens/                 # Design tokens
│   │   │   ├── colors.ts           # Theme + semantic colors
│   │   │   ├── spacing.ts          # Spacing scale
│   │   │   ├── radius.ts           # Border radius
│   │   │   ├── shadows.ts          # Shadow definitions
│   │   │   ├── typography.ts       # Font family, weights, sizes
│   │   │   └── animations.ts       # Duration, easing
│   │   ├── utils/cn.ts             # Tailwind class merge (clsx + tailwind-merge)
│   │   ├── types/index.ts          # Design system types
│   │   └── index.ts                # Barrel export (@ds)
│   │
│   ├── components/                  # App-specific components
│   │   ├── AliasTagInput.tsx        # Chip input for lookup aliases
│   │   ├── AvatarUpload.tsx         # Avatar image cropping + upload
│   │   ├── BottomNav.tsx            # Mobile bottom navigation (5 items)
│   │   ├── CommandPalette/          # Cmd+K command palette (cmdk)
│   │   ├── CurrencySelect.tsx       # Currency dropdown
│   │   ├── ErrorBoundary.tsx        # Error boundary wrapper
│   │   ├── HCaptchaWidget.tsx       # Bot protection widget
│   │   ├── ImageCropperDialog.tsx   # Image cropping dialog
│   │   ├── LastSeen.tsx             # Last seen indicator
│   │   ├── LoginSkeleton.tsx        # Login page skeleton
│   │   ├── NotificationBell.tsx     # Notification bell + drawer
│   │   ├── OnlineCount.tsx          # Real-time user count
│   │   ├── OnlineIndicator.tsx      # Online status badge
│   │   ├── OrgPinSettings.tsx       # PIN setup component
│   │   ├── PasswordStrengthIndicator.tsx
│   │   ├── PwaUpdatePrompt.tsx      # PWA update notification
│   │   ├── SuccessCheckmark.tsx     # Success animation
│   │   └── UserAvatar.tsx           # Current user avatar display
│   │
│   ├── layouts/
│   │   ├── AppLayout.tsx            # Main app shell (sidebar + header + content)
│   │   └── nav-config.ts            # Navigation structure (5 groups)
│   │
│   ├── pages/
│   │   ├── login.tsx                # Login (email/password + CAPTCHA)
│   │   ├── forgot-password.tsx      # Forgot password flow
│   │   ├── reset-password.tsx       # Password reset
│   │   ├── dashboard.tsx            # KPIs, charts, recent transfers
│   │   ├── transfers/               # Transfer management
│   │   │   ├── index.tsx            # List (table, filters, bulk ops)
│   │   │   ├── AddTransferPage.tsx  # Create transfer
│   │   │   ├── EditTransferPage.tsx # Edit transfer
│   │   │   ├── TransfersTable.tsx   # Table + daily summary
│   │   │   ├── TransferRowItem.tsx  # Row + quick actions
│   │   │   ├── DailySummaryDialog.tsx
│   │   │   ├── MonthlyTab.tsx       # Monthly analysis + charts
│   │   │   ├── TrashTab.tsx         # Soft-deleted transfers
│   │   │   ├── LookupSettings.tsx   # Transfer lookup management
│   │   │   ├── PinDialog.tsx        # PIN verification
│   │   │   ├── CsvImportDialog.tsx  # CSV import wizard
│   │   │   ├── TransferFormContent.tsx
│   │   │   ├── TransferDetailSheet.tsx
│   │   │   ├── transfersTableUtils.ts
│   │   │   └── import/              # CSV import steps
│   │   ├── accounting/              # Accounting & wallets
│   │   │   ├── index.tsx            # Ledger + Wallets + Reconciliation
│   │   │   ├── LedgerTab.tsx        # Accounting entries table
│   │   │   ├── LedgerTable.tsx      # Ledger data display
│   │   │   ├── WalletsTab.tsx       # Crypto wallets list
│   │   │   ├── WalletCard.tsx       # Individual wallet card
│   │   │   ├── WalletDialog.tsx     # Create/edit wallet
│   │   │   ├── WalletBalanceChart.tsx
│   │   │   ├── WalletTransfersPage.tsx
│   │   │   ├── WalletTransfersTable.tsx
│   │   │   ├── ReconciliationTab.tsx # Monthly reconciliation
│   │   │   ├── WalletDailyClosing.tsx
│   │   │   ├── LedgerDailySummaryDialog.tsx
│   │   │   ├── EntryDialog.tsx      # Create/edit entry
│   │   │   ├── LedgerImportDialog.tsx
│   │   │   ├── PortfolioSummary.tsx # Portfolio overview
│   │   │   ├── BulkPaymentDetailPage.tsx
│   │   │   ├── reconciliationTypes.ts
│   │   │   └── walletTypes.ts
│   │   ├── hr/                      # Human Resources
│   │   │   ├── index.tsx            # HR main (tabs)
│   │   │   ├── EmployeeFormPage.tsx # Create/edit employee
│   │   │   ├── AttendanceTab.tsx    # Attendance tracking
│   │   │   ├── SalariesTab.tsx      # Salary management
│   │   │   ├── SalaryPaymentsTab.tsx
│   │   │   ├── LeavesTab.tsx        # Leave management
│   │   │   ├── PaymentsTab.tsx      # Payments overview
│   │   │   ├── SettingsTab.tsx      # HR settings
│   │   │   ├── bonuses/             # Bonus system
│   │   │   │   ├── index.tsx        # Bonus main page
│   │   │   │   ├── AutoBonusTab.tsx # Auto bonus config
│   │   │   │   ├── MtConfigTab.tsx  # Marketing tier config
│   │   │   │   ├── ReConfigTab.tsx  # Retention config
│   │   │   │   ├── BonusAgreementDialog.tsx
│   │   │   │   └── BonusPaymentDialog.tsx
│   │   │   ├── payments/            # Bulk payment operations
│   │   │   │   ├── BulkSalaryPayoutPage.tsx
│   │   │   │   ├── BulkBankDepositPage.tsx
│   │   │   │   └── BulkBonusPayoutPage.tsx
│   │   │   ├── components/
│   │   │   │   ├── AttendanceRow.tsx
│   │   │   │   ├── MonthlySummary.tsx
│   │   │   │   └── RoleDeleteDialog.tsx
│   │   │   └── utils/
│   │   │       ├── attendanceHelpers.tsx
│   │   │       ├── hrConstants.ts
│   │   │       └── salaryCalculations.ts
│   │   ├── psps/                    # Payment Service Providers
│   │   │   ├── index.tsx            # PSPs list
│   │   │   ├── PspDetailPage.tsx    # PSP detail view
│   │   │   ├── PspMonthlyTab.tsx    # Monthly analysis
│   │   │   ├── PspBlokeTab.tsx      # Blocked transfers
│   │   │   ├── UniPaymentInvoicesTab.tsx
│   │   │   ├── UniPaymentPaymentsTab.tsx
│   │   │   ├── UniPaymentSyncTab.tsx
│   │   │   ├── UniPaymentTransactionsTab.tsx
│   │   │   └── UniPaymentWalletTab.tsx
│   │   ├── ai.tsx                   # AI Assistant (real-time chat)
│   │   ├── members/                 # User members (god-only)
│   │   │   ├── index.tsx
│   │   │   ├── MemberProfilePage.tsx
│   │   │   └── EditProfileDialog.tsx
│   │   ├── management/              # Org member + invitation mgmt
│   │   │   ├── members.tsx
│   │   │   ├── invitations.tsx
│   │   │   └── CredentialsDialog.tsx
│   │   ├── organizations/           # Organization management
│   │   │   ├── index.tsx
│   │   │   ├── OrganizationsListPage.tsx
│   │   │   ├── OrganizationDetailPage.tsx
│   │   │   ├── OrganizationsTable.tsx
│   │   │   ├── AddMemberDialog.tsx
│   │   │   ├── InviteMemberDialog.tsx
│   │   │   ├── CreateOrganizationDialog.tsx
│   │   │   └── tabs/ (Overview, Members, Invitations, Settings)
│   │   ├── settings/                # User settings
│   │   │   ├── index.tsx
│   │   │   ├── ApiKeysTab.tsx
│   │   │   ├── SessionsTab.tsx
│   │   │   └── WebhooksTab.tsx
│   │   ├── security-dashboard.tsx   # Security overview
│   │   ├── security/                # Security config
│   │   │   ├── ApiIntegrationsTab.tsx
│   │   │   ├── PermissionsTab.tsx
│   │   │   └── UpdateKeyDialog.tsx
│   │   └── audit/index.tsx          # Audit log viewer
│   │
│   ├── hooks/                       # React hooks
│   │   ├── queries/                 # Tanstack React Query (45+ hooks)
│   │   │   ├── useTransfersQuery.ts      # Transfer CRUD (23KB)
│   │   │   ├── useDashboardQuery.ts      # Dashboard KPIs (10KB)
│   │   │   ├── useHrQuery.ts             # HR data (76KB)
│   │   │   ├── useAccountingQuery.ts     # Accounting entries (15KB)
│   │   │   ├── useLookupQueries.ts       # Transfer lookups (DB-driven)
│   │   │   ├── useLookupMutations.ts     # CRUD lookups (6 hooks)
│   │   │   ├── useOrgMembersQuery.ts
│   │   │   ├── useOrgMutations.ts
│   │   │   ├── usePspsQuery.ts
│   │   │   ├── usePspDashboardQuery.ts
│   │   │   ├── usePspRatesQuery.ts
│   │   │   ├── useWalletsQuery.ts
│   │   │   ├── useReconciliationQuery.ts
│   │   │   ├── useProfileQuery.ts
│   │   │   ├── useOrgAuditLogQuery.ts
│   │   │   ├── useRolePermissionsQuery.ts
│   │   │   ├── useSessionManagement.ts
│   │   │   └── [15+ more]
│   │   ├── useAlerts.ts             # Velocity alerts
│   │   ├── useLookupData.ts         # Lookup caching
│   │   ├── useLookupManagement.ts   # Lookup UI state
│   │   ├── useNotifications.ts      # Push notifications
│   │   ├── usePagePermission.ts     # Page access control
│   │   ├── usePresence.ts           # Real-time presence
│   │   ├── usePresenceSubscription.ts
│   │   ├── useRealtimeSubscription.ts
│   │   ├── useToast.tsx             # Toast notifications
│   │   ├── useTransfers.ts          # Transfer computation
│   │   ├── useTrustedDevices.ts     # Device trust
│   │   └── useVirtualTable.ts       # Virtual scrolling
│   │
│   ├── lib/                         # Services & utilities
│   │   ├── supabase.ts              # Supabase client
│   │   ├── queryClient.ts           # React Query client
│   │   ├── queryKeys.ts             # Query key factories (150+ keys)
│   │   ├── database.types.ts        # Supabase types (2338 lines)
│   │   ├── roles.ts                 # Role permission helpers
│   │   ├── i18n.ts                  # i18n init (en, tr)
│   │   ├── transferLookups.ts       # Hardcoded transfer types
│   │   ├── currencies.ts            # 170+ currency definitions
│   │   ├── date.ts                  # Date utilities
│   │   ├── formatAmount.ts          # Locale-aware number formatting
│   │   ├── exchangeRateService.ts   # Exchange rate APIs
│   │   ├── apiHealthApi.ts          # API health checks
│   │   ├── tatumServiceSecure.ts    # Tatum crypto API
│   │   ├── uniPaymentApi.ts         # UniPayment integration
│   │   ├── uniPaymentTypes.ts       # UniPayment types
│   │   ├── secureApi.ts             # Secure API via edge functions
│   │   ├── presenceService.ts       # Presence batch ops
│   │   ├── pwaUpdateController.ts   # PWA update handling
│   │   ├── deviceFingerprinting.ts  # Device ID generation
│   │   ├── haptics.ts               # Mobile haptic feedback
│   │   ├── logger.ts                # Logging utility
│   │   ├── sentry.ts                # Sentry error tracking
│   │   ├── storageService.ts        # localStorage wrapper
│   │   ├── toastEmitter.ts          # Toast event emitter
│   │   ├── errorMessages.ts         # Error message mapping
│   │   ├── validationUtils.ts       # Form validation helpers
│   │   └── csvExport/               # CSV/Excel export
│   │       ├── exportLedgerCsv.ts
│   │       ├── exportLedgerXlsx.ts
│   │       ├── exportPspMonthlyCsv.ts
│   │       └── exportPspMonthlyXlsx.ts
│   ├── csvImport/                   # CSV import parsers
│   │   ├── parseCsv.ts
│   │   ├── parseLedgerCsv.ts
│   │   ├── validateRows.ts
│   │   └── types.ts
│   │
│   ├── schemas/                     # Zod validation schemas
│   │   ├── transferSchema.ts
│   │   ├── accountingSchema.ts
│   │   ├── organizationSchema.ts
│   │   ├── reconciliationSchema.ts
│   │   └── pspSettlementSchema.ts
│   │
│   ├── locales/                     # Translation files
│   │   ├── en/ (common.json, components.json, pages.json)
│   │   └── tr/ (common.json, components.json, pages.json)
│   │
│   ├── styles/index.css             # Global CSS + variables
│   ├── test/setup.ts                # Vitest setup
│   ├── types/i18n.d.ts              # i18n type defs
│   ├── vite-env.d.ts                # Vite env types
│   └── sw.ts                        # Service worker
│
├── supabase/
│   ├── migrations/                  # 106 SQL migration files (001-106)
│   └── functions/                   # 11 Edge Functions (Deno)
│       ├── ai-chat/                 # AI assistant (Anthropic SSE)
│       ├── api-gateway/             # API request forwarding
│       ├── api-health-check/        # Health check
│       ├── daily-wallet-snapshot/   # Scheduled wallet snapshots
│       ├── deliver-webhook/         # Webhook delivery
│       ├── invite-member/           # Send invite emails
│       ├── manage-secrets/          # Manage function secrets
│       ├── secure-api/              # Secure API wrapper
│       ├── send-credentials/        # Send credentials via email
│       ├── unipayment-proxy/        # UniPayment API proxy
│       ├── update-credentials/      # Update credentials
│       └── _shared/ (cors, rateLimit, supabase-admin, validation)
│
├── package.json
├── vite.config.ts                   # Vite + PWA + chunk splitting
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── vitest.config.ts
├── eslint.config.js
├── .prettierrc
├── index.html                       # HTML entry (CSP headers)
├── CLAUDE.md                        # AI instructions
├── PLAN.md                          # Project plan
└── PROJECT_BRAIN.md                 # This file
```

---

## 3. Routes & Pages

| Route | Page | Description | Access |
|-------|------|-------------|--------|
| `/login` | LoginPage | Email/password + hCaptcha + device tracking | Public |
| `/forgot-password` | ForgotPasswordPage | Password reset request | Public |
| `/reset-password` | ResetPasswordPage | Password reset via email token | Public |
| `/` | DashboardPage | KPIs, charts, recent transfers, PSP analysis | dashboard |
| `/transfers` | TransfersPage | Transfer list (table, filters, bulk ops) | transfers |
| `/transfers/new` | AddTransferPage | Create new transfer | transfers |
| `/transfers/:id/edit` | EditTransferPage | Edit transfer | transfers |
| `/accounting` | AccountingPage | Ledger + Wallets + Reconciliation tabs | accounting |
| `/accounting/bulk/:bulkPaymentId` | BulkPaymentDetailPage | Bulk payment detail | accounting |
| `/accounting/wallet/:walletId/transfers` | WalletTransfersPage | Wallet transfer history | accounting |
| `/psps` | PspsPage | Payment Service Providers list | psps |
| `/psps/:pspId` | PspDetailPage | PSP detail (ledger/monthly/bloke) | psps |
| `/ai` | AiPage | AI Assistant (real-time chat with tools) | ai |
| `/members` | MembersPage | All users (god-only) | members |
| `/members/:userId` | MemberProfilePage | User profile view | members |
| `/organizations` | OrganizationsListPage | All orgs (god/admin) | organizations |
| `/organizations/:orgId` | OrganizationDetailPage | Org detail with tabs | organizations |
| `/security` | SecurityDashboard | Security metrics, audit logs | security |
| `/hr` | HrPage | Employees, attendance, salaries, bonuses | hr |
| `/hr/employees/new` | EmployeeFormPage | Create employee | hr |
| `/hr/employees/:id/edit` | EmployeeFormPage | Edit employee | hr |
| `/hr/salary-payout` | BulkSalaryPayoutPage | Bulk salary distribution | hr |
| `/hr/bank-deposit` | BulkBankDepositPage | Bulk bank deposit | hr |
| `/hr/bonus-payout` | BulkBonusPayoutPage | Bulk bonus distribution | hr |
| `/settings` | SettingsPage | API keys, sessions, webhooks | Authenticated |
| `/audit` | AuditLogPage | Organization audit logs | audit |

---

## 4. Database Schema (50+ tables)

### Core Authentication & Multi-tenancy
- **`profiles`** — system_role (god/user), display_name, avatar_url. Auto-created on signup via trigger.
- **`organizations`** — name, logo_url, base_currency, security_pin
- **`organization_members`** — role (admin/manager/operation/ik), user_id, org_id
- **`organization_invitations`** — email, role, organization_id, accepted_at. Auto-accept trigger on signup.

### Transfer Management
- **`transfers`** — full_name, psp_id, category_id, type_id, payment_method_id, raw_amount, currency, exchange_rate, transfer_date, crm_id, meta_id, employee_id, is_first_deposit, notes, deleted_at (soft delete)
- **`transfer_audit_log`** — transfer_id, action, changed_by, old_values, new_values
- **`transfer_types`** — id, name, aliases[]
- **`transfer_categories`** — id, name, is_deposit, aliases[]
- **`payment_methods`** — id, name, aliases[]
- **`bloke_resolutions`** — transfer_id, status, resolution_date, resolution_notes

### PSPs (Payment Service Providers)
- **`psps`** — organization_id, name, commission_rate, is_active, is_internal
- **`psp_commission_rates`** — psp_id, commission_rate, effective_from, created_by
- **`psp_settlements`** — psp_id, settlement_date, amount, status
- **`psp_receiving_methods`** — psp_id, payment_method, account_details

### Accounting
- **`accounting_entries`** — organization_id, entry_date, entry_type (ODEME/TRANSFER), direction (in/out), register (USDT/NAKIT_TL/NAKIT_USD/TRX), amount, currency, description, hr_employee_id, hr_payment_id, hr_bulk_payment_id
- **`accounting_monthly_config`** — organization_id, year, month, kur, devir_*, teyit_entries
- **`exchange_rates`** — organization_id, currency, rate_to_base, rate_date

### Wallets (Crypto)
- **`wallets`** — organization_id, label, chain (tron/ethereum/bsc/bitcoin/solana), address, is_active
- **`wallet_snapshots`** — wallet_id, balance, snapshot_date

### HR Management
- **`hr_employees`** — organization_id, full_name, email, phone, position, department, hire_date, is_active, bank_account, ssn
- **`hr_salaries`** — hr_employee_id, base_salary, date_effective, is_insured, is_exempt_deduction
- **`hr_salary_payments`** — hr_employee_id, month, year, gross_salary, net_salary, status (pending/confirmed/paid)
- **`hr_bulk_payments`** — organization_id, payment_type (salary/bonus/bank_deposit), status, created_by
- **`hr_attendance`** — hr_employee_id, date, status (present/absent/leave), hours
- **`hr_leaves`** — hr_employee_id, leave_type, start_date, end_date, status, reason
- **`hr_bonuses`** — hr_employee_id, bonus_type (fixed/auto), amount, reason, status
- **`hr_settings`** — organization_id, work_hours_per_day, weekend_off, hourly_deduction_rate, etc.

### Security & Access
- **`login_attempts`** — device_id, user_id, success, error_message, created_at
- **`captcha_challenges`** — device_id, challenge_id, solved, user_id
- **`trusted_devices`** — user_id, device_fingerprint, device_name, is_trusted
- **`role_permissions`** — organization_id, role, page, can_view/can_create/can_edit/can_delete
- **`page_permissions`** — organization_id, user_id, page, can_view
- **`api_keys`** — user_id, key_hash, last_used_at
- **`webhooks`** — organization_id, url, events[], is_active, secret_key
- **`organization_audit_logs`** — organization_id, action, user_id, resource_type, resource_id, changes

### Real-time & Presence
- **`presence`** — user_id, organization_id, last_seen, status (online/away/offline)
- **`velocity_alerts`** — organization_id, threshold_usd, action (none/warn/block)

### Lookup Tables (Org-configurable)
- **`lookup_tables`** — organization_id, table_name, item_id, name, is_system, is_excluded, aliases[]
  - `organization_id IS NULL` = global defaults
  - `organization_id = <uuid>` = custom per-org

---

## 5. RLS (Row Level Security)

### Private Schema Helpers
- `private.is_god()` — checks auth JWT's `user_role` claim
- `private.get_user_org_ids()` — returns org IDs where user is member
- `private.is_org_admin(org_id)` — checks if user is admin in org

### Policy Pattern
- **SELECT**: `is_god() OR org_id IN (get_user_org_ids())`
- **INSERT/UPDATE**: `is_god() OR is_org_admin(org_id)`
- **DELETE**: `is_god() OR is_org_admin(org_id)`

### God Hiding
God profiles are excluded from non-god SELECT queries. Gods don't appear in org_members for non-god users.

---

## 6. Role Hierarchy & Permissions

```
God (hidden super-admin, devs/urgencies)
  └── Admin (highest org role, full org control)
       └── Manager (mid-tier, can assign manager/operation only)
            └── Operation (ops staff, CRUD on operational records)
                 └── IK (specific limited permissions)
```

- **God**: invisible to non-gods, can see/do everything
- **Admin**: full org management, assign all roles, act on all members
- **Manager**: can assign manager/operation, cannot act on admins
- **Operation**: support/ops, CRUD on transfers/accounting, no member/invite/org management
- **IK**: specific custom permissions per org

---

## 7. Authentication Flow

1. **Login** (`/login`) — Email + password, hCaptcha, device fingerprinting, rate limiting, login attempt logging
2. **AuthProvider** — `onAuthStateChange` listener, fetch profile from DB, track role changes, auto-refresh token
3. **Org Selection** (OrganizationProvider) — Fetch user's orgs, persist to localStorage (`piplinepro-org`), fetch membership
4. **Page Guards** (RoleRoute) — Check `role_permissions` table for page access
5. **SignOut** — Clear auth state, org selection, redirect to `/login`

---

## 8. API Integrations

### Tatum Crypto API (`src/lib/tatumServiceSecure.ts`)
- REST v4, via secure edge function
- Chains: tron, ethereum, bsc, bitcoin, solana
- Registers: USDT, NAKIT_TL, NAKIT_USD, TRX

### Anthropic AI Assistant (`supabase/functions/ai-chat/`)
- Model: `claude-sonnet-4-6`
- SSE streaming, max 4096 tokens, max 6 tool call loops
- 8 Tools: `get_monthly_summary`, `get_transfers`, `get_top_customers`, `get_psp_list`, `get_hr_summary`, `get_wallet_balances`, `get_accounting_summary`, `get_recent_activity`
- Org context injected in system prompt

### Exchange Rate APIs (`src/lib/exchangeRateService.ts`)
- Multiple sources (Yahoo Finance, TCMB, freecurrencyapi)
- Cached via React Query

### UniPayment Gateway (`src/lib/uniPaymentApi.ts`)
- Proxied via `supabase/functions/unipayment-proxy/`
- Payment reconciliation, transaction lookup

### hCaptcha (Bot protection on login)
### Sentry (Error tracking, optional)
### Resend (Email delivery for invitations/credentials)

---

## 9. State Management

| Layer | Tool | Usage |
|-------|------|-------|
| Auth | Context (AuthProvider) | Session, profile, auth actions |
| Org | Context (OrganizationProvider) | Current org, membership, selectOrg |
| Theme | Context (ThemeProvider) | Dark/light via `data-theme` attribute |
| Toast | Context (AppToastProvider) | Toast notifications |
| Server Data | Tanstack React Query | 45+ hooks, 150+ query keys, caching, background refetch |
| Forms | React Hook Form + Zod | Form state, validation |
| URL State | React Router search params | Pagination, filters |
| Persistence | localStorage | Theme (`piplinepro-theme`), org (`piplinepro-org`), locale (`piplinepro-locale`), device ID |

---

## 10. Sidebar Navigation Structure

```
Main
  ├── Dashboard (House icon)

Data Entry
  ├── Transfers (ArrowsLeftRight)
  └── Accounting (BookOpen)

Management
  ├── Members (Users)
  ├── PSPs (CreditCard)
  └── HR (IdentificationCard)

System
  ├── Organizations (Buildings)
  ├── Security (Shield)
  └── Audit (ClipboardText)

AI
  └── AI Assistant (Brain)
```

Visibility controlled by `usePagePermissions()` hook against `role_permissions` RLS table.

---

## 11. Key Business Logic

### Transfer Management
- **Lookup system**: Fixed global types/categories/methods + org-configurable overrides
- **Blocked transfers**: Type name contains 'bloke' → opacity-60 + BLOCKED tag
- **Commission**: PSP rate-based, zero for blocked/withdrawal shows "—" with tooltip
- **USD conversion**: raw_amount × exchange_rate
- **Soft delete**: `deleted_at` flag, shown in Trash tab
- **Audit trail**: Every change in `transfer_audit_log`
- **Bulk ops**: Select multiple → export CSV, bulk edit (PSP + Type), delete
- **PIN verification**: Server-side via `verify_org_pin` RPC
- **Daily summary**: Per-date-group popup (not inline strip)
- **Load More mode**: Toggle in pagination; accumulates pages
- **Page sizes**: 25/50/100
- **Net USD column**: In table after Net, before Currency

### HR & Payroll
- **Salary calculation**: Base + bonuses - deductions
- **Bonus types**: Fixed (constant), Auto (tier-based)
- **Marketing bonus**: Per-deposit tier (MT Barem config)
- **Retention bonus**: amount_usd × 5.75% (positive deposit, negative withdrawal)
- **Attendance**: Daily tracking, auto-deduction for absences
- **Work hours**: Configurable per org (default 8)
- **Leave types**: Annual/sick/unpaid
- **Bulk payouts**: Salary/bonus distribution, bank deposit coordination
- **Insurance split**: Insured salary split logic

### Accounting
- **Ledger entries**: Type (ODEME/TRANSFER), direction (in/out), register (USDT/TL/USD/TRX)
- **Monthly reconciliation**: Config per org/month (kur, devir, teyit)
- **Wallet snapshots**: Daily balance snapshots (scheduled edge function)
- **Exchange rates**: Multi-source, cached

### PSP Management
- **Commission rates**: Versioned by `effective_from` date
- **Settlement tracking**: Status transitions (pending/confirmed/settled)
- **Bloke tracking**: Blocked transfers per PSP
- **Monthly analysis**: Volume, commission, customer breakdown

### Security
- **Multi-tenancy**: RLS enforces org isolation
- **Trusted devices**: Device fingerprinting + trust tracking
- **Velocity alerts**: Per-org transfer thresholds
- **Login tracking**: Attempt logging + CAPTCHA on failures
- **Audit logs**: Complete action trail per org
- **API keys**: User-level, hashed storage
- **Webhooks**: Org-level, event-based, with secret key

---

## 12. Environment Variables

### Client-side (.env)
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJx...
VITE_HCAPTCHA_SITE_KEY=xxxxx
VITE_SENTRY_DSN=https://xxx@sentry.io/123
```

### Supabase Edge Function Secrets (Dashboard)
```
TATUM_API_KEY=key_xxx           # Tatum.io crypto API
GEMINI_API_KEY=key_xxx          # Google AI Studio
EXCHANGE_RATE_API_KEY=key_xxx   # freecurrencyapi.com
RESEND_API_KEY=key_xxx          # Email delivery
ANTHROPIC_API_KEY=key_xxx       # AI assistant
ALLOWED_ORIGINS=https://yourdomain.com
```

---

## 13. Scripts

```json
{
  "dev": "vite",
  "build": "vite build",
  "build:check": "tsc -b && vite build",
  "lint": "eslint .",
  "lint:fix": "eslint . --fix",
  "format": "prettier --write \"src/**/*.{ts,tsx,css,json}\"",
  "type-check": "tsc --noEmit",
  "test": "vitest",
  "test:run": "vitest run",
  "test:coverage": "vitest run --coverage",
  "db:types:local": "supabase gen types typescript --local > src/lib/database.types.ts",
  "db:types:remote": "supabase gen types typescript --project-id $SUPABASE_PROJECT_ID > src/lib/database.types.ts",
  "i18n:check": "node scripts/check-i18n.js"
}
```

---

## 14. Key Dependencies

```
React 19.2.0                    @tanstack/react-query 5.90.20
React Router DOM 7.13.0         @supabase/supabase-js 2.95.3
TypeScript 5.9.3                react-hook-form 7.71.1
Vite 6.4.1                     react-i18next 16.5.4
Tailwind CSS 4.1.18             i18next 25.8.4
@tailwindcss/vite 4.1.18        recharts 3.7.0
Radix UI (10+ packages)         papaparse 5.5.3
zod 3.25.76                     xlsx 0.18.5
@sentry/react 10.40.0           cmdk 1.1.1
@hcaptcha/react-hcaptcha 2.0.2  vite-plugin-pwa 1.2.0
```

---

## 15. Styling & Design System

- **Tailwind CSS v4** via `@tailwindcss/vite` plugin
- **22 Radix-based components** in `src/design-system/`
- **CVA** (class-variance-authority) for component variants
- **Design tokens** in `src/design-system/tokens/` (colors, spacing, radius, shadows, typography, animations)
- **Theme switching**: `data-theme="light|dark"` on `<html>`, stored in localStorage
- **Path aliases**: `@` → `src/`, `@ds` → `src/design-system/`
- **cn()** utility: clsx + tailwind-merge
- **Mobile-first**: Safe area insets, 44px touch targets, `cardOnMobile` tables
- **CSS variables**: Custom properties for theming in `src/styles/index.css`

---

## 16. PWA Configuration

- **Plugin**: vite-plugin-pwa (registerType: prompt)
- **Strategy**: injectManifest (custom SW at `src/sw.ts`)
- **Display**: standalone, portrait-primary
- **Icons**: 192x192 & 512x512 PNG
- **Offline**: `public/offline.html` branded fallback
- **Update prompt**: `src/components/PwaUpdatePrompt.tsx`
- **Bottom Nav** (mobile): Dashboard, Transfers, HR/Members, AI, More

---

## 17. i18n

- **Languages**: English (`en`), Turkish (`tr`)
- **Namespaces**: `common`, `components`, `pages`
- **Detection**: localStorage → navigator → fallback `en`
- **Storage key**: `piplinepro-locale`
- **Files**: `src/locales/{en,tr}/{common,components,pages}.json`

---

## 18. Migrations Summary (106 files)

| Range | Topic |
|-------|-------|
| 001-004 | Profiles, organizations, members, invitations |
| 005-007 | RLS policies, JWT hook, role restructure |
| 008 | Full transfer/PSP/lookup schema |
| 020-043 | Avatar, presence, trusted devices, audit |
| 045-075 | Manager role, HR settings, work hours, leaves |
| 076-084 | Org PINs, HR bulk, base currency, configurable lookups |
| 085-106 | Audit logs, webhooks, API keys, IK role, page permissions |

---

## 19. Known Issues

- `noUnusedLocals: true` — `SIDEBAR_WIDTH_MOBILE` in Sidebar.tsx triggers TS error
- `Form.tsx`: FormEvent vs SubmitEvent type mismatch
- `design-system/index.ts`: duplicate BreadcrumbItem export
- All predate multi-tenant work; `vite build` succeeds despite `tsc` errors

---

## 20. Post-Migration Manual Steps

1. Paste SQL migration files (001→latest) into Supabase SQL Editor in order
2. Enable JWT hook in Dashboard → Authentication → Hooks
3. Promote god admin: `UPDATE profiles SET system_role = 'god' WHERE id = '<uuid>'`
4. Sign out/in to refresh JWT
5. Set edge function secrets in Supabase Dashboard

---

## 21. Brainstorming Notes

> Add your brainstorming notes, ideas, and discussions with other models below this line.

---
