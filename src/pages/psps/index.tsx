import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { CreditCard, Plus, Clock, CaretRight, Globe, MapPin } from '@phosphor-icons/react'
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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@ds'
import { useAuth } from '@/app/providers/AuthProvider'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { usePspDashboardQuery, type PspSummary } from '@/hooks/queries/usePspDashboardQuery'
import { useLookupMutation } from '@/hooks/queries/useLookupMutation'
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription'
import { queryKeys } from '@/lib/queryKeys'

function formatCurrency(value: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/* ── PSP Card Component ────────────────────────────────────────────── */

function PspCard({
  psp,
  onClick,
  t,
}: {
  psp: PspSummary
  onClick: () => void
  t: (key: string) => string
}) {
  const isGlobal = psp.psp_scope === 'global'

  const accentColor = !psp.is_active
    ? 'bg-black/20'
    : isGlobal
      ? 'bg-cyan-500'
      : psp.is_internal
        ? 'bg-blue-400'
        : psp.balance > 0
          ? 'bg-amber-500'
          : psp.balance < 0
            ? 'bg-red-500'
            : 'bg-green-500'

  return (
    <Card
      padding="none"
      className={`group cursor-pointer overflow-hidden border border-black/10 bg-bg1 transition-all hover:border-black/20 hover:shadow-md ${
        !psp.is_active ? 'opacity-60' : ''
      }`}
      onClick={onClick}
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
              {isGlobal && (
                <Tag variant="cyan" className="text-[10px]">
                  Global
                </Tag>
              )}
              {psp.provider && (
                <Tag variant="blue" className="text-[10px]">
                  {psp.provider === 'unipayment' ? 'UniPayment' : psp.provider}
                </Tag>
              )}
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
            {!isGlobal && (
              <span className="text-[11px] font-medium text-black/30">
                {(psp.commission_rate * 100).toFixed(1)}%
              </span>
            )}
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
}

/* ── Main Page ─────────────────────────────────────────────────────── */

export function PspsPage() {
  const { t } = useTranslation('pages')
  const navigate = useNavigate()
  const { isGod } = useAuth()
  const { membership } = useOrganization()
  const isAdmin = isGod || membership?.role === 'admin' || membership?.role === 'manager'

  const { psps, isLoading } = usePspDashboardQuery()
  const pspMutation = useLookupMutation('psps')

  useRealtimeSubscription('psps', [queryKeys.pspDashboard.all])

  const [scopeTab, setScopeTab] = useState<'local' | 'global'>('local')
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  // Add dialog state
  const [newScope, setNewScope] = useState<'local' | 'global' | null>(null)
  const [newProvider, setNewProvider] = useState<string>('unipayment')
  const [newAppId, setNewAppId] = useState('')
  const [newName, setNewName] = useState('')
  const [newRate, setNewRate] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const localPsps = useMemo(() => psps.filter((p) => p.psp_scope === 'local'), [psps])
  const globalPsps = useMemo(() => psps.filter((p) => p.psp_scope === 'global'), [psps])
  const resetDialog = () => {
    setNewScope(null)
    setNewProvider('unipayment')
    setNewAppId('')
    setNewName('')
    setNewRate('')
  }

  const handleAddPsp = async () => {
    if (!newScope) return
    if (newScope === 'local') {
      if (!newName.trim() || !newRate) return
    } else {
      if (!newName.trim() || !newProvider || !newAppId.trim()) return
    }

    setIsSubmitting(true)
    try {
      const data: Record<string, unknown> = {
        name: newName.trim(),
        psp_scope: newScope,
      }

      if (newScope === 'local') {
        data.commission_rate = Number(newRate) / 100
      } else {
        data.provider = newProvider
        data.provider_app_id = newAppId.trim()
        data.commission_rate = 0
        data.currency = 'USD'
      }

      await pspMutation.createItem(data)
      setAddDialogOpen(false)
      resetDialog()
    } catch {
      // Error handled by mutation
    } finally {
      setIsSubmitting(false)
    }
  }

  const canSubmit =
    !!newScope &&
    (newScope === 'local'
      ? !!newName.trim() && !!newRate
      : !!newName.trim() && !!newProvider && !!newAppId.trim())

  const renderCards = (items: PspSummary[]) => {
    if (isLoading) {
      return (
        <div className="grid gap-md sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} padding="none" className="animate-pulse border border-black/10 bg-bg1">
              <div className="h-28" />
            </Card>
          ))}
        </div>
      )
    }

    if (items.length === 0) {
      return (
        <EmptyState
          icon={CreditCard}
          title={t('psps.noPsps')}
          description={t('psps.noPspsDesc')}
          action={
            isAdmin ? (
              <Button
                variant="outline"
                onClick={() => {
                  setNewScope(null)
                  setAddDialogOpen(true)
                }}
              >
                <Plus size={16} weight="bold" />
                {t('psps.addPsp')}
              </Button>
            ) : undefined
          }
        />
      )
    }

    return (
      <div className="grid gap-md sm:grid-cols-2 lg:grid-cols-3">
        {items.map((psp) => (
          <PspCard
            key={psp.psp_id}
            psp={psp}
            onClick={() => navigate(`/psps/${psp.psp_id}`)}
            t={t}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-lg">
      {/* Header */}
      <PageHeader
        title={t('psps.title')}
        subtitle={t('psps.subtitle')}
        actions={
          isAdmin ? (
            <Button
              variant="filled"
              onClick={() => {
                setNewScope(null)
                setAddDialogOpen(true)
              }}
            >
              <Plus size={16} weight="bold" />
              {t('psps.addPsp')}
            </Button>
          ) : undefined
        }
      />

      {/* Local / Global Tabs */}
      <Tabs value={scopeTab} onValueChange={(v) => setScopeTab(v as 'local' | 'global')}>
        <TabsList>
          <TabsTrigger value="local">
            <MapPin size={14} className="mr-1" />
            {t('psps.tabs.local')}
            {localPsps.length > 0 && (
              <span className="ml-1.5 text-[10px] text-black/40">({localPsps.length})</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="global">
            <Globe size={14} className="mr-1" />
            {t('psps.tabs.global')}
            {globalPsps.length > 0 && (
              <span className="ml-1.5 text-[10px] text-black/40">({globalPsps.length})</span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="local" className="pt-lg">
          {renderCards(localPsps)}
        </TabsContent>

        <TabsContent value="global" className="pt-lg">
          {renderCards(globalPsps)}
        </TabsContent>
      </Tabs>

      {/* Add PSP Dialog */}
      <Dialog
        open={addDialogOpen}
        onOpenChange={(open) => {
          setAddDialogOpen(open)
          if (!open) resetDialog()
        }}
      >
        <DialogContent size="md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{t('psps.addPsp')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-md py-2">
            {/* Scope Toggle */}
            <div className="space-y-sm">
              <Label>{t('psps.addDialog.scopeLabel')}</Label>
              <div className="flex gap-sm">
                <Button
                  type="button"
                  size="sm"
                  variant={newScope === 'local' ? 'filled' : 'outline'}
                  className="flex-1"
                  onClick={() => setNewScope('local')}
                >
                  <MapPin size={14} className="mr-1" />
                  {t('psps.tabs.local')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={newScope === 'global' ? 'filled' : 'outline'}
                  className="flex-1"
                  onClick={() => setNewScope('global')}
                >
                  <Globe size={14} className="mr-1" />
                  {t('psps.tabs.global')}
                </Button>
              </div>
            </div>

            {/* Provider (Global only) */}
            {newScope === 'global' && (
              <>
                <div className="space-y-sm">
                  <Label>{t('psps.addDialog.providerLabel')}</Label>
                  <Select value={newProvider} onValueChange={setNewProvider}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('psps.addDialog.selectProvider')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unipayment">UniPayment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-sm">
                  <Label>{t('psps.addDialog.appIdLabel')}</Label>
                  <Input
                    value={newAppId}
                    onChange={(e) => setNewAppId(e.target.value)}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  />
                </div>
              </>
            )}

            {/* Name */}
            <div className="space-y-sm">
              <Label>{t('psps.columns.name')}</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={newScope === 'global' ? 'UniPayment' : 'PSP'}
                autoFocus
              />
            </div>

            {/* Commission Rate (Local only) */}
            {newScope === 'local' && (
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
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddDialogOpen(false)}
              disabled={isSubmitting}
            >
              {t('psps.settlement.cancel')}
            </Button>
            <Button onClick={handleAddPsp} disabled={!canSubmit || isSubmitting}>
              {isSubmitting ? t('psps.settlement.saving') : t('psps.settlement.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
