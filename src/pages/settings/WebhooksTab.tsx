import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash, PaperPlaneTilt, CheckCircle, XCircle, Spinner } from '@phosphor-icons/react'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { useAuth } from '@/app/providers/AuthProvider'
import { queryKeys } from '@/lib/queryKeys'
import { Card, Button, Input, Label, Skeleton } from '@ds'
import { useToast } from '@/hooks/useToast'

interface OrgWebhook {
  id: string
  org_id: string
  name: string
  url: string
  secret: string
  events: string[]
  is_active: boolean
  created_at: string
}

interface DeliveryLog {
  id: string
  webhook_id: string
  event_type: string
  status: string
  http_status: number | null
  attempted_at: string
}

const ALL_EVENTS = ['transfer.created', 'transfer.updated', 'transfer.deleted']

function EventBadge({ event }: { event: string }) {
  const color =
    event === 'transfer.created'
      ? 'bg-green/10 text-green'
      : event === 'transfer.deleted'
        ? 'bg-red/10 text-red'
        : 'bg-orange/10 text-orange'
  return <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${color}`}>{event}</span>
}

function StatusDot({ status }: { status: string }) {
  if (status === 'success') return <CheckCircle size={13} className="text-green" weight="fill" />
  if (status === 'failed' || status === 'timeout')
    return <XCircle size={13} className="text-red" weight="fill" />
  return <Spinner size={13} className="text-orange animate-spin" />
}

export function WebhooksTab() {
  const { t } = useTranslation('pages')
  const { currentOrg, membership } = useOrganization()
  const { isGod } = useAuth()
  const isAdmin = isGod || membership?.role === 'admin'
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [addOpen, setAddOpen] = useState(false)
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])
  const [expandedLogs, setExpandedLogs] = useState<string | null>(null)
  const [testingId, setTestingId] = useState<string | null>(null)

  const { data: webhooks, isLoading } = useQuery({
    queryKey: queryKeys.webhooks.list(currentOrg?.id ?? ''),
    queryFn: async () => {
      if (!currentOrg) throw new Error('No org')
      const { data, error } = await supabase
        .from('org_webhooks')
        .select('*')
        .eq('org_id', currentOrg.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data as OrgWebhook[]) ?? []
    },
    enabled: !!currentOrg && isAdmin,
  })

  const { data: deliveryLogs } = useQuery({
    queryKey: queryKeys.webhooks.deliveryLog(expandedLogs ?? ''),
    queryFn: async () => {
      if (!expandedLogs) return []
      const { data, error } = await supabase
        .from('webhook_delivery_log')
        .select('id, webhook_id, event_type, status, http_status, attempted_at')
        .eq('webhook_id', expandedLogs)
        .order('attempted_at', { ascending: false })
        .limit(10)
      if (error) throw error
      return (data as DeliveryLog[]) ?? []
    },
    enabled: !!expandedLogs,
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!currentOrg) throw new Error('No org')
      const secret = Array.from(crypto.getRandomValues(new Uint8Array(24)))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
      const { error } = await supabase.from('org_webhooks').insert({
        org_id: currentOrg.id,
        name,
        url,
        secret,
        events: selectedEvents,
        is_active: true,
      } as never)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.webhooks.list(currentOrg?.id ?? '') })
      setAddOpen(false)
      setName('')
      setUrl('')
      setSelectedEvents([])
      toast({ title: t('settings.webhooks.created', 'Webhook created'), variant: 'success' })
    },
    onError: (err) => toast({ title: (err as Error).message, variant: 'error' }),
  })

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('org_webhooks')
        .update({ is_active } as never)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.webhooks.list(currentOrg?.id ?? '') })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('org_webhooks').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.webhooks.list(currentOrg?.id ?? '') })
      toast({ title: t('settings.webhooks.deleted', 'Webhook deleted'), variant: 'success' })
    },
    onError: (err) => toast({ title: (err as Error).message, variant: 'error' }),
  })

  const handleTest = async (webhook: OrgWebhook) => {
    setTestingId(webhook.id)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const edgeFnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/deliver-webhook`
      const res = await fetch(edgeFnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ webhook_id: webhook.id }),
      })
      const result = await res.json()
      if (result.status === 'success') {
        toast({
          title: t('settings.webhooks.testSuccess', 'Test delivery succeeded'),
          variant: 'success',
        })
      } else {
        toast({
          title: `${t('settings.webhooks.testFailed', 'Test failed')}: ${result.response ?? result.error}`,
          variant: 'error',
        })
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.webhooks.deliveryLog(webhook.id) })
    } catch (err) {
      toast({ title: (err as Error).message, variant: 'error' })
    } finally {
      setTestingId(null)
    }
  }

  const toggleEvent = (event: string) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    )
  }

  if (!isAdmin) {
    return (
      <div className="py-16 text-center text-sm text-black/40">
        {t('settings.webhooks.adminOnly', 'Only organization admins can manage webhooks.')}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{t('settings.webhooks.title', 'Outbound Webhooks')}</h3>
          <p className="text-xs text-black/40">
            {t('settings.webhooks.subtitle', 'Send transfer events to external URLs.')}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
          <Plus size={14} />
          {t('settings.webhooks.add', 'Add Webhook')}
        </Button>
      </div>

      {/* Add form */}
      {addOpen && (
        <Card padding="normal" className="border border-black/[0.06] bg-bg1 space-y-3">
          <h4 className="text-sm font-medium">
            {t('settings.webhooks.newWebhook', 'New Webhook')}
          </h4>
          <div className="space-y-2">
            <div>
              <Label className="mb-1 block text-xs text-black/60">
                {t('settings.webhooks.name', 'Name')}
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Service"
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs text-black/60">
                {t('settings.webhooks.url', 'Endpoint URL')}
              </Label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/webhook"
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs text-black/60">
                {t('settings.webhooks.events', 'Events')}
              </Label>
              <div className="flex flex-wrap gap-2">
                {ALL_EVENTS.map((event) => (
                  <label key={event} className="flex cursor-pointer items-center gap-1.5 text-xs">
                    <input
                      type="checkbox"
                      checked={selectedEvents.includes(event)}
                      onChange={() => toggleEvent(event)}
                      className="rounded"
                    />
                    {event}
                  </label>
                ))}
              </div>
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
              disabled={!name || !url || selectedEvents.length === 0 || createMutation.isPending}
            >
              {t('settings.webhooks.create', 'Create')}
            </Button>
          </div>
        </Card>
      )}

      {/* Webhook list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : !webhooks || webhooks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-black/10 py-12 text-center">
          <p className="text-sm text-black/40">
            {t('settings.webhooks.empty', 'No webhooks configured.')}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-black/[0.06]">
          {webhooks.map((webhook, i) => (
            <div key={webhook.id}>
              <div
                className={`flex items-center gap-3 px-4 py-3 ${i < webhooks.length - 1 ? 'border-b border-black/[0.06]' : ''}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-black/80">{webhook.name}</span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${webhook.is_active ? 'bg-green/10 text-green' : 'bg-black/10 text-black/40'}`}
                    >
                      {webhook.is_active
                        ? t('settings.webhooks.active', 'Active')
                        : t('settings.webhooks.inactive', 'Inactive')}
                    </span>
                  </div>
                  <p className="truncate text-xs text-black/40">{webhook.url}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {webhook.events.map((e) => (
                      <EventBadge key={e} event={e} />
                    ))}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleTest(webhook)}
                    disabled={testingId === webhook.id}
                    className="gap-1 text-xs"
                  >
                    <PaperPlaneTilt size={13} />
                    {t('settings.webhooks.test', 'Test')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      toggleMutation.mutate({ id: webhook.id, is_active: !webhook.is_active })
                    }
                    className="text-xs"
                  >
                    {webhook.is_active
                      ? t('settings.webhooks.disable', 'Disable')
                      : t('settings.webhooks.enable', 'Enable')}
                  </Button>
                  <button
                    onClick={() => setExpandedLogs(expandedLogs === webhook.id ? null : webhook.id)}
                    className="rounded px-2 py-1 text-[11px] text-black/40 hover:text-black/70"
                  >
                    {expandedLogs === webhook.id
                      ? t('settings.webhooks.hideLogs', 'Hide logs')
                      : t('settings.webhooks.showLogs', 'Logs')}
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutate(webhook.id)}
                    disabled={deleteMutation.isPending}
                    className="text-red/60 hover:text-red"
                  >
                    <Trash size={14} />
                  </Button>
                </div>
              </div>

              {/* Delivery logs */}
              {expandedLogs === webhook.id && (
                <div className="border-t border-black/[0.06] bg-black/[0.015] px-4 py-2">
                  <p className="mb-1.5 text-[11px] font-medium text-black/40 uppercase tracking-wide">
                    {t('settings.webhooks.recentDeliveries', 'Recent Deliveries')}
                  </p>
                  {!deliveryLogs || deliveryLogs.length === 0 ? (
                    <p className="text-xs text-black/30">
                      {t('settings.webhooks.noDeliveries', 'No deliveries yet.')}
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {deliveryLogs.map((log) => (
                        <div key={log.id} className="flex items-center gap-2 text-xs text-black/50">
                          <StatusDot status={log.status} />
                          <span className="font-mono text-[10px]">{log.event_type}</span>
                          {log.http_status && <span>{log.http_status}</span>}
                          <span className="ml-auto text-black/30">
                            {new Date(log.attempted_at).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Secret note */}
      <p className="text-xs text-black/35">
        {t(
          'settings.webhooks.signatureNote',
          'Deliveries are signed with HMAC-SHA256. Verify the X-PipLine-Signature header.',
        )}
      </p>
    </div>
  )
}
