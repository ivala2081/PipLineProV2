import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Copy, Check } from '@phosphor-icons/react'
import type { TransferRow } from '@/hooks/useTransfers'
import { formatDate, formatNumber } from './transfersTableUtils'
import { Sheet, SheetContent, SheetHeader, SheetTitle, Tag } from '@ds'
import { supabase } from '@/lib/supabase'

/* ── Helpers ────────────────────────────────────────────────── */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() =>
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        })
      }
      className="ml-1.5 rounded p-0.5 text-black/30 transition-colors hover:bg-black/5 hover:text-black/60"
    >
      {copied ? <Check size={12} weight="bold" /> : <Copy size={12} />}
    </button>
  )
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="mb-1 mt-5 text-[10px] font-semibold uppercase tracking-widest text-black/35">
      {label}
    </p>
  )
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-black/[0.06] py-2.5 last:border-0">
      <span className="text-sm text-black/45">{label}</span>
      <span className="text-sm font-medium text-black/90">{children}</span>
    </div>
  )
}

/* ── Props ──────────────────────────────────────────────────── */

interface TransferDetailSheetProps {
  row: TransferRow | null
  onClose: () => void
}

/* ── Component ──────────────────────────────────────────────── */

export function TransferDetailSheet({ row, onClose }: TransferDetailSheetProps) {
  const { t, i18n } = useTranslation('pages')
  const lang = i18n.language

  const [actorNames, setActorNames] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!row) return
    const ids = [...new Set([row.created_by, row.updated_by].filter(Boolean) as string[])]
    if (ids.length === 0) return

    supabase
      .from('profiles')
      .select('id, display_name, email')
      .in('id', ids)
      .then(({ data }) => {
        if (!data) return
        const map: Record<string, string> = {}
        for (const p of data) {
          map[p.id] = p.display_name ?? p.email ?? p.id.slice(0, 8)
        }
        setActorNames(map)
      })
  }, [row?.id])

  const isDeposit = row?.category?.is_deposit ?? true
  const amountColor = isDeposit ? 'text-green' : 'text-red'
  const categoryLabel = row?.category
    ? isDeposit
      ? t('transfers.categoryValues.deposit')
      : t('transfers.categoryValues.withdrawal')
    : '—'

  // net and commission are fetched via SELECT * but not typed in TransferRow
  const net = row ? ((row as Record<string, unknown>).net as number | undefined) : undefined
  const commission = row
    ? ((row as Record<string, unknown>).commission as number | undefined)
    : undefined

  return (
    <Sheet
      open={row !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <SheetContent side="right" className="flex w-full flex-col overflow-hidden sm:max-w-md">
        {/* Title is visually hidden — hero acts as the visual header */}
        <SheetHeader className="sr-only">
          <SheetTitle>{t('transfers.detail.title')}</SheetTitle>
        </SheetHeader>

        {row && (
          <div className="flex-1 overflow-y-auto">
            {/* ── Hero ──────────────────────────────────────── */}
            <div className="flex flex-col items-center gap-2 border-b border-black/[0.06] pb-6 pt-2 text-center">
              <Tag
                variant={isDeposit ? 'green' : 'red'}
                className="px-3 py-1 text-xs font-semibold uppercase tracking-wide"
              >
                {categoryLabel}
              </Tag>

              <p className={`font-mono tabular-nums text-4xl font-bold ${amountColor}`}>
                {formatNumber(Math.abs(row.amount), lang)}
                <span className="ml-1.5 text-xl font-semibold text-black/40">{row.currency}</span>
              </p>

              <p className="text-sm font-medium text-black/70">{row.full_name}</p>

              <p className="text-xs text-black/35">
                {formatDate(row.transfer_date, lang).date}{' '}
                <span className="text-black/25">{formatDate(row.transfer_date, lang).time}</span>
              </p>

              {row.is_first_deposit && (
                <Tag variant="yellow" className="mt-1">
                  {t('transfers.detail.firstDeposit', 'First Deposit')}
                </Tag>
              )}
            </div>

            {/* ── Financial ─────────────────────────────────── */}
            <SectionLabel label={t('transfers.detail.sectionFinancial', 'Financial')} />
            <div className="divide-y divide-black/[0.06]">
              <DetailRow label={t('transfers.columns.exchangeRate')}>
                <span className="font-mono tabular-nums">
                  {row.exchange_rate?.toFixed(4) ?? '—'}
                </span>
              </DetailRow>
              <DetailRow label={t('transfers.columns.tlEquivalent')}>
                <span className="font-mono tabular-nums text-blue">
                  {formatNumber(Math.abs(row.amount_try ?? 0), lang)} TL
                </span>
              </DetailRow>
              <DetailRow label={t('transfers.columns.usdEquivalent')}>
                <span className="font-mono tabular-nums text-green">
                  {formatNumber(Math.abs(row.amount_usd ?? 0), lang)} USD
                </span>
              </DetailRow>
              {commission != null && commission !== 0 && (
                <DetailRow label={t('transfers.detail.commission', 'Commission')}>
                  <span className="font-mono tabular-nums text-orange">
                    {formatNumber(Math.abs(commission), lang)} {row.currency}
                  </span>
                </DetailRow>
              )}
              {net != null && (
                <DetailRow label={t('transfers.detail.net', 'Net')}>
                  <span className={`font-mono tabular-nums font-semibold ${amountColor}`}>
                    {formatNumber(Math.abs(net), lang)} {row.currency}
                  </span>
                </DetailRow>
              )}
            </div>

            {/* ── Identity ──────────────────────────────────── */}
            <SectionLabel label={t('transfers.detail.sectionIdentity', 'Identity')} />
            <div className="divide-y divide-black/[0.06]">
              <DetailRow label={t('transfers.columns.psp')}>
                {row.psp ? (
                  <Link
                    to={`/psps/${row.psp_id}`}
                    className="font-medium underline decoration-black/20 underline-offset-2 hover:text-black hover:decoration-black/40"
                  >
                    {row.psp.name}
                  </Link>
                ) : (
                  '—'
                )}
              </DetailRow>
              <DetailRow label={t('transfers.columns.paymentMethod')}>
                {row.payment_method?.name ?? '—'}
              </DetailRow>
              <DetailRow label={t('transfers.columns.type')}>
                {row.type?.name
                  ? t(`transfers.typeValues.${row.type.name}`, { defaultValue: row.type.name })
                  : '—'}
              </DetailRow>
              {row.employee && (
                <DetailRow label={lang === 'tr' ? 'Çalışan' : 'Employee'}>
                  <span className="flex flex-col items-end gap-0.5">
                    <span className="font-medium">{row.employee.full_name}</span>
                    <span className="text-[11px] text-black/40">{row.employee.role}</span>
                  </span>
                </DetailRow>
              )}
              {row.ib_partner && (
                <DetailRow label={lang === 'tr' ? 'IB Ortağı' : 'IB Partner'}>
                  <span className="font-medium">{row.ib_partner.name}</span>
                </DetailRow>
              )}
            </div>

            {/* ── IDs ───────────────────────────────────────── */}
            {(row.crm_id || row.meta_id) && (
              <>
                <SectionLabel label={t('transfers.detail.sectionIds', 'IDs')} />
                <div className="divide-y divide-black/[0.06]">
                  {row.crm_id && (
                    <DetailRow label={t('transfers.columns.crmId')}>
                      <span className="flex items-center font-mono text-[12px]">
                        {row.crm_id}
                        <CopyButton text={row.crm_id} />
                      </span>
                    </DetailRow>
                  )}
                  {row.meta_id && (
                    <DetailRow label={t('transfers.columns.metaId')}>
                      <span className="flex items-center font-mono text-[12px]">
                        {row.meta_id}
                        <CopyButton text={row.meta_id} />
                      </span>
                    </DetailRow>
                  )}
                </div>
              </>
            )}

            {/* ── Notes ─────────────────────────────────────── */}
            {row.notes && (
              <>
                <SectionLabel label={t('transfers.detail.sectionNotes', 'Notes')} />
                <p className="rounded-md bg-black/[0.03] px-3 py-2.5 text-sm leading-relaxed text-black/70">
                  {row.notes}
                </p>
              </>
            )}

            {/* ── Audit ─────────────────────────────────────── */}
            <SectionLabel label={t('transfers.detail.sectionAudit', 'Audit')} />
            <div className="divide-y divide-black/[0.06]">
              <DetailRow label={t('transfers.detail.createdAt', 'Created')}>
                <span className="flex flex-col items-end gap-0.5">
                  <span className="font-mono text-[12px]">
                    {formatDate(row.created_at, lang).date}{' '}
                    <span className="text-black/40">{formatDate(row.created_at, lang).time}</span>
                  </span>
                  {row.created_by && actorNames[row.created_by] && (
                    <span className="text-[11px] text-black/40">{actorNames[row.created_by]}</span>
                  )}
                </span>
              </DetailRow>
              {row.updated_at !== row.created_at && (
                <DetailRow label={t('transfers.detail.updatedAt', 'Updated')}>
                  <span className="flex flex-col items-end gap-0.5">
                    <span className="font-mono text-[12px]">
                      {formatDate(row.updated_at, lang).date}{' '}
                      <span className="text-black/40">{formatDate(row.updated_at, lang).time}</span>
                    </span>
                    {row.updated_by && actorNames[row.updated_by] && (
                      <span className="text-[11px] text-black/40">
                        {actorNames[row.updated_by]}
                      </span>
                    )}
                  </span>
                </DetailRow>
              )}
            </div>

            {/* bottom breathing room */}
            <div className="h-4" />
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
