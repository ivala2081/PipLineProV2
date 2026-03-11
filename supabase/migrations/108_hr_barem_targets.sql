-- Barem targets: HR sets count / volume targets per employee per period
-- The system auto-calculates whether the target is met (replaces manual toggle)

create table if not exists hr_barem_targets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  employee_id uuid not null references hr_employees(id) on delete cascade,
  period text not null,               -- e.g. "Mart 2026"
  count_target int,                   -- nullable: if set, employee must reach this many deposits
  volume_target numeric,              -- nullable: if set, employee must reach this USD volume
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, employee_id, period)
);

alter table hr_barem_targets enable row level security;

-- SELECT: org members + god
create policy "org members can view barem targets"
  on hr_barem_targets for select
  using (
    (select private.is_god())
    OR organization_id in (
      select organization_id from organization_members where user_id = auth.uid()
    )
  );

-- INSERT: managers, admin, god, ik
create policy "managers can insert barem targets"
  on hr_barem_targets for insert
  with check (
    (select private.is_god())
    OR organization_id in (
      select organization_id from organization_members
      where user_id = auth.uid() and role in ('admin', 'god', 'manager', 'ik')
    )
  );

-- UPDATE: managers, admin, god, ik
create policy "managers can update barem targets"
  on hr_barem_targets for update
  using (
    (select private.is_god())
    OR organization_id in (
      select organization_id from organization_members
      where user_id = auth.uid() and role in ('admin', 'god', 'manager', 'ik')
    )
  );

-- DELETE: managers, admin, god, ik
create policy "managers can delete barem targets"
  on hr_barem_targets for delete
  using (
    (select private.is_god())
    OR organization_id in (
      select organization_id from organization_members
      where user_id = auth.uid() and role in ('admin', 'god', 'manager', 'ik')
    )
  );
