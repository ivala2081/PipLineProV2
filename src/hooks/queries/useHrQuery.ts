import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { useAuth } from '@/app/providers/AuthProvider'
import { localDayStart, localDayEnd } from '@/lib/date'
import type {
  HrEmployeeRole,
  HrDocumentType,
  HrBonusType,
  HrAttendanceStatus,
  HrLeaveType,
} from '@/lib/database.types'

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
  is_active: boolean
  hire_date: string | null
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
  is_active?: boolean
  hire_date?: string | null
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
  'Operation',
  'Retention',
  'Project Management',
  'Social Media',
  'Sales Development',
  'Programmer',
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
  absence_full_day_divisor: number
  absence_half_day_divisor: number
  absence_hourly_divisor: number
  daily_deduction_enabled: boolean
  hourly_deduction_enabled: boolean
  standard_check_in: string
  standard_check_out: string
  timezone: string
  weekend_off: boolean
}

export const DEFAULT_HR_SETTINGS: HrSettings = {
  roles: [
    'Manager', 'Marketing', 'Operation', 'Retention',
    'Project Management', 'Social Media', 'Sales Development', 'Programmer',
  ],
  supplement_tl: 4000,
  absence_full_day_divisor: 30,
  absence_half_day_divisor: 60,
  absence_hourly_divisor: 240,
  daily_deduction_enabled: true,
  hourly_deduction_enabled: true,
  standard_check_in: '10:00',
  standard_check_out: '18:30',
  timezone: 'Europe/Istanbul',
  weekend_off: true,
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

export const hrKeys = {
  all: (orgId: string) => ['hr', orgId] as const,
  employees: (orgId: string) => ['hr', orgId, 'employees'] as const,
  employee: (orgId: string, id: string) => ['hr', orgId, 'employee', id] as const,
  documents: (orgId: string, employeeId: string) => ['hr', orgId, 'documents', employeeId] as const,
  bonusAgreements: (orgId: string) => ['hr', orgId, 'bonus-agreements'] as const,
  bonusPayments: (orgId: string) => ['hr', orgId, 'bonus-payments'] as const,
  variablePending: (orgId: string) => ['hr', orgId, 'variable-pending'] as const,
  salaryPayments: (orgId: string, year: number, month: number) =>
    ['hr', orgId, 'salary-payments', year, month] as const,
  attendance: (orgId: string, date: string) => ['hr', orgId, 'attendance', date] as const,
  attendanceMonth: (orgId: string, year: number, month: number) =>
    ['hr', orgId, 'attendance-month', year, month] as const,
  autoBonusTransfers: (orgId: string, year: number, month: number) =>
    ['hr', orgId, 'auto-bonus-transfers', year, month] as const,
  mtConfig: (orgId: string) => ['hr', orgId, 'mt-config'] as const,
  reConfig: (orgId: string) => ['hr', orgId, 're-config'] as const,
  hrSettings: (orgId: string) => ['hr', orgId, 'settings'] as const,
  leaves: (orgId: string) => ['hr', orgId, 'leaves'] as const,
  leavesMonth: (orgId: string, year: number, month: number) =>
    ['hr', orgId, 'leaves-month', year, month] as const,
}

/* ------------------------------------------------------------------ */
/*  Hooks                                                               */
/* ------------------------------------------------------------------ */

export function useHrEmployeesQuery() {
  const { currentOrg } = useOrganization()
  const orgId = currentOrg?.id ?? ''

  return useQuery({
    queryKey: hrKeys.employees(orgId),
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
    queryKey: hrKeys.documents(orgId, employeeId),
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: hrKeys.employees(orgId) })
    },
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: hrKeys.employees(orgId) })
    },
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: hrKeys.employees(orgId) })
    },
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: hrKeys.documents(orgId, employeeId) })
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: hrKeys.documents(orgId, employeeId) })
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
    queryKey: hrKeys.bonusAgreements(orgId),
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
  })
}

export function useBonusPaymentsQuery() {
  const { currentOrg } = useOrganization()
  const orgId = currentOrg?.id ?? ''

  return useQuery({
    queryKey: hrKeys.bonusPayments(orgId),
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
  })
}

