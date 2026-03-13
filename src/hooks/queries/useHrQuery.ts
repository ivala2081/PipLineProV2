import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { useAuth } from '@/app/providers/AuthProvider'
import { localDayStart, localDayEnd } from '@/lib/date'
import { queryKeys } from '@/lib/queryKeys'
import type {
  HrDocumentType,
  HrBonusType,
  HrAttendanceStatus,
  HrLeaveType,
} from '@/lib/database.types'

export type HrEmployeeRole = string

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export type HrEmployee = {
  id: string
  organization_id: string
  full_name: string
  email: string
  role: HrEmployeeRole
  salary_tl: number
  salary_currency: 'TL' | 'USD'
  is_insured: boolean
  receives_supplement: boolean
  bank_salary_tl: number | null
  is_active: boolean
  hire_date: string | null
  exit_date: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  documents?: HrDocument[]
}

export type HrDocument = {
  id: string
  employee_id: string
  organization_id: string
  document_type: HrDocumentType
  file_name: string
  file_url: string
  storage_path: string
  uploaded_by: string | null
  created_at: string
}

export type HrEmployeeInsert = {
  full_name: string
  email: string
  role: HrEmployeeRole
  salary_tl?: number
  salary_currency?: 'TL' | 'USD'
  is_insured?: boolean
  receives_supplement?: boolean
  bank_salary_tl?: number | null
  is_active?: boolean
  hire_date?: string | null
  exit_date?: string | null
  notes?: string | null
}

export type HrAttendance = {
  id: string
  employee_id: string
  organization_id: string
  date: string
  status: HrAttendanceStatus
  check_in: string | null
  check_out: string | null
  absent_hours: number | null
  deduction_exempt: boolean
  leave_id: string | null
  notes: string | null
  recorded_by: string | null
  created_at: string
}

export type HrLeave = {
  id: string
  employee_id: string
  organization_id: string
  leave_type: HrLeaveType
  start_date: string
  end_date: string
  notes: string | null
  created_by: string | null
  created_at: string
}

export type HrBonusAgreement = {
  id: string
  employee_id: string
  organization_id: string
  title: string
  description: string | null
  bonus_type: HrBonusType
  currency: string
  fixed_amount: number
  percentage_rate: number
  percentage_base: string | null
  tier_rules: unknown
  is_active: boolean
  effective_from: string | null
  effective_until: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type HrBonusPayment = {
  id: string
  agreement_id: string | null
  employee_id: string
  organization_id: string
  period: string
  amount_usdt: number
  notes: string | null
  paid_at: string | null
  transfer_id: string | null
  created_by: string | null
  created_at: string
  status: 'pending' | 'paid'
}

export const HR_DOCUMENT_TYPES: { type: HrDocumentType; labelTr: string; labelEn: string }[] = [
  { type: 'ikametgah', labelTr: 'İkametgâh Belgesi', labelEn: 'Residence Certificate' },
  { type: 'adli_sicil', labelTr: 'Adli Sicil Kaydı', labelEn: 'Criminal Record' },
  { type: 'saglik_raporu', labelTr: 'Sağlık Raporu', labelEn: 'Health Report' },
  { type: 'kimlik_on', labelTr: 'Kimlik Ön Yüz', labelEn: 'ID Card (Front)' },
  { type: 'kimlik_arka', labelTr: 'Kimlik Arka Yüz', labelEn: 'ID Card (Back)' },
]

export const HR_EMPLOYEE_ROLES: HrEmployeeRole[] = [
  'Manager',
  'Marketing',
  'Marketing Manager',
  'Operation',
  'Retention',
  'Retention Manager',
  'Project Management',
  'Social Media',
  'Sales Development',
  'Programmer',
  'Sales',
]

/* ------------------------------------------------------------------ */
/*  Query Keys                                                          */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  MT Config Types                                                    */
/* ------------------------------------------------------------------ */

export type MtTier = { min: number; bonus: number }

export type MtConfig = {
  deposit_tiers: MtTier[]
  count_tiers: MtTier[]
  volume_tiers: MtTier[]
  weekly_prize_amount: number
  weekly_prize_min_sales: number
  monthly_prize_amount: number
  monthly_prize_min_sales: number
}

/* ------------------------------------------------------------------ */
/*  RE Config Types                                                    */
/* ------------------------------------------------------------------ */

export type ReTier = { min: number; rate: number }

export type ReConfig = {
  rate_tiers: ReTier[]
}

export const DEFAULT_RE_CONFIG: ReConfig = {
  rate_tiers: [{ min: 0, rate: 5.75 }],
}

/* ------------------------------------------------------------------ */
/*  HR Settings Types                                                  */
/* ------------------------------------------------------------------ */

export type HrSettings = {
  roles: string[]
  supplement_tl: number
  supplement_currency: 'TL' | 'USD'
  insured_bank_amount_tl: number
  insured_bank_currency: 'TL' | 'USD'
  absence_full_day_divisor: number
  absence_half_day_divisor: number
  absence_hourly_divisor: number
  daily_deduction_enabled: boolean
  hourly_deduction_enabled: boolean
  standard_check_in: string
  standard_check_out: string
  timezone: string
  weekend_off: boolean
  barem_roles: string[]
}

export const DEFAULT_HR_SETTINGS: HrSettings = {
  roles: [
    'Manager',
    'Marketing',
    'Marketing Manager',
    'Operation',
    'Retention',
    'Retention Manager',
    'Project Management',
    'Social Media',
    'Sales Development',
    'Programmer',
    'Sales',
  ],
  supplement_tl: 4000,
  supplement_currency: 'TL' as const,
  insured_bank_amount_tl: 28075.50,
  insured_bank_currency: 'TL' as const,
  absence_full_day_divisor: 30,
  absence_half_day_divisor: 60,
  absence_hourly_divisor: 240,
  daily_deduction_enabled: true,
  hourly_deduction_enabled: true,
  standard_check_in: '10:00',
  standard_check_out: '18:30',
  timezone: 'Europe/Istanbul',
  weekend_off: true,
  barem_roles: ['Marketing'],
}

export const DEFAULT_MT_CONFIG: MtConfig = {
  deposit_tiers: [
    { min: 10000, bonus: 750 },
    { min: 7500, bonus: 500 },
    { min: 5000, bonus: 350 },
    { min: 4000, bonus: 300 },
    { min: 3000, bonus: 200 },
    { min: 2500, bonus: 175 },
    { min: 2000, bonus: 150 },
    { min: 1000, bonus: 100 },
    { min: 500, bonus: 75 },
    { min: 300, bonus: 50 },
    { min: 100, bonus: 25 },
  ],
  count_tiers: [
    { min: 100, bonus: 4000 },
    { min: 80, bonus: 3000 },
    { min: 70, bonus: 2750 },
    { min: 60, bonus: 2250 },
    { min: 55, bonus: 2000 },
    { min: 50, bonus: 1750 },
    { min: 45, bonus: 1500 },
    { min: 40, bonus: 1250 },
    { min: 30, bonus: 1000 },
    { min: 25, bonus: 750 },
    { min: 20, bonus: 500 },
    { min: 15, bonus: 250 },
  ],
  volume_tiers: [
    { min: 50000, bonus: 1500 },
    { min: 30000, bonus: 750 },
    { min: 20000, bonus: 500 },
    { min: 10000, bonus: 250 },
  ],
  weekly_prize_amount: 50,
  weekly_prize_min_sales: 5,
  monthly_prize_amount: 200,
  monthly_prize_min_sales: 20,
}

/** @deprecated Use `queryKeys.hr` from '@/lib/queryKeys' instead */
export const hrKeys = queryKeys.hr

/* ------------------------------------------------------------------ */
/*  Hooks                                                               */
/* ------------------------------------------------------------------ */

export function useHrEmployeesQuery() {
  const { currentOrg } = useOrganization()
  const orgId = currentOrg?.id ?? ''

  return useQuery({
    queryKey: queryKeys.hr.employees(orgId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_employees')
        .select('*')
        .eq('organization_id', orgId)
        .order('full_name', { ascending: true })

      if (error) throw error
      return (data ?? []) as HrEmployee[]
    },
    enabled: !!orgId,
  })
}

export function useHrEmployeeDocumentsQuery(employeeId: string) {
  const { currentOrg } = useOrganization()
  const orgId = currentOrg?.id ?? ''

  return useQuery({
    queryKey: queryKeys.hr.documents(orgId, employeeId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_employee_documents')
        .select('*')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: true })

      if (error) throw error
      return (data ?? []) as HrDocument[]
    },
    enabled: !!orgId && !!employeeId,
  })
}

