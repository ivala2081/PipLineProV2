import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Users, PencilSimple, Trash, DotsThree, WarningCircle } from '@phosphor-icons/react'
import {
  Button,
  Tag,
  Skeleton,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  EmptyState,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@ds'
import { useToast } from '@/hooks/useToast'
import {
  useIBReferralsQuery,
  useIBReferralMutations,
  type IBReferralWithPartner,
} from '@/hooks/queries/useIBReferralsQuery'
import { useIBPartnersQuery } from '@/hooks/queries/useIBPartnersQuery'
import { ReferralDialog } from './ReferralDialog'

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

type ReferralStatus = 'registered' | 'ftd' | 'active' | 'churned'

const STATUS_CONFIG: Record<ReferralStatus, { variant: 'blue' | 'purple' | 'green' | 'red' }> = {
  registered: { variant: 'blue' },
  ftd: { variant: 'purple' },
  active: { variant: 'green' },
  churned: { variant: 'red' },
}

function formatDate(dateStr: string, lang: string): string {
  const locale = lang === 'tr' ? 'tr-TR' : 'en-US'
  return new Date(dateStr).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

interface ReferralsTabProps {
  isAdmin: boolean
  showDialog: boolean
  onShowDialog: (show: boolean) => void
}

export function ReferralsTab({ isAdmin, showDialog, onShowDialog }: ReferralsTabProps) {
  const { t, i18n } = useTranslation('pages')
  const { toast } = useToast()
  const { referrals, isLoading } = useIBReferralsQuery()
  const { deleteReferral } = useIBReferralMutations()
  const { selectablePartners: partners } = useIBPartnersQuery()

  const [filterPartnerId, setFilterPartnerId] = useState('__all__')
  const [editingReferral, setEditingReferral] = useState<IBReferralWithPartner | null>(null)
  const [deletingReferral, setDeletingReferral] = useState<IBReferralWithPartner | null>(null)

  /* Filtered list */
  const filteredReferrals = useMemo(() => {
    if (filterPartnerId === '__all__') return referrals
    return referrals.filter((r) => r.ib_partner_id === filterPartnerId)
  }, [referrals, filterPartnerId])

  /* Delete handler */
  const handleDelete = async () => {
    if (!deletingReferral) return
    try {
      await deleteReferral.mutateAsync(deletingReferral.id)
      toast({
        title: t('ib.referrals.deleted'),
        variant: 'success',
      })
    } catch {
      toast({
        title: t('ib.referrals.deleteError'),
        variant: 'error',
      })
    } finally {
      setDeletingReferral(null)
    }
  }

  /* Edit click */
  const handleEdit = (referral: IBReferralWithPartner) => {
    setEditingReferral(referral)
    onShowDialog(true)
  }

  /* Dialog close */
  const handleDialogClose = () => {
    setEditingReferral(null)
    onShowDialog(false)
  }

  return (
    <div className="space-y-lg">
      {/* Filter bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="w-full sm:w-56">
          <Select value={filterPartnerId} onValueChange={setFilterPartnerId}>
            <SelectTrigger>
              <SelectValue placeholder={t('ib.referrals.allPartners')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t('ib.referrals.allPartners')}</SelectItem>
              {partners.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2 rounded-xl border border-black/[0.07] p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      ) : filteredReferrals.length === 0 ? (
        <EmptyState
          icon={Users}
          title={t('ib.referrals.empty')}
          description={isAdmin ? t('ib.referrals.emptyDesc') : undefined}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-black/[0.07] bg-bg1">
          <Table cardOnMobile>
            <TableHeader>
              <TableRow>
                <TableHead>{t('ib.referrals.clientName')}</TableHead>
                <TableHead>{t('ib.referrals.partner')}</TableHead>
                <TableHead>{t('ib.referrals.status')}</TableHead>
                <TableHead>{t('ib.referrals.ftdDate')}</TableHead>
                <TableHead className="text-right">{t('ib.referrals.ftdAmount')}</TableHead>
                <TableHead className="text-right">{t('ib.referrals.lotsTraded')}</TableHead>
                {isAdmin && <TableHead className="w-12" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReferrals.map((referral) => {
                const statusCfg =
                  STATUS_CONFIG[referral.status as ReferralStatus] ?? STATUS_CONFIG.registered
                return (
                  <TableRow key={referral.id} className="group">
                    <TableCell data-label={t('ib.referrals.clientName')}>
                      <span className="text-sm font-medium text-black">{referral.client_name}</span>
                    </TableCell>
                    <TableCell data-label={t('ib.referrals.partner')}>
                      <span className="text-sm text-black/70">
                        {referral.ib_partner?.name ?? '—'}
                      </span>
                    </TableCell>
                    <TableCell data-label={t('ib.referrals.status')}>
                      <Tag variant={statusCfg.variant}>
                        {t('ib.referrals.statuses.' + referral.status)}
                      </Tag>
                    </TableCell>
                    <TableCell data-label={t('ib.referrals.ftdDate')}>
                      <span className="text-sm tabular-nums text-black/70">
                        {referral.ftd_date ? formatDate(referral.ftd_date, i18n.language) : '—'}
                      </span>
                    </TableCell>
                    <TableCell data-label={t('ib.referrals.ftdAmount')} className="text-right">
                      <span className="text-sm tabular-nums text-black/70">
                        {referral.ftd_amount != null
                          ? Number(referral.ftd_amount).toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })
                          : '—'}
                      </span>
                    </TableCell>
                    <TableCell data-label={t('ib.referrals.lotsTraded')} className="text-right">
                      <span className="text-sm tabular-nums text-black/70">
                        {referral.lots_traded != null
                          ? Number(referral.lots_traded).toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })
                          : '0.00'}
                      </span>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="whitespace-nowrap px-2" isActions>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="size-7 p-0 text-black/40 hover:text-black/70"
                              aria-label="Row actions"
                            >
                              <DotsThree size={16} weight="bold" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" sideOffset={4}>
                            <DropdownMenuItem onClick={() => handleEdit(referral)}>
                              <PencilSimple size={14} />
                              {t('ib.referrals.edit')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red"
                              onClick={() => setDeletingReferral(referral)}
                            >
                              <Trash size={14} />
                              {t('ib.referrals.delete')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Referral dialog (create / edit) */}
      <ReferralDialog
        open={showDialog}
        onClose={handleDialogClose}
        referral={editingReferral}
        partners={partners.map((p) => ({ id: p.id, name: p.name }))}
      />

      {/* Delete confirmation dialog */}
      <Dialog open={!!deletingReferral} onOpenChange={(o) => !o && setDeletingReferral(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-red/10">
              <WarningCircle size={22} weight="fill" className="text-red" />
            </div>
            <DialogTitle>{t('ib.referrals.deleteTitle')}</DialogTitle>
            <DialogDescription>
              {t('ib.referrals.deleteConfirm', {
                name: deletingReferral?.client_name ?? '',
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeletingReferral(null)}
              disabled={deleteReferral.isPending}
            >
              {t('ib.referrals.cancel')}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={deleteReferral.isPending}
              onClick={handleDelete}
              className="bg-red text-white hover:bg-red/90"
            >
              {deleteReferral.isPending
                ? t('ib.referrals.deleting')
                : t('ib.referrals.confirmDelete')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
