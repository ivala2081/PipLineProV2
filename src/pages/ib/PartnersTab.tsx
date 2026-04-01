import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  MagnifyingGlass,
  DotsThreeVertical,
  PencilSimple,
  Trash,
  Handshake,
} from '@phosphor-icons/react'
import {
  Input,
  Tag,
  EmptyState,
  Skeleton,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@ds'
import { useIBPartnersQuery, useIBPartnerMutations } from '@/hooks/queries/useIBPartnersQuery'
import { useIBReferralsQuery } from '@/hooks/queries/useIBReferralsQuery'
import { useToast } from '@/hooks/useToast'
import { getIBTier, getTierVariant } from './utils/ibTiers'
import { PartnerDialog } from './PartnerDialog'
import type { IBPartner } from '@/lib/database.types'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PartnersTabProps {
  isAdmin: boolean
  showDialog: boolean
  onShowDialog: (show: boolean) => void
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getStatusVariant(status: string): 'success' | 'warning' | 'error' | 'default' {
  switch (status) {
    case 'active':
      return 'success'
    case 'paused':
      return 'warning'
    case 'terminated':
      return 'error'
    default:
      return 'default'
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function PartnersTab({ isAdmin, showDialog, onShowDialog }: PartnersTabProps) {
  const { t } = useTranslation('pages')
  const navigate = useNavigate()
  const { toast } = useToast()

  const { partners, isLoading } = useIBPartnersQuery()
  const { deletePartner } = useIBPartnerMutations()
  const { referrals } = useIBReferralsQuery()

  const [search, setSearch] = useState('')
  const [editingPartner, setEditingPartner] = useState<IBPartner | null>(null)
  const [deletingPartner, setDeletingPartner] = useState<IBPartner | null>(null)

  /* ---- Derived data ---- */

  const filtered = useMemo(() => {
    if (!search.trim()) return partners
    const q = search.toLowerCase().trim()
    return partners.filter(
      (p) => p.name.toLowerCase().includes(q) || p.referral_code.toLowerCase().includes(q),
    )
  }, [partners, search])

  const referralCountMap = useMemo(() => {
    const map: Record<string, { total: number; ftd: number }> = {}
    for (const r of referrals) {
      if (!map[r.ib_partner_id]) {
        map[r.ib_partner_id] = { total: 0, ftd: 0 }
      }
      map[r.ib_partner_id].total++
      if (r.is_ftd) {
        map[r.ib_partner_id].ftd++
      }
    }
    return map
  }, [referrals])

  /* ---- Handlers ---- */

  const handleRowClick = (partner: IBPartner) => {
    navigate(`/ib/${partner.id}`)
  }

  const handleEdit = (e: React.MouseEvent, partner: IBPartner) => {
    e.stopPropagation()
    setEditingPartner(partner)
  }

  const handleDeleteClick = (e: React.MouseEvent, partner: IBPartner) => {
    e.stopPropagation()
    setDeletingPartner(partner)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingPartner) return
    try {
      await deletePartner.mutateAsync(deletingPartner.id)
      toast({ title: t('ib.partners.deleteSuccess'), variant: 'success' })
    } catch {
      toast({ title: t('ib.partners.deleteError'), variant: 'error' })
    } finally {
      setDeletingPartner(null)
    }
  }

  const handleDialogClose = () => {
    setEditingPartner(null)
    onShowDialog(false)
  }

  /* ---- Dialog open state ---- */

  const dialogOpen = showDialog || editingPartner !== null

  /* ---- Render ---- */

  return (
    <div className="space-y-md">
      {/* Search */}
      <div className="flex items-center gap-sm">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <Input
            placeholder={t('ib.partners.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="space-y-sm">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        /* Empty state */
        <EmptyState
          icon={Handshake}
          title={search.trim() ? t('ib.partners.noResults') : t('ib.partners.empty')}
          description={search.trim() ? undefined : t('ib.partners.emptyDesc')}
        />
      ) : (
        /* Table */
        <Table cardOnMobile>
          <TableHeader>
            <TableRow>
              <TableHead>{t('ib.partners.name')}</TableHead>
              <TableHead>{t('ib.partners.referralCode')}</TableHead>
              <TableHead>{t('ib.partners.agreementType')}</TableHead>
              <TableHead>{t('ib.partners.status')}</TableHead>
              <TableHead>{t('ib.partners.tier')}</TableHead>
              <TableHead className="text-right">{t('ib.partners.totalReferrals')}</TableHead>
              <TableHead className="text-right">{t('ib.partners.ftds')}</TableHead>
              {isAdmin && <TableHead className="w-12" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((partner) => {
              const counts = referralCountMap[partner.id] ?? { total: 0, ftd: 0 }
              const tier = getIBTier(counts.ftd)
              const tierVariant = getTierVariant(tier)

              return (
                <TableRow
                  key={partner.id}
                  className="cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => handleRowClick(partner)}
                >
                  <TableCell data-label={t('ib.partners.name')}>
                    <span className="font-medium">{partner.name}</span>
                  </TableCell>
                  <TableCell data-label={t('ib.partners.referralCode')}>
                    <code className="text-xs bg-muted/50 px-1.5 py-0.5 rounded">
                      {partner.referral_code}
                    </code>
                  </TableCell>
                  <TableCell data-label={t('ib.partners.agreementType')}>
                    {t(`ib.partners.agreements.${partner.agreement_type}`)}
                  </TableCell>
                  <TableCell data-label={t('ib.partners.status')}>
                    <Tag variant={getStatusVariant(partner.status)}>
                      {t(`ib.partners.statuses.${partner.status}`)}
                    </Tag>
                  </TableCell>
                  <TableCell data-label={t('ib.partners.tier')}>
                    <Tag variant={tierVariant}>{t(`ib.partners.tiers.${tier}`)}</Tag>
                  </TableCell>
                  <TableCell
                    data-label={t('ib.partners.totalReferrals')}
                    className="text-right tabular-nums"
                  >
                    {counts.total}
                  </TableCell>
                  <TableCell data-label={t('ib.partners.ftds')} className="text-right tabular-nums">
                    {counts.ftd}
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                            <DotsThreeVertical size={16} weight="bold" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => handleEdit(e, partner)}>
                            <PencilSimple size={14} className="mr-2" />
                            {t('ib.partners.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => handleDeleteClick(e, partner)}
                            className="text-error"
                          >
                            <Trash size={14} className="mr-2" />
                            {t('ib.partners.delete')}
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
      )}

      {/* Partner Create/Edit Dialog */}
      <PartnerDialog open={dialogOpen} onClose={handleDialogClose} partner={editingPartner} />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingPartner} onOpenChange={() => setDeletingPartner(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('ib.partners.deleteConfirmTitle')}</DialogTitle>
            <DialogDescription>
              {t('ib.partners.deleteConfirmDescription', {
                name: deletingPartner?.name,
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingPartner(null)}>
              {t('ib.partners.cancel')}
            </Button>
            <Button
              variant="filled"
              className="bg-error hover:bg-error/90"
              onClick={handleDeleteConfirm}
              disabled={deletePartner.isPending}
            >
              {deletePartner.isPending ? t('ib.partners.deleting') : t('ib.partners.confirmDelete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