export function useHrMutations() {
  const { currentOrg } = useOrganization()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const orgId = currentOrg?.id ?? ''

  const invalidateHrQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.hr.employees(orgId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.hr.salaryPaymentsPrefix(orgId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.hr.bonusAgreements(orgId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.hr.bonusPayments(orgId) }),
    ])
  }

  const createEmployee = useMutation({
    mutationFn: async (payload: HrEmployeeInsert) => {
      const { data, error } = await supabase
        .from('hr_employees')
        .insert({
          ...payload,
          organization_id: orgId,
          created_by: user?.id ?? null,
        })
        .select()
        .single()
      if (error) throw error
      return data as HrEmployee
    },
    onSuccess: invalidateHrQueries,
  })

  const updateEmployee = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<HrEmployeeInsert> }) => {
      const { data, error } = await supabase
        .from('hr_employees')
        .update(payload)
        .eq('id', id)
        .eq('organization_id', orgId)
        .select()
        .single()
      if (error) throw error
      return data as HrEmployee
    },
    onSuccess: invalidateHrQueries,
  })

  const deleteEmployee = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('hr_employees')
        .delete()
        .eq('id', id)
        .eq('organization_id', orgId)
      if (error) throw error
    },
    onSuccess: invalidateHrQueries,
  })

  return { createEmployee, updateEmployee, deleteEmployee }
}

export function useHrDocumentMutations(employeeId: string) {
  const { currentOrg } = useOrganization()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const orgId = currentOrg?.id ?? ''

  const uploadDocument = useMutation({
    mutationFn: async ({ file, documentType }: { file: File; documentType: HrDocumentType }) => {
      const ext = file.name.split('.').pop() ?? 'bin'
      const storagePath = `${orgId}/${employeeId}/${documentType}_${Date.now()}.${ext}`

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('hr-documents')
        .upload(storagePath, file, { upsert: true })

      if (uploadError) throw uploadError

      // Get public URL (or signed URL if private)
      const { data: urlData } = supabase.storage.from('hr-documents').getPublicUrl(storagePath)

      const fileUrl = urlData.publicUrl

      // Insert record
      const { data, error } = await supabase
        .from('hr_employee_documents')
        .insert({
          employee_id: employeeId,
          organization_id: orgId,
          document_type: documentType,
          file_name: file.name,
          file_url: fileUrl,
          storage_path: storagePath,
          uploaded_by: user?.id ?? null,
        })
        .select()
        .single()

      if (error) throw error
      return data as HrDocument
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.hr.documents(orgId, employeeId) })
    },
  })

  const deleteDocument = useMutation({
    mutationFn: async ({ docId, storagePath }: { docId: string; storagePath: string }) => {
      // Delete from storage
      await supabase.storage.from('hr-documents').remove([storagePath])

      // Delete record
      const { error } = await supabase
        .from('hr_employee_documents')
        .delete()
        .eq('id', docId)
        .eq('organization_id', orgId)

      if (error) throw error
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.hr.documents(orgId, employeeId) })
    },
  })

  return { uploadDocument, deleteDocument }
}

/* ------------------------------------------------------------------ */
/*  Bonus Agreements                                                    */
/* ------------------------------------------------------------------ */

export function useBonusAgreementsQuery() {
  const { currentOrg } = useOrganization()
  const orgId = currentOrg?.id ?? ''

  return useQuery({
    queryKey: queryKeys.hr.bonusAgreements(orgId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_bonus_agreements')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as HrBonusAgreement[]
    },
    enabled: !!orgId,
    staleTime: 10 * 60_000, // 10 min – agreements change rarely
    gcTime: 20 * 60_000,
  })
}

export function useBonusPaymentsQuery() {
  const { currentOrg } = useOrganization()
  const orgId = currentOrg?.id ?? ''

  return useQuery({
    queryKey: queryKeys.hr.bonusPayments(orgId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_bonus_payments')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as HrBonusPayment[]
    },
    enabled: !!orgId,
    staleTime: 5 * 60_000, // 5 min – payments change moderately
    gcTime: 10 * 60_000,
  })
}

/** Fetches hr_bonus_payments with status='pending' (variable bonuses not yet processed). */
export function useVariablePendingQuery() {
  const { currentOrg } = useOrganization()
  const orgId = currentOrg?.id ?? ''

  return useQuery({
    queryKey: queryKeys.hr.variablePending(orgId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_bonus_payments')
        .select('*')
        .eq('organization_id', orgId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) {
        // status column may not exist yet (migration not run) — return empty
        console.warn('useVariablePendingQuery:', error.message)
        return [] as HrBonusPayment[]
      }
      return (data ?? []) as HrBonusPayment[]
    },
    enabled: !!orgId,
    staleTime: 5 * 60_000, // 5 min – pending payments change moderately
    gcTime: 10 * 60_000,
  })
}

export function useBonusMutations() {
  const { currentOrg } = useOrganization()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const orgId = currentOrg?.id ?? ''

  const createAgreement = useMutation({
    mutationFn: async (
      payload: Omit<
        HrBonusAgreement,
        'id' | 'organization_id' | 'created_by' | 'created_at' | 'updated_at'
      >,
    ) => {
      const { data, error } = await supabase
        .from('hr_bonus_agreements')
        .insert({
          ...payload,
          organization_id: orgId,
          created_by: user?.id ?? null,
        })
        .select()
        .single()
      if (error) throw error
      return data as HrBonusAgreement
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.hr.bonusAgreements(orgId) })
    },
  })

  const updateAgreement = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<HrBonusAgreement> }) => {
      const { data, error } = await supabase
        .from('hr_bonus_agreements')
        .update(payload)
        .eq('id', id)
        .eq('organization_id', orgId)
        .select()
        .single()
      if (error) throw error
      return data as HrBonusAgreement
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.hr.bonusAgreements(orgId) })
    },
  })

  const deleteAgreement = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('hr_bonus_agreements')
        .delete()
        .eq('id', id)
        .eq('organization_id', orgId)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.hr.bonusAgreements(orgId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.hr.bonusPayments(orgId) })
    },
  })

  const createPayment = useMutation({
    mutationFn: async (payload: {
      agreement_id?: string | null
      employee_id: string
      period: string
      amount_usdt: number
      paid_at?: string | null
      notes?: string | null
      description: string // used for accounting entry
    }) => {
      const paidAt = payload.paid_at ?? new Date().toISOString().split('T')[0]

      // 1. Create hr_bonus_payment
      const { data: payment, error: paymentError } = await supabase
        .from('hr_bonus_payments')
        .insert({
          agreement_id: payload.agreement_id ?? null,
          employee_id: payload.employee_id,
          period: payload.period,
          amount_usdt: payload.amount_usdt,
          paid_at: paidAt,
          notes: payload.notes ?? null,
          status: 'paid',
          organization_id: orgId,
          created_by: user?.id ?? null,
        })
        .select()
        .single()
      if (paymentError) throw paymentError

      // 2. Create accounting entry (so payment is visible in accounting ledger)
      const { error: entryError } = await supabase.from('accounting_entries').insert({
        organization_id: orgId,
        description: payload.description,
        entry_type: 'ODEME',
        direction: 'out',
        amount: payload.amount_usdt,
        currency: 'USDT',
        entry_date: paidAt,
        payment_period: payload.period,
        register: 'USDT',
        hr_payment_id: payment.id,
        hr_payment_type: 'bonus',
        created_by: user?.id ?? null,
      })
      if (entryError) throw entryError

      return payment as HrBonusPayment
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.hr.bonusPayments(orgId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.accounting.all })
    },
  })

  /** Creates a pending variable bonus entry (no accounting — processed during bulk payout). */
  const createVariablePending = useMutation({
    mutationFn: async (payload: {
      agreement_id: string
      employee_id: string
      period: string
      amount_usdt: number
    }) => {
      // Delete any existing pending entry for the same agreement + period
      await supabase
        .from('hr_bonus_payments')
        .delete()
        .eq('organization_id', orgId)
        .eq('agreement_id', payload.agreement_id)
        .eq('period', payload.period)
        .eq('status', 'pending')

      if (payload.amount_usdt <= 0) return null

      const { data, error } = await supabase
        .from('hr_bonus_payments')
        .insert({
          ...payload,
          organization_id: orgId,
          status: 'pending',
          paid_at: null,
          notes: null,
          created_by: user?.id ?? null,
        })
        .select()
        .single()
      if (error) throw error
      return data as HrBonusPayment
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.hr.variablePending(orgId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.hr.bonusPayments(orgId) })
    },
  })

  const updatePayment = useMutation({
    mutationFn: async (payload: {
      id: string
      amount_usdt: number
      period: string
      paid_at: string | null
      notes: string | null
      description: string
    }) => {
      // 1. Update hr_bonus_payments
      const { error: paymentError } = await supabase
        .from('hr_bonus_payments')
        .update({
          amount_usdt: payload.amount_usdt,
          period: payload.period,
          paid_at: payload.paid_at,
          notes: payload.notes,
        })
        .eq('id', payload.id)
        .eq('organization_id', orgId)
      if (paymentError) throw paymentError

      // 2. Update the linked accounting_entries row (matched by hr_payment_id)
      const { error: entryError } = await supabase
        .from('accounting_entries')
        .update({
          amount: payload.amount_usdt,
          entry_date: payload.paid_at ?? new Date().toISOString().split('T')[0],
          payment_period: payload.period,
          description: payload.description,
        })
        .eq('hr_payment_id', payload.id)
        .eq('organization_id', orgId)
      if (entryError) throw entryError
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.hr.bonusPayments(orgId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.accounting.all })
    },
  })

  const deletePayment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('hr_bonus_payments')
        .delete()
        .eq('id', id)
        .eq('organization_id', orgId)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.hr.bonusPayments(orgId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.hr.variablePending(orgId) })
    },
  })

  return {
    createAgreement,
    updateAgreement,
    deleteAgreement,
    createPayment,
    updatePayment,
    createVariablePending,
    deletePayment,
  }
}

