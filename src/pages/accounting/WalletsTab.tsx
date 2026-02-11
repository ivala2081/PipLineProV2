import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Wallet as WalletIcon } from '@phosphor-icons/react'
import type { UseWalletsQueryReturn } from './walletTypes'
import { Skeleton } from '@ds'
import { WalletCard } from './WalletCard'
import { WalletDetailSheet } from './WalletDetailSheet'
import type { Wallet } from '@/lib/database.types'

interface WalletsTabProps {
  wallets: UseWalletsQueryReturn
}

export function WalletsTab({ wallets }: WalletsTabProps) {
  const { t } = useTranslation('pages')
  const [detailWallet, setDetailWallet] = useState<Wallet | null>(null)

  if (wallets.isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-black/[0.06] bg-bg1 p-5"
          >
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
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-black/[0.06] bg-bg1 py-20">
        <div className="flex size-12 items-center justify-center rounded-full bg-black/[0.04]">
          <WalletIcon size={20} className="text-black/30" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-black/60">
            {t('accounting.wallets.empty.title')}
          </p>
          <p className="mt-1 text-xs text-black/40">
            {t('accounting.wallets.empty.description')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {wallets.wallets.map((wallet) => (
          <WalletCard
            key={wallet.id}
            wallet={wallet}
            onViewDetail={() => setDetailWallet(wallet)}
            onDelete={() => wallets.deleteWallet(wallet.id)}
          />
        ))}
      </div>

      <WalletDetailSheet
        wallet={detailWallet}
        onClose={() => setDetailWallet(null)}
      />
    </>
  )
}
