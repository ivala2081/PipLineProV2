import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from '@phosphor-icons/react'
import { cn } from '@ds'

interface AliasTagInputProps {
  value: string[]
  onChange: (v: string[]) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function AliasTagInput({
  value,
  onChange,
  placeholder,
  disabled,
  className,
}: AliasTagInputProps) {
  const { t } = useTranslation('pages')
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const commit = () => {
    const trimmed = input.trim()
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed])
    }
    setInput('')
  }

  const remove = (alias: string) => {
    onChange(value.filter((a) => a !== alias))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commit()
    }
    if (e.key === 'Backspace' && !input && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div
      className={cn(
        'flex min-h-[42px] flex-wrap items-start gap-1.5 rounded-xl bg-bg2/75',
        'px-2.5 py-2 cursor-text transition-all',
        'inset-ring inset-ring-black/15',
        'focus-within:ring-4 focus-within:ring-brand/20 focus-within:inset-ring-brand/55',
        disabled && 'cursor-not-allowed opacity-50 pointer-events-none',
        className,
      )}
      onClick={() => !disabled && inputRef.current?.focus()}
    >
      {value.map((alias) => (
        <span
          key={alias}
          className="inline-flex items-center gap-1 rounded-lg bg-black/[0.07] px-2 py-0.5 font-mono text-[11px] text-black/55 transition-colors hover:bg-black/10"
        >
          {alias}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.stopPropagation()
              remove(alias)
            }}
            className="rounded-sm text-black/30 transition-colors hover:text-black/70"
          >
            <X size={9} weight="bold" />
          </button>
        </span>
      ))}

      <input
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commit}
        disabled={disabled}
        className="min-w-[6rem] flex-1 bg-transparent text-sm outline-none placeholder:text-black/30"
        placeholder={
          value.length === 0 ? (placeholder ?? t('transfers.settings.aliasesPlaceholder')) : ''
        }
      />
    </div>
  )
}