/* ------------------------------------------------------------------ */
/*  MT Config Query & Mutation                                         */
/* ------------------------------------------------------------------ */

export function useMtConfigQuery() {
  const { currentOrg } = useOrganization()
  const orgId = currentOrg?.id ?? ''

  return useQuery({
    queryKey: queryKeys.hr.mtConfig(orgId),
    queryFn: async () => {
      const { data } = await supabase
        .from('hr_mt_config')
        .select('*')
        .eq('organization_id', orgId)
        .maybeSingle()

      if (!data) return DEFAULT_MT_CONFIG
      return {
        deposit_tiers: data.deposit_tiers as MtTier[],
        count_tiers: data.count_tiers as MtTier[],
        volume_tiers: data.volume_tiers as MtTier[],
        weekly_prize_amount: Number(data.weekly_prize_amount),
        weekly_prize_min_sales: Number(data.weekly_prize_min_sales),
        monthly_prize_amount: Number(data.monthly_prize_amount),
        monthly_prize_min_sales: Number(data.monthly_prize_min_sales),
      } as MtConfig
    },
    enabled: !!orgId,
    staleTime: 10 * 60_000, // 10 min – config rarely changes
    gcTime: 20 * 60_000,
  })
}

export function useUpdateMtConfigMutation() {
  const { currentOrg } = useOrganization()
  const queryClient = useQueryClient()
  const orgId = currentOrg?.id ?? ''

  return useMutation({
    mutationFn: async (config: MtConfig) => {
      const { error } = await supabase.from('hr_mt_config').upsert(
        {
          organization_id: orgId,
          deposit_tiers: config.deposit_tiers,
          count_tiers: config.count_tiers,
          volume_tiers: config.volume_tiers,
          weekly_prize_amount: config.weekly_prize_amount,
          weekly_prize_min_sales: config.weekly_prize_min_sales,
          monthly_prize_amount: config.monthly_prize_amount,
          monthly_prize_min_sales: config.monthly_prize_min_sales,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'organization_id' },
      )
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.hr.mtConfig(orgId) })
    },
  })
}

/* ------------------------------------------------------------------ */
/*  RE Config Query & Mutation                                         */
/* ------------------------------------------------------------------ */

export function useReConfigQuery() {
  const { currentOrg } = useOrganization()
  const orgId = currentOrg?.id ?? ''

  return useQuery({
    queryKey: queryKeys.hr.reConfig(orgId),
    queryFn: async () => {
      const { data } = await supabase
        .from('hr_re_config')
        .select('*')
        .eq('organization_id', orgId)
        .maybeSingle()

      if (!data) return DEFAULT_RE_CONFIG
      return {
        rate_tiers: data.rate_tiers as ReTier[],
      } as ReConfig
    },
    enabled: !!orgId,
    staleTime: 10 * 60_000, // 10 min – config rarely changes
    gcTime: 20 * 60_000,
  })
}

export function useUpdateReConfigMutation() {
  const { currentOrg } = useOrganization()
  const queryClient = useQueryClient()
  const orgId = currentOrg?.id ?? ''

  return useMutation({
    mutationFn: async (config: ReConfig) => {
      const { error } = await supabase.from('hr_re_config').upsert(
        {
          organization_id: orgId,
          rate_tiers: config.rate_tiers,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'organization_id' },
      )
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.hr.reConfig(orgId) })
    },
  })
}

/* ------------------------------------------------------------------ */
/*  Auto Bonus Transfers Query                                         */
/* ------------------------------------------------------------------ */

export type AutoBonusTransfer = {
  id: string
  employee_id: string
  amount_usd: number
  is_first_deposit: boolean
  category_id: string
  transfer_date: string
}

export function useAutoBonusTransfersQuery(year: number, month: number) {
  const { currentOrg } = useOrganization()
  const orgId = currentOrg?.id ?? ''

  const monthStr = `${year}-${String(month).padStart(2, '0')}`
  const lastDay = new Date(year, month, 0).getDate()
  const dateFrom = localDayStart(`${monthStr}-01`)
  const dateTo = localDayEnd(`${monthStr}-${String(lastDay).padStart(2, '0')}`)

  return useQuery({
    queryKey: queryKeys.hr.autoBonusTransfers(orgId, year, month),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transfers')
        .select('id, employee_id, amount_usd, is_first_deposit, category_id, transfer_date')
        .eq('organization_id', orgId)
        .not('employee_id', 'is', null)
        .gte('transfer_date', dateFrom)
        .lte('transfer_date', dateTo)
        .order('transfer_date', { ascending: true })

      if (error) throw error
      return (data ?? []) as AutoBonusTransfer[]
    },
    enabled: !!orgId,
    staleTime: 5 * 60_000, // 5 min – changes when transfers are created
    gcTime: 10 * 60_000,
  })
}

/* ------------------------------------------------------------------ */
/*  Attendance                                                          */
/* ------------------------------------------------------------------ */

export function useHrAttendanceQuery(date: string) {
  const { currentOrg } = useOrganization()
  const orgId = currentOrg?.id ?? ''

  return useQuery({
    queryKey: queryKeys.hr.attendance(orgId, date),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_attendance')
        .select('*')
        .eq('organization_id', orgId)
        .eq('date', date)
      if (error) throw error
      return (data ?? []) as HrAttendance[]
    },
    enabled: !!orgId && !!date,
    staleTime: 60_000, // 1 min – attendance is tracked in real-time
    gcTime: 5 * 60_000,
  })
}

export function useHrMonthlyAttendanceQuery(year: number, month: number) {
  const { currentOrg } = useOrganization()
  const orgId = currentOrg?.id ?? ''

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(year, month, 0).toISOString().split('T')[0]

  return useQuery({
    queryKey: queryKeys.hr.attendanceMonth(orgId, year, month),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_attendance')
        .select('*')
        .eq('organization_id', orgId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })
      if (error) throw error
      return (data ?? []) as HrAttendance[]
    },
    enabled: !!orgId,
    staleTime: 60_000, // 1 min – attendance is tracked in real-time
    gcTime: 5 * 60_000,
  })
}

