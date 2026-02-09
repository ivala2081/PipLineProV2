import { ThemeProvider } from '@/app/providers/ThemeProvider'
import { AuthProvider } from '@/app/providers/AuthProvider'
import { OrganizationProvider } from '@/app/providers/OrganizationProvider'
import { useTranslation } from 'react-i18next'

export function App() {
  const { t } = useTranslation('pages')

  return (
    <ThemeProvider defaultTheme="light">
      <AuthProvider>
        <OrganizationProvider>
          <div className="min-h-screen bg-bg1 text-black font-normal">
            <h1 className="text-2xl font-semibold p-8">{t('dashboard.title')}</h1>
            <p className="px-8 text-black/60">{t('dashboard.subtitle')}</p>
          </div>
        </OrganizationProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
