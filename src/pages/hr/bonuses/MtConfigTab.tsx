import { useState, useEffect } from 'react'
import { Plus, Trash, FloppyDisk, GearSix, PencilSimple, X } from '@phosphor-icons/react'
import { Button, Input, Skeleton } from '@ds'
import {
  useMtConfigQuery,
  useUpdateMtConfigMutation,
  type MtConfig,
  type MtTier,
} from '@/hooks/queries/useHrQuery'
import { useToast } from '@/hooks/useToast'

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function sortDesc(tiers: MtTier[]): MtTier[] {
  return [...tiers].sort((a, b) => b.min - a.min)
}

/* ------------------------------------------------------------------ */
/*  TierDisplay — read-only view for one tier array                    */
/* ------------------------------------------------------------------ */

function TierDisplay({ tiers, accentClass }: { tiers: MtTier[]; accentClass: string }) {
  if (tiers.length === 0) {
    return <p className="text-xs italic text-black/30">—</p>
  }
  return (
    <div className="space-y-1.5">
      {tiers.map((tier, i) => (
        <div key={i} className="flex items-center gap-2 text-xs text-black/60">
          <span className="w-32 tabular-nums">≥ {tier.min.toLocaleString()}</span>
          <span className="text-black/25">→</span>
          <span className={`tabular-nums font-semibold ${accentClass}`}>
            {tier.bonus.toLocaleString()} USDT
          </span>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  TierTable — editable table for one tier array                      */
/* ------------------------------------------------------------------ */

interface TierTableProps {
  tiers: MtTier[]
  onChange: (tiers: MtTier[]) => void
  minLabel: string
  bonusLabel: string
  minPlaceholder: string
  accentClass: string
  lang: 'tr' | 'en'
}

function TierTable({
  tiers,
  onChange,
  minLabel,
  bonusLabel,
  minPlaceholder,
  accentClass,
  lang,
}: TierTableProps) {
  const handleChange = (idx: number, field: 'min' | 'bonus', raw: string) => {
    const val = parseInt(raw.replace(/\D/g, ''), 10)
    const next = tiers.map((t, i) => (i === idx ? { ...t, [field]: isNaN(val) ? 0 : val } : t))
    onChange(next)
  }

  const addRow = () => {
    onChange([...tiers, { min: 0, bonus: 0 }])
  }

  const removeRow = (idx: number) => {
    onChange(tiers.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="grid grid-cols-[1fr_1fr_2rem] gap-2 px-1">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-black/30">
          {minLabel}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-black/30">
          {bonusLabel}
        </span>
        <span />
      </div>

      {/* Rows */}
      {tiers.map((tier, idx) => (
        <div key={idx} className="grid grid-cols-[1fr_1fr_2rem] items-center gap-2">
          <Input
            type="number"
            min={0}
            value={tier.min === 0 ? '' : tier.min}
            placeholder={minPlaceholder}
            onChange={(e) => handleChange(idx, 'min', e.target.value)}
            className="h-8 text-sm tabular-nums"
          />
          <div className="relative">
            <Input
              type="number"
              min={0}
              value={tier.bonus === 0 ? '' : tier.bonus}
              placeholder="0"
              onChange={(e) => handleChange(idx, 'bonus', e.target.value)}
              className={`h-8 text-sm tabular-nums font-semibold pr-14 ${accentClass}`}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-black/30">
              USDT
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
/*  MtConfigTab                                                         */
/* ------------------------------------------------------------------ */

interface MtConfigTabProps {
  lang: 'tr' | 'en'
}

export function MtConfigTab({ lang }: MtConfigTabProps) {
  const { toast } = useToast()
  const { data: savedConfig, isLoading } = useMtConfigQuery()
  const updateMutation = useUpdateMtConfigMutation()

  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState<MtConfig | null>(null)

  // Sync draft when saved config loads for the first time
  useEffect(() => {
    if (savedConfig && !draft) {
      setDraft(structuredClone(savedConfig))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedConfig])

  if (isLoading || !savedConfig) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
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

    const clean: MtConfig = {
      deposit_tiers: sortDesc(draft.deposit_tiers.filter((t) => t.min > 0)),
      count_tiers: sortDesc(draft.count_tiers.filter((t) => t.min > 0)),
      volume_tiers: sortDesc(draft.volume_tiers.filter((t) => t.min > 0)),
      weekly_prize_amount: draft.weekly_prize_amount,
      weekly_prize_min_sales: draft.weekly_prize_min_sales,
      monthly_prize_amount: draft.monthly_prize_amount,
      monthly_prize_min_sales: draft.monthly_prize_min_sales,
    }

    if (clean.deposit_tiers.length === 0) {
      toast({
        title:
          lang === 'tr'
            ? 'En az 1 depozit basamağı gerekli'
            : 'At least 1 deposit tier is required',
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
          {lang === 'tr' ? 'MT Prim Yapılandırması' : 'MT Bonus Configuration'}
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
        <>
          {/* 1 — Depozit Primleri */}
          <Section title={lang === 'tr' ? '1. Depozit Başına Prim' : '1. Per-Deposit Bonus'}>
            <p className="mb-3 text-[11px] text-black/40 leading-relaxed">
              {lang === 'tr'
                ? 'Her deposit transferi için amount_usd değeri ilk eşleşen basamağa göre prim alır.'
                : 'Each deposit transfer gets a bonus matching the first tier.'}
            </p>
            <TierDisplay tiers={savedConfig.deposit_tiers} accentClass="text-purple" />
          </Section>

          {/* 2 — Adet Primleri */}
          <Section title={lang === 'tr' ? '2. Aylık Adet Primi' : '2. Monthly Count Bonus'}>
            <p className="mb-3 text-[11px] text-black/40 leading-relaxed">
              {lang === 'tr'
                ? 'Aylık toplam deposit adedine göre tek seferlik ek prim.'
                : 'One-time bonus based on monthly deposit count.'}
            </p>
            <TierDisplay tiers={savedConfig.count_tiers} accentClass="text-blue" />
          </Section>

          {/* 3 — Hacim Primleri */}
          <Section title={lang === 'tr' ? '3. Aylık Hacim Primi' : '3. Monthly Volume Bonus'}>
            <p className="mb-3 text-[11px] text-black/40 leading-relaxed">
              {lang === 'tr'
                ? 'Aylık toplam deposit hacmine (USD) göre tek seferlik ek prim.'
                : 'One-time bonus based on monthly deposit volume (USD).'}
            </p>
            <TierDisplay tiers={savedConfig.volume_tiers} accentClass="text-mint" />
          </Section>

          {/* 4 — Yarışma Ödülleri */}
          <Section title={lang === 'tr' ? '4. Yarışma Ödülleri' : '4. Competition Prizes'}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2 rounded-lg border border-yellow-400/20 bg-yellow-400/[0.04] p-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-yellow-700">
                  {lang === 'tr' ? 'Haftalık Ödül' : 'Weekly Prize'}
                </p>
                <div className="space-y-1 text-xs text-black/60">
                  <div className="flex justify-between">
                    <span>{lang === 'tr' ? 'Tutar' : 'Amount'}</span>
                    <span className="tabular-nums font-semibold text-yellow-700">
                      {savedConfig.weekly_prize_amount.toLocaleString()} USDT
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{lang === 'tr' ? 'Min Satış' : 'Min Sales'}</span>
                    <span className="tabular-nums font-semibold text-black/70">
                      {savedConfig.weekly_prize_min_sales}
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-2 rounded-lg border border-yellow-400/20 bg-yellow-400/[0.04] p-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-yellow-700">
                  {lang === 'tr' ? 'Aylık Birinci Ödülü' : 'Monthly Winner Prize'}
                </p>
                <div className="space-y-1 text-xs text-black/60">
                  <div className="flex justify-between">
                    <span>{lang === 'tr' ? 'Tutar' : 'Amount'}</span>
                    <span className="tabular-nums font-semibold text-yellow-700">
                      {savedConfig.monthly_prize_amount.toLocaleString()} USDT
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{lang === 'tr' ? 'Min Satış' : 'Min Sales'}</span>
                    <span className="tabular-nums font-semibold text-black/70">
                      {savedConfig.monthly_prize_min_sales}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Section>
        </>
      )}

      {/* ── EDIT VIEW ── */}
      {isEditing && draft && (
        <>
          {/* 1 — Depozit Primleri */}
          <Section title={lang === 'tr' ? '1. Depozit Başına Prim' : '1. Per-Deposit Bonus'}>
            <p className="mb-3 text-[11px] text-black/40 leading-relaxed">
              {lang === 'tr'
                ? 'Her deposit transferi için amount_usd değeri ilk eşleşen basamağa göre prim alır. Kaydettiğinde büyükten küçüğe otomatik sıralanır.'
                : 'Each deposit transfer gets a bonus matching the first tier. Auto-sorted descending on save.'}
            </p>
            <TierTable
              tiers={draft.deposit_tiers}
              onChange={(tiers) => setDraft((d) => (d ? { ...d, deposit_tiers: tiers } : d))}
              minLabel={lang === 'tr' ? 'Min Tutar (USD)' : 'Min Amount (USD)'}
              bonusLabel={lang === 'tr' ? 'Prim (USDT)' : 'Bonus (USDT)'}
              minPlaceholder="1000"
              accentClass="text-purple"
              lang={lang}
            />
          </Section>

          {/* 2 — Adet Primleri */}
          <Section title={lang === 'tr' ? '2. Aylık Adet Primi' : '2. Monthly Count Bonus'}>
            <p className="mb-3 text-[11px] text-black/40 leading-relaxed">
              {lang === 'tr'
                ? 'Aylık toplam deposit adedine göre tek seferlik ek prim.'
                : 'One-time bonus based on monthly deposit count.'}
            </p>
            <TierTable
              tiers={draft.count_tiers}
              onChange={(tiers) => setDraft((d) => (d ? { ...d, count_tiers: tiers } : d))}
              minLabel={lang === 'tr' ? 'Min Adet' : 'Min Count'}
              bonusLabel={lang === 'tr' ? 'Prim (USDT)' : 'Bonus (USDT)'}
              minPlaceholder="15"
              accentClass="text-blue"
              lang={lang}
            />
          </Section>

          {/* 3 — Hacim Primleri */}
          <Section title={lang === 'tr' ? '3. Aylık Hacim Primi' : '3. Monthly Volume Bonus'}>
            <p className="mb-3 text-[11px] text-black/40 leading-relaxed">
              {lang === 'tr'
                ? 'Aylık toplam deposit hacmine (USD) göre tek seferlik ek prim.'
                : 'One-time bonus based on monthly deposit volume (USD).'}
            </p>
            <TierTable
              tiers={draft.volume_tiers}
              onChange={(tiers) => setDraft((d) => (d ? { ...d, volume_tiers: tiers } : d))}
              minLabel={lang === 'tr' ? 'Min Hacim (USD)' : 'Min Volume (USD)'}
              bonusLabel={lang === 'tr' ? 'Prim (USDT)' : 'Bonus (USDT)'}
              minPlaceholder="10000"
              accentClass="text-mint"
              lang={lang}
            />
          </Section>

          {/* 4 — Yarışma Ödülleri */}
          <Section title={lang === 'tr' ? '4. Yarışma Ödülleri' : '4. Competition Prizes'}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Weekly */}
              <div className="space-y-3 rounded-lg border border-yellow-400/20 bg-yellow-400/[0.04] p-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-yellow-700">
                  {lang === 'tr' ? 'Haftalık Ödül' : 'Weekly Prize'}
                </p>
                <div className="space-y-2">
                  <div>
                    <label className="mb-1 block text-[11px] text-black/50">
                      {lang === 'tr' ? 'Ödül Tutarı (USDT)' : 'Prize Amount (USDT)'}
                    </label>
                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        value={draft.weekly_prize_amount}
                        onChange={(e) =>
                          setDraft((d) =>
                            d ? { ...d, weekly_prize_amount: Number(e.target.value) } : d,
                          )
                        }
                        className="h-8 pr-14 text-sm font-semibold tabular-nums text-yellow-700"
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-black/30">
                        USDT
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] text-black/50">
                      {lang === 'tr' ? 'Minimum Satış Adedi' : 'Min Sales Count'}
                    </label>
                    <Input
                      type="number"
                      min={1}
                      value={draft.weekly_prize_min_sales}
                      onChange={(e) =>
                        setDraft((d) =>
                          d ? { ...d, weekly_prize_min_sales: Number(e.target.value) } : d,
                        )
                      }
                      className="h-8 text-sm tabular-nums"
                    />
                  </div>
                </div>
              </div>

              {/* Monthly */}
              <div className="space-y-3 rounded-lg border border-yellow-400/20 bg-yellow-400/[0.04] p-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-yellow-700">
                  {lang === 'tr' ? 'Aylık Birinci Ödülü' : 'Monthly Winner Prize'}
                </p>
                <div className="space-y-2">
                  <div>
                    <label className="mb-1 block text-[11px] text-black/50">
                      {lang === 'tr' ? 'Ödül Tutarı (USDT)' : 'Prize Amount (USDT)'}
                    </label>
                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        value={draft.monthly_prize_amount}
                        onChange={(e) =>
                          setDraft((d) =>
                            d ? { ...d, monthly_prize_amount: Number(e.target.value) } : d,
                          )
                        }
                        className="h-8 pr-14 text-sm font-semibold tabular-nums text-yellow-700"
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-black/30">
                        USDT
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] text-black/50">
                      {lang === 'tr' ? 'Minimum Satış Adedi' : 'Min Sales Count'}
                    </label>
                    <Input
                      type="number"
                      min={1}
                      value={draft.monthly_prize_min_sales}
                      onChange={(e) =>
                        setDraft((d) =>
                          d ? { ...d, monthly_prize_min_sales: Number(e.target.value) } : d,
                        )
                      }
                      className="h-8 text-sm tabular-nums"
                    />
                  </div>
                </div>
              </div>
            </div>
          </Section>
        </>
      )}
    </div>
  )
}