export function useHrAttendanceMutations() {
  const { currentOrg } = useOrganization()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const orgId = currentOrg?.id ?? ''

  const upsertAttendance = useMutation({
    mutationFn: async (payload: {
      employee_id: string
      date: string
      status: HrAttendanceStatus
      check_in?: string | null
      check_out?: string | null
      absent_hours?: number | null
      deduction_exempt?: boolean
      notes?: string | null
    }) => {
      const { data, error } = await supabase
        .from('hr_attendance')
        .upsert(
          {
            ...payload,
            organization_id: orgId,
            recorded_by: user?.id ?? null,
          },
          { onConflict: 'employee_id,date' },
        )
        .select()
        .single()
      if (error) throw error
      return data as HrAttendance
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.hr.attendance(orgId, data.date) })
      const d = new Date(data.date)
      void queryClient.invalidateQueries({
        queryKey: queryKeys.hr.attendanceMonth(orgId, d.getFullYear(), d.getMonth() + 1),
      })
    },
  })

  const deleteAttendance = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('hr_attendance')
        .delete()
        .eq('id', id)
        .eq('organization_id', orgId)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.hr.attendanceAll(orgId) })
    },
  })

  const bulkUpsertAttendance = useMutation({
    mutationFn: async (payloads: {
      employee_id: string
      date: string
      status: HrAttendanceStatus
      check_in?: string | null
      check_out?: string | null
      absent_hours?: number | null
      deduction_exempt?: boolean
      notes?: string | null
    }[]) => {
      const rows = payloads.map((p) => ({
        ...p,
        organization_id: orgId,
        recorded_by: user?.id ?? null,
      }))
      const { data, error } = await supabase
        .from('hr_attendance')
        .upsert(rows, { onConflict: 'employee_id,date' })
        .select()
      if (error) throw error
      return data as HrAttendance[]
    },
    onSuccess: (data) => {
      if (data.length > 0) {
        const date = data[0].date
        void queryClient.invalidateQueries({ queryKey: queryKeys.hr.attendance(orgId, date) })
        const d = new Date(date)
        void queryClient.invalidateQueries({
          queryKey: queryKeys.hr.attendanceMonth(orgId, d.getFullYear(), d.getMonth() + 1),
        })
      }
    },
  })

  return { upsertAttendance, deleteAttendance, bulkUpsertAttendance }
}

/* ------------------------------------------------------------------ */
/*  Leaves Queries                                                    */
/* ------------------------------------------------------------------ */

export function useHrLeavesQuery() {
  const { currentOrg } = useOrganization()
  const orgId = currentOrg?.id ?? ''

  return useQuery<HrLeave[]>({
    queryKey: queryKeys.hr.leaves(orgId),
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_leaves')
        .select('*')
        .eq('organization_id', orgId)
        .order('start_date', { ascending: false })
      if (error) throw error
      return data as HrLeave[]
    },
  })
}

export function useHrMonthlyLeavesQuery(year: number, month: number) {
  const { currentOrg } = useOrganization()
  const orgId = currentOrg?.id ?? ''

  const dateFrom = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const dateTo = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  return useQuery<HrLeave[]>({
    queryKey: queryKeys.hr.leavesMonth(orgId, year, month),
    enabled: !!orgId,
    queryFn: async () => {
      // Fetch leaves that overlap with the month range
      const { data, error } = await supabase
        .from('hr_leaves')
        .select('*')
        .eq('organization_id', orgId)
        .lte('start_date', dateTo)
        .gte('end_date', dateFrom)
      if (error) throw error
      return data as HrLeave[]
    },
  })
}

export function useHrLeavesForDateQuery(date: string) {
  const { currentOrg } = useOrganization()
  const orgId = currentOrg?.id ?? ''

  return useQuery<HrLeave[]>({
    queryKey: queryKeys.hr.leavesForDate(orgId, date),
    enabled: !!orgId && !!date,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_leaves')
        .select('*')
        .eq('organization_id', orgId)
        .lte('start_date', date)
        .gte('end_date', date)
      if (error) throw error
      return data as HrLeave[]
    },
  })
}

export function useHrLeaveMutations() {
  const { currentOrg } = useOrganization()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const orgId = currentOrg?.id ?? ''

  const createLeave = useMutation({
    mutationFn: async (payload: {
      employee_id: string
      leave_type: HrLeaveType
      start_date: string
      end_date: string
      notes?: string | null
    }) => {
      const { data, error } = await supabase
        .from('hr_leaves')
        .insert({
          ...payload,
          organization_id: orgId,
          created_by: user?.id ?? null,
        })
        .select()
        .single()
      if (error) throw error
      return data as HrLeave
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.hr.leaves(orgId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.hr.leavesMonthAll(orgId) })
      void queryClient.invalidateQueries({ queryKey: ['hr', orgId, 'leaves-date'] })
    },
  })

  const updateLeave = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string
      payload: {
        employee_id: string
        leave_type: HrLeaveType
        start_date: string
        end_date: string
        notes?: string | null
      }
    }) => {
      const { data, error } = await supabase
        .from('hr_leaves')
        .update(payload)
        .eq('id', id)
        .eq('organization_id', orgId)
        .select()
        .single()
      if (error) throw error
      return data as HrLeave
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.hr.leaves(orgId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.hr.leavesMonthAll(orgId) })
      void queryClient.invalidateQueries({ queryKey: ['hr', orgId, 'leaves-date'] })
    },
  })

  const deleteLeave = useMutation({
    mutationFn: async (id: string) => {
      // Also delete any linked attendance records
      await supabase
        .from('hr_attendance')
        .delete()
        .eq('leave_id', id)
        .eq('organization_id', orgId)
      const { error } = await supabase
        .from('hr_leaves')
        .delete()
        .eq('id', id)
        .eq('organization_id', orgId)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.hr.leaves(orgId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.hr.leavesMonthAll(orgId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.hr.attendanceAll(orgId) })
      void queryClient.invalidateQueries({ queryKey: ['hr', orgId, 'leaves-date'] })
    },
  })

  return { createLeave, updateLeave, deleteLeave }
}

/** Count how many calendar days a leave overlaps with a given month. */
export function countLeaveDaysInMonth(leave: HrLeave, year: number, month: number): number {
  const monthStart = new Date(year, month - 1, 1)
  const monthEnd = new Date(year, month, 0) // last day of month
  const leaveStart = new Date(leave.start_date)
  const leaveEnd = new Date(leave.end_date)

  const overlapStart = leaveStart > monthStart ? leaveStart : monthStart
  const overlapEnd = leaveEnd < monthEnd ? leaveEnd : monthEnd

  if (overlapStart > overlapEnd) return 0

  // Count calendar days (inclusive)
  const diffMs = overlapEnd.getTime() - overlapStart.getTime()
  return Math.floor(diffMs / 86_400_000) + 1
}

/* ------------------------------------------------------------------ */
/*  Absence + Leave combined mutation                                */
/* ------------------------------------------------------------------ */

export function useAbsenceWithLeaveMutation() {
  const { currentOrg } = useOrganization()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const orgId = currentOrg?.id ?? ''

  return useMutation({
    mutationFn: async (payload: {
      employee_id: string
      date: string
      leave_type: HrLeaveType
      notes?: string | null
    }) => {
      // 1. Create leave record (single-day)
      const { data: leave, error: leaveErr } = await supabase
        .from('hr_leaves')
        .insert({
          employee_id: payload.employee_id,
          organization_id: orgId,
          leave_type: payload.leave_type,
          start_date: payload.date,
          end_date: payload.date,
          notes: payload.notes ?? null,
          created_by: user?.id ?? null,
        })
        .select()
        .single()
      if (leaveErr) throw leaveErr

      // 2. Upsert attendance with leave_id link + deduction_exempt
      const { error: attErr } = await supabase
        .from('hr_attendance')
        .upsert(
          {
            employee_id: payload.employee_id,
            organization_id: orgId,
            date: payload.date,
            status: 'absent' as HrAttendanceStatus,
            check_in: null,
            check_out: null,
            absent_hours: null,
            deduction_exempt: true,
            leave_id: (leave as HrLeave).id,
            recorded_by: user?.id ?? null,
          },
          { onConflict: 'employee_id,date' },
        )
      if (attErr) throw attErr

      return leave as HrLeave
    },
    onSuccess: (_data, variables) => {
      const d = new Date(variables.date)
      void queryClient.invalidateQueries({ queryKey: queryKeys.hr.attendance(orgId, variables.date) })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.hr.attendanceMonth(orgId, d.getFullYear(), d.getMonth() + 1),
      })
      void queryClient.invalidateQueries({ queryKey: queryKeys.hr.leaves(orgId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.hr.leavesMonthAll(orgId) })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.hr.leavesForDate(orgId, variables.date),
      })
    },
  })
}

/* ------------------------------------------------------------------ */
/*  Advances Query (accounting_entries with advance_type)             */
/* ------------------------------------------------------------------ */

