/**
 * RoleDeleteDialog — Confirmation dialog shown when deleting a role
 * that still has active employees assigned to it.
 *
 * Extracted from SettingsTab.tsx (Phase 2 refactoring).
 */
import { Warning, ShieldWarning } from '@phosphor-icons/react'
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@ds'

/* ------------------------------------------------------------------ */
/*  Props                                                               */
/* ------------------------------------------------------------------ */

export interface RoleDeleteDialogProps {
  /** The role name being deleted, or null when dialog is closed. */
  deleteRole: string | null
  /** Number of active employees currently in the role. */
  deleteRoleEmpCount: number
  /** Whether the reassignment mutation is in progress. */
  isPending: boolean
  lang: 'tr' | 'en'
  /** Called when user cancels / closes the dialog. */
  onClose: () => void
  /** Called when user confirms the deletion. */
  onConfirm: () => void
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function RoleDeleteDialog({
  deleteRole,
  deleteRoleEmpCount,
  isPending,
  lang,
  onClose,
  onConfirm,
}: RoleDeleteDialogProps) {
  return (
    <Dialog open={!!deleteRole} onOpenChange={(v) => !v && onClose()}>
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
          <Button variant="outline" onClick={onClose}>
            {lang === 'tr' ? 'İptal' : 'Cancel'}
          </Button>
          <Button
            variant="filled"
            className="bg-orange hover:bg-orange/90"
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending
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
  )
}
