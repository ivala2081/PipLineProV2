// Test validation with hardcoded lookups
const TRANSFER_TYPES = [
  {
    id: 'client',
    name: 'Client',
    aliases: ['client', 'CLIENT', 'Client', 'müşteri', 'musteri', 'Müşteri', 'Musteri', 'MÜŞTERİ', 'MUSTERI', 'customer', 'CUSTOMER'],
  },
]

const TRANSFER_CATEGORIES = [
  {
    id: 'dep',
    name: 'DEP',
    is_deposit: true,
    aliases: ['dep', 'DEP', 'Dep', 'deposit', 'DEPOSIT', 'Deposit', 'yatırım', 'yatirim', 'Yatırım', 'Yatirim', 'YATIRIM'],
  },
  {
    id: 'wd',
    name: 'WD',
    is_deposit: false,
    aliases: ['wd', 'WD', 'Wd', 'withdraw', 'WITHDRAW', 'Withdraw', 'withdrawal', 'WITHDRAWAL', 'Withdrawal', 'çekim', 'cekim', 'Çekim', 'Cekim', 'ÇEKİM', 'CEKIM', 'çekme', 'cekme', 'Çekme', 'Cekme', 'ÇEKME', 'CEKME'],
  },
]

const PAYMENT_METHODS = [
  {
    id: 'bank',
    name: 'Bank',
    aliases: ['bank', 'BANK', 'Bank', 'banka', 'Banka', 'BANKA', 'banks', 'Banks', 'BANKS', 'iban', 'IBAN', 'Iban'],
  },
  {
    id: 'tether',
    name: 'Tether',
    aliases: ['tether', 'TETHER', 'Tether', 'usdt', 'USDT', 'Usdt'],
  },
]

// Build lookup maps
const pmMap = new Map()
for (const m of PAYMENT_METHODS) {
  pmMap.set(m.name.toLowerCase(), m)
  for (const alias of m.aliases ?? []) pmMap.set(alias.toLowerCase(), m)
}

const catMap = new Map()
for (const c of TRANSFER_CATEGORIES) {
  catMap.set(c.name.toLowerCase(), c)
  for (const alias of c.aliases ?? []) catMap.set(alias.toLowerCase(), c)
}

const typeMap = new Map()
for (const type of TRANSFER_TYPES) {
  typeMap.set(type.name.toLowerCase(), type)
  for (const alias of type.aliases ?? []) typeMap.set(alias.toLowerCase(), type)
}

// Test CSV values
const csvValues = [
  { name: 'YATIRIM', mapName: 'category', map: catMap },
  { name: 'MÜŞTERİ', mapName: 'type', map: typeMap },
  { name: 'BANKA', mapName: 'payment method', map: pmMap },
  { name: 'Tether', mapName: 'payment method', map: pmMap },
  { name: 'ÇEKME', mapName: 'category', map: catMap },
]

console.log('=== Lookup Map Test ===\n')
csvValues.forEach(({ name, mapName, map }) => {
  const key = name.toLowerCase()
  const found = map.get(key)
  console.log(`"${name}" (${mapName}):`)
  console.log(`  Lookup key: "${key}"`)
  console.log(`  Found: ${found ? `✅ ${found.id} (${found.name})` : '❌ NOT FOUND'}`)
  console.log()
})
