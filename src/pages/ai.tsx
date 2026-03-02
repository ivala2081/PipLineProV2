import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Brain,
  PaperPlaneTilt,
  ArrowClockwise,
  Spinner,
  Robot,
  User,
  ChartBar,
  Users,
  CurrencyDollar,
  Calendar,
  Warning,
} from '@phosphor-icons/react'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { useAuth } from '@/app/providers/AuthProvider'

/* ── Types ──────────────────────────────────────────────────────── */

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolCalls?: string[]
  isError?: boolean
}

type StreamEvent =
  | { type: 'text'; content: string }
  | { type: 'tool_call'; name: string }
  | { type: 'done' }
  | { type: 'error'; message: string }

/* ── Suggested prompts ──────────────────────────────────────────── */

const SUGGESTED_PROMPTS = [
  { icon: ChartBar, labelKey: 'future.prompt.monthly', defaultLabel: "This month's KPI summary" },
  {
    icon: Users,
    labelKey: 'future.prompt.topCustomers',
    defaultLabel: 'Top 10 customers this month',
  },
  {
    icon: CurrencyDollar,
    labelKey: 'future.prompt.pspBreakdown',
    defaultLabel: 'PSP volume breakdown',
  },
  { icon: Calendar, labelKey: 'future.prompt.lastMonth', defaultLabel: "Last month's performance" },
]

/* ── Tool name formatter ─────────────────────────────────────────── */

function formatToolName(name: string, t: (key: string, fallback: string) => string): string {
  const map: Record<string, string> = {
    get_monthly_summary: t('future.tool.monthly', 'Fetching monthly summary...'),
    get_transfers: t('future.tool.transfers', 'Querying transfers...'),
    get_top_customers: t('future.tool.customers', 'Loading customer data...'),
    get_psp_list: t('future.tool.psps', 'Fetching PSP list...'),
  }
  return map[name] ?? `${name}...`
}

/* ── Markdown-lite renderer ──────────────────────────────────────── */

function renderMarkdown(text: string): string {
  return (
    text
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Inline code
      .replace(
        /`([^`]+)`/g,
        '<code class="bg-black/[0.07] rounded px-1 py-0.5 text-[0.82em] font-mono">$1</code>',
      )
      // Headers
      .replace(/^### (.+)$/gm, '<h3 class="font-semibold text-sm mt-3 mb-1">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="font-semibold text-sm mt-3 mb-1">$1</h2>')
      // Horizontal rule
      .replace(/^---$/gm, '<hr class="border-black/10 my-2">')
      // Table rows (simplified: | col | col |)
      .replace(/^\|(.+)\|$/gm, (_, row) => {
        const cells = row.split('|').map((c: string) => c.trim())
        const isHeader = cells.some((c: string) => /^-+$/.test(c))
        if (isHeader) return ''
        const tag = 'td'
        return `<tr>${cells.map((c: string) => `<${tag} class="border border-black/[0.08] px-2 py-1 text-xs">${c}</${tag}>`).join('')}</tr>`
      })
      // Wrap consecutive table rows
      .replace(
        /(<tr>.*<\/tr>\n?)+/g,
        (m) =>
          `<div class="overflow-x-auto my-2"><table class="w-full border-collapse text-xs">${m}</table></div>`,
      )
      // Bullet list items
      .replace(/^- (.+)$/gm, '<li class="ml-3 list-disc">$1</li>')
      .replace(/(<li[^>]*>.*<\/li>\n?)+/g, (m) => `<ul class="my-1 space-y-0.5">${m}</ul>`)
      // Numbered list items
      .replace(/^\d+\. (.+)$/gm, '<li class="ml-3 list-decimal">$1</li>')
      // Newlines → <br> (only outside block elements)
      .replace(/\n/g, '<br>')
  )
}

/* ── Message bubble ──────────────────────────────────────────────── */

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="flex max-w-[75%] items-start gap-2">
          <div className="rounded-2xl rounded-tr-sm bg-brand px-4 py-2.5 text-sm text-white">
            {msg.content}
          </div>
          <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-brand/10">
            <User size={14} className="text-brand" weight="fill" />
          </div>
        </div>
      </div>
    )
  }

  if (msg.isError) {
    return (
      <div className="flex justify-start">
        <div className="flex max-w-[85%] items-start gap-2">
          <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-red-50">
            <Warning size={14} className="text-red-500" weight="fill" />
          </div>
          <div className="rounded-2xl rounded-tl-sm border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
            {msg.content}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start">
      <div className="flex max-w-[85%] items-start gap-2">
        <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-brand/10">
          <Robot size={14} className="text-brand" weight="fill" />
        </div>
        <div className="rounded-2xl rounded-tl-sm bg-black/[0.04] px-4 py-2.5 text-sm text-black/90">
          {msg.toolCalls && msg.toolCalls.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1">
              {msg.toolCalls.map((tool, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-medium text-brand"
                >
                  <ChartBar size={9} />
                  {tool.replace('get_', '').replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          )}
          <div
            className="prose-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
          />
        </div>
      </div>
    </div>
  )
}

/* ── Typing indicator ────────────────────────────────────────────── */

function TypingIndicator({ toolLabel }: { toolLabel: string | null }) {
  const { t } = useTranslation('pages')

  return (
    <div className="flex justify-start">
      <div className="flex max-w-[85%] items-start gap-2">
        <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-brand/10">
          <Robot size={14} className="text-brand" weight="fill" />
        </div>
        <div className="rounded-2xl rounded-tl-sm bg-black/[0.04] px-4 py-3">
          {toolLabel ? (
            <div className="flex items-center gap-2 text-xs text-black/50">
              <Spinner size={12} className="animate-spin text-brand" />
              <span>{toolLabel}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-black/40">{t('future.thinking', 'Thinking')}</span>
              <span className="flex gap-0.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="inline-block size-1 rounded-full bg-black/30"
                    style={{ animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite` }}
                  />
                ))}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Streaming bubble ────────────────────────────────────────────── */

