# Inspirations from Claude Code Source for PipLineProV2

> Extracted from the leaked Claude Code CLI source (~1,900 files, 512K+ lines of TypeScript).
> Each section maps patterns from Claude Code to actionable improvements for PipLineProV2.

---

## Table of Contents

1. [Architecture & State Management](#1-architecture--state-management)
2. [Permission & RBAC System](#2-permission--rbac-system)
3. [UI Components & UX Patterns](#3-ui-components--ux-patterns)
4. [Performance & Optimization](#4-performance--optimization)
5. [Error Handling & Resilience](#5-error-handling--resilience)
6. [Extensibility & Plugin Patterns](#6-extensibility--plugin-patterns)
7. [Observability & Monitoring](#7-observability--monitoring)
8. [Feature Flags & Gradual Rollout](#8-feature-flags--gradual-rollout)
9. [Schema Validation & Type Safety](#9-schema-validation--type-safety)
10. [Build & Developer Experience](#10-build--developer-experience)
11. [Memory & Caching](#11-memory--caching)
12. [Multi-Agent & Task Orchestration](#12-multi-agent--task-orchestration)
13. [Theming & Design System](#13-theming--design-system)
14. [Configuration & Migration](#14-configuration--migration)
15. [Real-Time & Streaming](#15-real-time--streaming)
16. [Security Best Practices](#16-security-best-practices)

---

## 1. Architecture & State Management

### 1.1 Custom Lightweight Store (Replace Heavy State Libraries)

Claude Code uses a minimal ~100-line custom store instead of Redux/Zustand:

```typescript
function createStore<T>(initialState: T, onChange?: OnChange<T>) {
  let state = initialState
  const listeners = new Set<Listener>()
  return {
    getState: () => state,
    setState: (updater) => {
      const prev = state
      const next = updater(prev)
      if (Object.is(next, prev)) return
      state = next
      onChange?.({ newState: next, oldState: prev })
      for (const listener of listeners) listener()
    },
    subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener) }
  }
}
```

**PipLineProV2 Application:**
- Replace any heavy global state with a lightweight pub/sub store
- Add `onChange` callback to sync state changes to Supabase real-time
- Use `Object.is()` identity checks for efficient re-render prevention

### 1.2 Centralized Side-Effect Handler

All state mutations flow through a single `onChangeAppState()` function:

```typescript
function onChangeAppState({ newState, oldState }) {
  if (oldState.currentOrg !== newState.currentOrg) {
    syncToLocalStorage('piplinepro-org', newState.currentOrg)
    invalidateQueryCache()
  }
}
```

**PipLineProV2 Application:**
- Create a single choke point for derived side effects (localStorage sync, Supabase subscriptions, cache invalidation)
- Prevents scattered `useEffect` hooks for state synchronization
- Single place to audit all state-driven side effects

### 1.3 Context-Based Dependency Injection

Tools receive their dependencies via injected context, never importing directly:

```typescript
type ActionContext = {
  supabase: SupabaseClient
  userId: string
  orgId: string
  permissions: PermissionSet
  cache: Map<string, unknown>
}
```

**PipLineProV2 Application:**
- Create an `ActionContext` provider for all data mutations
- Break circular dependency chains between providers
- Makes testing trivial (inject mock context)
- All hooks/utils that perform mutations receive context, not import globals

### 1.4 Immutable State Updates

Claude Code uses DeepImmutable types and always creates new references:

**PipLineProV2 Application:**
- Always spread when updating nested state
- Enables efficient `Object.is()` change detection
- Prevents stale closure bugs in React hooks

### 1.5 Parallel Startup Optimization

Claude Code fires MDM reads, keychain prefetch, and API preconnect BEFORE loading heavy modules, saving ~65ms:

**PipLineProV2 Application:**
- Fire Supabase auth check, profile fetch, and org fetch in parallel at app start
- Use `Promise.all()` for independent initialization tasks
- Don't wait for theme/i18n to load before starting auth check

---

## 2. Permission & RBAC System

### 2.1 Multi-Layer Permission Architecture

Claude Code enforces permissions at 3 layers:
1. Automated checks (hooks, classifier) - fast, no UI
2. Rule matching (allow/deny/ask patterns) - declarative
3. Interactive prompt (fallback) - user decides

**PipLineProV2 Application:**
- Layer 1: RLS in Supabase (database level)
- Layer 2: Permission hook in React (UI level, declarative rules)
- Layer 3: Confirmation dialogs for destructive actions (user level)
- Never rely on a single layer

### 2.2 Permission Modes Adapted for Roles

```typescript
const ROLE_PERMISSION_MODES = {
  god:       ['all'],           // Full bypass available
  admin:     ['default', 'acceptEdits', 'plan'],
  manager:   ['default', 'acceptEdits'],
  operation: ['default'],       // Strictest
}
```

**PipLineProV2 Application:**
- Different roles see different feature sets, not just hidden UI
- Admin can enable "quick approve" mode for bulk operations
- Operation role always gets confirmation dialogs for sensitive actions

### 2.3 Declarative Permission Rules (Wildcard Patterns)

Claude Code uses pattern-matching rules like `Bash(git *)`, `FileEdit(/src/*)`.

**PipLineProV2 Application:**
- Define per-org permission overrides with patterns:
  ```
  transfers:create  -> admin, manager, operation
  transfers:delete  -> admin, manager
  ib_partners:*     -> admin
  page:accounting   -> admin, manager
  ```
- Store in `role_permissions` table (already exists)
- Match at runtime using pattern-based lookup

### 2.4 Feature Gating by Subscription/Role

Claude Code maps subscription types to feature availability:

**PipLineProV2 Application:**
- Map org roles to feature tiers
- `isRoleEligibleForFeature(role, feature)` utility
- Use for: bulk operations, export, AI assistant, advanced filters
- Warm message for locked features (already doing this for operations on settings tab)

### 2.5 Policy Limits with Background Polling

Claude Code fetches org policies hourly with HTTP caching (ETag/304):

**PipLineProV2 Application:**
- Fetch org permissions on login + poll hourly for changes
- Use Supabase real-time subscription on `role_permissions` table
- Cache permissions in memory, invalidate on subscription event
- Fail-open for reads, fail-closed for writes

### 2.6 Permission Decision Audit Trail

Every permission decision is logged with source, reason, and metadata.

**PipLineProV2 Application:**
- Already have `transfer_audit_log` - extend pattern to all sensitive operations
- Log: who, what, when, why (which rule matched), outcome
- Show in audit page with filters

---

## 3. UI Components & UX Patterns

### 3.1 Notification/Toast System with Priority & Folding

Claude Code implements a sophisticated notification system:
```typescript
addNotification({
  key: 'unique-id',
  priority: 'immediate' | 'high' | 'medium' | 'low',
  timeoutMs: 5000,
  jsx: <CustomUI />,
  invalidates: ['other-key'],
  fold: (acc, incoming) => mergeLogic  // Deduplicate/merge
})
```

**PipLineProV2 Application:**
- Build a centralized toast/notification provider
- Priority levels: errors > warnings > success > info
- `invalidates` key: new transfer creation dismisses "no transfers" toast
- `fold`: merge multiple "X transfers created" into "5 transfers created"
- Auto-dismiss configurable per priority

### 3.2 Virtual Scrolling for Large Lists

Claude Code uses `useVirtualScroll` for message lists with viewport caching.

**PipLineProV2 Application:**
- Apply to transfers table (can have 1000+ rows with "Load More" mode)
- Only render visible rows + buffer
- Maintain scroll position on data updates
- Essential for mobile performance with `cardOnMobile` layout

### 3.3 FuzzyPicker with Live Preview

A search component that filters items with optional preview pane:

```tsx
<FuzzyPicker
  items={items}
  renderPreview={item => <DetailView>{item}</DetailView>}
  previewPosition="bottom" | "right"
  onSelect={handleSelect}
/>
```

**PipLineProV2 Application:**
- Command palette (Ctrl+K) for quick navigation
- Customer search in transfers page with preview of recent transfers
- IB partner search with commission preview
- PSP search with settlement preview

### 3.4 Modal Focus Management

Claude Code uses `isCancelActive` prop to manage keyboard events in nested dialogs:

**PipLineProV2 Application:**
- When editing inside a dialog (e.g., bulk edit, PIN dialog), prevent Escape from closing the dialog while editing
- Manage focus trapping properly in nested modals
- Prevent keyboard shortcuts from leaking through dialog layers

### 3.5 Specialized Error Components per Action

Instead of generic error toasts, Claude Code renders tool-specific error UIs:

**PipLineProV2 Application:**
- `TransferCreationError` - shows which fields failed validation
- `BulkEditError` - shows which transfers failed and why
- `IBCommissionError` - shows calculation breakdown of what went wrong
- `ImportError` - shows line-by-line import failures
- Each error component knows how to suggest recovery actions

### 3.6 Shimmer/Loading Animation for Async Operations

Claude Code uses character-level shimmer animation at 20fps for async states.

**PipLineProV2 Application:**
- Skeleton loaders for table rows while fetching
- Shimmer effect on "Calculating..." states (IB commission calculation)
- Pulse animation on real-time data updates
- Loading states per-section, not full page

### 3.7 Keyboard Shortcut System with Chord Support

Claude Code has a full keybinding system with:
- Single keys and multi-key chords (Ctrl+K Ctrl+S)
- Context-specific bindings (different in dialog vs table)
- User-customizable via config file

**PipLineProV2 Application:**
- `Ctrl+N` - New transfer
- `Ctrl+K` - Command palette
- `Ctrl+S` - Save current form
- `Ctrl+Shift+F` - Open filter drawer
- `Ctrl+E` - Export current view
- Context-aware: different shortcuts when in dialog vs table
- Show keyboard shortcut hints in tooltips

### 3.8 Compound Tab Component with Fixed Height

Tabs prevent layout shift with fixed content height and controlled/uncontrolled modes.

**PipLineProV2 Application:**
- Transfers page tabs (filters, settings) with fixed height to prevent layout jump
- Accounting page tabs (Ledger, Wallets) with consistent content area
- IB page tabs with smooth transitions

### 3.9 Search/Filter with Debounced Live Results

Claude Code decouples filtering from rendering to prevent UI jank.

**PipLineProV2 Application:**
- Debounce filter inputs (250ms) before firing Supabase queries
- Show "searching..." indicator during debounce
- Preserve filter state across page navigation
- URL-synced filters for shareable views

---

## 4. Performance & Optimization

### 4.1 Lazy Loading with Dynamic Imports

Claude Code defers heavy modules (OpenTelemetry ~400KB, gRPC ~700KB) until first use.

**PipLineProV2 Application:**
- Lazy load chart libraries (only on Dashboard)
- Lazy load PDF export library (only when exporting)
- Lazy load rich text editor (only in notes fields)
- Route-based code splitting (already via React Router, but ensure heavy components are lazy)
- Lazy load i18n namespaces per page

### 4.2 Lazy Schema Construction

Claude Code defers Zod schema instantiation from module load to first access:
```typescript
const schema = lazySchema(() => z.object({ ... }))
```

**PipLineProV2 Application:**
- Defer validation schemas for forms not yet visited
- Large schemas (transfer creation with all fields) built on first render
- Prevents unnecessary work during initial page load

### 4.3 File/Response Caching with Size Limits

Claude Code caches file reads per-turn with `createFileStateCacheWithSizeLimit()`.

**PipLineProV2 Application:**
- Cache Supabase responses for non-critical data (PSP list, transfer types, payment methods)
- Use React Query's stale-while-revalidate pattern
- Size-limited cache: evict least-recently-used when cache exceeds limit
- Cache key includes org ID to prevent cross-org data leaks

### 4.4 Token/Cost Estimation with Tiered Accuracy

Three tiers: API-based (accurate) -> model-based (fast) -> rough estimation (instant).

**PipLineProV2 Application:**
- For AI assistant feature: estimate tokens before sending
- Show "~X tokens" indicator to help users understand cost
- Rough estimation for preview, accurate count after API call

### 4.5 Streaming Responses (Don't Wait for Full Response)

Claude Code processes API deltas as they arrive.

**PipLineProV2 Application:**
- AI assistant: stream responses in real-time (already doing this with SSE)
- Large data exports: stream CSV rows as they're generated
- Bulk operations: show progress per-item, not "loading..."

---

## 5. Error Handling & Resilience

### 5.1 Sophisticated Retry with Circuit Breaker

Claude Code's retry system includes:
- Error classification (auth vs rate-limit vs server error)
- Exponential backoff with jitter
- Circuit breaker (max 3 consecutive failures)
- Fast mode fallback on capacity errors

**PipLineProV2 Application:**
```typescript
async function withRetry<T>(operation: () => Promise<T>, options: RetryOptions): Promise<T> {
  for (let attempt = 0; attempt < options.maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      if (isAuthError(error)) { await refreshSession(); continue }
      if (isRateLimit(error)) { await delay(getBackoff(attempt)); continue }
      if (attempt >= options.maxRetries - 1) throw error
      await delay(getBackoff(attempt))
    }
  }
}
```
- Apply to all Supabase calls
- Distinguish auth errors (refresh token) from server errors (retry) from client errors (don't retry)
- Show "Reconnecting..." UI during retries

### 5.2 Error Classification by Type

Claude Code classifies errors and handles each differently:
| Status | Action |
|--------|--------|
| 401/403 | Refresh token, retry once |
| 408 | Timeout, retry with backoff |
| 429 | Rate limit, respect Retry-After header |
| 5xx | Server error, retry with backoff |

**PipLineProV2 Application:**
- Create a centralized error handler for Supabase responses
- Auth errors trigger silent token refresh
- Network errors show offline banner
- Rate limits queue requests

### 5.3 Strategic Error Boundaries (Not Everything)

Claude Code uses error boundaries sparingly - only where recovery is meaningful.

**PipLineProV2 Application:**
- Error boundary per page (crash one page, others work)
- Error boundary around AI assistant (don't crash transfers if AI fails)
- Error boundary around charts/widgets on dashboard
- NO error boundary on auth flow (must propagate)

### 5.4 Stale Connection Recovery

Claude Code detects ECONNRESET and disables HTTP keep-alive for retry.

**PipLineProV2 Application:**
- Detect Supabase real-time disconnections
- Auto-reconnect with exponential backoff
- Show "Reconnecting..." indicator
- Re-fetch stale data after reconnection

---

## 6. Extensibility & Plugin Patterns

### 6.1 Tool/Action Factory Pattern

Every capability in Claude Code is a self-contained "tool" with schema, permissions, and UI:

```typescript
const CreateTransferTool = buildTool({
  name: 'CreateTransfer',
  inputSchema: z.object({ amount: z.number(), currency: z.string() }),
  async call(args, context) { /* Supabase insert */ },
  checkPermissions(input, context) { /* RBAC check */ },
  isReadOnly: false,
  isDestructive: false,
})
```

**PipLineProV2 Application:**
- Define each Supabase mutation as a "tool" with:
  - Input validation (Zod schema)
  - Permission check (role-based)
  - Execution logic (Supabase call)
  - Audit logging (who did what)
- Centralize all CRUD operations in one pattern
- Makes it trivial to add audit logging, permission checks, validation to every operation

### 6.2 Command Registry Pattern

All slash commands are registered in a single registry with metadata:

**PipLineProV2 Application:**
- Build a command palette registry:
  ```typescript
  const commands = [
    { name: 'New Transfer', shortcut: 'Ctrl+N', action: () => navigate('/transfers/new'), icon: PlusIcon },
    { name: 'Export CSV', shortcut: 'Ctrl+E', action: () => exportCSV(), icon: ExportIcon },
    { name: 'Toggle Theme', shortcut: 'Ctrl+T', action: () => toggleTheme(), icon: MoonIcon },
  ]
  ```
- Searchable via Ctrl+K command palette
- All actions discoverable in one place

### 6.3 Skill/Workflow System

Claude Code's skills are reusable prompt templates with metadata.

**PipLineProV2 Application:**
- For AI assistant: define "skills" as pre-built prompts
  - "Monthly Summary" - fetches and summarizes monthly data
  - "Top Customers" - analyzes customer patterns
  - "Commission Calculator" - helps with IB commission calculations
- Each skill has specific tools (RPCs) it can access
- Users can trigger skills via quick buttons in AI chat

### 6.4 Declare, Don't Configure

Claude Code plugins use declarative manifests, not procedural code.

**PipLineProV2 Application:**
- Define page permissions declaratively:
  ```typescript
  const PAGE_PERMISSIONS = {
    'page:dashboard': { roles: ['admin', 'manager', 'operation'] },
    'page:accounting': { roles: ['admin', 'manager'] },
    'page:ib': { roles: ['admin', 'manager', 'operation'] },
  }
  ```
- Define form field visibility declaratively per role
- Define sidebar items declaratively with permission requirements

---

## 7. Observability & Monitoring

### 7.1 Request-Scoped Tracing

Claude Code uses OpenTelemetry with AsyncLocalStorage for tracing.

**PipLineProV2 Application:**
- Track user actions as "spans": page load -> data fetch -> render
- Measure: Supabase query duration, component render time, user interaction latency
- Send to analytics service (PostHog, Mixpanel, or custom)

### 7.2 Cost Tracking with Per-Session Persistence

Claude Code tracks API costs in memory and persists per session.

**PipLineProV2 Application:**
- Track AI assistant usage per user/org
- Show remaining quota in AI chat interface
- Persist usage to Supabase for billing/analytics
- Alert admins when org approaches usage limits

### 7.3 Performance Metrics (FPS Tracking)

Claude Code tracks average FPS and low 1% FPS.

**PipLineProV2 Application:**
- Track Core Web Vitals (LCP, FID, CLS) per page
- Monitor table rendering performance
- Detect slow renders and report
- Use `React.Profiler` in dev mode

### 7.4 Append-Only Event Log for Offline Resilience

Claude Code queues analytics events to disk when network fails.

**PipLineProV2 Application:**
- Queue analytics events in IndexedDB when offline
- Flush on reconnection
- Prevent data loss during network interruptions
- Critical for PWA offline mode

---

## 8. Feature Flags & Gradual Rollout

### 8.1 Build-Time Dead Code Elimination

Claude Code uses `feature('FLAG')` with Bun bundler to strip code at build time.

**PipLineProV2 Application:**
- Use Vite's `define` for build-time feature flags:
  ```typescript
  // vite.config.ts
  define: {
    __FEATURE_AI_ASSISTANT__: JSON.stringify(true),
    __FEATURE_IB_MODULE__: JSON.stringify(true),
    __FEATURE_ADVANCED_ANALYTICS__: JSON.stringify(false),
  }
  ```
- Unused features are completely removed from production bundle
- No runtime overhead for disabled features

### 8.2 Runtime Feature Flags (GrowthBook Pattern)

Claude Code uses GrowthBook with user attributes for targeting.

**PipLineProV2 Application:**
- Target features by:
  - Organization ID (beta features for specific orgs)
  - User role (god sees experimental features)
  - Organization plan/tier (premium features)
  - Platform (mobile-specific features)
- A/B test new UI layouts before full rollout
- Gradually roll out IB module to select orgs

### 8.3 Feature-Gated Route Loading

```typescript
const IBPage = __FEATURE_IB_MODULE__
  ? lazy(() => import('./pages/ib'))
  : () => <ComingSoon feature="IB Management" />
```

**PipLineProV2 Application:**
- Gate entire pages behind feature flags
- Show "Coming Soon" placeholder for unreleased features
- Different route sets for different org tiers

---

## 9. Schema Validation & Type Safety

### 9.1 Zod at All Boundaries

Claude Code validates with Zod at every system boundary.

**PipLineProV2 Application:**
- Validate all form inputs with Zod before Supabase calls
- Validate all Supabase responses (database types can drift)
- Validate URL params and query strings
- Validate localStorage/sessionStorage reads (can be corrupted)
- Share schemas between frontend and Edge Functions

### 9.2 Discriminated Union Schemas

Claude Code uses discriminated unions for different hook types.

**PipLineProV2 Application:**
- IB agreement types as discriminated unions:
  ```typescript
  const AgreementSchema = z.discriminatedUnion('agreement_type', [
    z.object({ agreement_type: z.literal('salary'), amount: z.number() }),
    z.object({ agreement_type: z.literal('cpa'), cpa_amount: z.number() }),
    z.object({ agreement_type: z.literal('lot_rebate'), rebate_per_lot: z.number() }),
    z.object({ agreement_type: z.literal('revenue_share'), revshare_pct: z.number() }),
    z.object({ agreement_type: z.literal('hybrid'), components: z.array(ComponentSchema) }),
  ])
  ```
- Transfer entry types as unions
- Accounting entry types as unions

### 9.3 Inferred Types from Schemas

```typescript
type Agreement = z.infer<typeof AgreementSchema>
```

**PipLineProV2 Application:**
- Single source of truth: schema defines both validation AND type
- No drift between validation logic and TypeScript types
- Update schema once, types update everywhere

---

## 10. Build & Developer Experience

### 10.1 Source Map Configuration

Claude Code generates external source maps for debugging.

**PipLineProV2 Application:**
- External source maps in production (for error tracking, not shipped to users)
- Inline source maps in development (for fast debugging)
- Upload source maps to error tracking service (Sentry)

### 10.2 Watch Mode with Hot Reload

Claude Code has `build:watch` for development.

**PipLineProV2 Application:**
- Already using Vite HMR - ensure it works for all file types
- Hot reload for i18n JSON changes
- Hot reload for Tailwind config changes

### 10.3 Index Re-exports for Clean Imports

Each directory has an `index.ts` re-exporting the public API.

**PipLineProV2 Application:**
- Already doing this with `@ds` alias
- Extend to all major directories:
  ```typescript
  import { useTransfersQuery, useCreateTransfer } from '@/hooks/queries'
  import { TransferCard, TransferTable } from '@/components/transfers'
  import { calculateCommission, formatCurrency } from '@/utils'
  ```
- Creates clear public/private boundaries per module

---

## 11. Memory & Caching

### 11.1 Multi-Layer Settings Cache

Claude Code uses 3 caches reset together:
1. Merged settings cache
2. Per-source cache
3. File parse cache

**PipLineProV2 Application:**
- Layer 1: React Query cache (Supabase responses)
- Layer 2: Context cache (user profile, org data, permissions)
- Layer 3: localStorage cache (theme, language, last org, filter preferences)
- Invalidate all layers on: logout, org switch, role change

### 11.2 Memory with Index File

Claude Code's memory system uses individual files + a `MEMORY.md` index.

**PipLineProV2 Application:**
- For AI assistant: maintain conversation memory per org
- Store key facts extracted from conversations
- Index file for quick context injection into AI prompts
- Memory types: user preferences, org context, recent decisions

### 11.3 Stale-While-Revalidate Pattern

Claude Code uses `getFeatureValue_CACHED_MAY_BE_STALE()` for fast reads.

**PipLineProV2 Application:**
- Show cached data immediately, refetch in background
- React Query's `staleTime` and `cacheTime` configuration
- Critical for: PSP list, transfer types, payment methods, employee list
- Show subtle "updating..." indicator when revalidating

---

## 12. Multi-Agent & Task Orchestration

### 12.1 Background Task Management

Claude Code manages background tasks with status tracking:
```typescript
TaskState { id, type, status, description, startTime, endTime, outputFile }
```

**PipLineProV2 Application:**
- Background CSV exports (large datasets)
- Background bulk operations (bulk transfer edit)
- Background IB commission calculations
- Show progress in a task panel/drawer
- Notify on completion (browser notification + in-app toast)

### 12.2 Task Abort Controller

Every task gets an `AbortController` for cancellation.

**PipLineProV2 Application:**
- Cancel long-running Supabase queries on page navigation
- Cancel AI assistant requests on user interrupt
- Cancel background exports on user request
- Proper cleanup of Supabase real-time subscriptions

### 12.3 Worker Communication Pattern

Claude Code agents communicate via `SendMessageTool`.

**PipLineProV2 Application:**
- For AI assistant: tool calling pattern
  - AI calls `get_monthly_summary` tool
  - Frontend shows "Fetching monthly data..." indicator
  - Tool returns structured data
  - AI formats response
- Already implemented in Edge Function - can extend with more tools

---

## 13. Theming & Design System

### 13.1 Semantic Color System (80+ Tokens)

Claude Code uses semantic names that resolve to actual colors per theme:
```typescript
success, error, warning, merged
permission, planMode, ide
diffAdded, diffRemoved
```

**PipLineProV2 Application:**
- Extend design system tokens beyond Tailwind defaults:
  ```css
  --color-transfer-deposit: ...
  --color-transfer-withdrawal: ...
  --color-transfer-blocked: ...
  --color-ib-active: ...
  --color-ib-paused: ...
  --color-ib-terminated: ...
  --color-commission-draft: ...
  --color-commission-confirmed: ...
  --color-commission-paid: ...
  ```
- Semantic names make the codebase self-documenting
- Easy to adjust all "deposit" colors in one place

### 13.2 Theme with Live Mode Switching

Claude Code watches for OS theme changes and switches in real-time.

**PipLineProV2 Application:**
- Already have theme system - add "auto" mode that follows OS preference
- `matchMedia('(prefers-color-scheme: dark)')` listener
- Smooth transition animation on theme switch
- Preview theme before committing (like Claude Code's `previewTheme`)

### 13.3 Accessibility Themes

Claude Code includes daltonized (color-blind) theme variants.

**PipLineProV2 Application:**
- High contrast mode for accessibility
- Color-blind friendly palettes for charts and status indicators
- Don't rely solely on color to convey meaning (add icons, patterns)
- Critical for financial data where deposit/withdrawal distinction matters

---

## 14. Configuration & Migration

### 14.1 Idempotent Config Migrations

Claude Code writes versioned, idempotent migration functions:
```typescript
function migrateV1toV2(config) {
  if (config.version >= 2) return config // Already migrated
  return { ...config, version: 2, newField: deriveFromOld(config.oldField) }
}
```

**PipLineProV2 Application:**
- Version user preferences stored in localStorage
- When adding new settings: migration function transforms old format
- Prevents "undefined" errors when new code reads old data
- Apply same pattern to Supabase migrations (already numbered 001-117)

### 14.2 Settings Cascade (Multi-Source Config)

Claude Code merges settings from 6+ sources with priority:
```
user settings > project settings > org settings > defaults
```

**PipLineProV2 Application:**
- Merge user preferences with org defaults:
  - Org default: page size = 25
  - User override: page size = 50
  - Result: 50 (user wins)
- Org admins set defaults, users can override non-locked settings
- Some settings are org-locked (admin can prevent override)

### 14.3 Remote Managed Settings

Claude Code lets admins push settings to orgs remotely.

**PipLineProV2 Application:**
- God/admin can push org-wide settings:
  - Default transfer types
  - Required fields for transfers
  - Commission calculation rules
  - Feature toggles per org
- Settings synced via Supabase real-time
- Users see changes without refresh

---

## 15. Real-Time & Streaming

### 15.1 Streaming Response Handler

Claude Code processes API deltas as they arrive, updates UI incrementally.

**PipLineProV2 Application:**
- AI assistant: already using SSE streaming - ensure UI updates per-token
- Real-time transfer updates: Supabase real-time subscriptions
- Live dashboard metrics: subscribe to `postgres_changes` events
- Live online user count (already exists)

### 15.2 Real-Time Subscription Pattern

```typescript
supabase
  .channel('transfers')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'transfers', filter: `organization_id=eq.${orgId}` },
    (payload) => {
      queryClient.invalidateQueries(['transfers'])
    }
  )
  .subscribe()
```

**PipLineProV2 Application:**
- Subscribe to transfers table for live updates
- Subscribe to IB commissions for status changes
- Subscribe to org_members for role changes
- Invalidate React Query cache on real-time events

### 15.3 Progressive Loading (Virtual + Streaming)

Claude Code renders visible items while streaming continues.

**PipLineProV2 Application:**
- Load first page of transfers immediately
- "Load More" fetches next page without blocking current view
- Virtual scrolling renders only visible rows
- Background prefetch next page for instant pagination

---

## 16. Security Best Practices

### 16.1 Defense in Depth

Claude Code enforces security at multiple layers.

**PipLineProV2 Application:**
- Layer 1: Supabase RLS (database) - already implemented
- Layer 2: Edge Function auth check (API) - already implemented
- Layer 3: Frontend permission check (UI) - prevent unauthorized UI access
- Layer 4: Input validation (client+server) - Zod schemas
- Never trust a single layer

### 16.2 Token Refresh with Proactive Schedule

Claude Code refreshes tokens 5 minutes before expiry.

**PipLineProV2 Application:**
- Proactive Supabase session refresh before expiry
- `onAuthStateChange` listener for automatic refresh
- Redirect to login if refresh fails after retries
- Show "Session expiring..." warning before force-logout

### 16.3 Fail-Closed for Sensitive Operations

Claude Code fails closed (deny) for compliance-critical policies.

**PipLineProV2 Application:**
- If permission check fails (network error), deny destructive operations
- Allow read operations with cached permissions (fail-open for reads)
- Deny write operations without confirmed permissions (fail-closed for writes)
- Log all permission check failures for audit

### 16.4 Checksum Validation for Cached Data

Claude Code uses SHA256 checksums on cached policy data.

**PipLineProV2 Application:**
- Validate integrity of cached permissions/settings
- Detect localStorage tampering
- Compare cached data checksum with server on each validation

---

## Priority Roadmap

### Quick Wins (1-2 days each)
1. Notification/toast system with priority and folding
2. Keyboard shortcuts (Ctrl+K command palette)
3. Semantic color tokens for domain concepts
4. Lazy loading heavy components (charts, PDF export)
5. Centralized error handler with retry logic

### Medium Effort (3-5 days each)
6. Virtual scrolling for transfers table
7. Background task management (exports, bulk ops)
8. Feature flags (build-time + runtime)
9. FuzzyPicker/command palette component
10. Settings cascade (org defaults + user overrides)

### Larger Initiatives (1-2 weeks each)
11. Tool/action factory pattern for all mutations
12. Declarative permission system overhaul
13. Real-time subscriptions for live updates
14. Observability/analytics pipeline
15. Config migration system

---

*Generated from analysis of Claude Code source (leaked 2026-03-31, ~1,900 files, 512K+ LOC)*
