import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  IdentificationCard,
  Plus,
  MagnifyingGlass,
  DotsThree,
  PencilSimple,
  Trash,
  CheckCircle,
  XCircle,
  Envelope,
  FolderOpen,
  ShieldWarning,
  Shield,
  CurrencyCircleDollar,
  Money,
  Users,
  GearSix,
} from '@phosphor-icons/react'
import {
  PageHeader,
  Button,
  Input,
  Tag,
  EmptyState,
  Skeleton,
  Grid,
  StatCard,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@ds'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { useAuth } from '@/app/providers/AuthProvider'
import { useToast } from '@/hooks/useToast'
import {
  useHrEmployeesQuery,
  useHrMutations,
  useHrSalaryPaymentsQuery,
  useHrSettingsQuery,
  type HrEmployee,
} from '@/hooks/queries/useHrQuery'
import { EmployeeDialog } from './EmployeeDialog'
import { DeleteEmployeeDialog } from './DeleteEmployeeDialog'
import { DocumentsDialog } from './DocumentsDialog'
import { BonusesTab } from './bonuses'
import { AttendanceTab } from './AttendanceTab'
import { SalariesTab } from './SalariesTab'
import { SettingsTab } from './SettingsTab'
import type { HrEmployeeRole } from '@/lib/database.types'

/* ------------------------------------------------------------------ */
/*  Role color mapping                                                  */
/* ------------------------------------------------------------------ */

function getRoleTag(role: HrEmployeeRole) {
  const map: Record<
    HrEmployeeRole,
    { variant: 'blue' | 'purple' | 'green' | 'orange' | 'red' | 'cyan'; label: string }
  > = {
    Manager: { variant: 'blue', label: 'Manager' },
    Marketing: { variant: 'purple', label: 'Marketing' },
    Operation: { variant: 'green', label: 'Operation' },
    'Retention': { variant: 'orange', label: 'Retention' },
    'Project Management': { variant: 'cyan', label: 'Project Mgmt' },
    'Social Media': { variant: 'purple', label: 'Social Media' },
    'Sales Development': { variant: 'red', label: 'Sales Dev' },
    Programmer: { variant: 'blue', label: 'Programmer' },
  }
  return map[role] ?? { variant: 'blue', label: role }
}

function EmployeeRow({
  emp,
  canManage,
  lang,
  onEdit,
  onDelete,
  onDocs,
}: {
  emp: HrEmployee
  canManage: boolean
  lang: 'tr' | 'en'
  onEdit: () => void
  onDelete: () => void
  onDocs: () => void
}) {
  const roleInfo = getRoleTag(emp.role)

  const formattedSalary =
    emp.salary_tl > 0
      ? new Intl.NumberFormat(lang === 'tr' ? 'tr-TR' : 'en-US', {
          style: 'currency',
          currency: 'TRY',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(emp.salary_tl)
      : '—'

  const formattedDate = emp.hire_date
    ? new Date(emp.hire_date).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '—'

  return (
    <TableRow className="group border-b border-black/[0.06] last:border-0">
      {/* Name + Email */}
      <TableCell className="py-3">
        <p className="text-sm font-semibold text-black">{emp.full_name}</p>
        <div className="mt-0.5 flex items-center gap-1 text-xs text-black/50">
          <Envelope size={11} className="shrink-0 text-black/30" />
          <span>{emp.email}</span>
        </div>
      </TableCell>

      {/* Role */}
      <TableCell className="py-3">
        <Tag variant={roleInfo.variant}>{roleInfo.label}</Tag>
      </TableCell>

      {/* Salary */}
      <TableCell className="py-3 tabular-nums text-sm text-black/70">{formattedSalary}</TableCell>

      {/* Insurance */}
      <TableCell className="py-3">
        {emp.is_insured ? (
          <div className="flex items-center gap-1">
            <Shield size={13} weight="fill" className="text-blue" />
            <span className="text-xs text-blue">{lang === 'tr' ? 'Sigortalı' : 'Insured'}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <ShieldWarning size={13} weight="fill" className="text-orange" />
            <span className="text-xs text-orange">
              {lang === 'tr' ? 'Sigortasız' : 'Uninsured'}
            </span>
          </div>
        )}
      </TableCell>

      {/* Status */}
      <TableCell className="py-3">
        {emp.is_active ? (
          <div className="flex items-center gap-1">
            <CheckCircle size={13} weight="fill" className="text-green" />
            <span className="text-xs text-green">{lang === 'tr' ? 'Aktif' : 'Active'}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <XCircle size={13} weight="fill" className="text-black/30" />
            <span className="text-xs text-black/40">{lang === 'tr' ? 'Pasif' : 'Inactive'}</span>
          </div>
        )}
      </TableCell>

      {/* Hire Date */}
      <TableCell className="py-3 tabular-nums text-xs text-black/60">{formattedDate}</TableCell>

      {/* Actions */}
      {canManage && (
        <TableCell className="py-3 text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100">
                <DotsThree size={18} weight="bold" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <PencilSimple size={14} />
                {lang === 'tr' ? 'Düzenle' : 'Edit'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDocs}>
                <FolderOpen size={14} />
                {lang === 'tr' ? 'Belgeler' : 'Documents'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-red focus:text-red">
                <Trash size={14} />
                {lang === 'tr' ? 'Sil' : 'Delete'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      )}
    </TableRow>
  )
}

/* ------------------------------------------------------------------ */
/*  Payment schedule helpers                                            */
/* ------------------------------------------------------------------ */

function daysUntil(dayOfMonth: number): number {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const today = now.getDate()

  let target = new Date(year, month, dayOfMonth)
  if (today > dayOfMonth) {
    target = new Date(year, month + 1, dayOfMonth)
  }
  const diff = Math.ceil((target.getTime() - new Date(year, month, today).getTime()) / 86400000)
  return diff
}

function dayLabel(d: number, lang: 'tr' | 'en') {
  if (d === 0) return lang === 'tr' ? 'Bugün' : 'Today'
  if (d === 1) return lang === 'tr' ? 'Yarın' : 'Tomorrow'
  return lang === 'tr' ? `${d} gün sonra` : `in ${d} days`
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                           */
/* ------------------------------------------------------------------ */

export function HrPage() {
  const { t, i18n } = useTranslation('pages')
  const { toast } = useToast()
  const { membership } = useOrganization()
  const { isGod } = useAuth()
  const canManage = isGod || membership?.role === 'admin' || membership?.role === 'manager'

  const { data: employees = [], isLoading } = useHrEmployeesQuery()
  const { deleteEmployee } = useHrMutations()
  const { data: hrSettings } = useHrSettingsQuery()
  const settingsRoles = hrSettings?.roles ?? []

  const lang: 'tr' | 'en' = i18n.language === 'tr' ? 'tr' : 'en'

  // Salary payment query for tab badge
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  const { data: currentSalaryPayments = [] } = useHrSalaryPaymentsQuery(currentYear, currentMonth)

  const [activeTab, setActiveTab] = useState('employees')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<HrEmployee | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<HrEmployee | null>(null)
  const [docsEmployee, setDocsEmployee] = useState<HrEmployee | null>(null)

  const filtered = useMemo(() => {
    let list = employees
    if (roleFilter !== 'all') list = list.filter((e) => e.role === roleFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (e) => e.full_name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q),
      )
    }
    return list
  }, [employees, search, roleFilter])

  const stats = useMemo(() => {
    const active = employees.filter((e) => e.is_active).length
    const insured = employees.filter((e) => e.is_insured).length
    const uninsured = employees.length - insured
    return { total: employees.length, active, insured, uninsured }
  }, [employees])

  const salaryPendingCount = useMemo(() => {
    const activeWithSalary = employees.filter((e) => e.is_active && e.salary_tl > 0)
    const paidIds = new Set(currentSalaryPayments.map((p) => p.employee_id))
    return activeWithSalary.filter((e) => !paidIds.has(e.id)).length
  }, [employees, currentSalaryPayments])

  const handleEdit = (emp: HrEmployee) => {
    setEditTarget(emp)
    setDialogOpen(true)
  }
  const handleAddNew = () => {
    setEditTarget(null)
    setDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteEmployee.mutateAsync(deleteTarget.id)
      toast({ title: lang === 'tr' ? 'Çalışan silindi' : 'Employee deleted', variant: 'success' })
      setDeleteTarget(null)
    } catch {
      toast({ title: lang === 'tr' ? 'Bir hata oluştu' : 'Something went wrong', variant: 'error' })
    }
  }

  /* Tab-aware header action */
  const headerAction =
    canManage && activeTab === 'employees' ? (
      <Button variant="filled" onClick={handleAddNew}>
        <Plus size={16} weight="bold" />
        {t('hr.addEmployee', 'Çalışan Ekle')}
      </Button>
    ) : undefined

  return (
    <div className="space-y-lg">
      <PageHeader
        title={t('hr.title', 'İnsan Kaynakları')}
        subtitle={t('hr.subtitle', 'Çalışanları yönetin ve belgelerini takip edin')}
        actions={headerAction}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="employees">
            {lang === 'tr' ? 'Çalışanlar' : 'Employees'}
            {employees.length > 0 && (
              <span className="ml-1.5 rounded-full bg-black/10 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums leading-none">
                {employees.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="salaries">
            {lang === 'tr' ? 'Maaşlar' : 'Salaries'}
            {salaryPendingCount > 0 && (
              <span className="ml-1.5 rounded-full bg-orange/15 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums leading-none text-orange">
                {salaryPendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="bonuses">{lang === 'tr' ? 'Primler' : 'Bonuses'}</TabsTrigger>
          <TabsTrigger value="attendance">
            {lang === 'tr' ? 'Devam Takibi' : 'Attendance'}
          </TabsTrigger>
          {canManage && (
            <TabsTrigger value="settings">
              <GearSix size={14} className="mr-1" />
              {lang === 'tr' ? 'Ayarlar' : 'Settings'}
            </TabsTrigger>
          )}
        </TabsList>

        {/* ── Employees Tab ── */}
        <TabsContent value="employees">
          <div className="space-y-lg pt-lg">
            {/* Stats + Payment Schedule */}
            {!isLoading && employees.length > 0 && (
              <div className="space-y-md">
                <Grid cols={4} gap="md">
                  <StatCard
                    icon={Users}
                    iconBg="bg-black/5"
                    iconColor="text-black/60"
                    label={lang === 'tr' ? 'Toplam' : 'Total'}
                    value={stats.total}
                  />
                  <StatCard
                    icon={CheckCircle}
                    iconBg="bg-green/10"
                    iconColor="text-green"
                    label={lang === 'tr' ? 'Aktif' : 'Active'}
                    value={stats.active}
                  />
                  <StatCard
                    icon={Shield}
                    iconBg="bg-blue/10"
                    iconColor="text-blue"
                    label={lang === 'tr' ? 'Sigortalı' : 'Insured'}
                    value={stats.insured}
                  />
                  {stats.uninsured > 0 && (
                    <StatCard
                      icon={ShieldWarning}
                      iconBg="bg-orange/10"
                      iconColor="text-orange"
                      label={lang === 'tr' ? 'Sigortasız' : 'Uninsured'}
                      value={stats.uninsured}
                    />
                  )}
                </Grid>

                {/* Payment schedule strip */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-xl border border-black/[0.07] bg-bg1 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <Money size={14} className="shrink-0 text-green" />
                    <span className="text-xs text-black/50">
                      {lang === 'tr' ? 'Maaş' : 'Salary'}&nbsp;—&nbsp;
                      <span className="font-medium text-black/70">
                        {lang === 'tr' ? "Her ayın 5'i" : '5th'}
                      </span>
                    </span>
                    <span
                      className={`text-xs tabular-nums ${daysUntil(5) <= 3 ? 'text-orange' : 'text-black/35'}`}
                    >
                      · {dayLabel(daysUntil(5), lang)}
                    </span>
                  </div>
                  <div className="h-3 w-px bg-black/10" />
                  <div className="flex items-center gap-2">
                    <CurrencyCircleDollar size={14} className="shrink-0 text-purple" />
                    <span className="text-xs text-black/50">
                      {lang === 'tr' ? 'Prim' : 'Bonus'}&nbsp;—&nbsp;
                      <span className="font-medium text-black/70">
                        {lang === 'tr' ? "Her ayın 20'si" : '20th'}
                      </span>
                    </span>
                    <span
                      className={`text-xs tabular-nums ${daysUntil(20) <= 3 ? 'text-orange' : 'text-black/35'}`}
                    >
                      · {dayLabel(daysUntil(20), lang)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-sm">
              <div className="relative min-w-48 flex-1">
                <MagnifyingGlass
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30"
                />
                <Input
                  className="pl-9"
                  placeholder={t('hr.searchPlaceholder', 'Ad veya e-posta ara...')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="w-48">
                <Select
                  value={roleFilter}
                  onValueChange={setRoleFilter}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={lang === 'tr' ? 'Role göre filtrele' : 'Filter by role'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {lang === 'tr' ? 'Tüm Roller' : 'All Roles'}
                    </SelectItem>
                    {settingsRoles.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Employee table */}
            {isLoading ? (
              <div className="rounded-xl border border-black/[0.07] bg-bg1">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-black/[0.07]">
                      <TableHead className="text-xs font-medium text-black/40">
                        {lang === 'tr' ? 'Çalışan' : 'Employee'}
                      </TableHead>
                      <TableHead className="text-xs font-medium text-black/40">
                        {lang === 'tr' ? 'Rol' : 'Role'}
                      </TableHead>
                      <TableHead className="text-xs font-medium text-black/40">
                        {lang === 'tr' ? 'Maaş' : 'Salary'}
                      </TableHead>
                      <TableHead className="text-xs font-medium text-black/40">
                        {lang === 'tr' ? 'Sigorta' : 'Insurance'}
                      </TableHead>
                      <TableHead className="text-xs font-medium text-black/40">
                        {lang === 'tr' ? 'Durum' : 'Status'}
                      </TableHead>
                      <TableHead className="text-xs font-medium text-black/40">
                        {lang === 'tr' ? 'İşe Giriş' : 'Hire Date'}
                      </TableHead>
                      {canManage && <TableHead />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i} className="border-b border-black/[0.06] last:border-0">
                        <TableCell className="py-3">
                          <Skeleton className="mb-1.5 h-4 w-36 rounded" />
                          <Skeleton className="h-3 w-48 rounded" />
                        </TableCell>
                        <TableCell className="py-3">
                          <Skeleton className="h-5 w-20 rounded" />
                        </TableCell>
                        <TableCell className="py-3">
                          <Skeleton className="h-4 w-24 rounded" />
                        </TableCell>
                        <TableCell className="py-3">
                          <Skeleton className="h-4 w-20 rounded" />
                        </TableCell>
                        <TableCell className="py-3">
                          <Skeleton className="h-4 w-16 rounded" />
                        </TableCell>
                        <TableCell className="py-3">
                          <Skeleton className="h-4 w-24 rounded" />
                        </TableCell>
                        {canManage && <TableCell className="py-3" />}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={IdentificationCard}
                title={
                  search || roleFilter !== 'all'
                    ? t('hr.noResults', 'Arama ile eşleşen çalışan bulunamadı')
                    : t('hr.empty', 'Henüz çalışan eklenmedi')
                }
                description={
                  !search && roleFilter === 'all'
                    ? t('hr.emptyDesc', 'Çalışan eklemek için "Çalışan Ekle" butonuna tıklayın.')
                    : undefined
                }
                action={
                  canManage && !search && roleFilter === 'all' ? (
                    <Button variant="filled" onClick={handleAddNew}>
                      <Plus size={16} weight="bold" />
                      {t('hr.addEmployee', 'Çalışan Ekle')}
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <div className="rounded-xl border border-black/[0.07] bg-bg1">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-black/[0.07]">
                      <TableHead className="text-xs font-medium text-black/40">
                        {lang === 'tr' ? 'Çalışan' : 'Employee'}
                      </TableHead>
                      <TableHead className="text-xs font-medium text-black/40">
                        {lang === 'tr' ? 'Rol' : 'Role'}
                      </TableHead>
                      <TableHead className="text-xs font-medium text-black/40">
                        {lang === 'tr' ? 'Maaş' : 'Salary'}
                      </TableHead>
                      <TableHead className="text-xs font-medium text-black/40">
                        {lang === 'tr' ? 'Sigorta' : 'Insurance'}
                      </TableHead>
                      <TableHead className="text-xs font-medium text-black/40">
                        {lang === 'tr' ? 'Durum' : 'Status'}
                      </TableHead>
                      <TableHead className="text-xs font-medium text-black/40">
                        {lang === 'tr' ? 'İşe Giriş' : 'Hire Date'}
                      </TableHead>
                      {canManage && <TableHead />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((emp) => (
                      <EmployeeRow
                        key={emp.id}
                        emp={emp}
                        canManage={canManage}
                        lang={lang}
                        onEdit={() => handleEdit(emp)}
                        onDelete={() => setDeleteTarget(emp)}
                        onDocs={() => setDocsEmployee(emp)}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Salaries Tab ── */}
        <TabsContent value="salaries">
          <div className="pt-lg">
            <SalariesTab employees={employees} canManage={canManage} lang={lang} />
          </div>
        </TabsContent>

        {/* ── Bonuses Tab ── */}
        <TabsContent value="bonuses">
          <div className="pt-lg">
            <BonusesTab employees={employees} canManage={canManage} lang={lang} />
          </div>
        </TabsContent>

        {/* ── Attendance Tab ── */}
        <TabsContent value="attendance">
          <div className="pt-lg">
            <AttendanceTab employees={employees} canManage={canManage} lang={lang} />
          </div>
        </TabsContent>

        {/* ── Settings Tab ── */}
        {canManage && (
          <TabsContent value="settings">
            <div className="pt-lg">
              <SettingsTab employees={employees} canManage={canManage} lang={lang} />
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Dialogs */}
      <EmployeeDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false)
          setEditTarget(null)
        }}
        employee={editTarget}
      />

      <DeleteEmployeeDialog
        open={!!deleteTarget}
        employee={deleteTarget}
        isDeleting={deleteEmployee.isPending}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />

      <DocumentsDialog
        open={!!docsEmployee}
        employee={docsEmployee}
        onClose={() => setDocsEmployee(null)}
      />
    </div>
  )
}
