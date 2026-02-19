import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Shield,
  Eye,
  Warning,
  Users,
  LockKey,
  Lightning,
  Clock,
  Database,
} from '@phosphor-icons/react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/app/providers/AuthProvider'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { canManageOrg } from '@/lib/roles'
import {
  Card,
  StatCard,
  Tag,
  EmptyState,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Skeleton,
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@ds'

/* ── Types ────────────────────────────────────────────────── */

interface SecurityMetric {
  metric: string
  value: string
}

interface GodAuditLog {
  id: string
  god_email: string
  action: string
  table_name: string
  record_id: string | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  created_at: string
}

interface FailedLoginGroup {
  ip_address: string
  failed_attempts: number
  last_attempt: string
}

/* ── Metric icon mapping ──────────────────────────────────── */

const METRIC_ICONS: Record<string, { icon: typeof Shield; bg: string; color: string }> = {
  default: { icon: Lightning, bg: 'bg-blue/20', color: 'text-blue' },
  users: { icon: Users, bg: 'bg-green/20', color: 'text-green' },
  logins: { icon: LockKey, bg: 'bg-indigo/20', color: 'text-indigo' },
  sessions: { icon: Clock, bg: 'bg-cyan/20', color: 'text-cyan' },
  tables: { icon: Database, bg: 'bg-purple/20', color: 'text-purple' },
  policies: { icon: Shield, bg: 'bg-mint/20', color: 'text-mint' },
  rls: { icon: Shield, bg: 'bg-orange/20', color: 'text-orange' },
  audit: { icon: Eye, bg: 'bg-yellow/20', color: 'text-yellow' },
}

function getMetricIcon(metricName: string) {
  const lower = metricName.toLowerCase()
  for (const [key, value] of Object.entries(METRIC_ICONS)) {
    if (key !== 'default' && lower.includes(key)) return value
  }
  return METRIC_ICONS.default
}

/* ── Action tag color ─────────────────────────────────────── */

function getActionVariant(action: string): 'red' | 'yellow' | 'green' | 'blue' | 'default' {
  const a = action.toLowerCase()
  if (a.includes('delete') || a.includes('drop') || a.includes('remove')) return 'red'
  if (a.includes('update') || a.includes('alter') || a.includes('modify')) return 'yellow'
  if (a.includes('insert') || a.includes('create') || a.includes('add')) return 'green'
  if (a.includes('select') || a.includes('read') || a.includes('view')) return 'blue'
  return 'default'
}

/* ── Severity tag ─────────────────────────────────────────── */

function getSeverityVariant(attempts: number): 'red' | 'orange' | 'yellow' {
  if (attempts > 50) return 'red'
  if (attempts > 20) return 'orange'
  return 'yellow'
}

/* ── Table header style (matches members/transfers) ───────── */

const TH = 'h-10 px-4 text-xs font-semibold uppercase tracking-wider text-black/40'

/* ── Audit Detail Dialog ──────────────────────────────────── */

function AuditDetailButton({ log }: { log: GodAuditLog }) {
  const { t, i18n } = useTranslation('pages')
  const [open, setOpen] = useState(false)
  const locale = i18n.language === 'tr' ? 'tr-TR' : 'en-US'

  if (!log.old_values && !log.new_values) return null

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-xs text-brand"
        onClick={() => setOpen(true)}
      >
        {t('security.columns.view')}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>{t('security.dialog.title')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-sm text-sm">
            <div className="flex flex-wrap items-center gap-sm">
              <Tag variant={getActionVariant(log.action)}>{log.action}</Tag>
              <span className="font-mono text-xs text-black/50">{log.table_name}</span>
              <span className="text-xs text-black/30">
                {new Date(log.created_at).toLocaleString(locale)}
              </span>
            </div>

            {log.old_values && (
              <div>
                <p className="mb-1 text-xs font-semibold text-black/40">
                  {t('security.dialog.oldValues')}
                </p>
                <pre className="max-h-60 overflow-auto rounded-xl bg-black/[0.03] p-3 text-xs text-black/60">
                  {JSON.stringify(log.old_values, null, 2)}
                </pre>
              </div>
            )}

            {log.new_values && (
              <div>
                <p className="mb-1 text-xs font-semibold text-black/40">
                  {t('security.dialog.newValues')}
                </p>
                <pre className="max-h-60 overflow-auto rounded-xl bg-black/[0.03] p-3 text-xs text-black/60">
                  {JSON.stringify(log.new_values, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

/* ── Page Component ─────────────────────────────────────────── */

export function SecurityDashboard() {
  const { t, i18n } = useTranslation('pages')
  const { isGod } = useAuth()
  const { membership } = useOrganization()
  const canAccess = isGod || canManageOrg(membership?.role)
  const locale = i18n.language === 'tr' ? 'tr-TR' : 'en-US'

  const [activeTab, setActiveTab] = useState('overview')

  const {
    data: metrics,
    isLoading: metricsLoading,
    isError: metricsError,
    error: metricsErrorObj,
  } = useQuery({
    queryKey: ['security', 'metrics'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_security_metrics')
      if (error) throw new Error(error.message)
      return (data as SecurityMetric[]) ?? []
    },
    enabled: canAccess,
    refetchInterval: 30000,
    retry: 1,
  })

  const { data: failedLogins, isLoading: failedLoading } = useQuery({
    queryKey: ['security', 'failed-logins'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('login_attempts')
        .select('ip_address, created_at')
        .eq('success', false)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })

      if (error) throw error

      const grouped = new Map<string, { count: number; lastAttempt: string }>()
      const rows = (data || []) as { ip_address: string | null; created_at: string }[]
      for (const row of rows) {
        const existing = grouped.get(row.ip_address || 'unknown')
        if (existing) {
          existing.count++
          if (row.created_at > existing.lastAttempt) {
            existing.lastAttempt = row.created_at
          }
        } else {
          grouped.set(row.ip_address || 'unknown', {
            count: 1,
            lastAttempt: row.created_at,
          })
        }
      }

      return Array.from(grouped.entries())
        .map(([ip, info]) => ({
          ip_address: ip,
          failed_attempts: info.count,
          last_attempt: info.lastAttempt,
        }))
        .filter((item) => item.failed_attempts > 5)
        .sort((a, b) => b.failed_attempts - a.failed_attempts)
        .slice(0, 10) as FailedLoginGroup[]
    },
    enabled: canAccess,
  })

  const { data: godAudit, isLoading: auditLoading } = useQuery({
    queryKey: ['security', 'god-audit'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('god_audit_log')
        .select('*')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      return data as GodAuditLog[]
    },
    enabled: canAccess,
  })

  /* ── Access denied ── */
  if (!canAccess) {
    return (
      <EmptyState
        icon={Shield}
        title={t('security.accessDenied')}
        description={t('security.accessDeniedDescription')}
        className="min-h-[400px]"
      />
    )
  }

  const failedCount = failedLogins?.length ?? 0
  const auditCount = godAudit?.length ?? 0

  return (
    <div className="space-y-lg">
      {/* ── Header (standard pattern: matches transfers, accounting, psps) ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t('security.title')}</h1>
          <p className="mt-1 text-sm text-black/60">{t('security.subtitle')}</p>
        </div>
      </div>

      {/* ── Tabs (page-level, like accounting/transfers) ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">{t('security.tabs.overview')}</TabsTrigger>
          <TabsTrigger value="failed-logins">{t('security.tabs.failedLogins')}</TabsTrigger>
          <TabsTrigger value="audit-log">{t('security.tabs.auditLog')}</TabsTrigger>
        </TabsList>

        {/* ── Overview Tab ── */}
        <TabsContent value="overview">
          {metricsLoading ? (
            <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(8)].map((_, i) => (
                <StatCard key={i} icon={Lightning} label="" value="" isLoading />
              ))}
            </div>
          ) : metricsError || !metrics?.length ? (
            <Card padding="compact">
              <div className="flex flex-col gap-xs">
                <div className="flex items-center gap-sm text-sm text-black/40">
                  <Warning size={16} />
                  {t('security.metricsUnavailable')}
                </div>
                {metricsErrorObj && (
                  <p className="font-mono text-xs text-red/70">{metricsErrorObj.message}</p>
                )}
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-4">
              {metrics.map((metric) => {
                const mi = getMetricIcon(metric.metric)
                return (
                  <StatCard
                    key={metric.metric}
                    icon={mi.icon}
                    iconBg={mi.bg}
                    iconColor={mi.color}
                    label={metric.metric}
                    value={metric.value}
                  />
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Failed Logins Tab ── */}
        <TabsContent value="failed-logins">
          {failedLoading ? (
            <div className="overflow-hidden rounded-xl border border-black/10">
              <div className="bg-black/[0.015] px-4 py-3">
                <Skeleton className="h-4 w-48 rounded-md" />
              </div>
              <div className="divide-y divide-black/[0.04]">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-4 py-3.5">
                    <Skeleton className="h-4 w-32 rounded-md" />
                    <Skeleton className="ml-auto h-5 w-12 rounded-md" />
                    <Skeleton className="h-4 w-36 rounded-md" />
                  </div>
                ))}
              </div>
            </div>
          ) : failedCount > 0 ? (
            <div className="overflow-hidden rounded-xl border border-black/10">
              <Table>
                <TableHeader>
                  <TableRow className="bg-black/[0.015] hover:bg-black/[0.015]">
                    <TableHead className={TH}>{t('security.columns.ipAddress')}</TableHead>
                    <TableHead className={`${TH} text-right`}>
                      {t('security.columns.failedAttempts')}
                    </TableHead>
                    <TableHead className={`${TH} text-right`}>
                      {t('security.columns.lastAttempt')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-black/[0.04]">
                  {failedLogins!.map((item) => (
                    <TableRow key={item.ip_address}>
                      <TableCell className="px-4 py-3 font-mono text-sm">
                        {item.ip_address}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <Tag variant={getSeverityVariant(item.failed_attempts)}>
                          {item.failed_attempts}
                        </Tag>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right text-sm text-black/50">
                        {new Date(item.last_attempt).toLocaleString(locale)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-sm rounded-xl border border-black/10 bg-bg1 py-20">
              <div className="flex size-12 items-center justify-center rounded-full bg-black/[0.04]">
                <Shield size={20} className="text-black/30" />
              </div>
              <p className="text-sm text-black/60">{t('security.noSuspiciousActivity')}</p>
            </div>
          )}
        </TabsContent>

        {/* ── Audit Log Tab ── */}
        <TabsContent value="audit-log">
          {auditLoading ? (
            <div className="overflow-hidden rounded-xl border border-black/10">
              <div className="bg-black/[0.015] px-4 py-3">
                <Skeleton className="h-4 w-48 rounded-md" />
              </div>
              <div className="divide-y divide-black/[0.04]">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-4 py-3.5">
                    <Skeleton className="h-4 w-28 rounded-md" />
                    <Skeleton className="h-4 w-32 rounded-md" />
                    <Skeleton className="h-5 w-16 rounded-md" />
                    <Skeleton className="h-4 w-24 rounded-md" />
                    <Skeleton className="ml-auto h-6 w-14 rounded-md" />
                  </div>
                ))}
              </div>
            </div>
          ) : auditCount > 0 ? (
            <div className="overflow-hidden rounded-xl border border-black/10">
              <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow className="bg-black/[0.015] hover:bg-black/[0.015]">
                    <TableHead className={TH}>{t('security.columns.time')}</TableHead>
                    <TableHead className={TH}>{t('security.columns.user')}</TableHead>
                    <TableHead className={TH}>{t('security.columns.action')}</TableHead>
                    <TableHead className={TH}>{t('security.columns.table')}</TableHead>
                    <TableHead className={`${TH} text-right`}>
                      {t('security.columns.details')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-black/[0.04]">
                  {godAudit!.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap px-4 py-3 text-sm text-black/50">
                        {new Date(log.created_at).toLocaleString(locale)}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm">{log.god_email}</TableCell>
                      <TableCell className="px-4 py-3">
                        <Tag variant={getActionVariant(log.action)}>{log.action}</Tag>
                      </TableCell>
                      <TableCell className="px-4 py-3 font-mono text-sm text-black/50">
                        {log.table_name}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <AuditDetailButton log={log} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-sm rounded-xl border border-black/10 bg-bg1 py-20">
              <div className="flex size-12 items-center justify-center rounded-full bg-black/[0.04]">
                <Eye size={20} className="text-black/30" />
              </div>
              <p className="text-sm text-black/60">{t('security.noGodActivity')}</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default SecurityDashboard
