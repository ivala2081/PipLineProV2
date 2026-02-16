/**
 * Hardcoded lookup data for transfers
 * These are not adjustable and serve as the source of truth for:
 * - Transfer Types (Client, Payment, Blocked)
 * - Categories (DEP, WD)
 * - Payment Methods (Bank, Credit Card, Tether)
 */

export interface TransferType {
  id: string
  name: string
  aliases: string[]
}

export interface TransferCategory {
  id: string
  name: string
  is_deposit: boolean
  aliases: string[]
}

export interface PaymentMethod {
  id: string
  name: string
  aliases: string[]
}

// Transfer Types
export const TRANSFER_TYPES: TransferType[] = [
  {
    id: 'client',
    name: 'Client',
    aliases: [
      'client',
      'CLIENT',
      'Client',
      'müşteri',
      'musteri',
      'Müşteri',
      'Musteri',
      'MÜŞTERİ',
      'MUSTERI',
      'customer',
      'CUSTOMER',
    ],
  },
  {
    id: 'payment',
    name: 'Payment',
    aliases: [
      'payment',
      'PAYMENT',
      'Payment',
      'ödeme',
      'odeme',
      'Ödeme',
      'Odeme',
      'ÖDEME',
      'ODEME',
    ],
  },
  {
    id: 'blocked',
    name: 'Blocked',
    aliases: [
      'blocked',
      'BLOCKED',
      'Blocked',
      'bloke',
      'Bloke',
      'BLOKE',
      'bloke hesap',
      'Bloke Hesap',
      'BLOKE HESAP',
      'engellendi',
      'Engellendi',
      'ENGELLENDI',
    ],
  },
]

// Categories
export const TRANSFER_CATEGORIES: TransferCategory[] = [
  {
    id: 'dep',
    name: 'DEP',
    is_deposit: true,
    aliases: [
      'dep',
      'DEP',
      'Dep',
      'deposit',
      'DEPOSIT',
      'Deposit',
      'yatırım',
      'yatirim',
      'Yatırım',
      'Yatirim',
      'YATIRIM',
      'YATIRIM',
    ],
  },
  {
    id: 'wd',
    name: 'WD',
    is_deposit: false,
    aliases: [
      'wd',
      'WD',
      'Wd',
      'withdraw',
      'WITHDRAW',
      'Withdraw',
      'withdrawal',
      'WITHDRAWAL',
      'Withdrawal',
      'çekim',
      'cekim',
      'Çekim',
      'Cekim',
      'ÇEKİM',
      'CEKIM',
      'çekme',
      'cekme',
      'Çekme',
      'Cekme',
      'ÇEKME',
      'CEKME',
    ],
  },
]

// Payment Methods
export const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'bank',
    name: 'Bank',
    aliases: [
      'bank',
      'BANK',
      'Bank',
      'banka',
      'Banka',
      'BANKA',
      'banks',
      'Banks',
      'BANKS',
      'iban',
      'IBAN',
      'Iban',
    ],
  },
  {
    id: 'credit-card',
    name: 'Credit Card',
    aliases: [
      'credit card',
      'CREDIT CARD',
      'Credit Card',
      'credit-card',
      'CREDIT-CARD',
      'Credit-Card',
      'kredi kartı',
      'kredi karti',
      'Kredi Kartı',
      'Kredi Karti',
      'KREDİ KARTI',
      'KREDI KARTI',
      'card',
      'Card',
      'CARD',
    ],
  },
  {
    id: 'tether',
    name: 'Tether',
    aliases: ['tether', 'TETHER', 'Tether', 'usdt', 'USDT', 'Usdt'],
  },
]

// Helper functions to find lookups by alias (useful for CSV import)
export function findTypeByAlias(alias: string): TransferType | undefined {
  const normalized = alias.toLowerCase().trim()
  return TRANSFER_TYPES.find((type) => type.aliases.some((a) => a.toLowerCase() === normalized))
}

export function findCategoryByAlias(alias: string): TransferCategory | undefined {
  const normalized = alias.toLowerCase().trim()
  return TRANSFER_CATEGORIES.find((cat) => cat.aliases.some((a) => a.toLowerCase() === normalized))
}

export function findPaymentMethodByAlias(alias: string): PaymentMethod | undefined {
  const normalized = alias.toLowerCase().trim()
  return PAYMENT_METHODS.find((pm) => pm.aliases.some((a) => a.toLowerCase() === normalized))
}