/** Fetches hr_bonus_payments with status='pending' (variable bonuses not yet processed). */
export function useVariablePendingQuery() {
  const { currentOrg } = useOrganization()
  const orgId = currentOrg?.id ?? ''

  return useQuery({
    queryKey: hrKeys.variablePending(orgId),
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
      void queryClient.invalidateQueries({ queryKey: hrKeys.bonusAgreements(orgId) })
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
      void queryClient.invalidateQueries({ queryKey: hrKeys.bonusAgreements(orgId) })
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
      void queryClient.invalidateQueries({ queryKey: hrKeys.bonusAgreements(orgId) })
      void queryClient.invalidateQueries({ queryKey: hrKeys.bonusPayments(orgId) })
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
      void queryClient.invalidateQueries({ queryKey: hrKeys.bonusPayments(orgId) })
      void queryClient.invalidateQueries({ queryKey: ['accounting'] })
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
      void queryClient.invalidateQueries({ queryKey: hrKeys.variablePending(orgId) })
      void queryClient.invalidateQueries({ queryKey: hrKeys.bonusPayments(orgId) })
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
      void queryClient.invalidateQueries({ queryKey: hrKeys.bonusPayments(orgId) })
      void queryClient.invalidateQueries({ queryKey: ['accounting'] })
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
      void queryClient.invalidateQueries({ queryKey: hrKeys.bonusPayments(orgId) })
      void queryClient.invalidateQueries({ queryKey: hrKeys.variablePending(orgId) })
    },
  })

  return { createAgreement, updateAgreement, deleteAgreement, createPayment, updatePayment, createVariablePending, deletePayment }
}

/* ------------------------------------------------------------------ */
/*  MT Config Query & Mutation                                         */
/* ------------------------------------------------------------------ */

export function useMtConfigQuery() {
  const { currentOrg } = useOrganization()
  const orgId = currentOrg?.id ?? ''

  return useQuery({
    queryKey: hrKeys.mtConfig(orgId),
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
      void queryClient.invalidateQueries({ queryKey: hrKeys.mtConfig(orgId) })
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
    queryKey: hrKeys.reConfig(orgId),
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
      void queryClient.invalidateQueries({ queryKey: hrKeys.reConfig(orgId) })
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
    queryKey: hrKeys.autoBonusTransfers(orgId, year, month),
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
  })
}

/* ------------------------------------------------------------------ */
/*  Attendance                                                          */
/* ------------------------------------------------------------------ */

export function useHrAttendanceQuery(date: string) {
  const { currentOrg } = useOrganization()
  const orgId = currentOrg?.id ?? ''

  return useQuery({
    queryKey: hrKeys.attendance(orgId, date),
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
  })
}

export function useHrMonthlyAttendanceQuery(year: number, month: number) {
  const { currentOrg } = useOrganization()
  const orgId = currentOrg?.id ?? ''

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(year, month, 0).toISOString().split('T')[0]

  return useQuery({
    queryKey: hrKeys.attendanceMonth(orgId, year, month),
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
      void queryClient.invalidateQueries({ queryKey: hrKeys.attendance(orgId, data.date) })
      const d = new Date(data.date)
      void queryClient.invalidateQueries({
        queryKey: hrKeys.attendanceMonth(orgId, d.getFullYear(), d.getMonth() + 1),
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
      void queryClient.invalidateQueries({ queryKey: ['hr', orgId, 'attendance'] })
    },
  })

  return { upsertAttendance, deleteAttendance }
}

/* ------------------------------------------------------------------ */
/*  Leaves Queries                                                    */
/* ------------------------------------------------------------------ */

export function useHrLeavesQuery() {
  const { currentOrg } = useOrganization()
  const orgId = currentOrg?.id ?? ''

  return useQuery<HrLeave[]>({
    queryKey: hrKeys.leaves(orgId),
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
    queryKey: hrKeys.leavesMonth(orgId, year, month),
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
      void queryClient.invalidateQueries({ queryKey: hrKeys.leaves(orgId) })
      void queryClient.invalidateQueries({ queryKey: ['hr', orgId, 'leaves-month'] })
    },
  })

  const updateLeave = useMutation({
    mutationFn: async ({ id, payload }: {
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
      void queryClient.invalidateQueries({ queryKey: hrKeys.leaves(orgId) })
      void queryClient.invalidateQueries({ queryKey: ['hr', orgId, 'leaves-month'] })
    },
  })

  const deleteLeave = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('hr_leaves')
        .delete()
        .eq('id', id)
        .eq('organization_id', orgId)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: hrKeys.leaves(orgId) })
      void queryClient.invalidateQueries({ queryKey: ['hr', orgId, 'leaves-month'] })
    },
  })

  return { createLeave, updateLeave, deleteLeave }
}

