-- Marketing barem failures: HR manually marks employees who failed the barem threshold
-- When marked, the employee receives no bonus for that period.
create table if not exists hr_mt_barem_failures (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  employee_id uuid not null references hr_employees(id) on delete cascade,
  period text not null, -- e.g. "Mart 2026"
  created_at timestamptz not null default now(),
  unique (organization_id, employee_id, period)
);

-- RLS
alter table hr_mt_barem_failures enable row level security;

create policy "org members can view barem failures"
  on hr_mt_barem_failures for select
  using (organization_id in (
    select organization_id from organization_members where user_id = auth.uid()
  ));

create policy "managers can manage barem failures"
  on hr_mt_barem_failures for all
  using (organization_id in (
    select organization_id from organization_members
    where user_id = auth.uid() and role in ('admin', 'god', 'manager')
  ));
