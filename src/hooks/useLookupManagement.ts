import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/app/providers/OrganizationProvider'

type LookupTable = 'psps' | 'transfer_categories' | 'payment_methods' | 'transfer_types'

interface LookupItem {
  id: string
  organization_id: string
  name: string
  is_active: boolean
  created_at: string
  updated_at: string
  [key: string]: unknown
}

interface UseLookupManagementReturn {
  items: LookupItem[]
  isLoading: boolean
  error: string | null
  createItem: (data: Record<string, unknown>) => Promise<{ error: string | null }>
  updateItem: (id: string, data: Record<string, unknown>) => Promise<{ error: string | null }>
  deleteItem: (id: string) => Promise<{ error: string | null }>
  refresh: () => Promise<void>
}

export function useLookupManagement(table: LookupTable): UseLookupManagementReturn {
  const { currentOrg } = useOrganization()
  const [items, setItems] = useState<LookupItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchItems = useCallback(async () => {
    if (!currentOrg) {
      setItems([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from(table)
      .select('*')
      .eq('organization_id', currentOrg.id)
      .order('name')

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setItems((data as LookupItem[]) ?? [])
    }

    setIsLoading(false)
  }, [currentOrg, table])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const createItem = useCallback(
    async (data: Record<string, unknown>): Promise<{ error: string | null }> => {
      if (!currentOrg) return { error: 'No organization selected' }

      const { error: insertError } = await supabase.from(table).insert({
        organization_id: currentOrg.id,
        ...data,
      })

      if (!insertError) await fetchItems()
      return { error: insertError?.message ?? null }
    },
    [currentOrg, table, fetchItems],
  )

  const updateItem = useCallback(
    async (id: string, data: Record<string, unknown>): Promise<{ error: string | null }> => {
      const { error: updateError } = await supabase
        .from(table)
        .update(data)
        .eq('id', id)

      if (!updateError) await fetchItems()
      return { error: updateError?.message ?? null }
    },
    [table, fetchItems],
  )

  const deleteItem = useCallback(
    async (id: string): Promise<{ error: string | null }> => {
      const { error: deleteError } = await supabase
        .from(table)
        .delete()
        .eq('id', id)

      if (!deleteError) await fetchItems()
      return { error: deleteError?.message ?? null }
    },
    [table, fetchItems],
  )

  return {
    items,
    isLoading,
    error,
    createItem,
    updateItem,
    deleteItem,
    refresh: fetchItems,
  }
}
