# Auth & RBAC

**Status:** Living spec · reflects codebase as of `main` on 2026-04-24
**Scope:** Authentication (Supabase Auth), authorization (RBAC), RLS helpers, JWT custom claims, invite flow, PIN gating, rate limiting.

> Most auth bugs in this repo are **"I thought X had access"** bugs. The rules below are the single source of truth. When a policy disagrees with this doc, fix one or the other.

---

## 1. The role hierarchy

Two dimensions of role, two storage locations:

| Dimension | Values | Stored in | Notes |
|---|---|---|---|
| **System role** | `god \| user` | `profiles.system_role` | Cross-org. God = super-admin. Default `user`. |
| **Organization role** | `admin \| manager \| operation \| ik` | `organization_members.role` | Per-org. One per user per org. Default `operation`. |

### 1.1 System roles

| Role | Capability summary |
|---|---|
| **god** | Cross-org super-admin. Sees **every** org, every profile (including other gods). Creates/deletes orgs. Invisible to non-gods (hidden from profile SELECTs, not listed in member queries). Meant for developers and urgent intervention. |
| **user** | Normal user. Access determined entirely by org membership. |

Source: [migrations/001_create_profiles.sql:10–11](../../supabase/migrations/001_create_profiles.sql#L10-L11) (CHECK), [005_create_rls_policies.sql](../../supabase/migrations/005_create_rls_policies.sql), [007_restructure_roles.sql:87–100](../../supabase/migrations/007_restructure_roles.sql#L87-L100) (god hiding).

### 1.2 Organization roles

Per-org role, one row per `(organization_id, user_id)` in `organization_members`.

| Role | Added by | Can |
|---|---|---|
| **admin** | 005 / 007 | Assign **any** org role. Edit/delete any member, invitations, org settings. Soft-delete transfers, manage trash, manage lookups, manage PSPs. |
| **manager** | 045b, elevated by 048, 059, 073 | Assign `manager` or `operation` only (not admin, not another manager above self). HR read/write. Most CRUD on operational tables. **Cannot** delete members, demote admins, change org settings. |
| **operation** | 007 (renamed from `member`) | Day-to-day CRUD on transfers, accounting entries, etc. **Cannot** manage members, invitations, PSPs, or settings. Cannot delete transfers (soft-delete is admin-only). |
| **ik** | 097 (HR-specialist) | Like manager but scoped to HR + accounting. Read/write on all HR tables (`hr_employees`, `hr_salary_payments`, `hr_bonus_agreements`, …). Can also touch accounting. |

Full capability matrix lives in [`private.default_permission()`](../../supabase/migrations/097_role_permissions.sql#L74-L145) — that function encodes the **current** default RLS behavior per `(role, table, action)` and is the authoritative matrix if you disagree with the table above.

**Hierarchy in practice:** god > admin > manager ≈ ik > operation. Manager and ik are siblings: neither is strictly higher — they cover different surfaces (manager is general ops, ik is HR-specialist).

### 1.3 The "who can assign whom" rule

Enforced by [migration 048](../../supabase/migrations/048_elevate_manager_access.sql) and later. In `add_organization_member` / `update_organization_member` RPCs:

- `admin` may assign any role (`admin | manager | operation | ik`).
- `manager` may assign `manager | operation` — **never** `admin`.
- `operation` and `ik` **cannot** assign roles.
- `god` bypasses everything.

---

## 2. RLS helpers (private schema)

The `private` schema holds `SECURITY DEFINER` helpers that bypass RLS, preventing infinite recursion when a policy on table T queries table T itself. **These are the building blocks of every policy in the app.**

### 2.1 `private.is_god()`
[005:27–40](../../supabase/migrations/005_create_rls_policies.sql#L27-L40)

```sql
RETURNS boolean
-- true if auth.uid()'s profile has system_role = 'god'
```

Used in every policy as the first branch. Always wrap in `(SELECT private.is_god())` — the subquery form lets Postgres cache the result per-statement instead of per-row.

### 2.2 `private.get_user_org_ids()`
[005:43–53](../../supabase/migrations/005_create_rls_policies.sql#L43-L53)

```sql
RETURNS SETOF uuid
-- every organization_id the current user is a member of
```

Used in `SELECT` policies: `organization_id IN (SELECT private.get_user_org_ids())`.

### 2.3 `private.is_org_admin(_org_id uuid)`
[007:34–48](../../supabase/migrations/007_restructure_roles.sql#L34-L48)

```sql
RETURNS boolean
-- true if auth.uid() is a member of _org_id with role = 'admin'
```

Used in `INSERT/UPDATE/DELETE` policies where only org admins should pass.

### 2.4 `private.get_user_system_role()`
[005:14–24](../../supabase/migrations/005_create_rls_policies.sql#L14-L24)

```sql
RETURNS text   -- 'god' | 'user'
```

Rarely used directly — prefer `is_god()` for boolean checks.

### 2.5 `private.has_role_permission(_org_id, _table, _action)`
[097:151–179](../../supabase/migrations/097_role_permissions.sql#L151-L179)

```sql
RETURNS boolean
-- true if the current user's role in _org_id has _action permission on _table
-- Checks configurable overrides in role_permissions, falls back to default_permission().
```

Used in the configurable permission system (migration 097). Tables that opt into it run `(SELECT private.has_role_permission(organization_id, 'transfers', 'delete'))` instead of hardcoded role lists.

### 2.6 `private.default_permission(_role, _table, _action)`
[097:74–145](../../supabase/migrations/097_role_permissions.sql#L74-L145)

Pure function — the current hardcoded defaults table. Immutable (IMMUTABLE).

**Rule:** never bypass these helpers by copying their logic into a policy body. When we change the model, we change it in one place.

---

## 3. JWT custom claims

### 3.1 What's in the token

Supabase's JWT carries the usual claims (`sub`, `email`, `aud`, `exp`). On top, a custom hook injects:

```json
{ "user_role": "god" | "user" }
```

Source: [`public.custom_access_token_hook`](../../supabase/migrations/006_create_access_token_hook.sql).

### 3.2 Enabling the hook (manual step)

**After paste of migration 006**, go to **Supabase Dashboard → Authentication → Hooks → "Customize Access Token (JWT) Claims"** and select `public.custom_access_token_hook`. Without this step the claim is never injected and RLS policies reading `user_role` quietly fail open.

### 3.3 Why it matters

- Zero disk I/O per RLS check: policies could in principle read `auth.jwt() ->> 'user_role'` instead of joining `profiles`.
- In this repo we **don't** read the claim in RLS — we use `private.is_god()` (a disk read, but cached per-statement). The claim is a future-proofing tool; keep it populated even if unused today.
- Frontend does **not** read the claim either. `AuthProvider` fetches `profiles.system_role` directly and exposes `isGod` from that — see §5.1.

### 3.4 Role-change propagation

Changing `profiles.system_role` does **not** automatically refresh active JWTs. Flow:

1. God updates `UPDATE profiles SET system_role = 'god' WHERE id = …`.
2. Affected user's existing session token still has the old claim.
3. Their `AuthProvider` fetches the updated profile on next mount (or via `refreshProfile()`).
4. If the role changed, `AuthProvider` calls `supabase.auth.refreshSession()` to rotate the token ([AuthProvider.tsx:311–329](../../src/app/providers/AuthProvider.tsx#L311-L329)).
5. The new token carries the updated `user_role` claim.

**Operator note:** for urgent promotion/demotion, tell the user to sign out and back in — guaranteed fresh claim.

### 3.5 Org switch and token rotation

Switching orgs on the frontend ([OrganizationProvider.tsx:178–217](../../src/app/providers/OrganizationProvider.tsx#L178-L217)) also forces `refreshToken()`. The JWT itself doesn't encode the active org (the app's "current org" is a client-side selector via `localStorage`), but rotating the token is a defensive measure so any server-side logic that *could* derive org context from the token sees a fresh one.

---

## 4. RLS patterns (house style)

Every table in `public` follows one of three patterns:

### 4.1 Auth-foundation pattern
Tables: `profiles`, `organizations`, `organization_members`, `organization_invitations`.

Policies are defined in [005](../../supabase/migrations/005_create_rls_policies.sql) and rewritten in [007](../../supabase/migrations/007_restructure_roles.sql). Read [007 §4](../../supabase/migrations/007_restructure_roles.sql#L78-L241) for the current shape. Highlights:

- `profiles.SELECT`: own profile OR god OR co-member profile **that is not god**.
- `organizations.UPDATE`: god OR `is_org_admin(id)`.
- `organization_members.INSERT/UPDATE`: god OR `is_org_admin(organization_id)`.
- `organization_members.DELETE`: god OR `is_org_admin(organization_id) AND user_id != auth.uid()` (admins cannot self-delete).
- `organization_invitations.*`: god OR `is_org_admin(organization_id)`.

### 4.2 Org-scoped operational pattern
Most business tables: `transfers`, `psps`, `accounting_entries`, `hr_employees`, `exchange_rates`, `wallets`, …

```sql
-- SELECT: every org member
USING ((SELECT private.is_god()) OR organization_id IN (SELECT private.get_user_org_ids()))

-- INSERT / UPDATE: every org member (feature code enforces role gates)
WITH CHECK (same as SELECT)

-- DELETE: admin-only
USING ((SELECT private.is_god()) OR (SELECT private.is_org_admin(organization_id)))
```

**Quirk:** many tables (incl. `transfers`) let every org member UPDATE. The feature-level role check prevents unwanted writes (e.g. operation can't change transfer type in bulk). This is *fragile* — protected by convention, not policy. Audit before expanding.

### 4.3 Configurable-permission pattern (migration 097)
Opt-in tables use `private.has_role_permission(org_id, 'table', 'action')` instead of hardcoded role lists. Admin can override the defaults per-org in the `role_permissions` table. Not every table is migrated to this pattern yet.

---

## 5. Frontend integration

### 5.1 `AuthProvider`
[src/app/providers/AuthProvider.tsx](../../src/app/providers/AuthProvider.tsx)

Wraps the app. Responsibilities:

- Tracks `session`, `user`, `profile`, `isLoading`.
- Fast-boots via a pre-fetched `sessionPromise` from `main.tsx` (session check overlaps React render time).
- Listens to `supabase.auth.onAuthStateChange` for `SIGNED_OUT`, `TOKEN_REFRESHED`, and regular updates.
- Fetches `profiles` row on user change, retries up to 3× with 800ms backoff on transient failures.
- Exposes `isGod: profile?.system_role === 'god'`.
- `signIn` is rate-limited server-side via `should_rate_limit_device` (5 attempts / 15 min / device).
- `refreshProfile()` re-fetches the profile; detects `system_role` change and rotates the session token.
- `refreshToken()` forces a session token rotation (called on org switch).

```tsx
const { user, profile, isGod, signIn, signOut, refreshProfile } = useAuth()
```

Throws if used outside `<AuthProvider>`.

### 5.2 `OrganizationProvider`
[src/app/providers/OrganizationProvider.tsx](../../src/app/providers/OrganizationProvider.tsx)

Wraps the app below `AuthProvider`. Responsibilities:

- Fetches orgs the user can see:
  - God → all orgs
  - Any-org admin → all orgs (implicit super-read via the loop)
  - Manager / operation / ik → only orgs they're a member of
- Loads the selected org from `localStorage('piplinepro-org')` and falls back to the first org.
- Fetches membership row for the selected org (skipped for gods).
- `selectOrg(orgId)`: switches active org, fetches new membership, triggers `onOrgSwitch` (cache reset), rotates token.
- Retries membership fetch up to 3× (handles stale-token race after app update).

```tsx
const { currentOrg, organizations, membership, selectOrg } = useOrganization()
// membership.role === 'admin' | 'manager' | 'operation' | 'ik' | null (for gods)
```

### 5.3 Role checks in feature code

Canonical patterns:

```ts
// Is the user an org admin here?
const isAdmin = isGod || membership?.role === 'admin'

// Can they manage HR?
const canManageHr = isGod || membership?.role === 'admin' || membership?.role === 'manager' || membership?.role === 'ik'

// Can they operate at all?
const canWrite = isGod || Boolean(membership)
```

**Rule:** centralize multi-role checks in helpers if they appear in more than two places. Don't sprinkle raw `membership?.role === 'x'` checks across components — if the role matrix evolves, you'll miss one.

### 5.4 God visibility

Gods are hidden from non-gods in every profile-listing query (RLS policy [007:87–100](../../supabase/migrations/007_restructure_roles.sql#L87-L100)). When the user switches UI — "list all org members", "pick a manager" — the query won't even **see** god rows. No frontend filter needed.

**Implication:** never add a frontend fallback that "filters out gods" — if gods appear to a non-god user, the policy is broken and that's the bug to fix.

---

## 6. Invite flow

### 6.1 End-to-end

1. **Creator** (god or org admin) creates an `organization_invitations` row via the admin UI.
   - `email` (not yet a user)
   - `role` (`admin | manager | operation | ik`)
   - `status = 'pending'`
   - `expires_at = now() + 7 days`
   - Unique-pending constraint: only one pending invite per email per org ([004:28–30](../../supabase/migrations/004_create_org_invitations.sql#L28-L30)).
2. **User** receives invite (out of band — currently manual; automated email is a gap) and signs up via Supabase Auth.
3. **`handle_new_user` trigger** fires ([004:33–73](../../supabase/migrations/004_create_org_invitations.sql#L33-L73)):
   - Inserts a `profiles` row for the new user.
   - Loops through pending invitations matching the user's email (not yet expired).
   - Inserts `organization_members` rows for each (with `ON CONFLICT DO NOTHING`).
   - Marks the invitations `status = 'accepted'`.
4. User logs in — `OrganizationProvider` picks up their new memberships.

### 6.2 Invitation lifecycle

| Status | Meaning |
|---|---|
| `pending` | Created but user hasn't signed up yet |
| `accepted` | Auto-accepted by the signup trigger |
| `expired` | Not auto-set — nothing writes this today. An expired invite (`expires_at < now()`) is silently ignored by the trigger but its status stays `pending`. **Gap:** no cleanup job. |

### 6.3 RLS on invitations

Gods and org admins can CRUD. Operation and non-admin roles cannot see invitations at all.

### 6.4 Edge cases

- **User already exists:** the trigger still runs (every `auth.users` insert does), but `organization_members.ON CONFLICT` prevents duplicate rows.
- **Invite changes role before accept:** admin can `UPDATE organization_invitations SET role = 'admin'` while status is `pending` — the trigger reads the current row at signup time, so the latest role wins.
- **Email re-used across orgs:** unique-pending constraint is per-org, so a user can have parallel pending invites from multiple orgs. Signing up accepts **all** valid ones.
- **Email case sensitivity:** trigger uses `=`, not `ILIKE`. If the invite had "Bob@x.com" and the user registers "bob@x.com", it won't match. Supabase normalizes emails on auth side — verify before assuming.

---

## 7. PIN gate

Independent of RBAC. An organization can set a PIN stored as a bcrypt hash in `organization_pins` (migration 076). PIN verification is used to gate:

- Transfers Settings CRUD for non-admins (see [features/transfers.md §10](../features/transfers.md#10-pin-gate)).
- Daily Summary day-rate override.
- Anywhere else admins want an extra confirmation step.

### 7.1 `verify_org_pin(p_organization_id, p_pin, p_device_id)`
[112_bugfixes.sql:620–664](../../supabase/migrations/112_bugfixes.sql#L620-L664)

- `SECURITY DEFINER`, compares bcrypt hash.
- On failure + device_id present, writes a row to `login_attempts` so `should_rate_limit_device` counts it.
- Rate limit: 5 failed attempts per device per 15 minutes → `RAISE EXCEPTION 'RATE_LIMITED'`.
- Frontend catches the exception and renders a warm "wait a few minutes" message.

**Rule:** every place that adds a new gated flow uses the same `PinDialog` + `useVerifyOrgPin` hook. No second PIN UI.

---

## 8. Rate limiting & device tracking

### 8.1 Device ID
Frontend generates a persistent device fingerprint via `getDeviceId()` in [src/lib/deviceFingerprinting.ts](../../src/lib/deviceFingerprinting.ts) — stored in `localStorage`. Not a security primitive (trivially spoofable), just a stability key for rate counting.

### 8.2 `login_attempts` table
Migration 023. Every sign-in attempt writes a row with `device_id`, `success`, `error_type`, timestamp. Queried by:

### 8.3 `should_rate_limit_device(device_id, max_attempts, minutes)`
Returns true if the device has had ≥ max_attempts failed attempts in the last `minutes`. Used by:

- `signIn` in AuthProvider (5 / 15 min).
- `verify_org_pin` (5 / 15 min, via pin_verify_failed error_type — migration 112 BUG-13).

### 8.4 CAPTCHA challenges
Migration 024 added `captcha_challenges`. If used, it's orthogonal to rate limiting. Verify current UX before relying on it.

### 8.5 Trusted devices
Migration 041 added `trusted_devices`. A device that passes auth + (future?) second factor gets a trust row so subsequent logins can relax some checks. Verify current usage.

---

## 9. Audit logging

### 9.1 Tables

| Table | Added by | Purpose |
|---|---|---|
| `god_audit_log` | 043 | Every god-only action (org create/update/delete, member add/remove) |
| `transfer_audit_log` | 008 + 118 | Transfer insert/update/delete with JSONB diff |
| `org_audit_log` | 118 | Org-scoped setting changes |

### 9.2 Who writes

Triggers:
- `audit_organization_changes` → `god_audit_log` on `organizations` INSERT/UPDATE/DELETE
- `audit_org_member_changes` → `god_audit_log` on `organization_members` INSERT/UPDATE/DELETE
- Transfer audit triggers on `transfers` (disabled during bulk imports — see [features/transfers.md §11.2](../features/transfers.md#112-bulk-script-one-off-yearly-re-imports))

Migration 112 (BUG-06) fixed trigger `RETURN` statements for DELETE branches — before the fix, DELETE actions weren't logged. New triggers must `RETURN OLD` on DELETE, `RETURN NEW` otherwise.

### 9.3 Who reads

God-only SELECT policies on `god_audit_log`. Org admins see their own `org_audit_log` and `transfer_audit_log` via `get_transfer_audit` / similar RPCs.

---

## 10. Post-migration manual checklist

When setting up a fresh Supabase project or restoring to a new org:

1. **Paste migrations 001 → 007 in order** into the SQL editor. These must land before any business migration.
2. **Enable the JWT hook** (Dashboard → Auth → Hooks → select `custom_access_token_hook`). Without this, `user_role` isn't in the token.
3. **Promote the god admin** manually:
   ```sql
   UPDATE profiles SET system_role = 'god' WHERE id = '<uuid-of-dev>';
   ```
4. **God signs out and back in** so their JWT carries `user_role='god'`.
5. Proceed with the remaining business migrations (008+).

If any of these steps is skipped, symptoms are "admin operations silently fail" or "god can't see other orgs." Check the list in order.

---

## 11. Known gaps / open questions

- **Invitation email automation.** No Edge Function sends the invite email currently — creators share the signup link manually. Add a Supabase Auth hook or Edge Function if this becomes a throughput problem.
- **Expired invitation cleanup.** Nothing transitions `pending` → `expired` when `expires_at < now()`. Add a cron or a trigger on select.
- **Role matrix drift between `default_permission` and actual RLS policies.** Migration 097 encoded the defaults *as of that date*. Policies on individual tables may have drifted since. A drift-check RPC comparing both would be useful.
- **Manager vs ik precedence is unclear.** Both have HR access, both can touch accounting, neither can manage members. In practice treat them as siblings — document the distinction more sharply if it becomes operationally important.
- **`captcha_challenges` and `trusted_devices` are underdocumented** — audit current usage before relying on them for security decisions.
- **Self-delete as admin.** The RLS policy allows only non-self deletes for admins. If an org has one admin and they want to transfer ownership before leaving, they must first promote someone else. Document the expected UX flow — currently there's none.
- **God role change.** There's no UI to promote/demote a god (the role is SQL-only). Intentional — keeps god a break-glass identity — but flag it if we ever want a "super-admin panel."
- **Session storage.** `localStorage('piplinepro-org')` can leak across users on shared devices if sign-out doesn't clear it. `AuthProvider.signOut` calls `clearSavedOrg()` ([AuthProvider.tsx:274](../../src/app/providers/AuthProvider.tsx#L274)) — verified. But browser profile sharing is not our problem.
