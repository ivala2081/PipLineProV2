import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  CreditCard,
  Plus,
  Coins,
  ArrowDown,
  ArrowUp,
  Clock,
} from '@phosphor-icons/react'
import {
  Card,
  Button,
  Badge,
  StatCard,
  EmptyState,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Label,
} from '@ds'
import { useAuth } from '@/app/providers/AuthProvider'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { usePspDashboardQuery } from '@/hooks/queries/usePspDashboardQuery'
import { useLookupMutation } from '@/hooks/queries/useLookupMutation'

function formatCurrency(value: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function PspsPage() {
  const { t } = useTranslation('pages')
  const navigate = useNavigate()
  const { isGod } = useAuth()
  const { membership } = useOrganization()
  const isAdmin = isGod || membership?.role === 'admin'

  const { psps, totals, isLoading } = usePspDashboardQuery()
  const pspMutation = useLookupMutation('psps')

  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newRate, setNewRate] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleAddPsp = async () => {
    if (!newName.trim() || !newRate) return
    setIsSubmitting(true)
    try {
      const rateDecimal = Number(newRate) / 100
      await pspMutation.createItem({
        name: newName.trim(),
        commission_rate: rateDecimal,
      })
      setAddDialogOpen(false)
      setNewName('')
      setNewRate('')
    } catch {
      // Error handled by mutation
    } finally {
      setIsSubmitting(false)
    }
  }

  const hasPsps = psps.length > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t('psps.title')}</h1>
          <p className="mt-1 text-sm text-black/60">{t('psps.subtitle')}</p>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => setAddDialogOpen(true)}>
            <Plus size={16} weight="bold" className="mr-1.5" />
            {t('psps.addPsp')}
          </Button>
        )}
      </div>

      {/* Summary Stats */}
      {hasPsps && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            icon={Coins}
            iconBg="bg-amber-100"
            iconColor="text-amber-600"
            label={t('psps.stats.outstanding')}
            value={formatCurrency(totals.outstanding)}
            isLoading={isLoading}
          />
          <StatCard
            icon={ArrowDown}
            iconBg="bg-green-100"
            iconColor="text-green-600"
            label={t('psps.stats.settlements')}
            value={formatCurrency(totals.settlements)}
            isLoading={isLoading}
          />
          <StatCard
            icon={ArrowUp}
            iconBg="bg-blue-100"
            iconColor="text-blue-600"
            label={t('psps.stats.deposits')}
            value={formatCurrency(totals.deposits)}
            isLoading={isLoading}
          />
          <StatCard
            icon={CreditCard}
            iconBg="bg-purple-100"
            iconColor="text-purple-600"
            label={t('psps.stats.commission')}
            value={formatCurrency(totals.commission)}
            isLoading={isLoading}
          />
        </div>
      )}

      {/* PSP Cards */}
      {!isLoading && !hasPsps ? (
        <EmptyState
          icon={CreditCard}
          title={t('psps.noPsps')}
          description={t('psps.noPspsDesc')}
          action={
            isAdmin ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAddDialogOpen(true)}
              >
                <Plus size={14} weight="bold" className="mr-1" />
                {t('psps.addPsp')}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <Card
                  key={i}
                  padding="default"
                  className="animate-pulse border border-black/10 bg-bg1"
                >
                  <div className="h-24" />
                </Card>
              ))
            : psps.map((psp) => (
                <Card
                  key={psp.psp_id}
                  padding="default"
                  className="cursor-pointer border border-black/10 bg-bg1 transition-shadow hover:shadow-md"
                  onClick={() => navigate(`/psps/${psp.psp_id}`)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-black/5">
                        <CreditCard size={18} className="text-black/40" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{psp.psp_name}</p>
                        <p className="text-xs text-black/50">
                          {t('psps.card.commission')}:{' '}
                          {(psp.commission_rate * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={psp.is_active ? 'default' : 'secondary'}
                    >
                      {psp.is_active
                        ? t('psps.card.active')
                        : t('psps.card.inactive')}
                    </Badge>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-black/40">
                        {t('psps.card.outstanding')}
                      </p>
                      <p
                        className={`text-sm font-semibold tabular-nums ${psp.balance > 0 ? 'text-amber-600' : 'text-green-600'}`}
                      >
                        {formatCurrency(psp.balance)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-black/40">
                        {t('psps.card.lastSettlement')}
                      </p>
                      <p className="flex items-center gap-1 text-sm text-black/60">
                        {psp.last_settlement_date ? (
                          <>
                            <Clock size={12} />
                            {psp.last_settlement_date}
                          </>
                        ) : (
                          <span className="text-xs text-black/30">
                            {t('psps.card.noSettlement')}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
        </div>
      )}

      {/* Add PSP Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('psps.addPsp')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t('psps.columns.name')}</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="PSP"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>{t('psps.card.commission')} (%)</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
                placeholder="3.5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddDialogOpen(false)}
              disabled={isSubmitting}
            >
              {t('psps.settlement.cancel')}
            </Button>
            <Button
              onClick={handleAddPsp}
              disabled={!newName.trim() || !newRate || isSubmitting}
            >
              {isSubmitting ? t('psps.settlement.saving') : t('psps.settlement.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
