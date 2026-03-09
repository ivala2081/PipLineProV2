import { useState, useMemo } from 'react'
import { GearSix, Plus, Trash, FloppyDisk } from '@phosphor-icons/react'
import {
  Button,
  Input,
  Label,
  Tag,
  Skeleton,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@ds'
import { useToast } from '@/hooks/useToast'
import {
  useHrSettingsQuery,
  useUpdateHrSettingsMutation,
  useHrMutations,
  type HrEmployee,
  type HrSettings,
  DEFAULT_HR_SETTINGS,
} from '@/hooks/queries/useHrQuery'
import { PROTECTED_ROLES, COMMON_TIMEZONES, getRoleVariant } from './utils/hrConstants'
import { RoleDeleteDialog } from './components/RoleDeleteDialog'

/* ------------------------------------------------------------------ */

interface SettingsTabProps {
  employees: HrEmployee[]
  canManage: boolean
  lang: 'tr' | 'en'
}

export function SettingsTab({ employees, canManage, lang }: SettingsTabProps) {
  const { toast } = useToast()
  const { data: settings, isLoading } = useHrSettingsQuery()
  const updateSettings = useUpdateHrSettingsMutation()
  const { updateEmployee } = useHrMutations()

  /* Draft state */
  const [draft, setDraft] = useState<HrSettings | null>(null)
  const [newRoleName, setNewRoleName] = useState('')
  const [deleteRole, setDeleteRole] = useState<string | null>(null)

  const current = draft ?? settings ?? DEFAULT_HR_SETTINGS
  const isEditing = draft !== null

  /* Employees count per role */
  const empCountByRole = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of employees) {
      if (e.is_active) {
        map.set(e.role, (map.get(e.role) ?? 0) + 1)
      }
    }
    return map
  }, [employees])

  /* Delete role employees */
  const deleteRoleEmpCount = deleteRole ? (empCountByRole.get(deleteRole) ?? 0) : 0

  /* Start editing */
  const startEdit = () => setDraft({ ...(settings ?? DEFAULT_HR_SETTINGS) })
  const cancelEdit = () => {
    setDraft(null)
    setNewRoleName('')
  }

  /* Add role */
  const handleAddRole = () => {
    if (!draft) return
    const name = newRoleName.trim()
    if (!name) return
    if (draft.roles.some((r) => r.toLowerCase() === name.toLowerCase())) {
      toast({
        title: lang === 'tr' ? 'Bu rol zaten mevcut' : 'This role already exists',
        variant: 'error',
      })
      return
    }
    setDraft({ ...draft, roles: [...draft.roles, name] })
    setNewRoleName('')
  }

  /* Remove role (opens confirm if employees exist) */
  const handleRemoveRole = (role: string) => {
    if (PROTECTED_ROLES.includes(role)) {
      toast({
        title:
          lang === 'tr'
            ? `${role} rolü otomatik prim sistemine bağlı, silinemez`
            : `${role} role is linked to auto-bonus system and cannot be deleted`,
        variant: 'error',
      })
      return
    }
    const count = empCountByRole.get(role) ?? 0
    if (count > 0) {
      setDeleteRole(role)
    } else {
      if (!draft) return
      setDraft({ ...draft, roles: draft.roles.filter((r) => r !== role) })
    }
  }

  /* Confirm delete role with employee reassignment */
  const confirmDeleteRole = async () => {
    if (!draft || !deleteRole) return
    const affectedEmployees = employees.filter((e) => e.is_active && e.role === deleteRole)
    // Ensure "Diğer" is in the roles list
    const newRoles = draft.roles.filter((r) => r !== deleteRole)
    if (!newRoles.includes('Diğer')) newRoles.push('Diğer')
    try {
      for (const emp of affectedEmployees) {
        await updateEmployee.mutateAsync({ id: emp.id, payload: { role: 'Diğer' as never } })
      }
      setDraft({ ...draft, roles: newRoles })
      toast({
        title:
          lang === 'tr'
            ? `${affectedEmployees.length} çalışan "Diğer" rolüne atandı`
            : `${affectedEmployees.length} employees reassigned to "Other"`,
        variant: 'success',
      })
    } catch {
      toast({
        title: lang === 'tr' ? 'Bir hata oluştu' : 'Something went wrong',
        variant: 'error',
      })
    } finally {
      setDeleteRole(null)
    }
  }

  /* Save all settings */
  const handleSave = async () => {
    if (!draft) return
    try {
      await updateSettings.mutateAsync(draft)
      toast({
        title: lang === 'tr' ? 'Ayarlar kaydedildi' : 'Settings saved',
        variant: 'success',
      })
      setDraft(null)
    } catch {
      toast({
        title: lang === 'tr' ? 'Bir hata oluştu' : 'Something went wrong',
        variant: 'error',
      })
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-lg">
        <Skeleton className="h-8 w-48 rounded" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-lg">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GearSix size={18} className="text-black/40" />
          <h2 className="text-sm font-semibold text-black/70">
            {lang === 'tr' ? 'Genel Ayarlar' : 'General Settings'}
          </h2>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" size="sm" onClick={cancelEdit}>
                  {lang === 'tr' ? 'İptal' : 'Cancel'}
                </Button>
                <Button
                  variant="filled"
                  size="sm"
                  disabled={updateSettings.isPending}
                  onClick={() => void handleSave()}
                >
                  <FloppyDisk size={14} />
                  {updateSettings.isPending
                    ? lang === 'tr'
                      ? 'Kaydediliyor...'
                      : 'Saving...'
                    : lang === 'tr'
                      ? 'Kaydet'
                      : 'Save'}
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={startEdit}>
                {lang === 'tr' ? 'Düzenle' : 'Edit'}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* ── Section 1: Roller ── */}
      <div className="space-y-sm">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-black/40">
          {lang === 'tr' ? 'Roller' : 'Roles'}
        </h3>
        <div className="rounded-xl border border-black/[0.07] bg-bg1 p-4 space-y-md">
          {/* Role list */}
          <div className="flex flex-wrap gap-2">
            {current.roles.map((role) => {
              const count = empCountByRole.get(role) ?? 0
              const isProtected = PROTECTED_ROLES.includes(role)
              return (
                <div
                  key={role}
                  className="flex items-center gap-1.5 rounded-lg border border-black/[0.07] bg-bg2 px-2.5 py-1.5"
                >
                  <Tag variant={getRoleVariant(role)}>{role}</Tag>
                  {count > 0 && (
                    <span className="text-[10px] text-black/40 tabular-nums">({count})</span>
                  )}
                  {isEditing && (
                    <button
                      className={`ml-1 rounded p-0.5 transition-colors ${
                        isProtected
                          ? 'cursor-not-allowed text-black/15'
                          : 'text-black/30 hover:bg-red/10 hover:text-red'
                      }`}
                      disabled={isProtected}
                      title={
                        isProtected
                          ? lang === 'tr'
                            ? 'Otomatik prim bağlı — silinemez'
                            : 'Linked to auto-bonus — cannot delete'
                          : lang === 'tr'
                            ? 'Sil'
                            : 'Delete'
                      }
                      onClick={() => handleRemoveRole(role)}
                    >
                      <Trash size={12} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {/* Add new role */}
          {isEditing && (
            <div className="flex items-center gap-2">
              <Input
                className="max-w-xs text-sm"
                placeholder={lang === 'tr' ? 'Yeni rol adı...' : 'New role name...'}
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddRole()}
              />
              <Button
                variant="outline"
                size="sm"
                disabled={!newRoleName.trim()}
                onClick={handleAddRole}
              >
                <Plus size={14} />
                {lang === 'tr' ? 'Ekle' : 'Add'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── Section 2: Çalışma Saatleri ── */}
      <div className="space-y-sm">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-black/40">
          {lang === 'tr' ? 'Çalışma Saatleri' : 'Work Hours'}
        </h3>
        <div className="rounded-xl border border-black/[0.07] bg-bg1 p-4 space-y-md">
          <div className="grid grid-cols-1 gap-sm sm:gap-md sm:grid-cols-3">
            {/* Standard check-in */}
            <div className="space-y-xs">
              <Label className="text-xs text-black/50">
                {lang === 'tr' ? 'Giriş Saati' : 'Check-in Time'}
              </Label>
              {isEditing ? (
                <input
                  type="time"
                  value={current.standard_check_in}
                  onChange={(e) => setDraft({ ...current, standard_check_in: e.target.value })}
                  className="h-9 w-full rounded-md border border-black/[0.12] bg-bg2/75 px-3 text-sm text-black focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/20"
                />
              ) : (
                <p className="text-sm font-medium text-black/70">{current.standard_check_in}</p>
              )}
            </div>

            {/* Standard check-out */}
            <div className="space-y-xs">
              <Label className="text-xs text-black/50">
                {lang === 'tr' ? 'Çıkış Saati' : 'Check-out Time'}
              </Label>
              {isEditing ? (
                <input
                  type="time"
                  value={current.standard_check_out}
                  onChange={(e) => setDraft({ ...current, standard_check_out: e.target.value })}
                  className="h-9 w-full rounded-md border border-black/[0.12] bg-bg2/75 px-3 text-sm text-black focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/20"
                />
              ) : (
                <p className="text-sm font-medium text-black/70">{current.standard_check_out}</p>
              )}
            </div>

            {/* Timezone */}
            <div className="space-y-xs">
              <Label className="text-xs text-black/50">
                {lang === 'tr' ? 'Saat Dilimi' : 'Timezone'}
              </Label>
              {isEditing ? (
                <Select
                  value={current.timezone}
                  onValueChange={(v) => setDraft({ ...current, timezone: v })}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm font-medium text-black/70">
                  {COMMON_TIMEZONES.find((tz) => tz.value === current.timezone)?.label ??
                    current.timezone}
                </p>
              )}
            </div>
          </div>

          <p className="text-[11px] text-black/30">
            {lang === 'tr'
              ? 'Giriş saatinden sonra gelen çalışanlar otomatik olarak "Geç Geldi" işaretlenir ve eksik saat hesaplanır.'
              : 'Employees arriving after the check-in time are automatically marked as "Late" with calculated missing hours.'}
          </p>
        </div>
      </div>

      {/* ── Section: Hafta Sonu Tatili ── */}
      <div className="space-y-sm">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-black/40">
          {lang === 'tr' ? 'Hafta Sonu Tatili' : 'Weekend Off'}
        </h3>
        <div className="rounded-xl border border-black/[0.07] bg-bg1 p-4 space-y-md">
          <div className="min-h-[44px] flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-black/70">
                {lang === 'tr' ? 'Hafta Sonu Devam Takibi' : 'Weekend Attendance Tracking'}
              </p>
              <p className="text-[11px] text-black/30">
                {lang === 'tr'
                  ? 'Aktif olduğunda Cumartesi ve Pazar günleri otomatik OFF olarak işaretlenir, devam takibi yapılmaz'
                  : 'When enabled, Saturday and Sunday are automatically marked as OFF, no attendance tracking is performed'}
              </p>
            </div>
            {isEditing ? (
              <button
                type="button"
                role="switch"
                aria-checked={current.weekend_off}
                onClick={() =>
                  setDraft({
                    ...current,
                    weekend_off: !current.weekend_off,
                  })
                }
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  current.weekend_off ? 'bg-brand' : 'bg-black/15'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform ${
                    current.weekend_off ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            ) : (
              <Tag variant={current.weekend_off ? 'green' : 'red'}>
                {current.weekend_off
                  ? lang === 'tr'
                    ? 'Aktif'
                    : 'Active'
                  : lang === 'tr'
                    ? 'Kapalı'
                    : 'Disabled'}
              </Tag>
            )}
          </div>
        </div>
      </div>

      {/* ── Section: Barem Departmanları ── */}
      <div className="space-y-sm">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-black/40">
          {lang === 'tr' ? 'Barem Departmanları' : 'Threshold Departments'}
        </h3>
        <div className="rounded-xl border border-black/[0.07] bg-bg1 p-4 space-y-md">
          <p className="text-[11px] text-black/30">
            {lang === 'tr'
              ? 'Seçilen departmanlarda İK yöneticisi, çalışanları "baremi geçemedi" olarak işaretleyebilir. Barem geçemeyenler prim hak etmez.'
              : 'In selected departments, HR managers can mark employees as "failed threshold". Employees who fail receive no bonus.'}
          </p>
          <div className="flex flex-wrap gap-2">
            {current.roles.map((role) => {
              const isSelected = current.barem_roles.includes(role)
              return (
                <button
                  key={role}
                  type="button"
                  disabled={!isEditing}
                  onClick={() => {
                    if (!isEditing) return
                    const next = isSelected
                      ? current.barem_roles.filter((r) => r !== role)
                      : [...current.barem_roles, role]
                    setDraft({ ...current, barem_roles: next })
                  }}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    isSelected
                      ? 'border-brand/40 bg-brand/5 text-brand'
                      : isEditing
                        ? 'border-black/[0.07] bg-bg2 text-black/50 hover:border-black/20'
                        : 'border-black/[0.07] bg-bg2 text-black/30'
                  }`}
                >
                  {role}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Section 3: Devam Kesintisi ── */}
      <div className="space-y-sm">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-black/40">
          {lang === 'tr' ? 'Devam Kesintisi Ayarları' : 'Absence Deduction Settings'}
        </h3>
        <div className="rounded-xl border border-black/[0.07] bg-bg1 p-4 space-y-lg">
          {/* ── Daily Deduction (Tam gün + Yarım gün) ── */}
          <div className="space-y-md">
            <div className="min-h-[44px] flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-black/70">
                  {lang === 'tr' ? 'Günlük Kesinti' : 'Daily Deduction'}
                </p>
                <p className="text-[11px] text-black/30">
                  {lang === 'tr'
                    ? 'Tam gün ve yarım gün devamsızlık kesintileri'
                    : 'Full day and half day absence deductions'}
                </p>
              </div>
              {isEditing ? (
                <button
                  type="button"
                  role="switch"
                  aria-checked={current.daily_deduction_enabled}
                  onClick={() =>
                    setDraft({
                      ...current,
                      daily_deduction_enabled: !current.daily_deduction_enabled,
                    })
                  }
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    current.daily_deduction_enabled ? 'bg-brand' : 'bg-black/15'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform ${
                      current.daily_deduction_enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              ) : (
                <Tag variant={current.daily_deduction_enabled ? 'green' : 'red'}>
                  {current.daily_deduction_enabled
                    ? lang === 'tr'
                      ? 'Aktif'
                      : 'Active'
                    : lang === 'tr'
                      ? 'Kapalı'
                      : 'Disabled'}
                </Tag>
              )}
            </div>

            {current.daily_deduction_enabled && (
              <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
                {/* Full day divisor */}
                <div className="space-y-xs">
                  <Label className="text-xs text-black/50">
                    {lang === 'tr' ? 'Tam gün bölen' : 'Full day divisor'}
                  </Label>
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-black/40">
                        {lang === 'tr' ? 'Maaş ÷' : 'Salary ÷'}
                      </span>
                      <Input
                        className="w-24 text-center text-sm"
                        type="number"
                        min={1}
                        value={current.absence_full_day_divisor}
                        onChange={(e) =>
                          setDraft({
                            ...current,
                            absence_full_day_divisor: parseInt(e.target.value) || 30,
                          })
                        }
                      />
                    </div>
                  ) : (
                    <p className="text-sm font-medium text-black/70">
                      {lang === 'tr' ? 'Maaş' : 'Salary'} ÷ {current.absence_full_day_divisor}
                    </p>
                  )}
                  <p className="text-[11px] text-black/30">
                    {lang === 'tr'
                      ? '1 gün gelmezse maaştan kesilecek miktar'
                      : 'Amount deducted for 1 full day absence'}
                  </p>
                </div>

                {/* Half day divisor */}
                <div className="space-y-xs">
                  <Label className="text-xs text-black/50">
                    {lang === 'tr' ? 'Yarım gün bölen' : 'Half day divisor'}
                  </Label>
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-black/40">
                        {lang === 'tr' ? 'Maaş ÷' : 'Salary ÷'}
                      </span>
                      <Input
                        className="w-24 text-center text-sm"
                        type="number"
                        min={1}
                        value={current.absence_half_day_divisor}
                        onChange={(e) =>
                          setDraft({
                            ...current,
                            absence_half_day_divisor: parseInt(e.target.value) || 60,
                          })
                        }
                      />
                    </div>
                  ) : (
                    <p className="text-sm font-medium text-black/70">
                      {lang === 'tr' ? 'Maaş' : 'Salary'} ÷ {current.absence_half_day_divisor}
                    </p>
                  )}
                  <p className="text-[11px] text-black/30">
                    {lang === 'tr'
                      ? 'Yarım gün geldiyse maaştan kesilecek miktar'
                      : 'Amount deducted for a half day'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-black/[0.06]" />

          {/* ── Hourly Deduction (Saatlik) ── */}
          <div className="space-y-md">
            <div className="min-h-[44px] flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-black/70">
                  {lang === 'tr' ? 'Saatlik Kesinti' : 'Hourly Deduction'}
                </p>
                <p className="text-[11px] text-black/30">
                  {lang === 'tr'
                    ? 'Eksik saat bazlı devamsızlık kesintileri'
                    : 'Missing hours based absence deductions'}
                </p>
              </div>
              {isEditing ? (
                <button
                  type="button"
                  role="switch"
                  aria-checked={current.hourly_deduction_enabled}
                  onClick={() =>
                    setDraft({
                      ...current,
                      hourly_deduction_enabled: !current.hourly_deduction_enabled,
                    })
                  }
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    current.hourly_deduction_enabled ? 'bg-brand' : 'bg-black/15'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform ${
                      current.hourly_deduction_enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              ) : (
                <Tag variant={current.hourly_deduction_enabled ? 'green' : 'red'}>
                  {current.hourly_deduction_enabled
                    ? lang === 'tr'
                      ? 'Aktif'
                      : 'Active'
                    : lang === 'tr'
                      ? 'Kapalı'
                      : 'Disabled'}
                </Tag>
              )}
            </div>

            {current.hourly_deduction_enabled && (
              <div className="space-y-xs">
                <Label className="text-xs text-black/50">
                  {lang === 'tr' ? 'Saatlik bölen' : 'Hourly divisor'}
                </Label>
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-black/40">
                      {lang === 'tr' ? 'Maaş ÷' : 'Salary ÷'}
                    </span>
                    <Input
                      className="w-24 text-center text-sm"
                      type="number"
                      min={1}
                      value={current.absence_hourly_divisor}
                      onChange={(e) =>
                        setDraft({
                          ...current,
                          absence_hourly_divisor: parseInt(e.target.value) || 240,
                        })
                      }
                    />
                  </div>
                ) : (
                  <p className="text-sm font-medium text-black/70">
                    {lang === 'tr' ? 'Maaş' : 'Salary'} ÷ {current.absence_hourly_divisor}
                  </p>
                )}
                <p className="text-[11px] text-black/30">
                  {lang === 'tr'
                    ? '1 saatlik izin için maaştan kesilecek miktar'
                    : 'Amount deducted per hour of absence'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Section 3: Sigorta Elden Ödeme ── */}
      <div className="space-y-sm">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-black/40">
          {lang === 'tr' ? 'Sigorta Elden Ödeme' : 'Insurance Supplement'}
        </h3>
        <div className="rounded-xl border border-black/[0.07] bg-bg1 p-4 space-y-md">
          {/* Currency selector */}
          <div className="space-y-xs">
            <Label className="text-xs text-black/50">
              {lang === 'tr' ? 'Para Birimi' : 'Currency'}
            </Label>
            {isEditing ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDraft({ ...current, supplement_currency: 'TL' })}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    current.supplement_currency === 'TL'
                      ? 'border-brand/40 bg-brand/5 text-brand'
                      : 'border-black/[0.07] bg-bg2 text-black/50 hover:border-black/20'
                  }`}
                >
                  ₺ TL
                </button>
                <button
                  type="button"
                  onClick={() => setDraft({ ...current, supplement_currency: 'USD' })}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    current.supplement_currency === 'USD'
                      ? 'border-brand/40 bg-brand/5 text-brand'
                      : 'border-black/[0.07] bg-bg2 text-black/50 hover:border-black/20'
                  }`}
                >
                  $ USD
                </button>
              </div>
            ) : (
              <p className="text-sm font-medium text-black/70">
                {current.supplement_currency === 'TL' ? '₺ Türk Lirası (TL)' : '$ Amerikan Doları (USD)'}
              </p>
            )}
          </div>

          {/* Amount */}
          <div className="space-y-xs">
            <Label className="text-xs text-black/50">
              {lang === 'tr'
                ? `Aylık ek ödeme tutarı (${current.supplement_currency})`
                : `Monthly supplement amount (${current.supplement_currency})`}
            </Label>
            {isEditing ? (
              <div className="flex items-center gap-2">
                <Input
                  className="w-32 text-sm"
                  type="number"
                  min={0}
                  value={current.supplement_tl}
                  onChange={(e) =>
                    setDraft({
                      ...current,
                      supplement_tl: parseInt(e.target.value) || 0,
                    })
                  }
                />
                <span className="text-sm text-black/40">{current.supplement_currency}</span>
              </div>
            ) : (
              <p className="text-sm font-medium text-black/70">
                {current.supplement_tl.toLocaleString('tr-TR')} {current.supplement_currency}
              </p>
            )}
            <p className="text-[11px] text-black/30">
              {lang === 'tr'
                ? 'Sigortası olmayan, ek ödeme alan çalışanlara aylık ödenen tutar'
                : 'Monthly amount paid to uninsured employees who receive supplement'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Section 4: Sigortalı Banka Ödeme ── */}
      <div className="space-y-sm">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-black/40">
          {lang === 'tr' ? 'Sigortalı Banka Ödeme' : 'Insured Bank Deposit'}
        </h3>
        <div className="rounded-xl border border-black/[0.07] bg-bg1 p-4 space-y-md">
          {/* Currency selector */}
          <div className="space-y-xs">
            <Label className="text-xs text-black/50">
              {lang === 'tr' ? 'Para Birimi' : 'Currency'}
            </Label>
            {isEditing ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDraft({ ...current, insured_bank_currency: 'TL' })}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    current.insured_bank_currency === 'TL'
                      ? 'border-brand/40 bg-brand/5 text-brand'
                      : 'border-black/[0.07] bg-bg2 text-black/50 hover:border-black/20'
                  }`}
                >
                  ₺ TL
                </button>
                <button
                  type="button"
                  onClick={() => setDraft({ ...current, insured_bank_currency: 'USD' })}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    current.insured_bank_currency === 'USD'
                      ? 'border-brand/40 bg-brand/5 text-brand'
                      : 'border-black/[0.07] bg-bg2 text-black/50 hover:border-black/20'
                  }`}
                >
                  $ USD
                </button>
              </div>
            ) : (
              <p className="text-sm font-medium text-black/70">
                {current.insured_bank_currency === 'TL' ? '₺ Türk Lirası (TL)' : '$ Amerikan Doları (USD)'}
              </p>
            )}
            <p className="text-[11px] text-black/30">
              {lang === 'tr'
                ? 'Sadece bu para birimi ile maaş alan sigortalı çalışanlara otomatik tutar uygulanır. Farklı para birimi ile maaş alanlar için elle girilir.'
                : 'Automatic amount only applies to insured employees paid in this currency. Others require manual entry.'}
            </p>
          </div>

          {/* Amount */}
          <div className="space-y-xs">
            <Label className="text-xs text-black/50">
              {lang === 'tr'
                ? `Aylık bankaya yatırılacak tutar (${current.insured_bank_currency})`
                : `Monthly bank deposit amount (${current.insured_bank_currency})`}
            </Label>
            {isEditing ? (
              <div className="flex items-center gap-2">
                <Input
                  className="w-40 text-sm"
                  type="number"
                  min={0}
                  step="0.01"
                  value={current.insured_bank_amount_tl}
                  onChange={(e) =>
                    setDraft({
                      ...current,
                      insured_bank_amount_tl: parseFloat(e.target.value) || 0,
                    })
                  }
                />
                <span className="text-sm text-black/40">{current.insured_bank_currency}</span>
              </div>
            ) : (
              <p className="text-sm font-medium text-black/70">
                {current.insured_bank_amount_tl.toLocaleString('tr-TR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                {current.insured_bank_currency}
              </p>
            )}
            <p className="text-[11px] text-black/30">
              {lang === 'tr'
                ? 'Her ayın 5\'inde sigortalı çalışanların banka hesabına yatırılan asgari ücret tutarı'
                : 'Minimum wage amount deposited to insured employees\' bank accounts on the 5th of each month'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Role delete confirm dialog ── */}
      <RoleDeleteDialog
        deleteRole={deleteRole}
        deleteRoleEmpCount={deleteRoleEmpCount}
        isPending={updateEmployee.isPending}
        lang={lang}
        onClose={() => setDeleteRole(null)}
        onConfirm={() => void confirmDeleteRole()}
      />
    </div>
  )
}
