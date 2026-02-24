import {
  TRANSFER_TYPES,
  TRANSFER_CATEGORIES,
  PAYMENT_METHODS,
  type TransferType,
  type TransferCategory,
  type PaymentMethod,
} from '@/lib/transferLookups'
import { usePspsQuery, type Psp } from './usePspsQuery'

export interface LookupQueries {
  categories: TransferCategory[]
  paymentMethods: PaymentMethod[]
  transferTypes: TransferType[]
  psps: Psp[]
  isLoading: boolean
  isError: boolean
  error: Error | null
}

/**
 * Lookup data hook — returns fixed business constants from transferLookups.ts
 * combined with PSPs fetched from the database.
 *
 * Types, categories, and payment methods are intentionally hardcoded constants
 * (see src/lib/transferLookups.ts). Only PSPs come from the database.
 */
export function useLookupQueries(): LookupQueries {
  const { psps, isLoading: pspsLoading, error: pspsError } = usePspsQuery()

  return {
    categories: TRANSFER_CATEGORIES,
    paymentMethods: PAYMENT_METHODS,
    transferTypes: TRANSFER_TYPES,
    psps,
    isLoading: pspsLoading,
    isError: !!pspsError,
    error: pspsError ? new Error(pspsError) : null,
  }
}
