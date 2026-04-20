# Migrations

This folder holds every SQL migration for the PipLinePro Supabase project. Migrations are currently pasted into the Supabase SQL Editor by hand — there is no automated deploy step yet.

## Numbering convention

- `NNN_short_name.sql` — primary migration; `NNN` is a zero-padded 3-digit sequence.
- `NNNb_short_name.sql` — intentional minor follow-up to `NNN`. Applied **after** the base `NNN` file. Currently used at `045b` and `069b`.
- Migrations are applied in **lexicographic file-name order** (what `ls` prints).

The next new migration should take the **next unused number** — at time of writing that is `136`.

## Known collision at `117`

There are two separate migrations that share number `117`:

| File | Author mtime |
| --- | --- |
| `117_transfer_fix_trash_permissions.sql` | 2026-03-31 17:57 |
| `117_ib_management.sql` | 2026-03-31 19:34 |

By mtime, `117_transfer_fix_trash_permissions.sql` was authored first. If both have already been applied to production, **do not rename** — renaming changes the filename a future migration tool would use to detect "already applied" state and could cause re-application. The safer rule going forward:

- Treat the pair as a known quirk.
- Do not create a new migration with number `117`.
- When the next person adds a migration, pick `136+`.

If you ever move this project to `supabase migration up` / `supabase db push`, the CLI keyed migration table is built from filenames, so the collision will need to be resolved before automated runs. The cleanest path at that point:

1. Confirm both `117_*` files are already applied in production (check `supabase_migrations.schema_migrations`).
2. Move one of them to `136_*` **and** insert a manual row into `supabase_migrations.schema_migrations` for the new name so the CLI does not try to re-apply it.

Until that move to CLI, leave the files as they are.

## Applying migrations (current manual flow)

1. Open the Supabase SQL Editor for the correct project.
2. Apply unapplied files in lexicographic order.
3. Track what has been applied outside this repo (deployment notes / ops log).

## Post-migration manual steps (one-time)

- Enable the `custom_access_token_hook` JWT hook in Dashboard → Authentication → Hooks.
- Promote the god admin: `UPDATE profiles SET system_role = 'god' WHERE id = '<uuid>';`
- Have the promoted user sign out and in to refresh the JWT.
