import { useState, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CaretDown,
  CaretRight,
  FloppyDisk,
  ArrowCounterClockwise,
  Info,
  SpinnerGap,
} from '@phosphor-icons/react'
import { Tag, Button, Skeleton, EmptyState } from '@ds'
import {
  useRolePermissionsQuery,
  useUpsertRolePermissions,
  type RolePermission,
} from '@/hooks/queries/useRolePermissionsQuery'
import { useToast } from '@/hooks/useToast'

/* ── Constants ───────────────────────────────────────────── */

const ROLES = ['admin', 'manager', 'operation', 'ik'] as const
const ACTIONS = ['select', 'insert', 'update', 'delete'] as const

type Action = (typeof ACTIONS)[number]

const ACTION_CONFIG: Record<
  Action,
  { labelKey: string; variant: TagVariant; activeVariant: TagVariant }
> = {
  select: {
    labelKey: 'security.permissions.actions.select',
    variant: 'default',
    activeVariant: 'blue',
  },
  insert: {
    labelKey: 'security.permissions.actions.insert',
    variant: 'default',
    activeVariant: 'green',
  },
  update: {
    labelKey: 'security.permissions.actions.update',
    variant: 'default',
    activeVariant: 'yellow',
  },
  delete: {
    labelKey: 'security.permissions.actions.delete',
    variant: 'default',
    activeVariant: 'red',
  },
}

type TagVariant =
  | 'default'
  | 'blue'
  | 'green'
  | 'yellow'
  | 'red'
  | 'purple'
  | 'orange'
  | 'cyan'
  | 'mint'
  | 'indigo'

const ROLE_LABELS: Record<string, { labelKey: string; variant: TagVariant }> = {
  admin: { labelKey: 'memberProfile.roles.admin', variant: 'green' },
  manager: { labelKey: 'memberProfile.roles.manager', variant: 'purple' },
  operation: { labelKey: 'memberProfile.roles.operation', variant: 'blue' },
  ik: { labelKey: 'memberProfile.roles.ik', variant: 'orange' },
}

interface ResourceGroup {
  key: string
  labelKey: string
  tables: string[]
}

const PAGE_TABLES = new Set([
  'page:dashboard',
  'page:members',
  'page:ai',
  'page:transfers',
  'page:transfer-fix',
  'page:trash',
  'page:accounting',
  'page:psps',
  'page:hr',
  'page:organizations',
  'page:security',
  'page:audit',
  'page:ib',
])

const RESOURCE_GROUPS: ResourceGroup[] = [
  {
    key: 'pages',
    labelKey: 'security.permissions.groups.pages',
    tables: [
      'page:dashboard',
      'page:members',
      'page:ai',
      'page:transfers',
      'page:transfer-fix',
      'page:trash',
      'page:accounting',
      'page:psps',
      'page:hr',
      'page:organizations',
      'page:security',
      'page:audit',
      'page:ib',
    ],
  },
  {
    key: 'organization',
    labelKey: 'security.permissions.groups.organization',
    tables: ['organizations', 'organization_members', 'organization_invitations'],
  },
  {
    key: 'transfers',
    labelKey: 'security.permissions.groups.transfers',
    tables: ['transfers', 'transfer_audit_log'],
  },
  {
    key: 'psp',
    labelKey: 'security.permissions.groups.psp',
    tables: ['psps', 'psp_commission_rates', 'psp_settlements'],
  },
  {
    key: 'accounting',
    labelKey: 'security.permissions.groups.accounting',
    tables: ['accounting_entries', 'accounting_monthly_config'],
  },
  {
    key: 'hr',
    labelKey: 'security.permissions.groups.hr',
    tables: [
      'hr_employees',
      'hr_employee_documents',
      'hr_bonus_agreements',
      'hr_bonus_payments',
      'hr_attendance',
      'hr_salary_payments',
      'hr_settings',
      'hr_leaves',
      'hr_mt_config',
      'hr_re_config',
    ],
  },
  {
    key: 'ib',
    labelKey: 'security.permissions.groups.ib',
    tables: ['ib_partners', 'ib_referrals', 'ib_commissions', 'ib_payments'],
  },
]

