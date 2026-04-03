import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { User } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { queryKeys } from '@/lib/queryKeys'
import type { IBPartner } from '@/lib/database.types'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Tag,
  Skeleton,
  EmptyState,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@ds'

/* ── Helpers ───────────────────────────────────────────── */

function formatNumber(n: number) {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/* ── Payment History Sheet ─────────────────────────────── */

interface PaymentSheetProps {
  partner: IBPartner | null
  onClose: () => void
}

function PaymentHistorySheet({ partner, onClose }: PaymentSheetProps) {
  const { t } = useTranslation('pages')
  const { currentOrg } = useOrganization()

  const { data: payments = [], isLoading } = useQuery({
    queryKey: queryKeys.ib.payments(currentOrg?.id ?? ''),
    queryFn: async () => {
      if (!currentOrg || !partner) return []
      const { data, error } = await supabase
        .from('ib_payments')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .eq('ib_partner_id', partner.id)
        .order('payment_date', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    enabled: !!currentOrg && !!partner,
  })

  return (
    <Sheet open={!!partner} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{partner?.name ?? ''}</SheetTitle>
        </SheetHeader>
        <div className="mt-md space-y-md">
          {partner && (
            <div className="grid grid-cols-2 gap-sm text-sm">
              <div>
                <span className="text-black/40">
                  {t('accounting.ibPartners.agreementType', 'Agreement')}
                </span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {((partner.agreement_types as string[]) ?? []).map((type) => (
                    <Tag key={type} variant="default">
                      {t(`ib.partners.agreements.${type}`)}
                    </Tag>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-black/40">{t('accounting.ibPartners.status', 'Status')}</span>
                <p>
                  <Tag variant={partner.status === 'active' ? 'default' : 'red'}>
                    {partner.status}
                  </Tag>
                </p>
              </div>
            </div>
          )}

          <h4 className="text-xs font-semibold uppercase tracking-widest text-black/40">
            {t('accounting.ibPartners.paymentHistory', 'Payment History')}
          </h4>

          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))
          ) : payments.length === 0 ? (
            <p className="py-4 text-center text-sm text-black/40">
              {t('accounting.ibPartners.noPayments', 'No payments recorded yet.')}
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-black/10">
              <Table>
                <TableHeader>
                  <TableRow className="bg-black/[0.02]">
                    <TableHead>{t('accounting.ibPartners.date', 'Date')}</TableHead>
                    <TableHead className="text-right">
                      {t('accounting.ibPartners.amount', 'Amount')}
                    </TableHead>
                    <TableHead>{t('accounting.ibPartners.register', 'Register')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p: Record<string, unknown>) => (
                    <TableRow key={p.id as string}>
                      <TableCell className="text-sm">{p.payment_date as string}</TableCell>
                      <TableCell className="text-right font-mono text-sm tabular-nums">
                        {formatNumber(p.amount as number)} {p.currency as string}
                      </TableCell>
                      <TableCell className="text-sm text-black/60">
                        {p.register as string}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

/* ── Main Component ────────────────────────────────────── */

export function IBPartnersTab() {
  const { t } = useTranslation('pages')
  const { currentOrg } = useOrganization()

  const [selectedPartner, setSelectedPartner] = useState<IBPartner | null>(null)

  const { data: partners = [], isLoading } = useQuery({
    queryKey: queryKeys.ib.partners(currentOrg?.id ?? ''),
    queryFn: async () => {
      if (!currentOrg) return []
      const { data, error } = await supabase
        .from('ib_partners')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .order('name', { ascending: true })
      if (error) throw error
      return (data ?? []) as IBPartner[]
    },
    enabled: !!currentOrg,
    staleTime: 5 * 60_000,
  })

  // Get this month's payment totals per partner
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const { data: monthlyTotals = {} } = useQuery({
    queryKey: [...queryKeys.ib.payments(currentOrg?.id ?? ''), 'monthly', currentMonth],
    queryFn: async () => {
      if (!currentOrg) return {}
      const { data, error } = await supabase
        .from('ib_payments')
        .select('ib_partner_id, amount, currency')
        .eq('organization_id', currentOrg.id)
        .gte('payment_date', `${currentMonth}-01`)
        .lt('payment_date', `${currentMonth}-32`)
      if (error) throw error
      const totals: Record<string, number> = {}
      for (const row of data ?? []) {
        const pid = row.ib_partner_id as string
        totals[pid] = (totals[pid] ?? 0) + (row.amount as number)
      }
      return totals
    },
    enabled: !!currentOrg,
    staleTime: 2 * 60_000,
  })

  if (isLoading) {
    return (
      <div className="space-y-sm">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (partners.length === 0) {
    return (
      <EmptyState
        icon={User}
        title={t('accounting.ibPartners.empty', 'No IB records')}
        description={t(
          'accounting.ibPartners.emptyDesc',
          'IB partners can be managed from the IB Management page.',
        )}
      />
    )
  }

  return (
    <div className="space-y-md">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-black/70">
          {t('accounting.ibPartners.title', 'IB')}
        </h3>
        <Tag variant="default">
          {partners.length} {t('accounting.ibPartners.partners', 'partners')}
        </Tag>
      </div>

      <div className="overflow-hidden rounded-xl border border-black/10">
        <Table cardOnMobile>
          <TableHeader>
            <TableRow className="bg-black/[0.02] hover:bg-black/[0.02]">
              <TableHead>{t('accounting.ibPartners.name', 'Name')}</TableHead>
              <TableHead>{t('accounting.ibPartners.agreementType', 'Agreement')}</TableHead>
              <TableHead>{t('accounting.ibPartners.status', 'Status')}</TableHead>
              <TableHead className="text-right">
                {t('accounting.ibPartners.thisMonth', 'This Month')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {partners.map((partner) => (
              <TableRow
                key={partner.id}
                className="cursor-pointer hover:bg-black/[0.015]"
                onClick={() => setSelectedPartner(partner)}
              >
                <TableCell data-label={t('accounting.ibPartners.name', 'Name')}>
                  <span className="font-medium text-black/80">{partner.name}</span>
                  {partner.company_name && (
                    <span className="ml-2 text-xs text-black/40">{partner.company_name}</span>
                  )}
                </TableCell>
                <TableCell data-label={t('accounting.ibPartners.agreementType', 'Agreement')}>
                  <div className="flex flex-wrap gap-1">
                    {((partner.agreement_types as string[]) ?? []).map((type) => (
                      <Tag key={type} variant="default">
                        {t(`ib.partners.agreements.${type}`)}
                      </Tag>
                    ))}
                  </div>
                </TableCell>
                <TableCell data-label={t('accounting.ibPartners.status', 'Status')}>
                  <Tag variant={partner.status === 'active' ? 'default' : 'red'}>
                    {partner.status}
                  </Tag>
                </TableCell>
                <TableCell
                  className="text-right font-mono text-sm tabular-nums"
                  data-label={t('accounting.ibPartners.thisMonth', 'This Month')}
                >
                  {(monthlyTotals as Record<string, number>)[partner.id]
                    ? `$${formatNumber((monthlyTotals as Record<string, number>)[partner.id])}`
                    : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <PaymentHistorySheet partner={selectedPartner} onClose={() => setSelectedPartner(null)} />
    </div>
  )
}
