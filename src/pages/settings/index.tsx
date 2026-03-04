import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { User, Gear, Buildings, ShieldCheck, Broadcast, Key } from '@phosphor-icons/react'
import { useAuth } from '@/app/providers/AuthProvider'
import { PageHeader } from '@ds/components/PageHeader/PageHeader'
import { SessionsTab } from './SessionsTab'
import { OrgPinSettings } from '@/components/OrgPinSettings'
import { Card, Label, Button, Input } from '@ds'
import { useToast } from '@/hooks/useToast'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { supabase } from '@/lib/supabase'
import { cn } from '@ds/utils'
import { WebhooksTab } from './WebhooksTab'
import { ApiKeysTab } from './ApiKeysTab'

type SettingsTab = 'profile' | 'preferences' | 'organization' | 'security' | 'webhooks' | 'apiKeys'

const BASE_TABS: Array<{ id: SettingsTab; icon: typeof User; labelKey: string }> = [
  { id: 'profile', icon: User, labelKey: 'settings.tabs.profile' },
  { id: 'preferences', icon: Gear, labelKey: 'settings.tabs.preferences' },
  { id: 'organization', icon: Buildings, labelKey: 'settings.tabs.organization' },
  { id: 'security', icon: ShieldCheck, labelKey: 'settings.tabs.security' },
]

const ADMIN_TABS: Array<{ id: SettingsTab; icon: typeof User; labelKey: string }> = [
  { id: 'webhooks', icon: Broadcast, labelKey: 'settings.tabs.webhooks' },
  { id: 'apiKeys', icon: Key, labelKey: 'settings.tabs.apiKeys' },
]

/* ── Profile Tab ──────────────────────────────────────────────────── */

function ProfileTab() {
  const { t } = useTranslation('pages')
  const { toast } = useToast()
  const { profile, refreshProfile } = useAuth()
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: displayName })
        .eq('id', profile!.id)
      if (error) throw error
      await refreshProfile()
      toast({ title: t('settings.profile.saved', 'Profile updated'), variant: 'success' })
    } catch (err) {
      toast({ title: (err as Error).message, variant: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card padding="spacious" className="space-y-md border border-black/5 bg-bg1">
      <h2 className="text-lg font-semibold">{t('settings.profile.title', 'Profile')}</h2>
      <div className="space-y-sm">
        <div>
          <Label className="mb-1.5 block text-xs font-medium text-black/60">
            {t('settings.profile.email', 'Email')}
          </Label>
          <Input value={profile?.email ?? ''} disabled className="opacity-60" />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs font-medium text-black/60">
            {t('settings.profile.displayName', 'Display Name')}
          </Label>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={t('settings.profile.displayNamePlaceholder', 'Your name')}
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Button variant="filled" size="sm" onClick={handleSave} disabled={saving}>
          {saving ? t('settings.profile.saving', 'Saving...') : t('settings.profile.save', 'Save')}
        </Button>
      </div>
    </Card>
  )
}

/* ── Preferences Tab ──────────────────────────────────────────────── */

function PreferencesTab() {
  const { t, i18n } = useTranslation('pages')

  const currentTheme = localStorage.getItem('piplinepro-theme') ?? 'system'
  const [theme, setTheme] = useState(currentTheme)
  const [locale, setLocale] = useState(i18n.language)

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme)
    localStorage.setItem('piplinepro-theme', newTheme)
    document.documentElement.setAttribute('data-theme', newTheme === 'system' ? '' : newTheme)
    window.dispatchEvent(new Event('storage'))
  }

  const handleLocaleChange = (newLocale: string) => {
    setLocale(newLocale)
    i18n.changeLanguage(newLocale)
  }

  return (
    <Card padding="spacious" className="space-y-md border border-black/5 bg-bg1">
      <h2 className="text-lg font-semibold">{t('settings.preferences.title', 'Preferences')}</h2>

      {/* Theme */}
      <div className="space-y-sm">
        <Label className="text-xs font-medium text-black/60">
          {t('settings.preferences.theme', 'Theme')}
        </Label>
        <div className="flex gap-2">
          {(['system', 'light', 'dark'] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => handleThemeChange(opt)}
              className={cn(
                'rounded-lg border px-4 py-2 text-xs font-medium transition-colors',
                theme === opt
                  ? 'border-brand bg-brand/10 text-brand'
                  : 'border-black/10 text-black/50 hover:border-black/20',
              )}
            >
              {t(`settings.preferences.theme_${opt}`, opt.charAt(0).toUpperCase() + opt.slice(1))}
            </button>
          ))}
        </div>
      </div>

      {/* Language */}
      <div className="space-y-sm">
        <Label className="text-xs font-medium text-black/60">
          {t('settings.preferences.language', 'Language')}
        </Label>
        <div className="flex gap-2">
          {(
            [
              { code: 'en', label: 'English' },
              { code: 'tr', label: 'Türkçe' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.code}
              type="button"
              onClick={() => handleLocaleChange(opt.code)}
              className={cn(
                'rounded-lg border px-4 py-2 text-xs font-medium transition-colors',
                locale === opt.code
                  ? 'border-brand bg-brand/10 text-brand'
                  : 'border-black/10 text-black/50 hover:border-black/20',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </Card>
  )
}

/* ── Organization Tab ─────────────────────────────────────────────── */

function OrganizationTab() {
  const { t } = useTranslation('pages')
  const { currentOrg } = useOrganization()

  return (
    <div className="space-y-lg">
      <Card padding="spacious" className="space-y-md border border-black/5 bg-bg1">
        <h2 className="text-lg font-semibold">
          {t('settings.organization.title', 'Organization')}
        </h2>
        <div className="space-y-sm">
          <div>
            <Label className="mb-1.5 block text-xs font-medium text-black/60">
              {t('settings.organization.name', 'Name')}
            </Label>
            <Input value={currentOrg?.name ?? ''} disabled className="opacity-60" />
          </div>
          <p className="text-xs text-black/35">
            {t(
              'settings.organization.hint',
              'To change organization settings, go to the Organization detail page.',
            )}
          </p>
        </div>
      </Card>
      <OrgPinSettings />
    </div>
  )
}

/* ── Main Settings Page ───────────────────────────────────────────── */

export function SettingsPage() {
  const { t } = useTranslation('pages')
  const { isGod } = useAuth()
  const { membership } = useOrganization()
  const isAdmin = isGod || membership?.role === 'admin'
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')

  const tabs = isAdmin ? [...BASE_TABS, ...ADMIN_TABS] : BASE_TABS

  return (
    <div className="mx-auto max-w-3xl space-y-lg">
      <PageHeader title={t('settings.title', 'Settings')} />

      {/* Tab navigation */}
      <div className="flex flex-wrap gap-1 rounded-xl border border-black/[0.06] bg-black/[0.02] p-1">
        {tabs.map(({ id, icon: Icon, labelKey }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
              activeTab === id
                ? 'bg-bg1 text-black shadow-sm'
                : 'text-black/45 hover:text-black/65',
            )}
          >
            <Icon size={16} />
            <span className="hidden sm:inline">{t(labelKey, id)}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'profile' && <ProfileTab />}
      {activeTab === 'preferences' && <PreferencesTab />}
      {activeTab === 'organization' && <OrganizationTab />}
      {activeTab === 'security' && <SessionsTab />}
      {activeTab === 'webhooks' && <WebhooksTab />}
      {activeTab === 'apiKeys' && <ApiKeysTab />}
    </div>
  )
}