/** Count how many calendar days a leave overlaps with a given month. */
export function countLeaveDaysInMonth(
  leave: HrLeave,
  year: number,
  month: number,
): number {
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
/*  Advances Query (accounting_entries with advance_type)             */
/* ------------------------------------------------------------------ */

export type EmployeeAdvance = {
  id: string
  hr_employee_id: string
  advance_type: 'salary' | 'bonus'
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
    queryKey: ['hr', orgId, 'advances', year, month] as const,
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

      // Separate new (fixed) items from existing pending (variable) items
      const newItems = items.filter((i) => !i.pending_payment_id)
      const pendingItems = items.filter((i) => !!i.pending_payment_id)

      // ── Fixed items: create new hr_bonus_payment + accounting_entry ──
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

        const paymentIdByEmployee = new Map<string, string>(
          (payments ?? []).map((p) => [p.employee_id, p.id]),
        )

        const entriesPayload = newItems.map((item) => ({
          organization_id: orgId,
          description: item.description,
          entry_type: 'ODEME' as const,
          direction: 'out' as const,
          amount: item.amount_usdt,
          currency: 'USDT',
          entry_date: paidAt,
          payment_period: item.period,
          register: 'USDT',
          hr_payment_id: paymentIdByEmployee.get(item.employee_id) ?? null,
          hr_payment_type: 'bonus' as const,
          created_by: user.id,
        }))

        const { error: entryError } = await supabase.from('accounting_entries').insert(entriesPayload)
        if (entryError) throw entryError
      }

      // ── Variable pending items: update status to 'paid' + create accounting_entry ──
      if (pendingItems.length > 0) {
        const pendingIds = pendingItems.map((i) => i.pending_payment_id!).filter(Boolean)

        const { error: updateError } = await supabase
          .from('hr_bonus_payments')
          .update({ status: 'paid', paid_at: paidAt })
          .in('id', pendingIds)
        if (updateError) throw updateError

        const pendingEntriesPayload = pendingItems.map((item) => ({
          organization_id: orgId,
          description: item.description,
          entry_type: 'ODEME' as const,
          direction: 'out' as const,
          amount: item.amount_usdt,
          currency: 'USDT',
          entry_date: paidAt,
          payment_period: item.period,
          register: 'USDT',
          hr_payment_id: item.pending_payment_id,
          hr_payment_type: 'bonus' as const,
          created_by: user.id,
        }))

        const { error: pendingEntryError } = await supabase
          .from('accounting_entries')
          .insert(pendingEntriesPayload)
        if (pendingEntryError) throw pendingEntryError
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: hrKeys.bonusPayments(orgId) })
      void queryClient.invalidateQueries({ queryKey: hrKeys.variablePending(orgId) })
      void queryClient.invalidateQueries({ queryKey: ['accounting'] })
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
    queryKey: hrKeys.salaryPayments(orgId, year, month),
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
        amount_tl: Math.max(0, item.amount_tl - item.attendance_deduction_tl - item.unpaid_leave_deduction_tl),
        salary_currency: item.salary_currency,
        paid_at: paidAt,
        notes: null as string | null,
        created_by: user.id,
      }))

      console.log('Salary insert payload:', JSON.stringify(paymentsPayload[0]))
      const { data: payments, error: paymentError } = await supabase
        .from('hr_salary_payments')
        .insert(paymentsPayload)
        .select('id, employee_id')
      if (paymentError) {
        console.error('Salary insert error details:', JSON.stringify(paymentError))
        throw paymentError
      }

      const paymentIdByEmployee = new Map<string, string>(
        (payments ?? []).map((p) => [p.employee_id, p.id]),
      )

      // 2. Create accounting_entries linked to salary payments
      const entriesPayload = items.map((item) => ({
        organization_id: orgId,
        description: item.description,
        entry_type: 'ODEME' as const,
        direction: 'out' as const,
        amount: Math.max(0, item.amount_tl - item.attendance_deduction_tl - item.unpaid_leave_deduction_tl),
        currency: item.salary_currency === 'USD' ? 'USD' : 'TL',
        entry_date: paidAt,
        payment_period: item.period,
        register: item.salary_currency === 'USD' ? 'NAKIT_USD' : 'NAKIT_TL',
        hr_payment_id: paymentIdByEmployee.get(item.employee_id) ?? null,
        hr_payment_type: 'salary' as const,
        created_by: user.id,
      }))

      const { error: entryError } = await supabase.from('accounting_entries').insert(entriesPayload)
      if (entryError) throw entryError

      // 3. Create separate supplement entries for uninsured employees with receives_supplement
      const supplementItems = items.filter((item) => item.supplement_tl > 0)
      if (supplementItems.length > 0) {
        const supplementPayload = supplementItems.map((item) => ({
          organization_id: orgId,
          description: `${item.employee_name} — ${item.period} Sigorta Elden Ödeme`,
          entry_type: 'ODEME' as const,
          direction: 'out' as const,
          amount: item.supplement_tl,
          currency: 'TL',
          entry_date: paidAt,
          payment_period: item.period,
          register: 'NAKIT_TL',
          hr_payment_id: paymentIdByEmployee.get(item.employee_id) ?? null,
          hr_payment_type: 'salary' as const,
          created_by: user.id,
        }))
        const { error: suppError } = await supabase
          .from('accounting_entries')
          .insert(supplementPayload)
        if (suppError) throw suppError
      }
    },
    onSuccess: () => {
      // Invalidate all salary payment queries
      void queryClient.invalidateQueries({ queryKey: ['hr', orgId, 'salary-payments'] })
      void queryClient.invalidateQueries({ queryKey: ['hr', orgId, 'all-salary-payments'] })
      void queryClient.invalidateQueries({ queryKey: ['accounting'] })
    },
  })
}

