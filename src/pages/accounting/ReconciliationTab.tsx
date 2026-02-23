import { useState, useCallback } from 'react'
import { formatAmount, parseAmount, numberToDisplay, amountPlaceholder } from '@/lib/formatAmount'
import { useTranslation } from 'react-i18next'
import {
  CaretLeft,
  CaretRight,
  CurrencyDollar,
  Money,
  Coins,
  Vault,
  ArrowDown,
  ArrowUp,
  GearSix,
  Trash,
  Plus,
  FloppyDisk,
  ArrowCounterClockwise,
  Warning,
  CheckCircle,
  Scales,
} from '@phosphor-icons/react'
import { useReconciliationQuery } from '@/hooks/queries/useReconciliationQuery'
import { useReconciliationConfigMutation } from '@/hooks/queries/useReconciliationConfigMutation'
import type { RegisterReconciliation, TeyitEntry } from './reconciliationTypes'
import { Button, Card, Skeleton, Tag, EmptyState } from '@ds'

/* ── Helpers ─────────────────────────────────────────── */

function formatNumber(n: number, lang: string) {
  return n.toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

const REGISTER_CONFIG: Record<
  string,
  { label: string; icon: typeof CurrencyDollar; iconBg: string; iconColor: string; symbol: string }
> = {
  USDT: {
    label: 'USDT',
    icon: CurrencyDollar,
    iconBg: 'bg-green/10',
    iconColor: 'text-green',
    symbol: '$',
  },
  NAKIT_TL: {
    label: 'Cash TL',
    icon: Money,
    iconBg: 'bg-blue/10',
    iconColor: 'text-blue',
    symbol: '₺',
  },
  NAKIT_USD: {
    label: 'Cash USD',
    icon: Coins,
    iconBg: 'bg-orange/10',
    iconColor: 'text-orange',
    symbol: '$',
  },
}

/* ── Register Card ───────────────────────────────────── */

function RegisterCard({
  reg,
  kur,
  lang,
  t,
}: {
  reg: RegisterReconciliation
  kur: number
  lang: string
  t: (key: string, fallback?: string) => string
}) {
  const config = REGISTER_CONFIG[reg.register]
  const Icon = config.icon
  const showConversion = reg.register === 'NAKIT_TL' && kur > 0

  return (
    <Card padding="default" className="border border-black/10 bg-bg1">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-sm">
          <div className={`flex size-10 items-center justify-center rounded-xl ${config.iconBg}`}>
            <Icon size={20} weight="duotone" className={config.iconColor} />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-black/40">
            {config.label}
          </span>
        </div>
        <Tag variant={reg.devirIsOverride ? 'default' : 'default'} className="text-[10px]">
          {t('accounting.reconciliation.fields.devir')}: {formatNumber(reg.devir, lang)}
          {reg.devirIsOverride && ' *'}
        </Tag>
      </div>

      {/* NET — large */}
      <p
        className={`font-mono text-2xl font-bold tabular-nums ${reg.net >= 0 ? 'text-green' : 'text-red'}`}
      >
        {reg.net >= 0 ? '+' : ''}
        {formatNumber(reg.net, lang)}
        <span className="ml-1.5 text-sm font-medium opacity-30">{config.symbol}</span>
      </p>

      {/* USD ÇEVRİM if applicable */}
      {showConversion && (
        <p className="mt-1 text-xs text-black/40">
          {t('accounting.reconciliation.fields.usdCevrim')}: ${formatNumber(reg.usdCevrim, lang)}
          <span className="ml-1 opacity-50">(÷ {formatNumber(kur, lang)})</span>
        </p>
      )}

      {/* GİREN / ÇIKAN */}
      <div className="mt-4 mb-3">
        {(() => {
          const vol = reg.giren + reg.cikan
          const inPct = vol > 0 ? (reg.giren / vol) * 100 : 50
          return (
            <div className="flex h-1.5 overflow-hidden rounded-full bg-black/[0.04]">
              <div
                className="rounded-full bg-green transition-all"
                style={{ width: `${inPct}%` }}
              />
              <div
                className="rounded-full bg-red transition-all"
                style={{ width: `${100 - inPct}%` }}
              />
            </div>
          )
        })()}
      </div>
      <div className="flex items-center justify-between text-xs text-black/50">
        <span className="flex items-center gap-1.5">
          <ArrowDown size={11} weight="bold" className="text-green" />
          {t('accounting.reconciliation.fields.giren')}
          <span className="font-mono font-medium tabular-nums text-black/70">
            {formatNumber(reg.giren, lang)}
          </span>
        </span>
        <span className="flex items-center gap-1.5">
          <ArrowUp size={11} weight="bold" className="text-red" />
          {t('accounting.reconciliation.fields.cikan')}
          <span className="font-mono font-medium tabular-nums text-black/70">
            {formatNumber(reg.cikan, lang)}
          </span>
        </span>
      </div>
    </Card>
  )
}

/* ── KASA TOPLAM Card ────────────────────────────────── */

function KasaToplamCard({
  kasaToplam,
  beklTahs,
  registers,
  lang,
  t,
}: {
  kasaToplam: number
  beklTahs: number
  registers: RegisterReconciliation[]
  lang: string
  t: (key: string, fallback?: string) => string
}) {
  const grandTotal = kasaToplam + beklTahs

  return (
    <Card padding="default" className="border border-black/10 bg-black/[0.02]">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-sm">
            <div className="flex size-10 items-center justify-center rounded-xl bg-black/5">
              <Vault size={20} weight="duotone" className="text-black/50" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-black/40">
              {t('accounting.reconciliation.fields.kasaToplam')}
            </span>
          </div>
          <p className="mt-3 font-mono text-3xl font-bold tabular-nums text-black/80">
            ${formatNumber(kasaToplam, lang)}
          </p>
        </div>

        {/* Register breakdown */}
        <div className="text-right">
          {registers.map((r) => (
            <p key={r.register} className="text-xs tabular-nums text-black/40">
              <span className="mr-1.5">{REGISTER_CONFIG[r.register]?.label}:</span>
              <span
                className={`font-mono font-medium ${r.usdCevrim >= 0 ? 'text-black/60' : 'text-red'}`}
              >
                ${formatNumber(r.usdCevrim, lang)}
              </span>
            </p>
          ))}
        </div>
      </div>

      {/* BEKL. TAHS + Grand Total */}
      {beklTahs > 0 && (
        <div className="mt-4 space-y-1.5 border-t border-black/10 pt-3">
          <div className="flex items-center justify-between text-xs text-black/40">
            <span>{t('accounting.reconciliation.fields.beklTahs')}</span>
            <span className="font-mono font-medium tabular-nums text-black/60">
              +${formatNumber(beklTahs, lang)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm font-semibold text-black/70">
            <span>{t('accounting.reconciliation.fields.grandTotal')}</span>
            <span className="font-mono tabular-nums">${formatNumber(grandTotal, lang)}</span>
          </div>
        </div>
      )}
    </Card>
  )
}

/* ── Settings Panel ──────────────────────────────────── */

function SettingsPanel({
  config,
  autoKur,
  year,
  month,
  lang,
  t,
  isSaving,
  onSave,
}: {
  config: {
    devir_usdt: number | null
    devir_nakit_tl: number | null
    devir_nakit_usd: number | null
    kur: number | null
    bekl_tahs: number | null
    teyit_entries: TeyitEntry[]
  } | null
  autoKur: number | null
  year: number
  month: number
  lang: string
  t: (key: string, fallback?: string) => string
  isSaving: boolean
  onSave: (data: {
    year: number
    month: number
    devir_usdt: number | null
    devir_nakit_tl: number | null
    devir_nakit_usd: number | null
    kur: number | null
    bekl_tahs: number | null
    teyit_entries: TeyitEntry[]
  }) => Promise<void>
}) {
  const amtLocale = (lang === 'tr' ? 'tr' : 'en') as 'tr' | 'en'
  const [devirUsdt, setDevirUsdt] = useState('')
  const [devirTl, setDevirTl] = useState('')
  const [devirUsd, setDevirUsd] = useState('')
  const [kur, setKur] = useState('')
  const [beklTahs, setBeklTahs] = useState('')
  const [teyitEntries, setTeyitEntries] = useState<TeyitEntry[]>([])
  const [teyitAmountDisplays, setTeyitAmountDisplays] = useState<string[]>([])
  const [prevConfig, setPrevConfig] = useState(config)

  // Initialize from config
  if (config !== prevConfig) {
    setPrevConfig(config)
    setDevirUsdt(config?.devir_usdt != null ? numberToDisplay(config.devir_usdt, amtLocale) : '')
    setDevirTl(config?.devir_nakit_tl != null ? numberToDisplay(config.devir_nakit_tl, amtLocale) : '')
    setDevirUsd(config?.devir_nakit_usd != null ? numberToDisplay(config.devir_nakit_usd, amtLocale) : '')
    setKur(config?.kur != null ? String(config.kur) : '')
    setBeklTahs(
      config?.bekl_tahs != null && Number(config.bekl_tahs) !== 0 ? numberToDisplay(config.bekl_tahs, amtLocale) : '',
    )
    const entries = config?.teyit_entries ?? []
    setTeyitEntries(entries)
    setTeyitAmountDisplays(entries.map((e) => numberToDisplay(e.amount, amtLocale)))
  }

  const handleAddTeyit = () => {
    setTeyitEntries((prev) => [...prev, { label: '', amount: 0, currency: 'USD' }])
    setTeyitAmountDisplays((prev) => [...prev, ''])
  }

  const handleRemoveTeyit = (index: number) => {
    setTeyitEntries((prev) => prev.filter((_, i) => i !== index))
    setTeyitAmountDisplays((prev) => prev.filter((_, i) => i !== index))
  }

  const handleTeyitChange = (index: number, field: keyof TeyitEntry, value: string) => {
    if (field === 'amount') {
      const formatted = formatAmount(value, amtLocale)
      setTeyitAmountDisplays((prev) => prev.map((d, i) => (i === index ? formatted : d)))
      setTeyitEntries((prev) =>
        prev.map((entry, i) =>
          i === index ? { ...entry, amount: parseAmount(formatted, amtLocale) } : entry,
        ),
      )
    } else {
      setTeyitEntries((prev) =>
        prev.map((entry, i) => {
          if (i !== index) return entry
          if (field === 'currency') return { ...entry, currency: value as 'USD' | 'TL' }
          return { ...entry, [field]: value }
        }),
      )
    }
  }

  const handleSave = async () => {
    // Validate KUR is positive if provided
    if (kur && Number(kur) <= 0) {
      alert(
        t('accounting.reconciliation.settings.kurMustBePositive', 'Exchange rate must be positive'),
      )
      return
    }

    // Parse formatted amounts
    const parsedDevirUsdt = devirUsdt ? parseAmount(devirUsdt, amtLocale) : null
    const parsedDevirTl = devirTl ? parseAmount(devirTl, amtLocale) : null
    const parsedDevirUsd = devirUsd ? parseAmount(devirUsd, amtLocale) : null
    const parsedBeklTahs = beklTahs ? parseAmount(beklTahs, amtLocale) : null

    // Validate TEYİT entries
    const validTeyitEntries = teyitEntries.filter((e) => e.label.trim())
    for (const entry of validTeyitEntries) {
      if (entry.amount <= 0) {
        alert(
          t(
            'accounting.reconciliation.teyit.amountMustBePositive',
            'TEYİT amounts must be positive',
          ),
        )
        return
      }
    }

    await onSave({
      year,
      month,
      devir_usdt: parsedDevirUsdt,
      devir_nakit_tl: parsedDevirTl,
      devir_nakit_usd: parsedDevirUsd,
      kur: kur ? Number(kur) : null,
      bekl_tahs: parsedBeklTahs,
      teyit_entries: validTeyitEntries,
    })
  }

  const handleResetToAuto = () => {
    setDevirUsdt('')
    setDevirTl('')
    setDevirUsd('')
    setKur('')
  }

  const inputClass =
    'h-8 w-full rounded-md border border-black/10 bg-white px-2.5 text-sm font-mono tabular-nums text-black/80 placeholder:text-black/25 focus:border-black/20 focus:outline-none focus:ring-1 focus:ring-black/10'

  return (
    <div className="space-y-lg rounded-xl border border-black/10 bg-white p-5">
      {/* DEVİR Overrides */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-black/40">
          {t('accounting.reconciliation.settings.devirOverrides')}
        </p>
        <div className="grid grid-cols-1 gap-md sm:grid-cols-3">
          {[
            { label: 'USDT', value: devirUsdt, onChange: setDevirUsdt },
            { label: 'Cash TL', value: devirTl, onChange: setDevirTl },
            { label: 'Cash USD', value: devirUsd, onChange: setDevirUsd },
          ].map(({ label, value, onChange }) => (
            <div key={label}>
              <label className="mb-1 block text-xs text-black/50">{label}</label>
              <input
                type="text"
                inputMode="decimal"
                className={inputClass}
                value={value}
                onChange={(e) => onChange(formatAmount(e.target.value, amtLocale))}
                placeholder={t('accounting.reconciliation.settings.autoCalculated')}
              />
            </div>
          ))}
        </div>
      </div>

      {/* KUR + BEKL. TAHS */}
      <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-black/50">
            {t('accounting.reconciliation.fields.kur')}
          </label>
          <input
            type="number"
            step="0.0001"
            className={inputClass}
            value={kur}
            onChange={(e) => setKur(e.target.value)}
            placeholder={
              autoKur
                ? `${t('accounting.reconciliation.settings.autoCalculated')}: ${formatNumber(autoKur, lang)}`
                : '—'
            }
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-black/50">
            {t('accounting.reconciliation.fields.beklTahs')}
          </label>
          <input
            type="text"
            inputMode="decimal"
            className={inputClass}
            value={beklTahs}
            onChange={(e) => setBeklTahs(formatAmount(e.target.value, amtLocale))}
            placeholder={amountPlaceholder(amtLocale)}
          />
        </div>
      </div>

      {/* TEYİT Entries */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-black/40">
            {t('accounting.reconciliation.teyit.title')}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAddTeyit}
            className="h-7 gap-1.5 px-2 text-xs"
          >
            <Plus size={12} weight="bold" />
            {t('accounting.reconciliation.teyit.addEntry')}
          </Button>
        </div>
        {teyitEntries.length > 0 && (
          <div className="space-y-sm">
            {teyitEntries.map((entry, i) => (
              <div key={i} className="flex items-center gap-sm">
                <input
                  type="text"
                  className={`${inputClass} flex-1`}
                  value={entry.label}
                  onChange={(e) => handleTeyitChange(i, 'label', e.target.value)}
                  placeholder={t('accounting.reconciliation.teyit.label')}
                />
                <input
                  type="text"
                  inputMode="decimal"
                  className={`${inputClass} w-32`}
                  value={teyitAmountDisplays[i] ?? ''}
                  onChange={(e) => handleTeyitChange(i, 'amount', e.target.value)}
                  placeholder={amountPlaceholder(amtLocale)}
                />
                <select
                  className={`${inputClass} w-20`}
                  value={entry.currency}
                  onChange={(e) => handleTeyitChange(i, 'currency', e.target.value)}
                >
                  <option value="USD">USD</option>
                  <option value="TL">TL</option>
                </select>
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-8 shrink-0 p-0 text-red hover:bg-red/10"
                  onClick={() => handleRemoveTeyit(i)}
                >
                  <Trash size={14} />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-black/10 pt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleResetToAuto}
          className="gap-1.5 text-xs text-black/40"
        >
          <ArrowCounterClockwise size={14} />
          {t('accounting.reconciliation.settings.resetToAuto')}
        </Button>
        <Button
          variant="filled"
          size="sm"
          onClick={handleSave}
          disabled={isSaving}
          className="gap-1.5"
        >
          <FloppyDisk size={14} />
          {isSaving
            ? t('accounting.reconciliation.settings.saving')
            : t('accounting.reconciliation.settings.save')}
        </Button>
      </div>
    </div>
  )
}

/* ── TEYİT Results ───────────────────────────────────── */

function TeyitResults({
  teyitEntries,
  teyitNet,
  fark,
  kur,
  lang,
  t,
}: {
  teyitEntries: TeyitEntry[]
  teyitNet: number
  fark: number
  kur: number
  lang: string
  t: (key: string, fallback?: string) => string
}) {
  if (teyitEntries.length === 0) return null

  const hasFark = Math.abs(fark) > 0.01

  return (
    <div className="rounded-xl border border-black/10 bg-white p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <Scales size={18} className="text-black/40" />
        <span className="text-xs font-semibold uppercase tracking-wider text-black/40">
          {t('accounting.reconciliation.teyit.title')}
        </span>
      </div>

      {/* Entries list */}
      <div className="mb-4 space-y-sm">
        {teyitEntries.map((entry, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <span className="text-black/60">{entry.label}</span>
            <span className="font-mono tabular-nums text-black/70">
              {entry.currency === 'TL' ? '₺' : '$'}
              {formatNumber(entry.amount, lang)}
              {entry.currency === 'TL' && kur > 0 && (
                <span className="ml-1.5 text-xs text-black/30">
                  (${formatNumber(entry.amount / kur, lang)})
                </span>
              )}
            </span>
          </div>
        ))}
      </div>

      {/* NET + FARK */}
      <div className="space-y-sm border-t border-black/10 pt-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-black/50">
            {t('accounting.reconciliation.teyit.net')}
          </span>
          <span className="font-mono font-semibold tabular-nums text-black/70">
            ${formatNumber(teyitNet, lang)}
          </span>
        </div>
        <div
          className={`flex items-center justify-between rounded-lg px-3 py-2.5 ${hasFark ? 'bg-red/5' : 'bg-green/5'}`}
        >
          <div className="flex items-center gap-sm">
            {hasFark ? (
              <Warning size={16} weight="fill" className="text-red" />
            ) : (
              <CheckCircle size={16} weight="fill" className="text-green" />
            )}
            <span className={`text-sm font-medium ${hasFark ? 'text-red' : 'text-green'}`}>
              {t('accounting.reconciliation.teyit.fark')}
            </span>
          </div>
          <span
            className={`font-mono text-lg font-bold tabular-nums ${hasFark ? 'text-red' : 'text-green'}`}
          >
            {fark >= 0 ? '+' : ''}${formatNumber(fark, lang)}
          </span>
        </div>
      </div>
    </div>
  )
}

/* ── Main Component ──────────────────────────────────── */

export function ReconciliationTab() {
  const { t, i18n } = useTranslation('pages')
  const lang = i18n.language

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const { data, isLoading, autoKur, config } = useReconciliationQuery(year, month)
  const { saveConfig, isSaving } = useReconciliationConfigMutation()

  const goToPrevMonth = useCallback(() => {
    if (month === 1) {
      setYear((y) => y - 1)
      setMonth(12)
    } else {
      setMonth((m) => m - 1)
    }
  }, [month])

  const goToNextMonth = useCallback(() => {
    if (month === 12) {
      setYear((y) => y + 1)
      setMonth(1)
    } else {
      setMonth((m) => m + 1)
    }
  }, [month])

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1

  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString(
    lang === 'tr' ? 'tr-TR' : 'en-US',
    { month: 'long', year: 'numeric' },
  )

  const handleSave = useCallback(
    async (saveData: Parameters<typeof saveConfig>[0]) => {
      await saveConfig(saveData)
    },
    [saveConfig],
  )

  /* ── Loading skeleton ─── */
  if (isLoading) {
    return (
      <div className="space-y-lg">
        <div className="flex items-center gap-sm">
          <Skeleton className="size-8 rounded-md" />
          <Skeleton className="h-5 w-40 rounded-md" />
          <Skeleton className="size-8 rounded-md" />
        </div>
        <div className="grid grid-cols-1 gap-md sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} padding="default" className="border border-black/10 bg-bg1">
              <div className="mb-4 flex items-center gap-sm">
                <Skeleton className="size-10 rounded-xl" />
                <Skeleton className="h-4 w-20 rounded" />
              </div>
              <Skeleton className="mb-3 h-8 w-32 rounded" />
              <Skeleton className="mb-3 h-1.5 w-full rounded-full" />
              <div className="flex gap-lg">
                <Skeleton className="h-3 w-20 rounded" />
                <Skeleton className="h-3 w-20 rounded" />
              </div>
            </Card>
          ))}
        </div>
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    )
  }

  /* ── Empty state ─── */
  if (!data || (data.registers.every((r) => r.giren === 0 && r.cikan === 0) && !config)) {
    return (
      <div className="space-y-lg">
        {/* Month picker */}
        <div className="flex items-center gap-sm">
          <Button variant="ghost" size="sm" onClick={goToPrevMonth} className="size-8 p-0">
            <CaretLeft size={16} weight="bold" />
          </Button>
          <span className="min-w-[160px] text-center text-sm font-semibold capitalize text-black/70">
            {monthLabel}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={goToNextMonth}
            disabled={isCurrentMonth}
            className="size-8 p-0"
          >
            <CaretRight size={16} weight="bold" />
          </Button>
        </div>
        <EmptyState
          icon={Scales}
          title={t('accounting.reconciliation.empty')}
          description={t('accounting.reconciliation.subtitle')}
        />
      </div>
    )
  }

  /* ── Data view ─── */
  return (
    <div className="space-y-lg">
      {/* Month picker + settings toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-sm">
          <Button variant="ghost" size="sm" onClick={goToPrevMonth} className="size-8 p-0">
            <CaretLeft size={16} weight="bold" />
          </Button>
          <span className="min-w-[160px] text-center text-sm font-semibold capitalize text-black/70">
            {monthLabel}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={goToNextMonth}
            disabled={isCurrentMonth}
            className="size-8 p-0"
          >
            <CaretRight size={16} weight="bold" />
          </Button>
        </div>
        <Button
          variant={settingsOpen ? 'outline' : 'ghost'}
          size="sm"
          onClick={() => setSettingsOpen((v) => !v)}
          className="gap-1.5 text-xs"
        >
          <GearSix size={14} />
          {t('accounting.reconciliation.settings.title')}
        </Button>
      </div>

      {/* KUR indicator */}
      <div className="flex items-center gap-sm text-xs text-black/40">
        <span>
          {t('accounting.reconciliation.fields.kur')}:{' '}
          <strong className={`font-mono ${data.kur <= 0 ? 'text-red' : 'text-black/60'}`}>
            {formatNumber(data.kur, lang)}
          </strong>{' '}
          TL/USD
        </span>
        <Tag variant="default" className="text-[10px]">
          {data.kurIsOverride
            ? t('accounting.reconciliation.badges.override')
            : t('accounting.reconciliation.badges.auto')}
        </Tag>
        {data.kur <= 0 && (
          <Tag variant="red" className="text-[10px]">
            {t('accounting.reconciliation.badges.invalidKur', 'Invalid rate')}
          </Tag>
        )}
      </div>

      {/* Register cards */}
      <div className="grid grid-cols-1 gap-md sm:grid-cols-3">
        {data.registers.map((reg) => (
          <RegisterCard key={reg.register} reg={reg} kur={data.kur} lang={lang} t={t} />
        ))}
      </div>

      {/* KASA TOPLAM */}
      <KasaToplamCard
        kasaToplam={data.kasaToplam}
        beklTahs={data.beklTahs}
        registers={data.registers}
        lang={lang}
        t={t}
      />

      {/* TEYİT Results */}
      <TeyitResults
        teyitEntries={data.teyitEntries}
        teyitNet={data.teyitNet}
        fark={data.fark}
        kur={data.kur}
        lang={lang}
        t={t}
      />

      {/* Settings Panel (collapsible) */}
      {settingsOpen && (
        <SettingsPanel
          config={config}
          autoKur={autoKur}
          year={year}
          month={month}
          lang={lang}
          t={t}
          isSaving={isSaving}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