const TABLE_DISPLAY: Record<string, string> = {
  'page:dashboard': 'Dashboard',
  'page:members': 'Members',
  'page:ai': 'AI / Future',
  'page:transfers': 'Transfers',
  'page:accounting': 'Accounting',
  'page:psps': 'PSPs',
  'page:hr': 'HR',
  'page:organizations': 'Organizations',
  'page:security': 'Security',
  'page:audit': 'Audit Log',
  'page:transfer-fix': 'Transfer Fix',
  'page:trash': 'Trash',
  'page:ib': 'IB Management',
  transfers: 'Transfers',
  transfer_audit_log: 'Transfer Audit Log',
  psps: 'PSPs',
  psp_commission_rates: 'PSP Commission Rates',
  psp_settlements: 'PSP Settlements',
  accounting_entries: 'Accounting Entries',
  accounting_monthly_config: 'Accounting Config',
  hr_employees: 'HR Employees',
  hr_employee_documents: 'HR Documents',
  hr_bonus_agreements: 'Bonus Agreements',
  hr_bonus_payments: 'Bonus Payments',
  hr_attendance: 'Attendance',
  hr_salary_payments: 'Salary Payments',
  hr_settings: 'HR Settings',
  hr_leaves: 'Leaves',
  hr_mt_config: 'MT Config',
  hr_re_config: 'RE Config',
  ib_partners: 'IB Partners',
  ib_referrals: 'IB Referrals',
  ib_commissions: 'IB Commissions',
  ib_payments: 'IB Payments',
  organizations: 'Organizations',
  organization_members: 'Org Members',
  organization_invitations: 'Org Invitations',
}

/* ── Helpers ─────────────────────────────────────────────── */

function permKey(table: string, role: string) {
  return `${table}::${role}`
}

function buildPermMap(perms: RolePermission[]): Map<string, RolePermission> {
  const map = new Map<string, RolePermission>()
  for (const p of perms) {
    map.set(permKey(p.table_name, p.role), p)
  }
  return map
}

/* ── Component ───────────────────────────────────────────── */

