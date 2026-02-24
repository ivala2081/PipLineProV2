import { useState, useMemo } from 'react'
import {
  GearSix,
  Plus,
  Trash,
  FloppyDisk,
  Warning,
  ShieldWarning,
} from '@phosphor-icons/react'
import {
  Button,
  Input,
  Label,
  Tag,
  Skeleton,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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

/* ------------------------------------------------------------------ */

const PROTECTED_ROLES = ['Marketing', 'Retention']

function getRoleVariant(
  role: string,
): 'blue' | 'purple' | 'green' | 'orange' | 'red' | 'cyan' {
  const map: Record<string, 'blue' | 'purple' | 'green' | 'orange' | 'red' | 'cyan'> = {
    Manager: 'blue',
    Marketing: 'purple',
    Operation: 'green',
    'Retention': 'orange',
    'Project Management': 'cyan',
    'Social Media': 'purple',
    'Sales Development': 'red',
    Programmer: 'blue',
  }
  return map[role] ?? 'blue'
}

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

      {/* ── Section 2: Devam Kesintisi ── */}
      <div className="space-y-sm">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-black/40">
          {lang === 'tr' ? 'Devam Kesintisi Ayarları' : 'Absence Deduction Settings'}
        </h3>
        <div className="rounded-xl border border-black/[0.07] bg-bg1 p-4 space-y-md">
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
        </div>
      </div>

      {/* ── Section 3: Sigorta Elden Ödeme ── */}
      <div className="space-y-sm">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-black/40">
          {lang === 'tr' ? 'Sigorta Elden Ödeme' : 'Insurance Supplement'}
        </h3>
        <div className="rounded-xl border border-black/[0.07] bg-bg1 p-4 space-y-md">
          <div className="space-y-xs">
            <Label className="text-xs text-black/50">
              {lang === 'tr' ? 'Aylık ek ödeme tutarı (TL)' : 'Monthly supplement amount (TL)'}
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
                <span className="text-sm text-black/40">TL</span>
              </div>
            ) : (
              <p className="text-sm font-medium text-black/70">
                {current.supplement_tl.toLocaleString('tr-TR')} TL
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

      {/* ── Role delete confirm dialog ── */}
      <Dialog open={!!deleteRole} onOpenChange={(v) => !v && setDeleteRole(null)}>
        <DialogContent size="md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldWarning size={20} weight="duotone" className="text-orange" />
              {lang === 'tr' ? 'Rol Silme Onayı' : 'Confirm Role Deletion'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-md py-2">
            <div className="flex items-start gap-3 rounded-xl border border-orange/30 bg-orange/5 px-4 py-3">
              <Warning size={18} className="mt-0.5 shrink-0 text-orange" />
              <p className="text-sm text-black/70">
                {lang === 'tr'
                  ? `"${deleteRole}" rolünde ${deleteRoleEmpCount} aktif çalışan var. Bu çalışanlar "Diğer" rolüne atanacak.`
                  : `There are ${deleteRoleEmpCount} active employees in the "${deleteRole}" role. They will be reassigned to "Other".`}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteRole(null)}>
              {lang === 'tr' ? 'İptal' : 'Cancel'}
            </Button>
            <Button
              variant="filled"
              className="bg-orange hover:bg-orange/90"
              disabled={updateEmployee.isPending}
              onClick={() => void confirmDeleteRole()}
            >
              {updateEmployee.isPending
                ? lang === 'tr'
                  ? 'İşleniyor...'
                  : 'Processing...'
                : lang === 'tr'
                  ? 'Onayla ve Sil'
                  : 'Confirm & Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
