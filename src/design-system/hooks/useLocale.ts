import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/lib/i18n'

export type Locale = SupportedLanguage

export const SUPPORTED_LOCALES = SUPPORTED_LANGUAGES
export const DEFAULT_LOCALE: Locale = 'en'

export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  tr: 'Türkçe',
}

export function useLocale() {
  const { i18n } = useTranslation()

  const locale = (i18n.language?.slice(0, 2) ?? DEFAULT_LOCALE) as Locale

  const changeLocale = useCallback(
    (newLocale: Locale) => {
      i18n.changeLanguage(newLocale)
    },
    [i18n],
  )

  return {
    locale,
    changeLocale,
    locales: SUPPORTED_LOCALES,
    localeNames: LOCALE_NAMES,
  } as const
}