export function PermissionsTab() {
  const { t } = useTranslation('pages')
  const { toast } = useToast()
  const { data: permissions, isLoading, isError } = useRolePermissionsQuery()
  const upsertMutation = useUpsertRolePermissions()

  // Local edits map — key: "table::role", value: RolePermission
  const [edits, setEdits] = useState<Map<string, RolePermission>>(new Map())
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => new Set(RESOURCE_GROUPS.map((g) => g.key)),
  )

  // Build source map from server data
  const serverMap = useMemo(() => buildPermMap(permissions ?? []), [permissions])

  // Effective permission: local edit overrides server
  const getPermission = useCallback(
    (table: string, role: string): RolePermission | undefined => {
      const key = permKey(table, role)
      return edits.get(key) ?? serverMap.get(key)
    },
    [edits, serverMap],
  )

  // Toggle a single action
  const toggleAction = useCallback(
    (table: string, role: string, action: Action) => {
      const key = permKey(table, role)
      const current = edits.get(key) ?? serverMap.get(key)
      if (!current) return

      const field = `can_${action}` as keyof Pick<
        RolePermission,
        'can_select' | 'can_insert' | 'can_update' | 'can_delete'
      >

      setEdits((prev) => {
        const next = new Map(prev)
        next.set(key, { ...current, [field]: !current[field] })
        return next
      })
    },
    [serverMap, edits],
  )

  // Check if there are unsaved changes
  const isDirty = useMemo(() => {
    for (const [key, edit] of edits) {
      const server = serverMap.get(key)
      if (!server) return true
      if (
        edit.can_select !== server.can_select ||
        edit.can_insert !== server.can_insert ||
        edit.can_update !== server.can_update ||
        edit.can_delete !== server.can_delete
      )
        return true
    }
    return false
  }, [edits, serverMap])

  // Count changes
  const changeCount = useMemo(() => {
    let count = 0
    for (const [key, edit] of edits) {
      const server = serverMap.get(key)
      if (!server) {
        count++
        continue
      }
      if (
        edit.can_select !== server.can_select ||
        edit.can_insert !== server.can_insert ||
        edit.can_update !== server.can_update ||
        edit.can_delete !== server.can_delete
      )
        count++
    }
    return count
  }, [edits, serverMap])

  // Save
  const handleSave = async () => {
    if (!isDirty) return
    const changedPerms: RolePermission[] = []
    for (const [key, edit] of edits) {
      const server = serverMap.get(key)
      if (
        !server ||
        edit.can_select !== server.can_select ||
        edit.can_insert !== server.can_insert ||
        edit.can_update !== server.can_update ||
        edit.can_delete !== server.can_delete
      ) {
        changedPerms.push(edit)
      }
    }
    try {
      await upsertMutation.mutateAsync(changedPerms)
      setEdits(new Map())
      toast({ title: t('security.permissions.saved'), variant: 'success' })
    } catch {
      toast({ title: t('security.permissions.error'), variant: 'error' })
    }
  }

  // Reset
  const handleReset = () => setEdits(new Map())

  // Toggle group
  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div className="space-y-md">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  /* ── Error ── */
  if (isError || !permissions) {
    return <EmptyState icon={Info} title={t('security.permissions.error')} />
  }

  return (
    <div className="space-y-md">
      {/* Role column headers */}
      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          {/* Header row */}
          <div className="mb-sm flex items-center gap-2 px-2">
            <div className="w-[220px] shrink-0 text-xs font-semibold uppercase tracking-wider text-black/40">
              {t('security.permissions.tableHeader', 'Tablo')}
            </div>
            {ROLES.map((role) => (
              <div key={role} className="flex-1 text-center">
                <Tag variant={ROLE_LABELS[role].variant}>{t(ROLE_LABELS[role].labelKey)}</Tag>
              </div>
            ))}
          </div>

          {/* Resource groups */}
          {RESOURCE_GROUPS.map((group) => {
            const expanded = expandedGroups.has(group.key)
            return (
              <div
                key={group.key}
                className="mb-sm overflow-hidden rounded-xl border border-black/10"
              >
                {/* Group header */}
                <button
                  type="button"
                  onClick={() => toggleGroup(group.key)}
                  className="flex w-full items-center gap-sm bg-black/[0.02] px-4 py-2.5 text-left text-sm font-semibold text-black/70 hover:bg-black/[0.04] transition-colors"
                >
                  {expanded ? <CaretDown size={14} /> : <CaretRight size={14} />}
                  {t(group.labelKey)}
                  <span className="ml-1 text-xs font-normal text-black/30">
                    ({group.tables.length})
                  </span>
                </button>

                {/* Table rows */}
                {expanded && (
                  <div className="divide-y divide-black/[0.04] bg-bg1">
                    {group.tables.map((table) => (
                      <div key={table} className="flex items-center gap-2 px-4 py-2.5">
                        {/* Table name */}
                        <div className="w-[204px] shrink-0 truncate text-sm text-black/60">
                          {TABLE_DISPLAY[table] ?? table}
                        </div>

                        {/* Roles */}
                        {ROLES.map((role) => {
                          const perm = getPermission(table, role)
                          if (!perm) return <div key={role} className="flex-1" />

                          return (
                            <div
                              key={role}
                              className="flex flex-1 items-center justify-center gap-1"
                            >
                              {(PAGE_TABLES.has(table) ? (['select'] as Action[]) : ACTIONS).map(
                                (action) => {
                                  const field = `can_${action}` as keyof Pick<
                                    RolePermission,
                                    'can_select' | 'can_insert' | 'can_update' | 'can_delete'
                                  >
                                  const active = perm[field]
                                  const cfg = ACTION_CONFIG[action]
                                  // Prevent admin from losing access to critical pages
                                  const locked =
                                    (table === 'page:security' && role === 'admin') ||
                                    (table === 'page:dashboard' && role === 'admin')

                                  return (
                                    <button
                                      key={action}
                                      type="button"
                                      onClick={() => !locked && toggleAction(table, role, action)}
                                      title={
                                        locked
                                          ? t(
                                              'security.permissions.lockedSecurity',
                                              'Admin her zaman güvenlik sayfasına erişebilir',
                                            )
                                          : t(cfg.labelKey)
                                      }
                                      className={
                                        locked
                                          ? 'cursor-not-allowed opacity-50'
                                          : 'cursor-pointer transition-transform hover:scale-110 active:scale-95'
                                      }
                                    >
                                      <Tag
                                        variant={active ? cfg.activeVariant : 'default'}
                                        className={`min-w-[24px] justify-center select-none ${!active ? 'opacity-20' : ''}`}
                                      >
                                        {PAGE_TABLES.has(table)
                                          ? t('security.permissions.actions.access')
                                          : t(cfg.labelKey)}
                                      </Tag>
                                    </button>
                                  )
                                },
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Floating save bar */}
      {isDirty && (
        <div className="sticky bottom-4 z-10 flex items-center justify-between gap-md rounded-xl border border-black/10 bg-bg1 px-4 py-3 shadow-lg">
          <span className="text-sm text-black/60">
            {changeCount} {t('security.permissions.unsavedChanges')}
          </span>
          <div className="flex items-center gap-sm">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              disabled={upsertMutation.isPending}
            >
              <ArrowCounterClockwise size={14} />
              {t('security.permissions.resetToDefault')}
            </Button>
            <Button size="sm" onClick={handleSave} disabled={upsertMutation.isPending}>
              {upsertMutation.isPending ? (
                <SpinnerGap size={14} className="animate-spin" />
              ) : (
                <FloppyDisk size={14} />
              )}
              {t('security.permissions.save')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
