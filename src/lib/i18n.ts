import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import enCommon from '@/locales/en/common.json'
import enComponents from '@/locales/en/components.json'
import enPages from '@/locales/en/pages.json'

import trCommon from '@/locales/tr/common.json'
import trComponents from '@/locales/tr/components.json'
import trPages from '@/locales/tr/pages.json'

export const SUPPORTED_LANGUAGES = ['en', 'tr'] as const
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

const STORAGE_KEY = 'piplinepro-locale'

/** RTL language codes — extend this list when adding RTL languages */
const RTL_LANGUAGES: readonly string[] = ['ar', 'he', 'fa', 'ur']

function updateDocumentAttributes(lng: string) {
  document.documentElement.lang = lng
  document.documentElement.dir = RTL_LANGUAGES.includes(lng) ? 'rtl' : 'ltr'
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: enCommon, components: enComponents, pages: enPages },
      tr: { common: trCommon, components: trComponents, pages: trPages },
    },

    supportedLngs: SUPPORTED_LANGUAGES,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'components', 'pages'],

    interpolation: {
      escapeValue: false, // React already escapes
    },

    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: STORAGE_KEY,
      caches: ['localStorage'],
    },
  })

// Set initial document attributes
updateDocumentAttributes(i18n.language)

// Keep document attributes in sync on every language change
i18n.on('languageChanged', updateDocumentAttributes)

export default i18n