export type EmployeeAdvance = {
  id: string
  hr_employee_id: string
  advance_type: 'salary' | 'bonus' | 'insured_salary'
  amount: number
  currency: string
  entry_date: string
  description: string
}

export function useAdvancesQuery(year: number, month: number) {
  const { currentOrg } = useOrganization()
  const orgId = currentOrg?.id ?? ''

  const dateFrom = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const dateTo = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  return useQuery({
    queryKey: queryKeys.hr.advances(orgId, year, month),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounting_entries')
        .select('id, hr_employee_id, advance_type, amount, currency, entry_date, description')
        .eq('organization_id', orgId)
        .not('advance_type', 'is', null)
        .not('hr_employee_id', 'is', null)
        .gte('entry_date', dateFrom)
        .lte('entry_date', dateTo)

      if (error) throw error
      return (data ?? []) as EmployeeAdvance[]
    },
    enabled: !!orgId,
    staleTime: 5 * 60_000, // 5 min – advances change moderately
    gcTime: 10 * 60_000,
  })
}

/* ------------------------------------------------------------------ */
/*  Bulk Bonus Payout Mutation                                         */
/* ------------------------------------------------------------------ */

export type BulkPayoutItem = {
  employee_id: string
  employee_name: string
  amount_usdt: number
  period: string // e.g. "Şubat 2026"
  description: string // used as accounting entry description
  agreement_id?: string | null
  /** If set, this is an existing pending variable payment — update status instead of creating new. */
  pending_payment_id?: string | null
}

export function useBulkBonusPayoutMutation() {
  const { currentOrg } = useOrganization()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const orgId = currentOrg?.id ?? ''

  return useMutation({
    mutationFn: async ({
      items,
      paidAt,
    }: {
      items: BulkPayoutItem[]
      paidAt: string // ISO date string
    }) => {
      if (!orgId || !user) throw new Error('No organization selected')

      const newItems = items.filter((i) => !i.pending_payment_id)
      const pendingItems = items.filter((i) => !!i.pending_payment_id)

      // Map: employee_id → bonus_payment_id (for bulk_payment_items)
      const bonusPaymentIdByEmployee = new Map<string, string>()

      // ── Fixed items: create new hr_bonus_payment ──
      if (newItems.length > 0) {
        const paymentsPayload = newItems.map((item) => ({
          organization_id: orgId,
          employee_id: item.employee_id,
          agreement_id: item.agreement_id ?? null,
          period: item.period,
          amount_usdt: item.amount_usdt,
          paid_at: paidAt,
          notes: null as string | null,
          status: 'paid',
          created_by: user.id,
        }))

        const { data: payments, error: paymentError } = await supabase
          .from('hr_bonus_payments')
          .insert(paymentsPayload)
          .select('id, employee_id')
        if (paymentError) throw paymentError

        for (const p of payments ?? []) {
          bonusPaymentIdByEmployee.set(p.employee_id, p.id)
        }
      }

      // ── Variable pending items: update status to 'paid' ──
      if (pendingItems.length > 0) {
        const pendingIds = pendingItems.map((i) => i.pending_payment_id!).filter(Boolean)

        const { error: updateError } = await supabase
          .from('hr_bonus_payments')
          .update({ status: 'paid', paid_at: paidAt })
          .in('id', pendingIds)
        if (updateError) throw updateError

        for (const item of pendingItems) {
          if (item.pending_payment_id) {
            bonusPaymentIdByEmployee.set(item.employee_id, item.pending_payment_id)
          }
        }
      }

      // ── Create hr_bulk_payments (tek kayıt, USDT) ──
      const totalAmount = items.reduce((sum, i) => sum + i.amount_usdt, 0)
      const period = items[0].period

      const { data: bulkPayment, error: bulkError } = await supabase
        .from('hr_bulk_payments')
        .insert({
          organization_id: orgId,
          batch_type: 'bonus',
          period,
          total_amount: totalAmount,
          currency: 'USDT',
          item_count: items.length,
          paid_at: paidAt,
          created_by: user.id,
        })
        .select('id')
        .single()
      if (bulkError) throw bulkError

      // ── Create hr_bulk_payment_items ──
      const bulkItemsPayload = items.map((item) => ({
        bulk_payment_id: bulkPayment.id,
        employee_id: item.employee_id,
        organization_id: orgId,
        amount: item.amount_usdt,
        currency: 'USDT',
        description: item.description,
        agreement_id: item.agreement_id ?? null,
        bonus_payment_id: bonusPaymentIdByEmployee.get(item.employee_id) ?? null,
      }))
      const { error: itemsError } = await supabase
        .from('hr_bulk_payment_items')
        .insert(bulkItemsPayload)
      if (itemsError) throw itemsError

      // ── Create ONE accounting_entry ──
      const { error: entryError } = await supabase.from('accounting_entries').insert({
        organization_id: orgId,
        description: `Toplu Prim Ödemesi — ${period} (${items.length} kişi)`,
        entry_type: 'ODEME',
        direction: 'out',
        amount: totalAmount,
        currency: 'USDT',
        entry_date: paidAt,
        payment_period: period,
        register: 'USDT',
        hr_bulk_payment_id: bulkPayment.id,
        created_by: user.id,
      })
      if (entryError) throw entryError
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.hr.bonusPayments(orgId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.hr.variablePending(orgId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.hr.bulkPayments(orgId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.accounting.all })
    },
  })
}

/* ------------------------------------------------------------------ */
/*  Salary Payment Hooks                                                */
/* ------------------------------------------------------------------ */

export type HrSalaryPaymentLocal = {
  id: string
  employee_id: string
  organization_id: string
  period: string
  amount_tl: number
  salary_currency: 'TL' | 'USD'
  paid_at: string
  notes: string | null
  created_by: string | null
  created_at: string
}

export type BulkSalaryPayoutItem = {
  employee_id: string
  employee_name: string
  amount_tl: number
  salary_currency: 'TL' | 'USD'
  supplement_tl: number
  supplement_currency: 'TL' | 'USD'
  bank_deposit_tl: number
  attendance_deduction_tl: number
  unpaid_leave_deduction_tl: number
  period: string
  description: string
}

export function useHrSalaryPaymentsQuery(year: number, month: number) {
  const { currentOrg } = useOrganization()
  const orgId = currentOrg?.id ?? ''

  const dateFrom = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const dateTo = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  return useQuery({
    queryKey: queryKeys.hr.salaryPayments(orgId, year, month),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_salary_payments')
        .select('*')
        .eq('organization_id', orgId)
        .gte('paid_at', dateFrom)
        .lte('paid_at', dateTo)

      if (error) throw error
      return (data ?? []) as HrSalaryPaymentLocal[]
    },
    enabled: !!orgId,
    staleTime: 5 * 60_000, // 5 min – salary payments change moderately
    gcTime: 10 * 60_000,
  })
}

