import { useState, useEffect } from 'react'
import { Plus, Trash, FloppyDisk, GearSix, PencilSimple, X } from '@phosphor-icons/react'
import { Button, Input, Skeleton } from '@ds'
import { formatAmount, parseAmount, numberToDisplay, amountPlaceholder } from '@/lib/formatAmount'
import {
  useReConfigQuery,
  useUpdateReConfigMutation,
  type ReConfig,
  type ReTier,
} from '@/hooks/queries/useHrQuery'
import { useToast } from '@/hooks/useToast'

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function sortDesc(tiers: ReTier[]): ReTier[] {
  return [...tiers].sort((a, b) => b.min - a.min)
}

/* ------------------------------------------------------------------ */
/*  TierDisplay — read-only view for rate tiers                        */
/* ------------------------------------------------------------------ */

function TierDisplay({ tiers }: { tiers: ReTier[] }) {
  if (tiers.length === 0) {
    return <p className="text-xs italic text-black/30">—</p>
  }
  return (
    <div className="space-y-1.5">
      {tiers.map((tier, i) => (
        <div key={i} className="flex items-center gap-2 text-xs text-black/60">
          <span className="w-32 tabular-nums">≥ {tier.min.toLocaleString()} USD</span>
          <span className="text-black/25">→</span>
          <span className="tabular-nums font-semibold text-orange">
            %{tier.rate}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  TierTable — editable table for rate tiers                          */
/* ------------------------------------------------------------------ */

interface TierTableProps {
  tiers: ReTier[]
  onChange: (tiers: ReTier[]) => void
  lang: 'tr' | 'en'
}

function TierTable({ tiers, onChange, lang }: TierTableProps) {
  const [minDisplays, setMinDisplays] = useState<string[]>(() =>
    tiers.map((t) => (t.min ? numberToDisplay(t.min, lang) : '')),
  )
  const [rateDisplays, setRateDisplays] = useState<string[]>(() =>
    tiers.map((t) => (t.rate ? numberToDisplay(t.rate, lang) : '')),
  )

  useEffect(() => {
    setMinDisplays(tiers.map((t) => (t.min ? numberToDisplay(t.min, lang) : '')))
    setRateDisplays(tiers.map((t) => (t.rate ? numberToDisplay(t.rate, lang) : '')))
  }, [tiers.length, lang]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleMinChange = (idx: number, raw: string) => {
    const formatted = formatAmount(raw, lang)
    const num = Math.round(parseAmount(formatted, lang))
    setMinDisplays((prev) => prev.map((d, i) => (i === idx ? formatted : d)))
    const next = tiers.map((t, i) => (i === idx ? { ...t, min: isNaN(num) ? 0 : num } : t))
    onChange(next)
  }

  const handleRateChange = (idx: number, raw: string) => {
    // Allow decimal rates like 5.75 — use raw parsing
    const cleaned = raw.replace(/[^0-9.,]/g, '')
    setRateDisplays((prev) => prev.map((d, i) => (i === idx ? cleaned : d)))
    const num = parseFloat(cleaned.replace(',', '.'))
    const next = tiers.map((t, i) => (i === idx ? { ...t, rate: isNaN(num) ? 0 : num } : t))
    onChange(next)
  }

  const addRow = () => {
    onChange([...tiers, { min: 0, rate: 0 }])
    setMinDisplays((prev) => [...prev, ''])
    setRateDisplays((prev) => [...prev, ''])
  }

  const removeRow = (idx: number) => {
    onChange(tiers.filter((_, i) => i !== idx))
    setMinDisplays((prev) => prev.filter((_, i) => i !== idx))
    setRateDisplays((prev) => prev.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="grid grid-cols-[1fr_1fr_2rem] gap-2 px-1">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-black/30">
          {lang === 'tr' ? 'Min Net (USD)' : 'Min Net (USD)'}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-black/30">
          {lang === 'tr' ? 'Oran (%)' : 'Rate (%)'}
        </span>
        <span />
      </div>

      {/* Rows */}
      {tiers.map((tier, idx) => (
        <div key={idx} className="grid grid-cols-[1fr_1fr_2rem] items-center gap-2">
          <Input
            type="text"
            inputMode="numeric"
            value={minDisplays[idx] ?? ''}
            placeholder="0"
            onChange={(e) => handleMinChange(idx, e.target.value)}
            className="h-8 text-sm tabular-nums"
          />
          <div className="relative">
            <Input
              type="text"
              inputMode="decimal"
              value={rateDisplays[idx] ?? ''}
              placeholder="5.75"
              onChange={(e) => handleRateChange(idx, e.target.value)}
              className="h-8 text-sm tabular-nums font-semibold pr-8 text-orange"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-black/30">
              %
            </span>
          </div>
          <button
            type="button"
            onClick={() => removeRow(idx)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-black/30 hover:bg-red/10 hover:text-red transition-colors"
          >
            <Trash size={14} />
          </button>
        </div>
      ))}

      {/* Add row */}
      <button
        type="button"
        onClick={addRow}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-black/40 hover:bg-black/[0.04] hover:text-black/60 transition-colors"
      >
        <Plus size={12} weight="bold" />
        {lang === 'tr' ? 'Satır Ekle' : 'Add Row'}
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Section wrapper                                                     */
/* ------------------------------------------------------------------ */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-black/40">{title}</p>
      <div className="rounded-xl border border-black/[0.07] bg-bg1 p-4">{children}</div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  ReConfigTab                                                         */
/* ------------------------------------------------------------------ */

interface ReConfigTabProps {
  lang: 'tr' | 'en'
}

export function ReConfigTab({ lang }: ReConfigTabProps) {
  const { toast } = useToast()
  const { data: savedConfig, isLoading } = useReConfigQuery()
  const updateMutation = useUpdateReConfigMutation()

  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState<ReConfig | null>(null)

  useEffect(() => {
    if (savedConfig && !draft) {
      setDraft(structuredClone(savedConfig))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedConfig])

  if (isLoading || !savedConfig) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  const handleStartEdit = () => {
    setDraft(structuredClone(savedConfig))
    setIsEditing(true)
  }

  const handleCancel = () => {
    setDraft(structuredClone(savedConfig))
    setIsEditing(false)
  }

  const handleSave = async () => {
    if (!draft) return

    const clean: ReConfig = {
      rate_tiers: sortDesc(draft.rate_tiers.filter((t) => t.rate > 0)),
    }

    if (clean.rate_tiers.length === 0) {
      toast({
        title:
          lang === 'tr'
            ? 'En az 1 oran kademesi gerekli'
            : 'At least 1 rate tier is required',
        variant: 'error',
      })
      return
    }

    try {
      await updateMutation.mutateAsync(clean)
      setDraft(structuredClone(clean))
      setIsEditing(false)
      toast({
        title: lang === 'tr' ? 'Yapılandırma kaydedildi' : 'Configuration saved',
        variant: 'success',
      })
    } catch {
      toast({ title: lang === 'tr' ? 'Kayıt başarısız' : 'Save failed', variant: 'error' })
    }
  }

  return (
    <div className="space-y-lg">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-black/60">
          <GearSix size={16} weight="duotone" className="text-brand" />
          {lang === 'tr' ? 'RE Prim Yapılandırması' : 'RE Bonus Configuration'}
        </div>
        <div className="flex items-center gap-sm">
          {!isEditing ? (
            <Button variant="outline" onClick={handleStartEdit}>
              <PencilSimple size={14} />
              {lang === 'tr' ? 'Düzenle' : 'Edit'}
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleCancel} disabled={updateMutation.isPending}>
                <X size={14} />
                {lang === 'tr' ? 'İptal' : 'Cancel'}
              </Button>
              <Button
                variant="filled"
                onClick={() => void handleSave()}
                disabled={updateMutation.isPending}
              >
                <FloppyDisk size={14} />
                {updateMutation.isPending
                  ? lang === 'tr'
                    ? 'Kaydediliyor…'
                    : 'Saving…'
                  : lang === 'tr'
                    ? 'Kaydet'
                    : 'Save'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── READ-ONLY VIEW ── */}
      {!isEditing && (
        <Section title={lang === 'tr' ? 'Net USD Oran Kademeleri' : 'Net USD Rate Tiers'}>
          <p className="mb-3 text-[11px] text-black/40 leading-relaxed">
            {lang === 'tr'
              ? 'Her Retention çalışanının aylık net USD tutarına (deposit − withdrawal) göre ilk eşleşen kademe oranı uygulanır.'
              : 'The first matching tier rate is applied based on each Retention employee\'s monthly net USD (deposits − withdrawals).'}
          </p>
          <TierDisplay tiers={savedConfig.rate_tiers} />
        </Section>
      )}

      {/* ── EDIT VIEW ── */}
      {isEditing && draft && (
        <Section title={lang === 'tr' ? 'Net USD Oran Kademeleri' : 'Net USD Rate Tiers'}>
          <p className="mb-3 text-[11px] text-black/40 leading-relaxed">
            {lang === 'tr'
              ? 'Her Retention çalışanının aylık net USD tutarına göre ilk eşleşen kademe oranı uygulanır. Kaydettiğinde büyükten küçüğe otomatik sıralanır.'
              : 'The first matching tier rate is applied based on net USD. Auto-sorted descending on save.'}
          </p>
          <TierTable
            tiers={draft.rate_tiers}
            onChange={(tiers) => setDraft((d) => (d ? { ...d, rate_tiers: tiers } : d))}
            lang={lang}
          />
        </Section>
      )}
    </div>
  )
}
