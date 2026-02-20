import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { CreditCard, Plus, Clock, CaretRight } from '@phosphor-icons/react'
import {
  Card,
  Button,
  Tag,
  EmptyState,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Label,
  PageHeader,
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
  const isAdmin = isGod || membership?.role === 'admin' || membership?.role === 'manager'

  const { psps, isLoading } = usePspDashboardQuery()
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
    <div className="space-y-lg">
      {/* Header */}
      <PageHeader
        title={t('psps.title')}
        subtitle={t('psps.subtitle')}
        actions={
          isAdmin ? (
            <Button size="sm" onClick={() => setAddDialogOpen(true)}>
              <Plus size={16} weight="bold" />
              {t('psps.addPsp')}
            </Button>
          ) : undefined
        }
      />

      {/* PSP Cards */}
      {!isLoading && !hasPsps ? (
        <EmptyState
          icon={CreditCard}
          title={t('psps.noPsps')}
          description={t('psps.noPspsDesc')}
          action={
            isAdmin ? (
              <Button size="sm" variant="outline" onClick={() => setAddDialogOpen(true)}>
                <Plus size={14} weight="bold" className="mr-1" />
                {t('psps.addPsp')}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-md sm:grid-cols-2 lg:grid-cols-3">
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <Card
                  key={i}
                  padding="none"
                  className="animate-pulse border border-black/10 bg-bg1"
                >
                  <div className="h-28" />
                </Card>
              ))
            : psps.map((psp) => {
                const accentColor = !psp.is_active
                  ? 'bg-black/20'
                  : psp.is_internal
                    ? 'bg-blue-400'
                    : psp.balance > 0
                      ? 'bg-amber-500'
                      : psp.balance < 0
                        ? 'bg-red-500'
                        : 'bg-green-500'

                return (
                  <Card
                    key={psp.psp_id}
                    padding="none"
                    className={`group cursor-pointer overflow-hidden border border-black/10 bg-bg1 transition-all hover:border-black/20 hover:shadow-md ${
                      !psp.is_active ? 'opacity-60' : ''
                    }`}
                    onClick={() => navigate(`/psps/${psp.psp_id}`)}
                  >
                    <div className="flex">
                      {/* Left accent bar */}
                      <div className={`w-1 shrink-0 ${accentColor}`} />

                      <div className="flex flex-1 flex-col gap-sm p-md">
                        {/* Top row: name + tags + arrow */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <p className="text-sm font-semibold">{psp.psp_name}</p>
                            <Tag variant={psp.is_active ? 'green' : 'red'} className="text-[10px]">
                              {psp.is_active ? t('psps.card.active') : t('psps.card.inactive')}
                            </Tag>
                            {psp.is_internal && (
                              <Tag variant="purple" className="text-[10px]">
                                {t('psps.settings.internalTag')}
                              </Tag>
                            )}
                          </div>
                          <CaretRight
                            size={14}
                            weight="bold"
                            className="text-black/15 transition-all group-hover:translate-x-0.5 group-hover:text-black/40"
                          />
                        </div>

                        {/* Balance — the single key metric */}
                        <div className="flex items-baseline justify-between">
                          <p
                            className={`text-xl font-bold tabular-nums ${
                              !psp.is_active
                                ? 'text-black/40'
                                : psp.balance > 0
                                  ? 'text-amber-600'
                                  : psp.balance < 0
                                    ? 'text-red-600'
                                    : 'text-green-600'
                            }`}
                          >
                            {formatCurrency(psp.balance)}
                          </p>
                          <span className="text-[11px] font-medium text-black/30">
                            {(psp.commission_rate * 100).toFixed(1)}%
                          </span>
                        </div>

                        {/* Subtle footer */}
                        <div className="flex items-center gap-xs text-[11px] text-black/30">
                          <Clock size={10} />
                          {psp.last_settlement_date ?? t('psps.card.noSettlement')}
                        </div>
                      </div>
                    </div>
                  </Card>
                )
              })}
        </div>
      )}

      {/* Add PSP Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>{t('psps.addPsp')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-md py-2">
            <div className="space-y-sm">
              <Label>{t('psps.columns.name')}</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="PSP"
                autoFocus
              />
            </div>
            <div className="space-y-sm">
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
            <Button onClick={handleAddPsp} disabled={!newName.trim() || !newRate || isSubmitting}>
              {isSubmitting ? t('psps.settlement.saving') : t('psps.settlement.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