export function useBulkSalaryPayoutMutation() {
  const { currentOrg } = useOrganization()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const orgId = currentOrg?.id ?? ''

  return useMutation({
    mutationFn: async ({ items, paidAt }: { items: BulkSalaryPayoutItem[]; paidAt: string }) => {
      if (!orgId || !user) throw new Error('No organization selected')

      // 1. Create hr_salary_payments, get back IDs
      const paymentsPayload = items.map((item) => ({
        organization_id: orgId,
        employee_id: item.employee_id,
        period: item.period,
        amount_tl: Math.max(
          0,
          item.amount_tl -
            item.attendance_deduction_tl -
            item.unpaid_leave_deduction_tl -
            (item.bank_deposit_tl ?? 0),
        ),
        salary_currency: item.salary_currency,
        paid_at: paidAt,
        notes: null as string | null,
        created_by: user.id,
      }))

      const { data: payments, error: paymentError } = await supabase
        .from('hr_salary_payments')
        .insert(paymentsPayload)
        .select('id, employee_id')
      if (paymentError) throw paymentError

      const paymentIdByEmployee = new Map<string, string>(
        (payments ?? []).map((p) => [p.employee_id, p.id]),
      )

      // 2. Register bazında gruplama (NAKIT_TL / NAKIT_USD)
      const netAmount = (item: BulkSalaryPayoutItem) =>
        Math.max(
          0,
          item.amount_tl -
            item.attendance_deduction_tl -
            item.unpaid_leave_deduction_tl -
            (item.bank_deposit_tl ?? 0),
        )

      const tlItems = items.filter((i) => i.salary_currency !== 'USD')
      const usdItems = items.filter((i) => i.salary_currency === 'USD')

      const registerGroups: {
        items: BulkSalaryPayoutItem[]
        register: string
        currency: string
      }[] = []
      if (tlItems.length > 0) registerGroups.push({ items: tlItems, register: 'NAKIT_TL', currency: 'TL' })
      if (usdItems.length > 0) registerGroups.push({ items: usdItems, register: 'NAKIT_USD', currency: 'USD' })

      for (const group of registerGroups) {
        const totalNet = group.items.reduce((sum, i) => sum + netAmount(i), 0)
        const period = group.items[0].period

        // 3. Create hr_bulk_payments
        const { data: bulkPayment, error: bulkError } = await supabase
          .from('hr_bulk_payments')
          .insert({
            organization_id: orgId,
            batch_type: 'salary',
            period,
            total_amount: totalNet,
            currency: group.currency,
            item_count: group.items.length,
            paid_at: paidAt,
            created_by: user.id,
          })
          .select('id')
          .single()
        if (bulkError) throw bulkError

        // 4. Create hr_bulk_payment_items
        const itemsPayload = group.items.map((item) => ({
          bulk_payment_id: bulkPayment.id,
          employee_id: item.employee_id,
          organization_id: orgId,
          amount: netAmount(item),
          currency: group.currency,
          description: item.description,
          salary_currency: item.salary_currency,
          supplement_amount: item.supplement_tl > 0 ? item.supplement_tl : null,
          supplement_currency: item.supplement_tl > 0 ? item.supplement_currency : null,
          bank_deposit_amount: item.bank_deposit_tl > 0 ? item.bank_deposit_tl : null,
          attendance_deduction: item.attendance_deduction_tl > 0 ? item.attendance_deduction_tl : null,
          unpaid_leave_deduction: item.unpaid_leave_deduction_tl > 0 ? item.unpaid_leave_deduction_tl : null,
          salary_payment_id: paymentIdByEmployee.get(item.employee_id) ?? null,
        }))
        const { error: itemsError } = await supabase
          .from('hr_bulk_payment_items')
          .insert(itemsPayload)
        if (itemsError) throw itemsError

        // 5. Create ONE accounting_entry for the entire group
        const { error: entryError } = await supabase.from('accounting_entries').insert({
          organization_id: orgId,
          description: `Toplu Maaş Ödemesi — ${period} (${group.items.length} kişi)`,
          entry_type: 'ODEME',
          direction: 'out',
          amount: totalNet,
          currency: group.currency,
          entry_date: paidAt,
          payment_period: period,
          register: group.register,
          hr_bulk_payment_id: bulkPayment.id,
          created_by: user.id,
        })
        if (entryError) throw entryError

        // 6. Supplement entries (aynı bulk payment'a bağlı, ayrı accounting entry)
        const supplementItems = group.items.filter((item) => item.supplement_tl > 0)
        if (supplementItems.length > 0) {
          const totalSupplement = supplementItems.reduce((sum, i) => sum + i.supplement_tl, 0)
          const suppCurrency = supplementItems[0].supplement_currency
          const suppRegister = suppCurrency === 'USD' ? 'NAKIT_USD' : 'NAKIT_TL'

          const { error: suppError } = await supabase.from('accounting_entries').insert({
            organization_id: orgId,
            description: `Toplu Sigorta Elden Ödeme — ${period} (${supplementItems.length} kişi)`,
            entry_type: 'ODEME',
            direction: 'out',
            amount: totalSupplement,
            currency: suppCurrency,
            entry_date: paidAt,
            payment_period: period,
            register: suppRegister,
            hr_bulk_payment_id: bulkPayment.id,
            created_by: user.id,
          })
          if (suppError) throw suppError
        }
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.hr.salaryPaymentsPrefix(orgId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.hr.allSalaryPayments(orgId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.hr.bulkPayments(orgId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.accounting.all })
    },
  })
}

/* ------------------------------------------------------------------ */
/*  Bulk Bank Deposit Mutation (insured salary)                         */
/* ------------------------------------------------------------------ */

export type BulkBankDepositItem = {
  employee_id: string
  employee_name: string
  amount: number
  currency: 'TL' | 'USD'
  period: string
  description: string
}

export function useBulkBankDepositMutation() {
  const { currentOrg } = useOrganization()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const orgId = currentOrg?.id ?? ''

  return useMutation({
    mutationFn: async ({ items, paidAt }: { items: BulkBankDepositItem[]; paidAt: string }) => {
      if (!orgId || !user) throw new Error('No organization selected')

      // Register bazında gruplama
      const tlItems = items.filter((i) => i.currency === 'TL')
      const usdItems = items.filter((i) => i.currency !== 'TL')

      const registerGroups: { items: BulkBankDepositItem[]; register: string; currency: string }[] = []
      if (tlItems.length > 0) registerGroups.push({ items: tlItems, register: 'NAKIT_TL', currency: 'TL' })
      if (usdItems.length > 0) registerGroups.push({ items: usdItems, register: 'NAKIT_USD', currency: 'USD' })

      for (const group of registerGroups) {
        const totalAmount = group.items.reduce((sum, i) => sum + i.amount, 0)
        const period = group.items[0].period

        // 1. Create hr_bulk_payments
        const { data: bulkPayment, error: bulkError } = await supabase
          .from('hr_bulk_payments')
          .insert({
            organization_id: orgId,
            batch_type: 'bank_deposit',
            period,
            total_amount: totalAmount,
            currency: group.currency,
            item_count: group.items.length,
            paid_at: paidAt,
            created_by: user.id,
          })
          .select('id')
          .single()
        if (bulkError) throw bulkError

        // 2. Create hr_bulk_payment_items
        const itemsPayload = group.items.map((item) => ({
          bulk_payment_id: bulkPayment.id,
          employee_id: item.employee_id,
          organization_id: orgId,
          amount: item.amount,
          currency: item.currency,
          description: item.description,
          advance_type: 'insured_salary',
        }))
        const { error: itemsError } = await supabase
          .from('hr_bulk_payment_items')
          .insert(itemsPayload)
        if (itemsError) throw itemsError

        // 3. Create ONE accounting_entry
        const { error: entryError } = await supabase.from('accounting_entries').insert({
          organization_id: orgId,
          description: `Toplu Banka Yatırımı — ${period} (${group.items.length} kişi)`,
          entry_type: 'ODEME',
          direction: 'out',
          amount: totalAmount,
          currency: group.currency,
          entry_date: paidAt,
          payment_period: period,
          register: group.register,
          advance_type: 'insured_salary',
          hr_bulk_payment_id: bulkPayment.id,
          created_by: user.id,
        })
        if (entryError) throw entryError
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.hr.salaryPaymentsPrefix(orgId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.hr.allSalaryPayments(orgId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.hr.bulkPayments(orgId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.accounting.all })
    },
  })
}

/** Fetches ALL hr_salary_payments for the org (no month filter) — used for history view. */
export function useAllSalaryPaymentsQuery() {
  const { currentOrg } = useOrganization()
  const orgId = currentOrg?.id ?? ''

  return useQuery({
    queryKey: queryKeys.hr.allSalaryPayments(orgId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_salary_payments')
        .select('*')
        .eq('organization_id', orgId)
        .order('paid_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as HrSalaryPaymentLocal[]
    },
    enabled: !!orgId,
    staleTime: 5 * 60_000, // 5 min – salary payments change moderately
    gcTime: 10 * 60_000,
  })
}

export function useUpdateSalaryPaymentMutation() {
  const { currentOrg } = useOrganization()
  const queryClient = useQueryClient()
  const orgId = currentOrg?.id ?? ''

  return useMutation({
    mutationFn: async (payload: {
      id: string
      amount_tl: number
      old_amount_tl: number
      salary_currency: 'TL' | 'USD'
      paid_at: string
      notes: string | null
      description: string
    }) => {
      // 1. Update hr_salary_payments
      const { error: paymentError } = await supabase
        .from('hr_salary_payments')
        .update({
          amount_tl: payload.amount_tl,
          paid_at: payload.paid_at,
          notes: payload.notes,
        })
        .eq('id', payload.id)
        .eq('organization_id', orgId)
      if (paymentError) throw paymentError

      // 2. Update main salary accounting entry (matched by old amount)
      const { error: mainError } = await supabase
        .from('accounting_entries')
        .update({
          amount: payload.amount_tl,
          entry_date: payload.paid_at,
          description: payload.description,
          currency: payload.salary_currency === 'USD' ? 'USD' : 'TL',
          register: payload.salary_currency === 'USD' ? 'NAKIT_USD' : 'NAKIT_TL',
        })
        .eq('hr_payment_id', payload.id)
        .eq('organization_id', orgId)
        .eq('amount', payload.old_amount_tl)
      if (mainError) throw mainError

      // 3. Update entry_date for supplement entries (different amount) — ignore error
      await supabase
        .from('accounting_entries')
        .update({ entry_date: payload.paid_at })
        .eq('hr_payment_id', payload.id)
        .eq('organization_id', orgId)
        .neq('amount', payload.old_amount_tl)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.hr.salaryPaymentsPrefix(orgId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.hr.allSalaryPayments(orgId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.accounting.all })
    },
  })
}

/* ------------------------------------------------------------------ */
/*  HR Settings Hooks                                                   */
/* ------------------------------------------------------------------ */

export function useHrSettingsQuery() {
  const { currentOrg } = useOrganization()
  const orgId = currentOrg?.id ?? ''

  return useQuery({
    queryKey: queryKeys.hr.hrSettings(orgId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_settings')
        .select('*')
        .eq('organization_id', orgId)
        .maybeSingle()

      if (error) throw error
      if (!data) return DEFAULT_HR_SETTINGS

      return {
        roles: (data.roles ?? DEFAULT_HR_SETTINGS.roles) as string[],
        supplement_tl: data.supplement_tl != null ? Number(data.supplement_tl) : DEFAULT_HR_SETTINGS.supplement_tl,
        supplement_currency:
          (data.supplement_currency as 'TL' | 'USD') ?? DEFAULT_HR_SETTINGS.supplement_currency,
        insured_bank_amount_tl:
          data.insured_bank_amount_tl != null ? Number(data.insured_bank_amount_tl) : DEFAULT_HR_SETTINGS.insured_bank_amount_tl,
        insured_bank_currency:
          (data.insured_bank_currency as 'TL' | 'USD') ?? DEFAULT_HR_SETTINGS.insured_bank_currency,
        absence_full_day_divisor:
          Number(data.absence_full_day_divisor) || DEFAULT_HR_SETTINGS.absence_full_day_divisor,
        absence_half_day_divisor:
          Number(data.absence_half_day_divisor) || DEFAULT_HR_SETTINGS.absence_half_day_divisor,
        absence_hourly_divisor:
          Number(data.absence_hourly_divisor) || DEFAULT_HR_SETTINGS.absence_hourly_divisor,
        daily_deduction_enabled:
          data.daily_deduction_enabled ?? DEFAULT_HR_SETTINGS.daily_deduction_enabled,
        hourly_deduction_enabled:
          data.hourly_deduction_enabled ?? DEFAULT_HR_SETTINGS.hourly_deduction_enabled,
        standard_check_in: data.standard_check_in ?? DEFAULT_HR_SETTINGS.standard_check_in,
        standard_check_out: data.standard_check_out ?? DEFAULT_HR_SETTINGS.standard_check_out,
        timezone: data.timezone ?? DEFAULT_HR_SETTINGS.timezone,
        weekend_off: data.weekend_off ?? DEFAULT_HR_SETTINGS.weekend_off,
        barem_roles: (data.barem_roles ?? DEFAULT_HR_SETTINGS.barem_roles) as string[],
      } as HrSettings
    },
    enabled: !!orgId,
    staleTime: 10 * 60_000, // 10 min – HR settings rarely change
    gcTime: 20 * 60_000,
  })
}

export function useUpdateHrSettingsMutation() {
  const { currentOrg } = useOrganization()
  const queryClient = useQueryClient()
  const orgId = currentOrg?.id ?? ''

  return useMutation({
    mutationFn: async (settings: HrSettings) => {
      const { error } = await supabase.from('hr_settings').upsert(
        {
          organization_id: orgId,
          roles: settings.roles,
          supplement_tl: settings.supplement_tl,
          supplement_currency: settings.supplement_currency,
          insured_bank_amount_tl: settings.insured_bank_amount_tl,
          insured_bank_currency: settings.insured_bank_currency,
          absence_full_day_divisor: settings.absence_full_day_divisor,
          absence_half_day_divisor: settings.absence_half_day_divisor,
          absence_hourly_divisor: settings.absence_hourly_divisor,
          daily_deduction_enabled: settings.daily_deduction_enabled,
          hourly_deduction_enabled: settings.hourly_deduction_enabled,
          standard_check_in: settings.standard_check_in,
          standard_check_out: settings.standard_check_out,
          timezone: settings.timezone,
          weekend_off: settings.weekend_off,
          barem_roles: settings.barem_roles,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'organization_id' },
      )
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.hr.hrSettings(orgId) })
    },
  })
}

/* ------------------------------------------------------------------ */
/*  Barem Failures (Marketing)                                         */
/* ------------------------------------------------------------------ */

export function useBaremFailuresQuery(period: string) {
  const { currentOrg } = useOrganization()
  const orgId = currentOrg?.id ?? ''

  return useQuery({
    queryKey: queryKeys.hr.baremFailures(orgId, period),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_mt_barem_failures')
        .select('id, employee_id, period')
        .eq('organization_id', orgId)
        .eq('period', period)
      if (error) throw error
      return new Set((data ?? []).map((r) => r.employee_id))
    },
    enabled: !!orgId && !!period,
    staleTime: 5 * 60_000,
  })
}

export function useBaremFailureMutation() {
  const { currentOrg } = useOrganization()
  const queryClient = useQueryClient()
  const orgId = currentOrg?.id ?? ''

  const toggle = useMutation({
    mutationFn: async ({ employeeId, period, failed }: { employeeId: string; period: string; failed: boolean }) => {
      if (failed) {
        // Insert barem failure
        const { error } = await supabase.from('hr_mt_barem_failures').upsert(
          { organization_id: orgId, employee_id: employeeId, period },
          { onConflict: 'organization_id,employee_id,period' },
        )
        if (error) throw error
      } else {
        // Remove barem failure
        const { error } = await supabase
          .from('hr_mt_barem_failures')
          .delete()
          .eq('organization_id', orgId)
          .eq('employee_id', employeeId)
          .eq('period', period)
        if (error) throw error
      }
    },
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.hr.baremFailures(orgId, vars.period) })
    },
  })

  return { toggleBarem: toggle }
}

