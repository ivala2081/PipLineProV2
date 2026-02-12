import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  User,
  Phone,
  Briefcase,
  Info,
  ShieldCheck,
} from '@phosphor-icons/react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label,
  Separator,
} from '@ds'

interface EditProfileDialogProps {
  open: boolean
  onClose: () => void
  onSave: (data: ProfileFormData) => Promise<void>
  initialData: ProfileFormData
  canEditAdminFields: boolean
  isSaving: boolean
}

export interface ProfileFormData {
  display_name: string
  phone: string
  bio: string
  department: string
  notes: string
}

export function EditProfileDialog({
  open,
  onClose,
  onSave,
  initialData,
  canEditAdminFields,
  isSaving,
}: EditProfileDialogProps) {
  const { t } = useTranslation('pages')
  const [formData, setFormData] = useState<ProfileFormData>(initialData)

  // Sync form data when initial data changes
  useEffect(() => {
    setFormData(initialData)
  }, [initialData, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSave(formData)
  }

  const handleCancel = () => {
    setFormData(initialData)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('memberProfile.editProfile')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-1 space-y-6">
            {/* Display Name */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <User size={16} className="text-black/50" />
                {t('memberProfile.fields.displayName')}
              </Label>
              <Input
                value={formData.display_name}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, display_name: e.target.value }))
                }
                placeholder={t('memberProfile.fields.displayNamePlaceholder')}
              />
            </div>

            <Separator />

            {/* Phone */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Phone size={16} className="text-black/50" />
                {t('memberProfile.fields.phone')}
              </Label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, phone: e.target.value }))
                }
                placeholder={t('memberProfile.fields.phonePlaceholder')}
              />
            </div>

            <Separator />

            {/* Bio */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Info size={16} className="text-black/50" />
                {t('memberProfile.sections.bio')}
              </Label>
              <textarea
                value={formData.bio}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, bio: e.target.value }))
                }
                placeholder={t('memberProfile.fields.bioPlaceholder')}
                rows={5}
                className="w-full resize-none rounded-lg border border-black/10 bg-white px-4 py-3 text-sm text-black/90 outline-none transition-colors placeholder:text-black/30 focus:border-black/20"
              />
            </div>

            {/* Admin-only fields */}
            {canEditAdminFields && (
              <>
                <Separator />

                {/* Department */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <Briefcase size={16} className="text-black/50" />
                    {t('memberProfile.fields.department')}
                  </Label>
                  <Input
                    value={formData.department}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, department: e.target.value }))
                    }
                    placeholder={t('memberProfile.fields.departmentPlaceholder')}
                  />
                </div>

                <Separator />

                {/* Internal Notes */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <ShieldCheck size={16} className="text-black/50" />
                    {t('memberProfile.sections.notes')}
                    <span className="text-xs font-normal text-black/40">
                      ({t('memberProfile.notesHint')})
                    </span>
                  </Label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, notes: e.target.value }))
                    }
                    placeholder={t('memberProfile.fields.notesPlaceholder')}
                    rows={4}
                    className="w-full resize-none rounded-lg border border-black/10 bg-white px-4 py-3 text-sm text-black/90 outline-none transition-colors placeholder:text-black/30 focus:border-black/20"
                  />
                </div>
              </>
            )}
          </div>

          {/* Fixed footer with actions */}
          <div className="flex justify-end gap-2 border-t border-black/5 pt-4 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSaving}
            >
              {t('memberProfile.cancel')}
            </Button>
            <Button type="submit" variant="filled" disabled={isSaving}>
              {isSaving
                ? t('memberProfile.saving')
                : t('memberProfile.saveChanges')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
