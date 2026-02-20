import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { useAuth } from '@/app/providers/AuthProvider'
import type {
  HrEmployeeRole,
  HrDocumentType,
  HrBonusType,
  HrAttendanceStatus,
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
  is_insured: boolean
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
  is_insured?: boolean
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
  notes: string | null
  recorded_by: string | null
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
}

export const HR_DOCUMENT_TYPES: { type: HrDocumentType; labelTr: string; labelEn: string }[] = [
  { type: 'ikametgah', labelTr: 'İkametgâh Belgesi', labelEn: 'Residence Certificate' },
  { type: 'adli_sicil', labelTr: 'Adli Sicil Kaydı', labelEn: 'Criminal Record' },
  { type: 'diploma', labelTr: 'Diploma Fotokopisi', labelEn: 'Diploma Copy' },
  { type: 'saglik_raporu', labelTr: 'Sağlık Raporu', labelEn: 'Health Report' },
  { type: 'kimlik_on', labelTr: 'Kimlik Ön Yüz', labelEn: 'ID Card (Front)' },
  { type: 'kimlik_arka', labelTr: 'Kimlik Arka Yüz', labelEn: 'ID Card (Back)' },
]

export const HR_EMPLOYEE_ROLES: HrEmployeeRole[] = [
  'Manager',
  'Marketing',
  'Operation',
  'Re-attention',
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
  salaryPayments: (orgId: string, year: number, month: number) =>
    ['hr', orgId, 'salary-payments', year, month] as const,
  attendance: (orgId: string, date: string) => ['hr', orgId, 'attendance', date] as const,
  attendanceMonth: (orgId: string, year: number, month: number) =>
    ['hr', orgId, 'attendance-month', year, month] as const,
  autoBonusTransfers: (orgId: string, year: number, month: number) =>
    ['hr', orgId, 'auto-bonus-transfers', year, month] as const,
  mtConfig: (orgId: string) => ['hr', orgId, 'mt-config'] as const,
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
    mutationFn: async (
      payload: Omit<HrBonusPayment, 'id' | 'organization_id' | 'created_by' | 'created_at'> & {
        agreement_id?: string | null
      },
    ) => {
      const { data, error } = await supabase
        .from('hr_bonus_payments')
        .insert({
          ...payload,
          organization_id: orgId,
          created_by: user?.id ?? null,
        })
        .select()
        .single()
      if (error) throw error
      return data as HrBonusPayment
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: hrKeys.bonusPayments(orgId) })
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
    },
  })

  return { createAgreement, updateAgreement, deleteAgreement, createPayment, deletePayment }
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

  const dateFrom = `${year}-${String(month).padStart(2, '0')}-01T00:00:00`
  const lastDay = new Date(year, month, 0).getDate()
  const dateTo = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59`

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

      // 1. Create hr_bonus_payments for each item, get back IDs
      const paymentsPayload = items.map((item) => ({
        organization_id: orgId,
        employee_id: item.employee_id,
        agreement_id: null as string | null,
        period: item.period,
        amount_usdt: item.amount_usdt,
        paid_at: paidAt,
        notes: null as string | null,
        created_by: user.id,
      }))

      const { data: payments, error: paymentError } = await supabase
        .from('hr_bonus_payments')
        .insert(paymentsPayload)
        .select('id, employee_id')
      if (paymentError) throw paymentError

      // Build employee_id → payment_id map
      const paymentIdByEmployee = new Map<string, string>(
        (payments ?? []).map((p) => [p.employee_id, p.id]),
      )

      // 2. Create accounting_entries for each item, linked to payment
      const entriesPayload = items.map((item) => ({
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
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: hrKeys.bonusPayments(orgId) })
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
  paid_at: string
  notes: string | null
  created_by: string | null
  created_at: string
}

export type BulkSalaryPayoutItem = {
  employee_id: string
  employee_name: string
  amount_tl: number
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
        amount_tl: item.amount_tl,
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

      // 2. Create accounting_entries linked to salary payments
      const entriesPayload = items.map((item) => ({
        organization_id: orgId,
        description: item.description,
        entry_type: 'ODEME' as const,
        direction: 'out' as const,
        amount: item.amount_tl,
        currency: 'TL',
        entry_date: paidAt,
        payment_period: item.period,
        register: 'NAKIT_TL',
        hr_payment_id: paymentIdByEmployee.get(item.employee_id) ?? null,
        hr_payment_type: 'salary' as const,
        created_by: user.id,
      }))

      const { error: entryError } = await supabase.from('accounting_entries').insert(entriesPayload)
      if (entryError) throw entryError
    },
    onSuccess: () => {
      // Invalidate all salary payment queries
      void queryClient.invalidateQueries({ queryKey: ['hr', orgId, 'salary-payments'] })
      void queryClient.invalidateQueries({ queryKey: ['accounting'] })
    },
  })
}
