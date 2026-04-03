import { useTranslation } from 'react-i18next'
import { Wrench, Brain } from '@phosphor-icons/react'

/* ── Main page ───────────────────────────────────────────────────── */

export function AiPage() {
  const { t } = useTranslation('pages')

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center border-b border-black/[0.06] px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-brand/10">
            <Brain size={18} className="text-brand" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-black">
              {t('future.title', 'Data Analyst')}
            </h1>
          </div>
        </div>
      </div>

      {/* ── Maintenance screen ─────────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center px-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-20 items-center justify-center rounded-2xl bg-orange-50">
            <Wrench size={40} className="text-orange-400" />
          </div>
          <h2 className="text-xl font-semibold text-black">
            {t('future.maintenanceTitle', 'Bakımda')}
          </h2>
          <p className="max-w-sm text-sm leading-relaxed text-black/50">
            {t(
              'future.maintenanceDesc',
              'Bu sayfa şu anda bakım çalışması nedeniyle geçici olarak kullanıma kapalıdır. Kısa süre içinde tekrar hizmetinizde olacaktır.',
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
