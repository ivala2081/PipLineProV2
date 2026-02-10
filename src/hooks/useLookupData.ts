import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import type { Psp, TransferCategory, PaymentMethod, TransferType } from '@/lib/database.types'

interface LookupData {
  psps: Psp[]
  categories: TransferCategory[]
  paymentMethods: PaymentMethod[]
  transferTypes: TransferType[]
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useLookupData(): LookupData {
  const { currentOrg } = useOrganization()
  const [psps, setPsps] = useState<Psp[]>([])
  const [categories, setCategories] = useState<TransferCategory[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [transferTypes, setTransferTypes] = useState<TransferType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    if (!currentOrg) {
      setPsps([])
      setCategories([])
      setPaymentMethods([])
      setTransferTypes([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    const orgId = currentOrg.id

    const [pspsRes, categoriesRes, methodsRes, typesRes] = await Promise.all([
      supabase
        .from('psps')
        .select('*')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('transfer_categories')
        .select('*')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('payment_methods')
        .select('*')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('transfer_types')
        .select('*')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .order('name'),
    ])

    const firstError =
      pspsRes.error || categoriesRes.error || methodsRes.error || typesRes.error

    if (firstError) {
      setError(firstError.message)
    } else {
      setPsps(pspsRes.data ?? [])
      setCategories(categoriesRes.data ?? [])
      setPaymentMethods(methodsRes.data ?? [])
      setTransferTypes(typesRes.data ?? [])
    }

    setIsLoading(false)
  }, [currentOrg])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  return {
    psps,
    categories,
    paymentMethods,
    transferTypes,
    isLoading,
    error,
    refresh: fetchAll,
  }
}