/** Fetches ALL hr_salary_payments for the org (no month filter) — used for history view. */
export function useAllSalaryPaymentsQuery() {
  const { currentOrg } = useOrganization()
  const orgId = currentOrg?.id ?? ''

  return useQuery({
    queryKey: ['hr', orgId, 'all-salary-payments'] as const,
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
      void queryClient.invalidateQueries({ queryKey: ['hr', orgId, 'salary-payments'] })
      void queryClient.invalidateQueries({ queryKey: ['hr', orgId, 'all-salary-payments'] })
      void queryClient.invalidateQueries({ queryKey: ['accounting'] })
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
    queryKey: hrKeys.hrSettings(orgId),
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
        supplement_tl: Number(data.supplement_tl) || DEFAULT_HR_SETTINGS.supplement_tl,
        absence_full_day_divisor: Number(data.absence_full_day_divisor) || DEFAULT_HR_SETTINGS.absence_full_day_divisor,
        absence_half_day_divisor: Number(data.absence_half_day_divisor) || DEFAULT_HR_SETTINGS.absence_half_day_divisor,
        absence_hourly_divisor: Number(data.absence_hourly_divisor) || DEFAULT_HR_SETTINGS.absence_hourly_divisor,
        daily_deduction_enabled: data.daily_deduction_enabled ?? DEFAULT_HR_SETTINGS.daily_deduction_enabled,
        hourly_deduction_enabled: data.hourly_deduction_enabled ?? DEFAULT_HR_SETTINGS.hourly_deduction_enabled,
        standard_check_in: data.standard_check_in ?? DEFAULT_HR_SETTINGS.standard_check_in,
        standard_check_out: data.standard_check_out ?? DEFAULT_HR_SETTINGS.standard_check_out,
        timezone: data.timezone ?? DEFAULT_HR_SETTINGS.timezone,
        weekend_off: data.weekend_off ?? DEFAULT_HR_SETTINGS.weekend_off,
      } as HrSettings
    },
    enabled: !!orgId,
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
          absence_full_day_divisor: settings.absence_full_day_divisor,
          absence_half_day_divisor: settings.absence_half_day_divisor,
          absence_hourly_divisor: settings.absence_hourly_divisor,
          daily_deduction_enabled: settings.daily_deduction_enabled,
          hourly_deduction_enabled: settings.hourly_deduction_enabled,
          standard_check_in: settings.standard_check_in,
          standard_check_out: settings.standard_check_out,
          timezone: settings.timezone,
          weekend_off: settings.weekend_off,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'organization_id' },
      )
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: hrKeys.hrSettings(orgId) })
    },
  })
}
