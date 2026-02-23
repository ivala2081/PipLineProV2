import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowsClockwise,
  CheckCircle,
  WarningCircle,
  MinusCircle,
  Key,
  Clock,
  Lightning,
} from '@phosphor-icons/react'
import { Card, Tag, Button, Skeleton } from '@ds'
import { useApiHealthQuery } from '@/hooks/queries/useApiHealthQuery'
import type { ApiHealthResult } from '@/lib/apiHealthApi'
import { UpdateKeyDialog } from './UpdateKeyDialog'

/* ── Service display config ──────────────────────────────── */

interface ServiceMeta {
  label: string
  affectedKey: string
}

const SERVICE_META: Record<string, ServiceMeta> = {
  tatum: { label: 'Tatum', affectedKey: 'security.api.affected.tatum' },
  exchangeRate: { label: 'Exchange Rate', affectedKey: 'security.api.affected.exchangeRate' },
  gemini: { label: 'Gemini AI', affectedKey: 'security.api.affected.gemini' },
  resend: { label: 'Resend', affectedKey: 'security.api.affected.resend' },
  uniPayment: { label: 'UniPayment', affectedKey: 'security.api.affected.uniPayment' },
}

/* ── Status helpers ─────────────────────────────────────── */

function getStatusTag(
  status: ApiHealthResult['status'],
  t: (key: string) => string,
) {
  switch (status) {
    case 'healthy':
      return (
        <Tag variant="green">
          <CheckCircle size={14} weight="fill" className="mr-1" />
          {t('security.api.status.healthy')}
        </Tag>
      )
    case 'error':
      return (
        <Tag variant="red">
          <WarningCircle size={14} weight="fill" className="mr-1" />
          {t('security.api.status.error')}
        </Tag>
      )
    case 'not_configured':
      return (
        <Tag variant="orange">
          <MinusCircle size={14} weight="fill" className="mr-1" />
          {t('security.api.status.notConfigured')}
        </Tag>
      )
  }
}

function getErrorLabel(
  errorType: ApiHealthResult['errorType'],
  t: (key: string) => string,
): string | null {
  switch (errorType) {
    case 'invalid_key':
      return t('security.api.errorType.invalidKey')
    case 'rate_limit':
      return t('security.api.errorType.rateLimit')
    case 'server_error':
      return t('security.api.errorType.serverError')
    case 'network_error':
      return t('security.api.errorType.networkError')
    default:
      return null
  }
}

/* ── Service Card ───────────────────────────────────────── */

function ServiceCard({
  result,
  onUpdate,
}: {
  result: ApiHealthResult
  onUpdate: () => void
}) {
  const { t } = useTranslation('pages')
  const meta = SERVICE_META[result.service]
  const errorLabel = result.errorType ? getErrorLabel(result.errorType, t) : null

  return (
    <Card padding="compact" className="flex flex-col justify-between gap-sm">
      <div className="space-y-sm">
        {/* Header: name + status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">{meta?.label ?? result.service}</span>
          {getStatusTag(result.status, t)}
        </div>

        {/* Key info */}
        {result.keyMasked && (
          <div className="flex items-center gap-xs text-xs text-black/40">
            <Key size={12} />
            <span className="font-mono">{result.keyMasked}</span>
          </div>
        )}

        {/* Response time */}
        {result.status === 'healthy' && result.responseTimeMs > 0 && (
          <div className="flex items-center gap-xs text-xs text-black/40">
            <Clock size={12} />
            <span>{result.responseTimeMs}ms</span>
          </div>
        )}

        {/* Error info */}
        {errorLabel && (
          <p className="text-xs font-medium text-red/80">{errorLabel}</p>
        )}
        {result.errorMessage && (
          <p
            className="line-clamp-2 text-xs text-black/40"
            title={result.errorMessage}
          >
            {result.errorMessage}
          </p>
        )}

        {/* Affected pages */}
        <p className="text-xs text-black/40">
          {t(meta?.affectedKey ?? '')}
        </p>
      </div>

      {/* Update button */}
      <Button
        variant="outline"
        size="sm"
        className="mt-auto w-full"
        onClick={onUpdate}
      >
        <Key size={14} className="mr-1" />
        {t('security.api.updateKey')}
      </Button>
    </Card>
  )
}

/* ── Loading skeleton ───────────────────────────────────── */

function ServiceCardSkeleton() {
  return (
    <Card padding="compact" className="space-y-sm">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24 rounded-md" />
        <Skeleton className="h-5 w-16 rounded-md" />
      </div>
      <Skeleton className="h-3 w-20 rounded-md" />
      <Skeleton className="h-3 w-32 rounded-md" />
      <Skeleton className="h-8 w-full rounded-md" />
    </Card>
  )
}

/* ── Main Tab Component ─────────────────────────────────── */

export function ApiIntegrationsTab() {
  const { t, i18n } = useTranslation('pages')
  const locale = i18n.language === 'tr' ? 'tr-TR' : 'en-US'

  const [enabled, setEnabled] = useState(false)
  const { data: results, isLoading, isFetching, dataUpdatedAt } = useApiHealthQuery(enabled)

  const [editService, setEditService] = useState<string | null>(null)
  const editMeta = editService ? SERVICE_META[editService] : null

  function handleCheck() {
    setEnabled(true)
  }

  return (
    <div className="space-y-md">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-sm">
        <Button onClick={handleCheck} disabled={isFetching}>
          <ArrowsClockwise
            size={16}
            className={isFetching ? 'animate-spin' : ''}
          />
          {t('security.api.checkHealth')}
        </Button>

        {dataUpdatedAt > 0 && (
          <span className="text-xs text-black/40">
            {t('security.api.lastCheck')}{' '}
            {new Date(dataUpdatedAt).toLocaleTimeString(locale)}
          </span>
        )}
      </div>

      {/* Cards grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <ServiceCardSkeleton key={i} />
          ))}
        </div>
      ) : results && results.length > 0 ? (
        <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3">
          {results.map((r) => (
            <ServiceCard
              key={r.service}
              result={r}
              onUpdate={() => setEditService(r.service)}
            />
          ))}
        </div>
      ) : !enabled ? (
        <div className="flex flex-col items-center justify-center gap-sm rounded-xl border border-black/10 bg-bg1 py-20">
          <div className="flex size-12 items-center justify-center rounded-full bg-black/[0.04]">
            <Lightning size={20} className="text-black/30" />
          </div>
          <p className="text-sm text-black/60">{t('security.api.emptyState')}</p>
        </div>
      ) : null}

      {/* Warning note */}
      {results && results.length > 0 && (
        <div className="rounded-lg bg-orange/10 px-4 py-2.5 text-xs text-orange">
          {t('security.api.coldStartNote')}
        </div>
      )}

      {/* Update key dialog */}
      <UpdateKeyDialog
        open={!!editService}
        onOpenChange={(open) => {
          if (!open) setEditService(null)
        }}
        service={editService ?? ''}
        serviceName={editMeta?.label ?? ''}
      />
    </div>
  )
}
