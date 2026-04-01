export type IBTier = 'starter' | 'bronze' | 'silver' | 'gold' | 'platinum'

export function getIBTier(ftdCount: number): IBTier {
  if (ftdCount >= 100) return 'platinum'
  if (ftdCount >= 50) return 'gold'
  if (ftdCount >= 20) return 'silver'
  if (ftdCount >= 5) return 'bronze'
  return 'starter'
}

export function getTierVariant(tier: IBTier): 'default' | 'warning' | 'info' | 'success' | 'brand' {
  const map: Record<IBTier, 'default' | 'warning' | 'info' | 'success' | 'brand'> = {
    starter: 'default',
    bronze: 'warning',
    silver: 'info',
    gold: 'success',
    platinum: 'brand',
  }
  return map[tier]
}
