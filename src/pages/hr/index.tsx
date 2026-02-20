import { useState, useMemo, useRef } from 'react'
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
} from '@phosphor-icons/react'
import {
  PageHeader,
  Button,
  Input,
  Tag,
  EmptyState,
  Skeleton,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
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
} from '@ds'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { useAuth } from '@/app/providers/AuthProvider'
import { useToast } from '@/hooks/useToast'
import {
  useHrEmployeesQuery,
  useHrMutations,
  HR_EMPLOYEE_ROLES,
  type HrEmployee,
} from '@/hooks/queries/useHrQuery'
import { EmployeeDialog } from './EmployeeDialog'
import { DeleteEmployeeDialog } from './DeleteEmployeeDialog'
import { DocumentsDialog } from './DocumentsDialog'
import { BonusesTab } from './bonuses'
import { AttendanceTab } from './AttendanceTab'
import { SalariesTab } from './SalariesTab'
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
    'Re-attention': { variant: 'orange', label: 'Re-attention' },
    'Project Management': { variant: 'cyan', label: 'Project Mgmt' },
    'Social Media': { variant: 'purple', label: 'Social Media' },
    'Sales Development': { variant: 'red', label: 'Sales Dev' },
    Programmer: { variant: 'blue', label: 'Programmer' },
  }
  return map[role] ?? { variant: 'blue', label: role }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function AvatarInitials({ name, role }: { name: string; role: HrEmployeeRole }) {
  const colors: Partial<Record<HrEmployeeRole, string>> = {
    Manager: 'bg-blue/15 text-blue',
    Marketing: 'bg-purple/15 text-purple',
    Operation: 'bg-mint/15 text-mint',
    'Re-attention': 'bg-orange/15 text-orange',
    'Project Management': 'bg-cyan/15 text-cyan',
    'Social Media': 'bg-purple/15 text-purple',
    'Sales Development': 'bg-red/15 text-red',
    Programmer: 'bg-blue/15 text-blue',
  }
  return (
    <div
      className={`flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${colors[role] ?? 'bg-black/10 text-black/60'}`}
    >
      {getInitials(name)}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Stats pill                                                          */
/* ------------------------------------------------------------------ */

function StatPill({ label, count, variant }: { label: string; count: number; variant: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-black/[0.07] bg-bg1 px-3 py-2 shadow-sm">
      <span className={`text-lg font-bold tabular-nums ${variant}`}>{count}</span>
      <span className="text-xs text-black/50">{label}</span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Payment Schedule Banner                                             */
/* ------------------------------------------------------------------ */

function daysUntil(dayOfMonth: number): number {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const today = now.getDate()

  let target = new Date(year, month, dayOfMonth)
  if (today > dayOfMonth) {
    // Already passed this month — next occurrence
    target = new Date(year, month + 1, dayOfMonth)
  }
  const diff = Math.ceil((target.getTime() - new Date(year, month, today).getTime()) / 86400000)
  return diff
}

function PaymentScheduleBanner({ lang }: { lang: 'tr' | 'en' }) {
  const salaryDays = daysUntil(5)
  const bonusDays = daysUntil(20)

  const salaryLabel = lang === 'tr' ? 'Maaş Ödemesi' : 'Salary Payment'
  const bonusLabel = lang === 'tr' ? 'Prim Ödemesi' : 'Bonus Payment'
  const dayLabel = (d: number) =>
    d === 0
      ? lang === 'tr'
        ? 'Bugün'
        : 'Today'
      : d === 1
        ? lang === 'tr'
          ? 'Yarın'
          : 'Tomorrow'
        : lang === 'tr'
          ? `${d} gün sonra`
          : `in ${d} days`

  return (
    <div className="flex flex-wrap items-center gap-sm">
      <div className="flex items-center gap-2 rounded-lg border border-black/[0.07] bg-bg1 px-3 py-2 shadow-sm">
        <Money size={14} weight="duotone" className="shrink-0 text-green" />
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-black/35">
            {salaryLabel}
          </p>
          <p className="text-xs font-medium text-black">
            {lang === 'tr' ? "Her ayın 5'i" : '5th of each month'}
            <span
              className={`ml-2 tabular-nums ${salaryDays <= 3 ? 'text-orange' : 'text-black/40'}`}
            >
              · {dayLabel(salaryDays)}
            </span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-black/[0.07] bg-bg1 px-3 py-2 shadow-sm">
        <CurrencyCircleDollar size={14} weight="duotone" className="shrink-0 text-purple" />
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-black/35">
            {bonusLabel}
          </p>
          <p className="text-xs font-medium text-black">
            {lang === 'tr' ? "Her ayın 20'si" : '20th of each month'}
            <span
              className={`ml-2 tabular-nums ${bonusDays <= 3 ? 'text-orange' : 'text-black/40'}`}
            >
              · {dayLabel(bonusDays)}
            </span>
          </p>
        </div>
      </div>
    </div>
  )
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

  const lang: 'tr' | 'en' = i18n.language === 'tr' ? 'tr' : 'en'

  const [activeTab, setActiveTab] = useState('employees')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<HrEmployeeRole | 'all'>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<HrEmployee | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<HrEmployee | null>(null)
  const [docsEmployee, setDocsEmployee] = useState<HrEmployee | null>(null)

  // Ref to BonusesTab's add handler (for header button wiring)
  const bonusAddFnRef = useRef<(() => void) | null>(null)

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
  const headerAction = canManage ? (
    activeTab === 'employees' ? (
      <Button variant="filled" onClick={handleAddNew}>
        <Plus size={16} weight="bold" />
        {t('hr.addEmployee', 'Çalışan Ekle')}
      </Button>
    ) : activeTab === 'bonuses' ? (
      <Button variant="filled" onClick={() => bonusAddFnRef.current?.()}>
        <Plus size={16} weight="bold" />
        {lang === 'tr' ? 'Prim Anlaşması Ekle' : 'Add Bonus Agreement'}
      </Button>
    ) : null
  ) : undefined

  return (
    <div className="space-y-lg">
      <PageHeader
        title={t('hr.title', 'İnsan Kaynakları')}
        subtitle={t('hr.subtitle', 'Çalışanları yönetin ve belgelerini takip edin')}
        actions={headerAction}
      />

      <PaymentScheduleBanner lang={lang} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="employees">{lang === 'tr' ? 'Çalışanlar' : 'Employees'}</TabsTrigger>
          <TabsTrigger value="salaries">{lang === 'tr' ? 'Maaşlar' : 'Salaries'}</TabsTrigger>
          <TabsTrigger value="bonuses">{lang === 'tr' ? 'Primler' : 'Bonuses'}</TabsTrigger>
          <TabsTrigger value="attendance">
            {lang === 'tr' ? 'Devam Takibi' : 'Attendance'}
          </TabsTrigger>
        </TabsList>

        {/* ── Employees Tab ── */}
        <TabsContent value="employees">
          <div className="space-y-lg pt-lg">
            {/* Stats row */}
            {!isLoading && employees.length > 0 && (
              <div className="flex flex-wrap items-center gap-sm">
                <StatPill
                  label={lang === 'tr' ? 'Toplam' : 'Total'}
                  count={stats.total}
                  variant="text-black"
                />
                <StatPill
                  label={lang === 'tr' ? 'Aktif' : 'Active'}
                  count={stats.active}
                  variant="text-green"
                />
                <StatPill
                  label={lang === 'tr' ? 'Sigortalı' : 'Insured'}
                  count={stats.insured}
                  variant="text-blue"
                />
                {stats.uninsured > 0 && (
                  <StatPill
                    label={lang === 'tr' ? 'Sigortasız' : 'Uninsured'}
                    count={stats.uninsured}
                    variant="text-orange"
                  />
                )}
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
                  onValueChange={(v) => setRoleFilter(v as HrEmployeeRole | 'all')}
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
                    {HR_EMPLOYEE_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Table */}
            {isLoading ? (
              <div className="space-y-2 rounded-xl border border-black/[0.07] p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
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
              <div className="overflow-hidden rounded-xl border border-black/[0.07] bg-bg1">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-64">
                        {lang === 'tr' ? 'Çalışan' : 'Employee'}
                      </TableHead>
                      <TableHead>{lang === 'tr' ? 'E-posta' : 'Email'}</TableHead>
                      <TableHead>{lang === 'tr' ? 'Maaş' : 'Salary'}</TableHead>
                      <TableHead>{lang === 'tr' ? 'Rol' : 'Role'}</TableHead>
                      <TableHead>{lang === 'tr' ? 'Sigorta' : 'Insurance'}</TableHead>
                      <TableHead>{lang === 'tr' ? 'Durum' : 'Status'}</TableHead>
                      <TableHead>{lang === 'tr' ? 'İşe Giriş' : 'Hire Date'}</TableHead>
                      <TableHead className="w-14" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((emp) => {
                      const roleInfo = getRoleTag(emp.role)
                      return (
                        <TableRow key={emp.id} className="group">
                          {/* Name */}
                          <TableCell>
                            <div className="flex items-center gap-sm">
                              <AvatarInitials name={emp.full_name} role={emp.role} />
                              <p className="truncate text-sm font-medium text-black">
                                {emp.full_name}
                              </p>
                            </div>
                          </TableCell>

                          {/* Email */}
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-sm text-black/60">
                              <Envelope size={13} className="shrink-0 text-black/30" />
                              <span className="truncate">{emp.email}</span>
                            </div>
                          </TableCell>

                          {/* Salary */}
                          <TableCell>
                            <span className="text-sm tabular-nums font-medium text-black/70">
                              {emp.salary_tl > 0
                                ? new Intl.NumberFormat(lang === 'tr' ? 'tr-TR' : 'en-US', {
                                    style: 'currency',
                                    currency: 'TRY',
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0,
                                  }).format(emp.salary_tl)
                                : '—'}
                            </span>
                          </TableCell>

                          {/* Role */}
                          <TableCell>
                            <Tag variant={roleInfo.variant}>{roleInfo.label}</Tag>
                          </TableCell>

                          {/* Insurance */}
                          <TableCell>
                            {emp.is_insured ? (
                              <div className="flex items-center gap-1.5">
                                <Shield size={13} weight="fill" className="text-blue" />
                                <span className="text-xs text-blue">
                                  {lang === 'tr' ? 'Sigortalı' : 'Insured'}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <ShieldWarning size={13} weight="fill" className="text-orange" />
                                <span className="text-xs text-orange">
                                  {lang === 'tr' ? 'Sigortasız' : 'Uninsured'}
                                </span>
                              </div>
                            )}
                          </TableCell>

                          {/* Status */}
                          <TableCell>
                            {emp.is_active ? (
                              <div className="flex items-center gap-1.5">
                                <CheckCircle size={14} weight="fill" className="text-green" />
                                <span className="text-xs text-green">
                                  {lang === 'tr' ? 'Aktif' : 'Active'}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <XCircle size={14} weight="fill" className="text-black/30" />
                                <span className="text-xs text-black/40">
                                  {lang === 'tr' ? 'Pasif' : 'Inactive'}
                                </span>
                              </div>
                            )}
                          </TableCell>

                          {/* Hire date */}
                          <TableCell>
                            {emp.hire_date ? (
                              <span className="text-xs tabular-nums text-black/60">
                                {new Date(emp.hire_date).toLocaleDateString(
                                  lang === 'tr' ? 'tr-TR' : 'en-US',
                                  { year: 'numeric', month: 'short', day: 'numeric' },
                                )}
                              </span>
                            ) : (
                              <span className="text-xs text-black/25">—</span>
                            )}
                          </TableCell>

                          {/* Actions */}
                          <TableCell>
                            {canManage && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    className="opacity-0 group-hover:opacity-100"
                                  >
                                    <DotsThree size={18} weight="bold" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEdit(emp)}>
                                    <PencilSimple size={14} />
                                    {lang === 'tr' ? 'Düzenle' : 'Edit'}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setDocsEmployee(emp)}>
                                    <FolderOpen size={14} />
                                    {lang === 'tr' ? 'Belgeler' : 'Documents'}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => setDeleteTarget(emp)}
                                    className="text-red focus:text-red"
                                  >
                                    <Trash size={14} />
                                    {lang === 'tr' ? 'Sil' : 'Delete'}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
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
            <BonusesTab
              employees={employees}
              canManage={canManage}
              lang={lang}
              onAddRef={(fn) => {
                bonusAddFnRef.current = fn
              }}
            />
          </div>
        </TabsContent>

        {/* ── Attendance Tab ── */}
        <TabsContent value="attendance">
          <div className="pt-lg">
            <AttendanceTab employees={employees} canManage={canManage} lang={lang} />
          </div>
        </TabsContent>
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
