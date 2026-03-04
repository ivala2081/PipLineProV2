import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Copy, Eye, EyeSlash, Warning } from '@phosphor-icons/react'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { useAuth } from '@/app/providers/AuthProvider'
import { queryKeys } from '@/lib/queryKeys'
import { Card, Button, Input, Label, Skeleton } from '@ds'
import { useToast } from '@/hooks/useToast'

interface OrgApiKey {
  id: string
  org_id: string
  name: string
  key_prefix: string
  scopes: string[]
  is_active: boolean
  last_used_at: string | null
  expires_at: string | null
  created_at: string
}

const ALL_SCOPES = ['transfers:read', 'transfers:write']

async function sha256hex(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function generateApiKey(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  const base64url = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
  return `pipline_${base64url}`
}

export function ApiKeysTab() {
  const { t } = useTranslation('pages')
  const { currentOrg } = useOrganization()
  const { isGod } = useAuth()
  const { membership } = useOrganization()
  const isAdmin = isGod || membership?.role === 'admin'
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [addOpen, setAddOpen] = useState(false)
  const [name, setName] = useState('')
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['transfers:read'])
  const [expiresAt, setExpiresAt] = useState('')
  const [newKey, setNewKey] = useState<string | null>(null)
  const [showKey, setShowKey] = useState(false)

  const { data: apiKeys, isLoading } = useQuery({
    queryKey: queryKeys.apiKeys.list(currentOrg?.id ?? ''),
    queryFn: async () => {
      if (!currentOrg) throw new Error('No org')
      const { data, error } = await supabase
        .from('org_api_keys')
        .select(
          'id, org_id, name, key_prefix, scopes, is_active, last_used_at, expires_at, created_at',
        )
        .eq('org_id', currentOrg.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data as OrgApiKey[]) ?? []
    },
    enabled: !!currentOrg && isAdmin,
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!currentOrg) throw new Error('No org')
      const fullKey = generateApiKey()
      const keyHash = await sha256hex(fullKey)
      const keyPrefix = fullKey.slice(0, 16)
      const { error } = await supabase.from('org_api_keys').insert({
        org_id: currentOrg.id,
        name,
        key_prefix: keyPrefix,
        key_hash: keyHash,
        scopes: selectedScopes,
        is_active: true,
        expires_at: expiresAt || null,
      } as never)
      if (error) throw error
      return fullKey
    },
    onSuccess: (fullKey) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys.list(currentOrg?.id ?? '') })
      setNewKey(fullKey)
      setShowKey(true)
      setAddOpen(false)
      setName('')
      setSelectedScopes(['transfers:read'])
      setExpiresAt('')
    },
    onError: (err) => toast({ title: (err as Error).message, variant: 'error' }),
  })

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('org_api_keys')
        .update({ is_active: false } as never)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys.list(currentOrg?.id ?? '') })
      toast({ title: t('settings.apiKeys.revoked', 'API key revoked'), variant: 'success' })
    },
    onError: (err) => toast({ title: (err as Error).message, variant: 'error' }),
  })

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    )
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: t('settings.apiKeys.copied', 'Copied to clipboard'), variant: 'success' })
  }

  if (!isAdmin) {
    return (
      <div className="py-16 text-center text-sm text-black/40">
        {t('settings.apiKeys.adminOnly', 'Only organization admins can manage API keys.')}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{t('settings.apiKeys.title', 'API Keys')}</h3>
          <p className="text-xs text-black/40">
            {t('settings.apiKeys.subtitle', 'Programmatic access to your organization data.')}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setAddOpen(true)
            setNewKey(null)
          }}
        >
          <Plus size={14} />
          {t('settings.apiKeys.generate', 'Generate Key')}
        </Button>
      </div>

      {/* New key reveal panel */}
      {newKey && (
        <Card padding="normal" className="border border-green/20 bg-green/5 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-green">
            <Warning size={14} weight="fill" />
            {t('settings.apiKeys.saveNow', 'Save this key now — it will not be shown again.')}
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-black/10 bg-bg1 px-3 py-2 font-mono text-xs">
            <span className="flex-1 break-all">{showKey ? newKey : '•'.repeat(newKey.length)}</span>
            <button
              onClick={() => setShowKey((v) => !v)}
              className="shrink-0 text-black/40 hover:text-black/70"
            >
              {showKey ? <EyeSlash size={14} /> : <Eye size={14} />}
            </button>
            <button
              onClick={() => handleCopy(newKey)}
              className="shrink-0 text-black/40 hover:text-black/70"
            >
              <Copy size={14} />
            </button>
          </div>
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => setNewKey(null)}>
            {t('settings.apiKeys.dismiss', 'Dismiss')}
          </Button>
        </Card>
      )}

      {/* Add form */}
      {addOpen && (
        <Card padding="normal" className="border border-black/[0.06] bg-bg1 space-y-3">
          <h4 className="text-sm font-medium">{t('settings.apiKeys.newKey', 'New API Key')}</h4>
          <div className="space-y-2">
            <div>
              <Label className="mb-1 block text-xs text-black/60">
                {t('settings.apiKeys.name', 'Name')}
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Integration"
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs text-black/60">
                {t('settings.apiKeys.scopes', 'Scopes')}
              </Label>
              <div className="flex flex-wrap gap-2">
                {ALL_SCOPES.map((scope) => (
                  <label key={scope} className="flex cursor-pointer items-center gap-1.5 text-xs">
                    <input
                      type="checkbox"
                      checked={selectedScopes.includes(scope)}
                      onChange={() => toggleScope(scope)}
                      className="rounded"
                    />
                    {scope}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label className="mb-1 block text-xs text-black/60">
                {t('settings.apiKeys.expiresAt', 'Expires At (optional)')}
              </Label>
              <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setAddOpen(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              variant="filled"
              size="sm"
              onClick={() => createMutation.mutate()}
              disabled={!name || selectedScopes.length === 0 || createMutation.isPending}
            >
              {t('settings.apiKeys.create', 'Generate')}
            </Button>
          </div>
        </Card>
      )}

      {/* Key list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : !apiKeys || apiKeys.length === 0 ? (
        <div className="rounded-xl border border-dashed border-black/10 py-12 text-center">
          <p className="text-sm text-black/40">{t('settings.apiKeys.empty', 'No API keys yet.')}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-black/[0.06]">
          {apiKeys.map((key, i) => (
            <div
              key={key.id}
              className={`flex items-center gap-3 px-4 py-3 ${i < apiKeys.length - 1 ? 'border-b border-black/[0.06]' : ''} ${!key.is_active ? 'opacity-50' : ''}`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-black/80">{key.name}</span>
                  {!key.is_active && (
                    <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-black/10 text-black/40">
                      {t('settings.apiKeys.revoked', 'Revoked')}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-black/40">
                  <span className="font-mono">{key.key_prefix}…</span>
                  {key.scopes.map((s) => (
                    <span key={s} className="rounded bg-black/[0.05] px-1.5 py-0.5 text-[10px]">
                      {s}
                    </span>
                  ))}
                  {key.last_used_at && (
                    <span>
                      {t('settings.apiKeys.lastUsed', 'Last used')}{' '}
                      {new Date(key.last_used_at).toLocaleDateString()}
                    </span>
                  )}
                  {key.expires_at && (
                    <span>
                      {t('settings.apiKeys.expires', 'Expires')}{' '}
                      {new Date(key.expires_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              {key.is_active && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => revokeMutation.mutate(key.id)}
                  disabled={revokeMutation.isPending}
                  className="shrink-0 text-xs text-red/60 hover:text-red"
                >
                  {t('settings.apiKeys.revoke', 'Revoke')}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* curl example */}
      <Card padding="normal" className="border border-black/[0.06] bg-black/[0.015]">
        <p className="mb-2 text-xs font-medium text-black/40 uppercase tracking-wide">
          {t('settings.apiKeys.example', 'Example Usage')}
        </p>
        <pre className="overflow-x-auto rounded bg-black/[0.04] px-3 py-2 text-[11px] text-black/60">
          {`curl -H "Authorization: Bearer pipline_YOUR_KEY" \\
  ${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-gateway/transfers`}
        </pre>
      </Card>
    </div>
  )
}
