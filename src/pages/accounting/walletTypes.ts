import type { Wallet } from '@/lib/database.types'
import type { WalletFormValues } from '@/schemas/accountingSchema'

export interface UseWalletsQueryReturn {
  wallets: Wallet[]
  isLoading: boolean
  error: string | null
  createWallet: (data: WalletFormValues) => Promise<void>
  updateWallet: (id: string, data: WalletFormValues) => Promise<void>
  deleteWallet: (id: string) => Promise<void>
  isCreating: boolean
  isUpdating: boolean
  isDeleting: boolean
}
