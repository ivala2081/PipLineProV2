import { useTranslation } from 'react-i18next'
import { ArrowsClockwise, CheckCircle, WarningCircle, Clock } from '@phosphor-icons/react'
import { Button, Card, Tag } from '@ds'
import {
  useSyncTransactionsMutation,
  useUniPaymentSyncStatus,
} from '@/hooks/queries/useUniPaymentQuery'
import { useToast } from '@/hooks/useToast'

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

interface Props {
  pspId: string
  isAdmin: boolean
}

export function UniPaymentSyncTab({ pspId, isAdmin }: Props) {
  const { t } = useTranslation('pages')
  const { toast } = useToast()
  const { data: syncLog } = useUniPaymentSyncStatus(pspId)
  const syncMutation = useSyncTransactionsMutation(pspId)

  const handleSync = async () => {
    try {
      const result = await syncMutation.mutateAsync()
      toast({
        title: t('psps.sync.syncSuccess', { count: result.new_count }),
        variant: 'success',
      })
    } catch (err) {
      toast({
        title: t('psps.sync.syncError', { error: (err as Error).message }),
        variant: 'error',
      })
    }
  }

  const status = syncLog?.sync_status ?? 'idle'
  const isRunning = status === 'running' || syncMutation.isPending

  return (
    <div className="space-y-lg">
      {/* Sync Status Card */}
      <Card className="border border-black/10 bg-bg1">
        <div className="flex items-center justify-between">
          <div className="space-y-sm">
            <h3 className="text-sm font-semibold">{t('psps.sync.title')}</h3>

            {/* Status Badge */}
            <div className="flex items-center gap-sm">
              <span className="text-xs text-black/40">{t('psps.sync.status')}:</span>
              {status === 'idle' && (
                <Tag variant="green" className="text-[10px]">
                  <CheckCircle size={10} className="mr-0.5" />
                  {t('psps.sync.idle')}
                </Tag>
              )}
              {status === 'running' && (
                <Tag variant="orange" className="text-[10px]">
                  <ArrowsClockwise size={10} className="mr-0.5 animate-spin" />
                  {t('psps.sync.running')}
                </Tag>
              )}
              {status === 'error' && (
                <Tag variant="red" className="text-[10px]">
                  <WarningCircle size={10} className="mr-0.5" />
                  {t('psps.sync.error')}
                </Tag>
              )}
            </div>

            {/* Last Sync Time */}
            <div className="flex items-center gap-xs text-xs text-black/40">
              <Clock size={12} />
              <span>{t('psps.sync.lastSync')}:</span>
              <span className="font-medium text-black/60">
                {syncLog?.last_synced_at
                  ? formatDateTime(syncLog.last_synced_at)
                  : t('psps.sync.neverSynced')}
              </span>
            </div>
          </div>

          {/* Sync Button */}
          {isAdmin && (
            <Button size="sm" onClick={handleSync} disabled={isRunning}>
              <ArrowsClockwise
                size={14}
                weight="bold"
                className={isRunning ? 'mr-1 animate-spin' : 'mr-1'}
              />
              {isRunning ? t('psps.sync.syncing') : t('psps.sync.syncNow')}
            </Button>
          )}
        </div>
      </Card>

      {/* Error Display */}
      {syncLog?.error_message && (
        <Card className="border border-red-200 bg-red-50">
          <div className="flex items-start gap-sm">
            <WarningCircle size={16} className="mt-0.5 shrink-0 text-red-500" />
            <div>
              <p className="text-sm font-medium text-red-700">{t('psps.sync.error')}</p>
              <p className="mt-1 text-xs text-red-600">{syncLog.error_message}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Info */}
      <Card className="border border-black/5 bg-bg1/50">
        <div className="space-y-xs text-xs text-black/40">
          <p>
            Senkronizasyon, UniPayment hesabındaki tüm işlemleri tarar ve yeni olanları sistemdeki
            transfers tablosuna ekler.
          </p>
          <p>
            Daha önce senkronize edilmiş işlemler tekrar eklenmez (external_transaction_id ile
            kontrol edilir).
          </p>
        </div>
      </Card>
    </div>
  )
}
