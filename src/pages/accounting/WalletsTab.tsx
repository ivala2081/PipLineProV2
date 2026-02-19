import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Wallet as WalletIcon } from '@phosphor-icons/react'
import type { UseWalletsQueryReturn } from './walletTypes'
import { Skeleton, EmptyState } from '@ds'
import { WalletCard } from './WalletCard'
import { WalletDetailSheet } from './WalletDetailSheet'
import { PortfolioSummary } from './PortfolioSummary'
import { usePortfolioQuery } from '@/hooks/queries/usePortfolioQuery'
import type { Wallet } from '@/lib/database.types'

interface WalletsTabProps {
  wallets: UseWalletsQueryReturn
}

export function WalletsTab({ wallets }: WalletsTabProps) {
  const { t } = useTranslation('pages')
  const [detailWallet, setDetailWallet] = useState<Wallet | null>(null)

  const portfolio = usePortfolioQuery(wallets.wallets)

  if (wallets.isLoading) {
    return (
      <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-black/10 bg-bg1 p-card">
            <Skeleton className="mb-3 h-5 w-32 rounded" />
            <Skeleton className="mb-2 h-4 w-48 rounded" />
            <Skeleton className="mb-4 h-3 w-24 rounded" />
            <Skeleton className="h-8 w-full rounded" />
          </div>
        ))}
      </div>
    )
  }

  if (wallets.wallets.length === 0) {
    return (
      <EmptyState
        icon={WalletIcon}
        title={t('accounting.wallets.empty.title')}
        description={t('accounting.wallets.empty.description')}
      />
    )
  }

  return (
    <div className="space-y-lg">
      {/* Portfolio dashboard */}
      <PortfolioSummary
        totalUsd={portfolio.totalUsd}
        tokenAllocation={portfolio.tokenAllocation}
        chainAllocation={portfolio.chainAllocation}
        isLoading={portfolio.isLoading}
      />

      {/* Wallet cards */}
      <div className="grid grid-cols-1 gap-md xl:grid-cols-2">
        {wallets.wallets.map((wallet) => (
          <WalletCard
            key={wallet.id}
            wallet={wallet}
            onViewDetail={() => setDetailWallet(wallet)}
            onDelete={() => wallets.deleteWallet(wallet.id)}
          />
        ))}
      </div>

      <WalletDetailSheet wallet={detailWallet} onClose={() => setDetailWallet(null)} />
    </div>
  )
}
