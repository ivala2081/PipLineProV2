export interface ChatMessage {
  role: 'user' | 'model'
  text: string
}

export interface GeminiModel {
  id: string
  label: string
}

export const GEMINI_MODELS: GeminiModel[] = [
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite' },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
]

export const DEFAULT_MODEL = GEMINI_MODELS[0].id

const SYSTEM_INSTRUCTION = `You are the AI assistant for PipLinePro V2, a multi-tenant financial operations platform.

Key features of PipLinePro:
- **Transfers**: Track financial transfers with categories, payment methods, PSPs (payment service providers), types, currencies (TL/USD), commission calculations, and exchange rates.
- **Accounting**: Ledger for expenses/transfers and crypto wallet management via Tatum API (tron, ethereum, bsc, bitcoin, solana chains).
- **Organizations**: Multi-tenant architecture where users belong to organizations with roles (admin, operation).
- **Members**: User management within organizations with role-based access control.
- **PSPs**: Payment service providers with configurable commission rates per category.

Tech stack: React 19, TypeScript, Vite, Tailwind CSS, Radix UI, Supabase (auth + database + RLS), React Router, React Query.

Answer questions about the system clearly and helpfully. If you don't know something specific about the implementation, say so honestly. You can help with understanding features, troubleshooting, and general guidance about the platform.`

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

export async function sendMessage(messages: ChatMessage[], modelId: string = DEFAULT_MODEL): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY

  if (!apiKey) {
    throw new Error('VITE_GEMINI_API_KEY is not configured')
  }

  const contents = messages.map((msg) => ({
    role: msg.role,
    parts: [{ text: msg.text }],
  }))

  const response = await fetch(`${API_BASE}/${modelId}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: SYSTEM_INSTRUCTION }],
      },
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    throw new Error(errorData?.error?.message ?? `Gemini API error: ${response.status}`)
  }

  const data = await response.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text

  if (!text) {
    throw new Error('No response from Gemini')
  }

  return text
}
