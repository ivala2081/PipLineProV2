import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { CaretLeft, Handshake } from '@phosphor-icons/react'
import {
  PageHeader,
  Button,
  Tag,
  Grid,
  StatCard,
  Skeleton,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  EmptyState,
} from '@ds'
import { useIBPartnersQuery } from '@/hooks/queries/useIBPartnersQuery'
import { useIBReferralsQuery } from '@/hooks/queries/useIBReferralsQuery'
import { useIBCommissionsQuery } from '@/hooks/queries/useIBCommissionsQuery'
import { useIBPaymentsQuery } from '@/hooks/queries/useIBPaymentsQuery'
import { getIBTier, getTierVariant } from './utils/ibTiers'

interface PartnerDetailPanelProps {
  partnerId: string
  isAdmin: boolean
  onBack: () => void
}

export function PartnerDetailPanel({ partnerId, onBack }: PartnerDetailPanelProps) {
  const { t } = useTranslation('pages')
  const { partners, isLoading: partnersLoading } = useIBPartnersQuery()
  const { referrals } = useIBReferralsQuery()
  const { commissions } = useIBCommissionsQuery()
  const { payments } = useIBPaymentsQuery()

  const partner = partners.find((p) => p.id === partnerId)

  const partnerReferrals = useMemo(
    () => referrals.filter((r) => r.ib_partner_id === partnerId),
    [referrals, partnerId],
  )

  const partnerCommissions = useMemo(
    () => commissions.filter((c) => c.ib_partner_id === partnerId),
    [commissions, partnerId],
  )

  const partnerPayments = useMemo(
    () => payments.filter((p) => p.ib_partner_id === partnerId),
    [payments, partnerId],
  )

  const ftdCount = useMemo(
    () => partnerReferrals.filter((r) => r.is_ftd).length,
    [partnerReferrals],
  )

  const totalLots = useMemo(
    () => partnerReferrals.reduce((sum, r) => sum + (r.lots_traded ?? 0), 0),
    [partnerReferrals],
  )

  const totalEarned = useMemo(
    () => partnerCommissions.reduce((sum, c) => sum + (c.final_amount ?? 0), 0),
    [partnerCommissions],
  )

  const totalPaid = useMemo(
    () => partnerPayments.reduce((sum, p) => sum + p.amount, 0),
    [partnerPayments],
  )

  const conversionRate =
    partnerReferrals.length > 0 ? ((ftdCount / partnerReferrals.length) * 100).toFixed(1) : '0.0'

  const tier = getIBTier(ftdCount)
  const tierVariant = getTierVariant(tier)
  const balance = totalEarned - totalPaid

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

  if (partnersLoading) {
    return (
      <div className="space-y-lg">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-60 w-full" />
      </div>
    )
  }

  if (!partner) {
    return (
      <div className="space-y-lg">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <CaretLeft size={14} />
          {t('ib.partners.detail.back')}
        </Button>
        <EmptyState icon={Handshake} title={t('ib.partners.notFound')} />
      </div>
    )
  }

  const details = (partner.agreement_details ?? {}) as Record<string, unknown>

  return (
    <div className="space-y-lg">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <CaretLeft size={14} />
        {t('ib.partners.detail.back')}
      </Button>

      <PageHeader
        title={partner.name}
        subtitle={`${t('ib.partners.referralCode')}: ${partner.referral_code}`}
        actions={
          <div className="flex items-center gap-2">
            <Tag
              variant={
                partner.status === 'active'
                  ? 'success'
                  : partner.status === 'paused'
                    ? 'warning'
                    : 'default'
              }
            >
              {t(`ib.partners.statuses.${partner.status}`)}
            </Tag>
            <Tag variant={tierVariant}>{t(`ib.partners.tiers.${tier}`)}</Tag>
          </div>
        }
      />

      {/* Profile info */}
      <div className="rounded-xl border border-black/10 p-md">
        <p className="mb-sm text-xs font-semibold uppercase tracking-widest text-black/35">
          {t('ib.partners.detail.profile')}
        </p>
        <div className="grid grid-cols-2 gap-sm sm:grid-cols-4">
          <div>
            <p className="text-xs text-black/50">{t('ib.partners.contactEmail')}</p>
            <p className="text-sm font-medium">{partner.contact_email || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-black/50">{t('ib.partners.contactPhone')}</p>
            <p className="text-sm font-medium">{partner.contact_phone || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-black/50">{t('ib.partners.agreementType')}</p>
            <p className="text-sm font-medium">
              {t(`ib.partners.agreements.${partner.agreement_type}`)}
            </p>
          </div>
          <div>
            <p className="text-xs text-black/50">{t('ib.partners.agreementDetails')}</p>
            <p className="text-sm font-medium text-black/70">
              {Object.entries(details)
                .filter(([, v]) => v != null && v !== '')
                .map(([k, v]) => `${k}: ${v}`)
                .join(', ') || '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Performance metrics */}
      <div>
        <p className="mb-sm text-xs font-semibold uppercase tracking-widest text-black/35">
          {t('ib.partners.detail.performance')}
        </p>
        <Grid cols={3} colsSm={2} colsMd={3}>
          <StatCard label={t('ib.partners.totalReferrals')} value={partnerReferrals.length} />
          <StatCard label={t('ib.partners.ftds')} value={ftdCount} />
          <StatCard label={t('ib.partners.detail.conversionRate')} value={`${conversionRate}%`} />
          <StatCard label={t('ib.partners.detail.totalLots')} value={fmt(totalLots)} />
          <StatCard label={t('ib.partners.totalEarned')} value={fmt(totalEarned)} />
          <StatCard label={t('ib.partners.totalPaid')} value={fmt(totalPaid)} />
          <StatCard label={t('ib.partners.balance')} value={fmt(balance)} />
        </Grid>
      </div>

      {/* Referrals table */}
      <div>
        <p className="mb-sm text-xs font-semibold uppercase tracking-widest text-black/35">
          {t('ib.tabs.referrals')} ({partnerReferrals.length})
        </p>
        {partnerReferrals.length === 0 ? (
          <p className="text-sm text-black/40">{t('ib.referrals.empty')}</p>
        ) : (
          <Table cardOnMobile>
            <TableHeader>
              <TableRow>
                <TableHead>{t('ib.referrals.clientName')}</TableHead>
                <TableHead>{t('ib.referrals.status')}</TableHead>
                <TableHead>{t('ib.referrals.ftdDate')}</TableHead>
                <TableHead>{t('ib.referrals.lotsTraded')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partnerReferrals.map((ref) => (
                <TableRow key={ref.id}>
                  <TableCell className="text-sm font-medium">{ref.client_name}</TableCell>
                  <TableCell>
                    <Tag variant={ref.is_ftd ? 'success' : 'default'}>
                      {t(`ib.referrals.statuses.${ref.status}`)}
                    </Tag>
                  </TableCell>
                  <TableCell className="text-sm text-black/60">
                    {ref.ftd_date ? fmtDate(ref.ftd_date) : '—'}
                  </TableCell>
                  <TableCell className="text-sm tabular-nums">{fmt(ref.lots_traded)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Commissions table */}
      <div>
        <p className="mb-sm text-xs font-semibold uppercase tracking-widest text-black/35">
          {t('ib.tabs.commissions')} ({partnerCommissions.length})
        </p>
        {partnerCommissions.length === 0 ? (
          <p className="text-sm text-black/40">{t('ib.commissions.empty')}</p>
        ) : (
          <Table cardOnMobile>
            <TableHeader>
              <TableRow>
                <TableHead>{t('ib.commissions.period')}</TableHead>
                <TableHead>{t('ib.commissions.finalAmount')}</TableHead>
                <TableHead>{t('ib.commissions.currency')}</TableHead>
                <TableHead>{t('ib.commissions.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partnerCommissions.map((comm) => (
                <TableRow key={comm.id}>
                  <TableCell className="text-sm">
                    {fmtDate(comm.period_start)} — {fmtDate(comm.period_end)}
                  </TableCell>
                  <TableCell className="text-sm tabular-nums font-medium">
                    {fmt(comm.final_amount)}
                  </TableCell>
                  <TableCell className="text-sm">{comm.currency}</TableCell>
                  <TableCell>
                    <Tag
                      variant={
                        comm.status === 'paid'
                          ? 'success'
                          : comm.status === 'confirmed'
                            ? 'info'
                            : 'default'
                      }
                    >
                      {t(`ib.commissions.statuses.${comm.status}`)}
                    </Tag>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Payments table */}
      <div>
        <p className="mb-sm text-xs font-semibold uppercase tracking-widest text-black/35">
          {t('ib.tabs.payments')} ({partnerPayments.length})
        </p>
        {partnerPayments.length === 0 ? (
          <p className="text-sm text-black/40">{t('ib.payments.empty')}</p>
        ) : (
          <Table cardOnMobile>
            <TableHeader>
              <TableRow>
                <TableHead>{t('ib.payments.amount')}</TableHead>
                <TableHead>{t('ib.payments.currency')}</TableHead>
                <TableHead>{t('ib.payments.register')}</TableHead>
                <TableHead>{t('ib.payments.paymentDate')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partnerPayments.map((pay) => (
                <TableRow key={pay.id}>
                  <TableCell className="text-sm tabular-nums font-medium">
                    {fmt(pay.amount)}
                  </TableCell>
                  <TableCell className="text-sm">{pay.currency}</TableCell>
                  <TableCell className="text-sm">{pay.register}</TableCell>
                  <TableCell className="text-sm text-black/60">
                    {fmtDate(pay.payment_date)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