/* ------------------------------------------------------------------ */
/*  Barem Targets (auto-calculated thresholds)                          */
/* ------------------------------------------------------------------ */

export interface BaremTarget {
  id: string
  employee_id: string
  period: string
  count_target: number | null
  volume_target: number | null
}

export function useBaremTargetsQuery(period: string) {
  const { currentOrg } = useOrganization()
  const orgId = currentOrg?.id ?? ''

  return useQuery({
    queryKey: queryKeys.hr.baremTargets(orgId, period),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_barem_targets')
        .select('id, employee_id, period, count_target, volume_target')
        .eq('organization_id', orgId)
        .eq('period', period)
      if (error) throw error
      const map = new Map<string, BaremTarget>()
      for (const row of data ?? []) {
        map.set(row.employee_id, row as BaremTarget)
      }
      return map
    },
    enabled: !!orgId && !!period,
    staleTime: 5 * 60_000,
  })
}

export function useBaremTargetMutation() {
  const { currentOrg } = useOrganization()
  const queryClient = useQueryClient()
  const orgId = currentOrg?.id ?? ''

  const upsert = useMutation({
    mutationFn: async ({
      employeeId,
      period,
      countTarget,
      volumeTarget,
    }: {
      employeeId: string
      period: string
      countTarget: number | null
      volumeTarget: number | null
    }) => {
      // If both null, delete
      if (countTarget == null && volumeTarget == null) {
        const { error } = await supabase
          .from('hr_barem_targets')
          .delete()
          .eq('organization_id', orgId)
          .eq('employee_id', employeeId)
          .eq('period', period)
        if (error) throw error
        return
      }
      const { error } = await supabase.from('hr_barem_targets').upsert(
        {
          organization_id: orgId,
          employee_id: employeeId,
          period,
          count_target: countTarget,
          volume_target: volumeTarget,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'organization_id,employee_id,period' },
      )
      if (error) throw error
    },
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.hr.baremTargets(orgId, vars.period) })
    },
  })

  return { upsertTarget: upsert }
}

