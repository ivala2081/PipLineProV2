import { useState, useMemo } from 'react'
import { Command } from 'cmdk'
import { CaretUpDown, Check } from '@phosphor-icons/react'
import { Popover, PopoverTrigger, PopoverContent } from '@ds'
import { CURRENCIES, getCurrency } from '@/lib/currencies'
import { cn } from '@ds/utils'

const CRYPTO_CURRENCIES = [{ code: 'USDT', name: 'Tether', symbol: '₮' }]

function getCryptoCurrency(code: string) {
  return CRYPTO_CURRENCIES.find((c) => c.code === code)
}

interface CurrencySelectProps {
  value: string
  onChange: (code: string) => void
  disabled?: boolean
}

export function CurrencySelect({ value, onChange, disabled }: CurrencySelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const selected = getCurrency(value) ?? getCryptoCurrency(value)

  const filteredCrypto = useMemo(() => {
    if (!query) return CRYPTO_CURRENCIES
    const q = query.toLowerCase()
    return CRYPTO_CURRENCIES.filter(
      (c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q),
    )
  }, [query])

  const filtered = useMemo(() => {
    if (!query) return CURRENCIES
    const q = query.toLowerCase()
    return CURRENCIES.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q),
    )
  }, [query])

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) setQuery('')
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'flex h-9 w-full items-center justify-between rounded-lg border border-black/10 bg-bg1 px-3 py-2 text-sm shadow-sm transition-colors',
            'hover:border-black/20 focus:outline-none focus:ring-2 focus:ring-black/10',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          {selected ? (
            <span className="flex items-center gap-2">
              <span className="font-mono font-semibold">{selected.code}</span>
              <span className="text-black/60">{selected.name}</span>
              <span className="ml-1 text-black/40">{selected.symbol}</span>
            </span>
          ) : (
            <span className="text-black/40">Select currency…</span>
          )}
          <CaretUpDown size={14} className="shrink-0 text-black/40" />
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-[320px] p-0" sideOffset={6}>
        <Command shouldFilter={false}>
          <div className="border-b border-black/10 px-3 py-2">
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Search currency…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-black/35"
            />
          </div>
          <Command.List className="max-h-60 overflow-y-auto p-1">
            {filteredCrypto.length === 0 && filtered.length === 0 && (
              <Command.Empty className="px-4 py-6 text-center text-xs text-black/40">
                No currency found.
              </Command.Empty>
            )}

            {/* Crypto section */}
            {filteredCrypto.length > 0 && (
              <>
                <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-black/35">
                  Crypto
                </div>
                {filteredCrypto.map((currency) => (
                  <Command.Item
                    key={currency.code}
                    value={currency.code}
                    onSelect={() => {
                      onChange(currency.code)
                      handleOpenChange(false)
                    }}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm',
                      'hover:bg-black/5 aria-selected:bg-black/5',
                    )}
                  >
                    <span className="w-12 font-mono text-xs font-semibold">{currency.code}</span>
                    <span className="flex-1 text-black/80">{currency.name}</span>
                    <span className="w-8 text-right text-xs text-black/40">{currency.symbol}</span>
                    {currency.code === value && <Check size={14} className="shrink-0 text-black" />}
                  </Command.Item>
                ))}
                {filtered.length > 0 && <div className="mx-1 my-1 border-t border-black/[0.06]" />}
              </>
            )}

            {/* Fiat section */}
            {filtered.length > 0 && (
              <>
                <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-black/35">
                  Fiat
                </div>
                {filtered.map((currency) => (
                  <Command.Item
                    key={currency.code}
                    value={currency.code}
                    onSelect={() => {
                      onChange(currency.code)
                      handleOpenChange(false)
                    }}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm',
                      'hover:bg-black/5 aria-selected:bg-black/5',
                    )}
                  >
                    <span className="w-12 font-mono text-xs font-semibold">{currency.code}</span>
                    <span className="flex-1 text-black/80">{currency.name}</span>
                    <span className="w-8 text-right text-xs text-black/40">{currency.symbol}</span>
                    {currency.code === value && <Check size={14} className="shrink-0 text-black" />}
                  </Command.Item>
                ))}
              </>
            )}
          </Command.List>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
