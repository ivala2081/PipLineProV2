import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Shield,
  ShieldCheck,
  Eye,
  Warning,
  Users,
  LockKey,
  Lightning,
  Clock,
  Database,
  ArrowsClockwise,
} from '@phosphor-icons/react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/app/providers/AuthProvider'
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

/* ── Table header style ───────────────────────────────────── */

const TH = 'h-9 px-4 text-xs font-semibold uppercase tracking-wider text-black/40 whitespace-nowrap'

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

          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
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
  const locale = i18n.language === 'tr' ? 'tr-TR' : 'en-US'

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
    enabled: isGod,
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
      for (const row of data || []) {
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
    enabled: isGod,
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
    enabled: isGod,
  })

  /* ── Access denied ── */
  if (!isGod) {
    return (
      <EmptyState
        icon={Shield}
        title={t('security.accessDenied')}
        description={t('security.accessDeniedDescription')}
        className="min-h-[400px]"
      />
    )
  }

  /* ── Split metrics into hero (first 4) and secondary (rest) ── */
  const heroMetrics = metrics?.slice(0, 4) ?? []
  const secondaryMetrics = metrics?.slice(4) ?? []

  const failedCount = failedLogins?.length ?? 0
  const auditCount = godAudit?.length ?? 0

  /* ── Main render ── */
  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-brand/10">
            <ShieldCheck size={20} weight="fill" className="text-brand" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-black">{t('security.title')}</h1>
            <p className="text-sm text-black/50">{t('security.subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-black/30">
          <ArrowsClockwise size={12} />
          {t('security.refreshing')}
        </div>
      </div>

      {/* ── Hero Metrics (4 StatCards) ── */}
      {metricsLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <StatCard key={i} icon={Lightning} label="" value="" isLoading />
          ))}
        </div>
      ) : metricsError || heroMetrics.length === 0 ? (
        <Card padding="compact">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-sm text-black/40">
              <Warning size={16} />
              {t('security.metricsUnavailable')}
            </div>
            {metricsErrorObj && (
              <p className="font-mono text-xs text-red/70">{metricsErrorObj.message}</p>
            )}
          </div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {heroMetrics.map((metric) => {
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

          {/* ── Secondary Metrics (compact row) ── */}
          {secondaryMetrics.length > 0 && (
            <Card padding="compact" className="bg-black/[0.015]">
              <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
                {secondaryMetrics.map((metric) => {
                  const mi = getMetricIcon(metric.metric)
                  const Icon = mi.icon
                  return (
                    <div key={metric.metric} className="flex items-center gap-2">
                      <div
                        className={`flex size-7 items-center justify-center rounded-lg ${mi.bg}`}
                      >
                        <Icon size={13} className={mi.color} />
                      </div>
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-black/35">
                          {metric.metric}
                        </p>
                        <p className="text-sm font-semibold tabular-nums">{metric.value}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}
        </>
      )}

      {/* ── Tabbed Activity Card ── */}
      <Card padding="none">
        <Tabs defaultValue="failed-logins">
          <div className="border-b border-black/[0.06] px-4 pt-4 pb-0">
            <TabsList>
              <TabsTrigger value="failed-logins" className="gap-1.5">
                <Warning size={14} weight="fill" />
                {t('security.tabs.failedLogins')}
                {failedCount > 0 && (
                  <span className="ml-1 inline-flex size-5 items-center justify-center rounded-full bg-red/15 text-[10px] font-bold text-red">
                    {failedCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="audit-log" className="gap-1.5">
                <Eye size={14} />
                {t('security.tabs.auditLog')}
                {auditCount > 0 && (
                  <span className="ml-1 inline-flex size-5 items-center justify-center rounded-full bg-brand/15 text-[10px] font-bold text-brand">
                    {auditCount}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ── Failed Logins Tab ── */}
          <TabsContent value="failed-logins" className="mt-0">
            {failedLoading ? (
              <div className="space-y-2 p-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-10 rounded-lg" />
                ))}
              </div>
            ) : failedCount > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-black/[0.015]">
                      <TableHead className={TH}>{t('security.columns.ipAddress')}</TableHead>
                      <TableHead className={`${TH} text-right`}>
                        {t('security.columns.failedAttempts')}
                      </TableHead>
                      <TableHead className={`${TH} text-right`}>
                        {t('security.columns.lastAttempt')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {failedLogins!.map((item) => (
                      <TableRow key={item.ip_address} className="hover:bg-black/[0.01]">
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
              <div className="py-12 text-center text-sm text-black/35">
                {t('security.noSuspiciousActivity')}
              </div>
            )}
          </TabsContent>

          {/* ── Audit Log Tab ── */}
          <TabsContent value="audit-log" className="mt-0">
            {auditLoading ? (
              <div className="space-y-2 p-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-10 rounded-lg" />
                ))}
              </div>
            ) : auditCount > 0 ? (
              <div className="overflow-x-auto">
                <Table className="min-w-[700px]">
                  <TableHeader>
                    <TableRow className="bg-black/[0.015]">
                      <TableHead className={TH}>{t('security.columns.time')}</TableHead>
                      <TableHead className={TH}>{t('security.columns.user')}</TableHead>
                      <TableHead className={TH}>{t('security.columns.action')}</TableHead>
                      <TableHead className={TH}>{t('security.columns.table')}</TableHead>
                      <TableHead className={`${TH} text-right`}>
                        {t('security.columns.details')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {godAudit!.map((log) => (
                      <TableRow key={log.id} className="hover:bg-black/[0.01]">
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
              <div className="py-12 text-center text-sm text-black/35">
                {t('security.noGodActivity')}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </Card>

      {/* ── Footer note (replaces Security Actions card) ── */}
      <div className="flex items-center gap-2 px-1 text-xs text-black/25">
        <LockKey size={14} />
        <span>
          {t('security.securityActionsNote')}{' '}
          <code className="rounded bg-black/[0.04] px-1 py-0.5 text-[10px]">
            SECURITY_INCIDENT_RESPONSE.md
          </code>
        </span>
      </div>
    </div>
  )
}

export default SecurityDashboard