/* ------------------------------------------------------------------ */
/*  Bulk Payment Detail Query & Mutations                               */
/* ------------------------------------------------------------------ */

export type BulkPaymentItemWithEmployee = {
  id: string
  bulk_payment_id: string
  employee_id: string
  organization_id: string
  amount: number
  currency: string
  description: string
  salary_currency: string | null
  supplement_amount: number | null
  supplement_currency: string | null
  bank_deposit_amount: number | null
  attendance_deduction: number | null
  unpaid_leave_deduction: number | null
  agreement_id: string | null
  bonus_payment_id: string | null
  salary_payment_id: string | null
  advance_type: string | null
  created_at: string
  employee_name: string
  employee_role: string
}

export function useBulkPaymentDetailQuery(bulkPaymentId: string) {
  const { currentOrg } = useOrganization()
  const orgId = currentOrg?.id ?? ''

  return useQuery({
    queryKey: queryKeys.hr.bulkPaymentDetail(orgId, bulkPaymentId),
    queryFn: async () => {
      // Fetch bulk payment header
      const { data: bulkPayment, error: bpError } = await supabase
        .from('hr_bulk_payments')
        .select('*')
        .eq('id', bulkPaymentId)
        .single()
      if (bpError) throw bpError

      // Fetch items with employee names
      const { data: itemsRaw, error: itemsError } = await supabase
        .from('hr_bulk_payment_items')
        .select('*, hr_employees(full_name, role)')
        .eq('bulk_payment_id', bulkPaymentId)
        .order('created_at', { ascending: true })
      if (itemsError) throw itemsError

      const items: BulkPaymentItemWithEmployee[] = (itemsRaw ?? []).map((item: any) => ({
        ...item,
        employee_name: item.hr_employees?.full_name ?? '—',
        employee_role: item.hr_employees?.role ?? '—',
        hr_employees: undefined,
      }))

      // Fetch linked accounting entries
      const { data: entries, error: entriesError } = await supabase
        .from('accounting_entries')
        .select('*')
        .eq('hr_bulk_payment_id', bulkPaymentId)
      if (entriesError) throw entriesError

      return {
        bulkPayment: bulkPayment as import('@/lib/database.types').HrBulkPayment,
        items,
        accountingEntries: (entries ?? []) as import('@/lib/database.types').AccountingEntry[],
      }
    },
    enabled: !!orgId && !!bulkPaymentId,
    staleTime: 3 * 60_000,
  })
}

export function useBulkPaymentItemMutations(bulkPaymentId: string) {
  const { currentOrg } = useOrganization()
  const queryClient = useQueryClient()
  const orgId = currentOrg?.id ?? ''

  // Update a single item amount
  const updateItem = useMutation({
    mutationFn: async ({ itemId, amount }: { itemId: string; amount: number }) => {
      // 1. Update the item
      const { error: updateError } = await supabase
        .from('hr_bulk_payment_items')
        .update({ amount })
        .eq('id', itemId)
      if (updateError) throw updateError

      // 2. Recalculate totals
      const { data: allItems, error: fetchError } = await supabase
        .from('hr_bulk_payment_items')
        .select('amount')
        .eq('bulk_payment_id', bulkPaymentId)
      if (fetchError) throw fetchError

      const newTotal = (allItems ?? []).reduce((sum, i) => sum + Number(i.amount), 0)

      // 3. Update bulk payment total
      const { error: bpError } = await supabase
        .from('hr_bulk_payments')
        .update({ total_amount: newTotal })
        .eq('id', bulkPaymentId)
      if (bpError) throw bpError

      // 4. Update ALL linked accounting entries proportionally
      // For simplicity: update the main entry (non-supplement) to the new total
      const { data: entries, error: entriesError } = await supabase
        .from('accounting_entries')
        .select('id, description')
        .eq('hr_bulk_payment_id', bulkPaymentId)
      if (entriesError) throw entriesError

      // Update the main (non-supplement) entry
      const mainEntry = (entries ?? []).find((e) => !e.description.includes('Sigorta Elden'))
      if (mainEntry) {
        const { error: entryError } = await supabase
          .from('accounting_entries')
          .update({ amount: newTotal })
          .eq('id', mainEntry.id)
        if (entryError) throw entryError
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.hr.bulkPaymentDetail(orgId, bulkPaymentId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.accounting.all })
    },
  })

  // Delete a single item
  const deleteItem = useMutation({
    mutationFn: async (itemId: string) => {
      // 1. Fetch the item to get linked payment IDs
      const { data: item, error: fetchError } = await supabase
        .from('hr_bulk_payment_items')
        .select('*')
        .eq('id', itemId)
        .single()
      if (fetchError) throw fetchError

      // 2. Delete linked HR payments
      if (item.salary_payment_id) {
        await supabase.from('hr_salary_payments').delete().eq('id', item.salary_payment_id)
      }
      if (item.bonus_payment_id) {
        await supabase.from('hr_bonus_payments').delete().eq('id', item.bonus_payment_id)
      }

      // 3. Delete the item
      const { error: deleteError } = await supabase
        .from('hr_bulk_payment_items')
        .delete()
        .eq('id', itemId)
      if (deleteError) throw deleteError

      // 4. Check remaining items
      const { data: remaining, error: remainError } = await supabase
        .from('hr_bulk_payment_items')
        .select('amount')
        .eq('bulk_payment_id', bulkPaymentId)
      if (remainError) throw remainError

      if (!remaining || remaining.length === 0) {
        // No items left — delete the entire bulk payment + accounting entries
        await supabase.from('accounting_entries').delete().eq('hr_bulk_payment_id', bulkPaymentId)
        await supabase.from('hr_bulk_payments').delete().eq('id', bulkPaymentId)
      } else {
        // Recalculate totals
        const newTotal = remaining.reduce((sum, i) => sum + Number(i.amount), 0)
        await supabase
          .from('hr_bulk_payments')
          .update({ total_amount: newTotal, item_count: remaining.length })
          .eq('id', bulkPaymentId)

        // Update main accounting entry
        const { data: entries } = await supabase
          .from('accounting_entries')
          .select('id, description')
          .eq('hr_bulk_payment_id', bulkPaymentId)

        const mainEntry = (entries ?? []).find((e) => !e.description.includes('Sigorta Elden'))
        if (mainEntry) {
          await supabase
            .from('accounting_entries')
            .update({ amount: newTotal })
            .eq('id', mainEntry.id)
        }
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.hr.bulkPaymentDetail(orgId, bulkPaymentId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.hr.bulkPayments(orgId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.hr.salaryPaymentsPrefix(orgId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.hr.allSalaryPayments(orgId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.hr.bonusPayments(orgId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.accounting.all })
    },
  })

  // Delete entire bulk payment
  const deleteBulkPayment = useMutation({
    mutationFn: async () => {
      // 1. Fetch all items to cascade-delete linked HR payments
      const { data: items, error: fetchError } = await supabase
        .from('hr_bulk_payment_items')
        .select('salary_payment_id, bonus_payment_id')
        .eq('bulk_payment_id', bulkPaymentId)
      if (fetchError) throw fetchError

      // 2. Delete linked HR payments
      const salaryIds = (items ?? []).map((i) => i.salary_payment_id).filter(Boolean) as string[]
      const bonusIds = (items ?? []).map((i) => i.bonus_payment_id).filter(Boolean) as string[]

      if (salaryIds.length > 0) {
        await supabase.from('hr_salary_payments').delete().in('id', salaryIds)
      }
      if (bonusIds.length > 0) {
        await supabase.from('hr_bonus_payments').delete().in('id', bonusIds)
      }

      // 3. Delete accounting entries linked to this bulk payment
      await supabase.from('accounting_entries').delete().eq('hr_bulk_payment_id', bulkPaymentId)

      // 4. Delete the bulk payment (CASCADE deletes items)
      const { error: deleteError } = await supabase
        .from('hr_bulk_payments')
        .delete()
        .eq('id', bulkPaymentId)
      if (deleteError) throw deleteError
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.hr.bulkPayments(orgId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.hr.salaryPaymentsPrefix(orgId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.hr.allSalaryPayments(orgId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.hr.bonusPayments(orgId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.accounting.all })
    },
  })

  return { updateItem, deleteItem, deleteBulkPayment }
}
