import { useState, useRef, useEffect, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { PaperPlaneRight, Brain, User, CircleNotch, CaretDown } from '@phosphor-icons/react'
import { Button, Card } from '@ds'
import { sendMessage, GEMINI_MODELS, DEFAULT_MODEL, type ChatMessage } from '@/lib/geminiService'

const STORAGE_KEY = 'piplinepro-gemini-model'

interface DisplayMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
}

export function FuturePage() {
  const { t } = useTranslation('pages')
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState(() =>
    localStorage.getItem(STORAGE_KEY) ?? DEFAULT_MODEL,
  )
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId)
    localStorage.setItem(STORAGE_KEY, modelId)
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || isLoading) return

    setError(null)
    setInput('')

    const userMsg: DisplayMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: trimmed,
    }

    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setIsLoading(true)

    try {
      // Build conversation history for Gemini
      const history: ChatMessage[] = updatedMessages.map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        text: m.text,
      }))

      const response = await sendMessage(history, selectedModel)

      const assistantMsg: DisplayMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: response,
      }

      setMessages((prev) => [...prev, assistantMsg])
    } catch (err) {
      setError(err instanceof Error ? err.message : t('future.error'))
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as FormEvent)
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t('future.title')}</h1>
          <p className="mt-1 text-sm text-black/60">{t('future.subtitle')}</p>
        </div>
        <div className="relative shrink-0">
          <select
            value={selectedModel}
            onChange={(e) => handleModelChange(e.target.value)}
            disabled={isLoading}
            className="appearance-none rounded-lg border border-black/10 bg-bg1 py-1.5 pl-3 pr-8 text-xs font-medium text-black/70 transition hover:border-black/20 focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-50"
          >
            {GEMINI_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          <CaretDown
            size={12}
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-black/40"
          />
        </div>
      </div>

      {/* Chat area */}
      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden border border-black/5 bg-bg1">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                <Brain size={28} weight="duotone" />
              </div>
              <p className="max-w-md text-sm text-black/50">
                {t('future.welcome')}
              </p>
            </div>
          )}

          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
                    msg.role === 'user'
                      ? 'bg-brand/10 text-brand'
                      : 'bg-black/5 text-black/50'
                  }`}
                >
                  {msg.role === 'user' ? <User size={16} /> : <Brain size={16} weight="duotone" />}
                </div>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-brand text-white'
                      : 'bg-black/[0.04] text-black/80'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-black/5 text-black/50">
                  <Brain size={16} weight="duotone" />
                </div>
                <div className="flex items-center gap-2 rounded-2xl bg-black/[0.04] px-4 py-2.5 text-sm text-black/50">
                  <CircleNotch size={14} className="animate-spin" />
                  {t('future.thinking')}
                </div>
              </div>
            )}

            {error && (
              <div className="mx-11 rounded-lg bg-red/10 px-3 py-2 text-xs text-red">
                {error}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input bar */}
        <div className="border-t border-black/[0.06] px-4 py-3">
          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('future.placeholder')}
              rows={1}
              className="min-h-[40px] max-h-[120px] flex-1 resize-none rounded-xl bg-black/[0.04] px-4 py-2.5 text-sm text-black placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-brand/20"
              disabled={isLoading}
            />
            <Button
              type="submit"
              variant="filled"
              size="sm"
              disabled={!input.trim() || isLoading}
              className="h-10 w-10 shrink-0 !rounded-xl !p-0"
            >
              <PaperPlaneRight size={18} weight="fill" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  )
}