function StreamingBubble({ content, toolCalls }: { content: string; toolCalls: string[] }) {
  return (
    <div className="flex justify-start">
      <div className="flex max-w-[85%] items-start gap-2">
        <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-brand/10">
          <Robot size={14} className="text-brand" weight="fill" />
        </div>
        <div className="rounded-2xl rounded-tl-sm bg-black/[0.04] px-4 py-2.5 text-sm text-black/90">
          {toolCalls.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1">
              {toolCalls.map((tool, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-medium text-brand"
                >
                  <ChartBar size={9} />
                  {tool.replace('get_', '').replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          )}
          <div
            className="prose-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
          />
          <span className="ml-0.5 inline-block h-[1em] w-0.5 animate-pulse bg-brand align-middle" />
        </div>
      </div>
    </div>
  )
}

/* ── Welcome screen ──────────────────────────────────────────────── */

function WelcomeScreen({
  onPrompt,
  orgName,
}: {
  onPrompt: (text: string) => void
  orgName: string
}) {
  const { t } = useTranslation('pages')

  const prompts = SUGGESTED_PROMPTS.map((p) => ({
    icon: p.icon,
    label: t(p.labelKey, p.defaultLabel),
  }))

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-brand/10">
        <Brain size={32} className="text-brand" />
      </div>
      <h2 className="text-xl font-semibold text-black">
        {t('future.welcome', 'Hi! How can I help?')}
      </h2>
      <p className="mt-1 text-sm text-black/50">
        {t('future.welcomeSub', 'Ask me anything about {{org}}', { org: orgName })}
      </p>

      {/* Suggested prompts */}
      <div className="mt-8 grid w-full max-w-lg grid-cols-2 gap-2">
        {prompts.map(({ icon: Icon, label }, i) => (
          <button
            key={i}
            onClick={() => onPrompt(label)}
            className="flex items-center gap-2.5 rounded-xl border border-black/[0.08] bg-white px-3.5 py-3 text-left text-sm text-black/70 transition-colors hover:border-brand/30 hover:bg-brand/[0.03] hover:text-brand"
          >
            <Icon size={16} className="shrink-0 text-brand/70" />
            <span className="leading-snug">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ── Main page ───────────────────────────────────────────────────── */

export function AiPage() {
  const { t } = useTranslation('pages')
  const { currentOrg, membership } = useOrganization()
  const { isGod, profile } = useAuth()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [streamingContent, setStreamingContent] = useState<string | null>(null)
  const [streamingToolCalls, setStreamingToolCalls] = useState<string[]>([])
  const [activeTool, setActiveTool] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [input, setInput] = useState('')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const streamingContentRef = useRef('')
  const streamingToolCallsRef = useRef<string[]>([])
  const abortRef = useRef<AbortController | null>(null)

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingContent, isLoading, scrollToBottom])

  // Auto-grow textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`
  }

  // Reset new chat
  const handleNewChat = () => {
    abortRef.current?.abort()
    setMessages([])
    setStreamingContent(null)
    setStreamingToolCalls([])
    setActiveTool(null)
    setIsLoading(false)
    setInput('')
    streamingContentRef.current = ''
    streamingToolCallsRef.current = []
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  // Send message
  const handleSend = useCallback(
    async (text?: string) => {
      const content = (text ?? input).trim()
      if (!content || isLoading || !currentOrg) return

      setInput('')
      if (inputRef.current) {
        inputRef.current.style.height = 'auto'
      }

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
      }

      setMessages((prev) => [...prev, userMsg])
      setIsLoading(true)
      setStreamingContent(null)
      setActiveTool(null)
      streamingContentRef.current = ''
      streamingToolCallsRef.current = []
      setStreamingToolCalls([])

      // Build conversation history for the API (user+assistant messages only)
      const history = [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content },
      ]

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session?.access_token) throw new Error('Not authenticated')

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
        const edgeFnUrl = `${supabaseUrl}/functions/v1/ai-chat`

        // Determine user role string
        const userRole = isGod ? 'god' : (membership?.role ?? profile?.system_role ?? 'operation')

        abortRef.current = new AbortController()

        const response = await fetch(edgeFnUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: history,
            orgId: currentOrg.id,
            orgName: currentOrg.name,
            userRole,
          }),
          signal: abortRef.current.signal,
        })

        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: 'Unknown error' }))
          throw new Error((err as { error?: string }).error ?? `HTTP ${response.status}`)
        }

        if (!response.body) throw new Error('No response body')

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buf = ''
        let done = false

        while (!done) {
          const { value, done: streamDone } = await reader.read()
          done = streamDone
          if (value) buf += decoder.decode(value, { stream: true })

          const lines = buf.split('\n')
          buf = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const payload = line.slice(6).trim()
            if (!payload) continue

            let evt: StreamEvent
            try {
              evt = JSON.parse(payload)
            } catch {
              continue
            }

            if (evt.type === 'text') {
              streamingContentRef.current += evt.content
              setStreamingContent(streamingContentRef.current)
              setActiveTool(null) // clear tool indicator once text starts
            } else if (evt.type === 'tool_call') {
              setActiveTool(evt.name)
              streamingToolCallsRef.current = [...streamingToolCallsRef.current, evt.name]
              setStreamingToolCalls([...streamingToolCallsRef.current])
            } else if (evt.type === 'done') {
              const finalContent = streamingContentRef.current
              const finalTools = streamingToolCallsRef.current

              const assistantMsg: ChatMessage = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: finalContent,
                toolCalls: finalTools.length > 0 ? finalTools : undefined,
              }

              setMessages((prev) => [...prev, assistantMsg])
              setStreamingContent(null)
              setStreamingToolCalls([])
              setActiveTool(null)
              setIsLoading(false)
              streamingContentRef.current = ''
              streamingToolCallsRef.current = []
            } else if (evt.type === 'error') {
              throw new Error(evt.message)
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          // User cancelled — finalize whatever was streamed
          if (streamingContentRef.current) {
            setMessages((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: streamingContentRef.current,
                toolCalls:
                  streamingToolCallsRef.current.length > 0
                    ? streamingToolCallsRef.current
                    : undefined,
              },
            ])
          }
        } else {
          const errMsg =
            err instanceof Error ? err.message : t('future.error', 'Failed to get a response.')
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: errMsg,
              isError: true,
            },
          ])
        }

        setStreamingContent(null)
        setStreamingToolCalls([])
        setActiveTool(null)
        setIsLoading(false)
        streamingContentRef.current = ''
        streamingToolCallsRef.current = []
      }
    },
    [input, isLoading, currentOrg, messages, isGod, membership, profile, t],
  )

  // Handle Enter key (Shift+Enter for newline)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const hasMessages = messages.length > 0 || isLoading

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center justify-between border-b border-black/[0.06] px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-brand/10">
            <Brain size={18} className="text-brand" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-black">
              {t('future.title', 'AI Assistant')}
            </h1>
            <p className="text-[11px] text-black/40">
              {t('future.model', 'Claude claude-sonnet-4-6')}
            </p>
          </div>
        </div>

        {hasMessages && (
          <button
            onClick={handleNewChat}
            className="flex items-center gap-1.5 rounded-lg border border-black/[0.08] px-3 py-1.5 text-xs text-black/50 transition-colors hover:border-black/20 hover:text-black/70"
          >
            <ArrowClockwise size={12} />
            {t('future.newChat', 'New chat')}
          </button>
        )}
      </div>

      {/* ── Messages area ──────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-y-auto">
        {!hasMessages && streamingContent === null ? (
          <WelcomeScreen orgName={currentOrg?.name ?? ''} onPrompt={(text) => handleSend(text)} />
        ) : (
          <div className="flex flex-col gap-4 px-4 py-5 md:px-6">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}

            {/* Streaming message */}
            {streamingContent !== null && (
              <StreamingBubble content={streamingContent} toolCalls={streamingToolCalls} />
            )}

            {/* Loading / tool indicator (before any text arrives) */}
            {isLoading && streamingContent === null && (
              <TypingIndicator toolLabel={activeTool ? formatToolName(activeTool, t) : null} />
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ── Input area ─────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-black/[0.06] px-4 py-3 md:px-6">
        <div className="flex items-end gap-2 rounded-2xl border border-black/[0.1] bg-white px-4 py-2.5 shadow-sm focus-within:border-brand/40 focus-within:ring-2 focus-within:ring-brand/10">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={t('future.placeholder', 'Ask about your data...')}
            disabled={isLoading || !currentOrg}
            className="flex-1 resize-none bg-transparent text-sm text-black/90 placeholder:text-black/30 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            style={{ maxHeight: '160px' }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading || !currentOrg}
            className="mb-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-brand text-white transition-opacity hover:opacity-90 disabled:opacity-30"
          >
            {isLoading ? (
              <Spinner size={14} className="animate-spin" />
            ) : (
              <PaperPlaneTilt size={14} weight="fill" />
            )}
          </button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-black/25">
          {t('future.disclaimer', 'Read-only access · Responses may contain errors')}
        </p>
      </div>
    </div>
  )
}
