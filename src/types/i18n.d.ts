import type common from '@/locales/en/common.json'
import type components from '@/locales/en/components.json'
import type pages from '@/locales/en/pages.json'

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: {
      common: typeof common
      components: typeof components
      pages: typeof pages
    }
  }
}
