import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  CaretLeft,
  Handshake,
  PencilSimple,
  Globe,
  TelegramLogo,
  WhatsappLogo,
  InstagramLogo,
  TwitterLogo,
  LinkedinLogo,
} from '@phosphor-icons/react'
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
  Avatar,
  AvatarImage,
  AvatarFallback,
} from '@ds'
import { useIBPartnersQuery } from '@/hooks/queries/useIBPartnersQuery'
import { useIBReferralsQuery } from '@/hooks/queries/useIBReferralsQuery'
import { useIBCommissionsQuery } from '@/hooks/queries/useIBCommissionsQuery'
import { useIBPaymentsQuery } from '@/hooks/queries/useIBPaymentsQuery'
import { useHrEmployeesQuery } from '@/hooks/queries/useHrQuery'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { getIBTier, getTierVariant } from './utils/ibTiers'

interface PartnerDetailPanelProps {
  partnerId: string
  isAdmin: boolean
  onBack: () => void
}

export function PartnerDetailPanel({ partnerId, isAdmin, onBack }: PartnerDetailPanelProps) {
  const { t } = useTranslation('pages')
  const navigate = useNavigate()
  const { partners, isLoading: partnersLoading } = useIBPartnersQuery()
  const { referrals } = useIBReferralsQuery()
  const { commissions } = useIBCommissionsQuery()
  const { payments } = useIBPaymentsQuery()
  const { data: hrEmployees = [] } = useHrEmployeesQuery()
  const { currentOrg } = useOrganization()

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
        title={
          <div className="flex items-center gap-3">
            {partner.logo_url && (
              <Avatar className="size-10 rounded-xl">
                <AvatarImage src={partner.logo_url} className="rounded-xl" />
                <AvatarFallback className="rounded-xl bg-black/5">
                  <Handshake size={20} className="text-black/30" />
                </AvatarFallback>
              </Avatar>
            )}
            <span>{partner.name}</span>
          </div>
        }
        subtitle={partner.contact_email || ''}
        actions={
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => navigate(`/ib/${partnerId}/edit`)}>
                <PencilSimple size={14} weight="bold" />
                {t('ib.partners.edit')}
              </Button>
            )}
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
            <p className="text-xs text-black/50">{t('ib.partners.responsible')}</p>
            <p className="text-sm font-medium">
              {partner.managed_by_employee_id
                ? (hrEmployees.find((e) => e.id === partner.managed_by_employee_id)?.full_name ??
                  '—')
                : (currentOrg?.name ?? '—')}
            </p>
          </div>
          {partner.secondary_employee_id &&
            partner.secondary_employee_id !== partner.managed_by_employee_id && (
              <div>
                <p className="text-xs text-black/50">{t('ib.partners.secondary')}</p>
                <p className="text-sm font-medium">
                  {hrEmployees.find((e) => e.id === partner.secondary_employee_id)?.full_name ??
                    '—'}
                </p>
              </div>
            )}
          <div>
            <p className="text-xs text-black/50">{t('ib.partners.agreementType')}</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {((partner.agreement_types as string[]) ?? []).map((type) => (
                <Tag key={type} variant="default">
                  {t(`ib.partners.agreements.${type}`)}
                </Tag>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-black/50">{t('ib.partners.agreementDetails')}</p>
            <div className="mt-1 space-y-1">
              {((partner.agreement_types as string[]) ?? []).map((type) => {
                const d = (details as Record<string, Record<string, unknown>>)?.[type]
                if (!d) return null
                let summary = ''
                if (type === 'salary') {
                  const amt = d.amount != null ? fmt(Number(d.amount)) : '—'
                  const cur = (d.currency as string) || 'USD'
                  const period =
                    d.period === 'weekly'
                      ? t('ib.partners.detail.weekly')
                      : t('ib.partners.detail.monthly')
                  summary = `${amt} ${cur} / ${period}`
                } else if (type === 'lot_rebate') {
                  const rebate = d.rebate_per_lot != null ? fmt(Number(d.rebate_per_lot)) : '—'
                  const cur = (d.currency as string) || 'USD'
                  summary = `${rebate} ${cur} / lot`
                } else if (type === 'revenue_share') {
                  const pct = d.revshare_pct != null ? `${d.revshare_pct}%` : '—'
                  const rawSrc = (d.source as string) || 'first_deposit'
                  const srcKey = rawSrc === 'net_revenue' ? 'netRevenue' : 'firstDeposit'
                  summary = `${pct} (${t(`ib.partners.revenueShare.${srcKey}`)})`
                }
                return summary ? (
                  <p key={type} className="text-sm font-medium text-black/70">
                    <span className="text-xs text-black/40">
                      {t(`ib.partners.agreements.${type}`)}:{' '}
                    </span>
                    {summary}
                  </p>
                ) : null
              })}
              {!((partner.agreement_types as string[]) ?? []).some(
                (type) => (details as Record<string, Record<string, unknown>>)?.[type],
              ) && <p className="text-sm text-black/40">—</p>}
            </div>
          </div>
        </div>

        {/* Contract dates */}
        {(partner.contract_start_date || partner.contract_end_date) && (
          <div className="mt-sm grid grid-cols-2 gap-sm sm:grid-cols-4">
            <div>
              <p className="text-xs text-black/50">{t('ib.partnerForm.contractStart')}</p>
              <p className="text-sm font-medium">
                {partner.contract_start_date ? fmtDate(partner.contract_start_date) : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-black/50">{t('ib.partnerForm.contractEnd')}</p>
              <p className="text-sm font-medium">
                {partner.contract_end_date
                  ? fmtDate(partner.contract_end_date)
                  : t('ib.partnerForm.contractEndHint')}
              </p>
            </div>
          </div>
        )}

        {/* Payment preference */}
        {partner.preferred_payment_method && (
          <div className="mt-sm grid grid-cols-2 gap-sm sm:grid-cols-4">
            <div>
              <p className="text-xs text-black/50">{t('ib.partnerForm.preferredPayment')}</p>
              <p className="text-sm font-medium">
                {partner.preferred_payment_method === 'crypto'
                  ? t('ib.partnerForm.crypto')
                  : t('ib.partnerForm.iban')}
              </p>
            </div>
            {partner.preferred_payment_method === 'iban' && partner.iban && (
              <div>
                <p className="text-xs text-black/50">{t('ib.partnerForm.iban')}</p>
                <p className="text-sm font-medium font-mono">{partner.iban}</p>
              </div>
            )}
            {partner.preferred_payment_method === 'crypto' && (
              <>
                {partner.crypto_wallet_address && (
                  <div className="col-span-2">
                    <p className="text-xs text-black/50">{t('ib.partnerForm.walletAddress')}</p>
                    <p className="text-sm font-medium font-mono truncate">
                      {partner.crypto_wallet_address}
                    </p>
                  </div>
                )}
                {partner.crypto_network && (
                  <div>
                    <p className="text-xs text-black/50">{t('ib.partnerForm.cryptoNetwork')}</p>
                    <p className="text-sm font-medium">{partner.crypto_network}</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Social media links */}
        {(partner.website ||
          partner.telegram ||
          partner.whatsapp ||
          partner.instagram ||
          partner.twitter ||
          partner.linkedin) && (
          <div className="mt-sm flex flex-wrap items-center gap-2">
            {partner.website && (
              <a
                href={partner.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-black/[0.08] px-2.5 py-1.5 text-xs text-black/60 transition-colors hover:bg-black/[0.03] hover:text-black/80"
              >
                <Globe size={14} />
                <span>{t('ib.partnerForm.website')}</span>
              </a>
            )}
            {partner.telegram && (
              <a
                href={
                  partner.telegram.startsWith('http')
                    ? partner.telegram
                    : `https://t.me/${partner.telegram.replace('@', '')}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-black/[0.08] px-2.5 py-1.5 text-xs text-black/60 transition-colors hover:bg-black/[0.03] hover:text-black/80"
              >
                <TelegramLogo size={14} />
                <span>{partner.telegram}</span>
              </a>
            )}
            {partner.whatsapp && (
              <a
                href={`https://wa.me/${partner.whatsapp.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-black/[0.08] px-2.5 py-1.5 text-xs text-black/60 transition-colors hover:bg-black/[0.03] hover:text-black/80"
              >
                <WhatsappLogo size={14} />
                <span>{partner.whatsapp}</span>
              </a>
            )}
            {partner.instagram && (
              <a
                href={
                  partner.instagram.startsWith('http')
                    ? partner.instagram
                    : `https://instagram.com/${partner.instagram.replace('@', '')}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-black/[0.08] px-2.5 py-1.5 text-xs text-black/60 transition-colors hover:bg-black/[0.03] hover:text-black/80"
              >
                <InstagramLogo size={14} />
                <span>{partner.instagram}</span>
              </a>
            )}
            {partner.twitter && (
              <a
                href={
                  partner.twitter.startsWith('http')
                    ? partner.twitter
                    : `https://x.com/${partner.twitter.replace('@', '')}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-black/[0.08] px-2.5 py-1.5 text-xs text-black/60 transition-colors hover:bg-black/[0.03] hover:text-black/80"
              >
                <TwitterLogo size={14} />
                <span>{partner.twitter}</span>
              </a>
            )}
            {partner.linkedin && (
              <a
                href={
                  partner.linkedin.startsWith('http')
                    ? partner.linkedin
                    : `https://linkedin.com/in/${partner.linkedin}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-black/[0.08] px-2.5 py-1.5 text-xs text-black/60 transition-colors hover:bg-black/[0.03] hover:text-black/80"
              >
                <LinkedinLogo size={14} />
                <span>{t('ib.partnerForm.linkedin')}</span>
              </a>
            )}
          </div>
        )}
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
