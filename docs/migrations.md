# Migrations

**Status:** Living spec · reflects codebase as of `main` on 2026-04-27
**Scope:** How we write, name, review, and deploy Supabase migrations
**Related:** [supabase/migrations/README.md](../supabase/migrations/README.md), [data-model/README.md §7](./data-model/README.md#7-migration-conventions)

> There is **no** automated migration pipeline in this repo. Migrations are SQL files pasted manually into the Supabase Dashboard SQL editor, in order. This doc captures the conventions that keep that manual process safe.

---

## 1. Naming

Format: `NNN_snake_case_description.sql` where `NNN` is a 3-digit zero-padded integer.

- Current range: `001` → `143` as of 2026-04-27.
- Each migration gets the next available prefix.
- Description is a short snake_case summary (e.g. `create_profiles`, `migrate_tether_to_usdt`, `normalize_transfer_currency_to_try`).

### 1.1 Suffixes for follow-ups

`NNNb_*.sql` is used when a prior migration needs a small follow-up that logically belongs to the same change:

- `045b_add_manager_role.sql` follows `045_*`.
- `069b_bonus_payment_status.sql` follows `069_*`.

These are **intentional**. Grep the `b` suffix if looking for fix-ups to a base migration.

### 1.2 Duplicate prefixes (known)

Two prefixes collide — **real duplicates**, not follow-ups:

- `117_ib_management.sql` + `117_transfer_fix_trash_permissions.sql`
- `136_hr_qr_checkin.sql` + `136_transfers_2026_data_import.sql`

Both were committed by accident and are documented in [supabase/migrations/README.md](../supabase/migrations/README.md). When pasting in order, both must be applied. Don't try to "clean them up" by renaming — other migrations may reference the current filenames in comments / docs.

## 2. File structure

Every migration should:

1. **Header comment** explaining the why (not just the what).
2. **Wrap in `BEGIN;` / `COMMIT;`** for multi-statement migrations so the whole thing is atomic.
3. **Use `IF NOT EXISTS` / `IF EXISTS`** for table/index creation/deletion — makes re-running safe.
4. **Group by concern:** schema → triggers → RLS → seed data → RPC updates.

Template:

```sql
-- ============================================================================
-- NNN: <summary>
-- ----------------------------------------------------------------------------
-- Context:
--   <why this migration exists — what broke or what was needed>
--
--   This migration:
--     1. <step>
--     2. <step>
--
--   Scope: <what's intentionally in/out of scope>
-- ============================================================================

BEGIN;

-- ── 1. <section> ───────────────────────────────────────────────────────────
<SQL>

-- ── 2. <section> ───────────────────────────────────────────────────────────
<SQL>

COMMIT;
```

Good examples: [140_migrate_transfers_usd_to_usdt.sql](../supabase/migrations/140_migrate_transfers_usd_to_usdt.sql), [141_normalize_transfer_currency_to_try.sql](../supabase/migrations/141_normalize_transfer_currency_to_try.sql).

## 3. Data migrations

### 3.1 Backup before destructive changes

Bulk data migrations (re-imports, currency normalizations) **must** snapshot affected rows before DELETE / UPDATE:

```sql
CREATE TABLE public.<name>_backup_<tag> AS SELECT * FROM public.<name> WHERE <scope>;
-- then DELETE / UPDATE
```

See [136_transfers_2026_data_import.sql](../supabase/migrations/136_transfers_2026_data_import.sql) for the canonical pattern.

### 3.2 Reporting rowcounts

Always `GET DIAGNOSTICS v_updated = ROW_COUNT` + `RAISE NOTICE`. Gives you audit output in the SQL editor:

```sql
DO $$
DECLARE
  v_updated INT;
BEGIN
  UPDATE public.transfers SET currency = 'TRY' WHERE currency = 'TL';
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RAISE NOTICE 'transfers re-labelled TL → TRY: %', v_updated;
END $$;
```

### 3.3 Idempotence

Data migrations must be safe to re-run (e.g. if the editor session drops mid-apply). Use `WHERE <condition> AND NOT EXISTS` / `ON CONFLICT DO NOTHING` patterns.

## 4. Schema changes

### 4.1 Widening vs tightening

- **Widening** (adding a column, loosening a CHECK) is usually safe and non-blocking.
- **Tightening** (dropping a column, narrowing a CHECK) can fail on existing data. **Always UPDATE the data first**, then tighten.

Example — migration 141:
1. `UPDATE transfers SET currency = 'TRY' WHERE currency = 'TL';` (data)
2. `ALTER TABLE transfers DROP CONSTRAINT transfers_currency_check;` (schema)
3. `ALTER TABLE transfers ADD CONSTRAINT ... CHECK (currency IN ('TRY', 'USD', 'USDT'));` (schema)

### 4.2 RPC redefinition

When changing an RPC's output shape, **CREATE OR REPLACE** works but the caller's TypeScript types won't auto-update. Check `src/lib/database.types.ts` + every `supabase.rpc('<name>', ...)` callsite in the same PR.

Rule: if an RPC is redefined to add/rename/remove fields in the output JSON/TABLE, document the change in the affected feature spec's migration timeline AND the RPC reference ([api/README.md](./api/README.md)).

### 4.3 Triggers

Always `DROP TRIGGER IF EXISTS <name> ON <table>;` before `CREATE TRIGGER` so the migration is re-runnable. Same for trigger functions — `CREATE OR REPLACE FUNCTION` is idempotent.

### 4.4 RLS policies

Same rule — `DROP POLICY IF EXISTS "<name>" ON <table>;` before `CREATE POLICY`. Policies can be recreated safely.

## 5. Post-migration manual steps

Some migrations require actions outside SQL. These are documented in [auth/README.md §10](./auth/README.md#10-post-migration-manual-checklist):

1. **Enable JWT hook** (after migration 006) — Dashboard → Authentication → Hooks.
2. **Promote god admin** (first-time setup) — `UPDATE profiles SET system_role = 'god' WHERE id = '<uuid>';`.
3. **Sign out / in** — to refresh JWT claims.
4. **Configure cron jobs** (for Edge Functions like `daily-wallet-snapshot`).

**Rule:** if your migration requires an out-of-band action, document it in the migration's header comment **and** update the post-migration checklist.

## 6. Deploy process

### 6.1 Writing

1. Create `NNN_description.sql` in `supabase/migrations/`.
2. Test locally if possible (via `supabase db push` or by pasting into a dev project).
3. Commit alongside any code changes that depend on it.

### 6.2 Applying to production

Per [CLAUDE.md](../CLAUDE.md), migrations are pasted **manually** into the Supabase Dashboard SQL editor:

1. Open Supabase Dashboard → SQL Editor.
2. Paste the full migration file contents.
3. Run.
4. Confirm via `RAISE NOTICE` output or table inspection.
5. If it fails, **do not retry blindly** — diagnose. Wrap in transaction so a failure rolls back cleanly.

### 6.3 No `supabase db push`

The CLI works in principle but isn't the current workflow. Anyone switching to CLI deploys must:
- Align the local `supabase/config.toml` with the deployed project.
- Check that migration metadata (`supabase_migrations.schema_migrations`) matches the actual state.
- Reconcile the two duplicate `117` / `136` prefixes.

## 7. Reverting

There's no automated rollback.

- **Schema changes:** write a companion migration that does the reverse. Document in the header.
- **Data changes:** restore from the `*_backup_*` table created in the forward migration. If no backup exists, recover from Supabase point-in-time restore (PITR) — available on Pro+ plans.

## 8. Migration review checklist

Before running a migration in production:

- [ ] Header comment explains the *why*.
- [ ] Wrapped in `BEGIN; / COMMIT;` if multi-statement.
- [ ] Uses `IF NOT EXISTS` / `IF EXISTS` for DDL.
- [ ] Destructive changes have a backup snapshot.
- [ ] Rowcount `RAISE NOTICE` for data migrations.
- [ ] RLS policies set on new tables (`ALTER TABLE … ENABLE ROW LEVEL SECURITY` + at least one policy per action).
- [ ] `GRANT EXECUTE` on new RPCs (to `authenticated` or wider).
- [ ] CHECK constraints widened *before* data updates that need them.
- [ ] TypeScript types and RPC callers updated if output shapes changed.
- [ ] Affected feature spec's migration timeline is updated in the same PR.
- [ ] Post-migration manual steps documented if any.

## 9. Known gaps

- **No CI for migrations.** Nothing tests that the full migration sequence (001 → latest) applies cleanly to an empty Supabase project. Add a GitHub Action that spins up a local Supabase and runs them in order.
- **No dry-run mode.** Postgres has `BEGIN; ROLLBACK;` wrappers but we don't formalize a dry-run step. A helper script could wrap any migration in a transaction + rollback for preview.
- **Duplicate 117 / 136 prefixes** are accepted but fragile. Future tooling that sorts by filename will order them arbitrarily. If automation is added, rename these to `117a` / `117b`, `136a` / `136b` as a separate cleanup migration (`142_rename_duplicate_migrations.sql`?).
- **No migration metadata tracking.** We don't populate `supabase_migrations.schema_migrations`. If we move to `supabase db push`, need to backfill.
- **Base HR schema is missing.** The `hr_employees`, `hr_salary_payments`, etc. CREATE TABLE statements aren't in the migrations folder (applied out-of-band). A new Supabase project can't reach current state from migrations alone. See [hr.md §3](./features/hr.md#3-data-model) and [§19](./features/hr.md#19-known-gaps--open-questions). Consider a `142_hr_base_schema.sql` backfill.
- **No retention for `*_backup_*` tables.** They linger forever. A cleanup job (or a policy to drop backups older than 30 days) would keep the schema tidy.
- **`RAISE NOTICE` output is lost** if you run a migration via `supabase db push`. The dashboard preserves it; the CLI doesn't. Plan accordingly.
