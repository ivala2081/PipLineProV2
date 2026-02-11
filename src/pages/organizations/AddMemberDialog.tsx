import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Label,
} from '@ds'
import { useToast } from '@/hooks/useToast'
import { useAddMember } from '@/hooks/queries/useOrgMemberMutations'
import {
  addMemberSchema,
  type AddMemberValues,
} from '@/schemas/organizationSchema'

interface AddMemberDialogProps {
  open: boolean
  onClose: () => void
  orgId: string
}

export function AddMemberDialog({
  open,
  onClose,
  orgId,
}: AddMemberDialogProps) {
  const { t } = useTranslation('pages')
  const { toast } = useToast()
  const addMember = useAddMember(orgId)

  const form = useForm<AddMemberValues>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: { email: '', password: '', role: 'operation', display_name: '' },
  })

  useEffect(() => {
    if (open) form.reset({ email: '', password: '', role: 'operation', display_name: '' })
  }, [open, form])

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      await addMember.mutateAsync(data)
      toast({ title: t('organizations.toast.memberAdded'), variant: 'success' })
      onClose()
    } catch (err) {
      toast({ title: (err as Error).message, variant: 'error' })
    }
  })

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('organizations.addMemberDialog.title')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t('organizations.addMemberDialog.displayName')}</Label>
            <Input
              type="text"
              {...form.register('display_name')}
              placeholder={t('organizations.addMemberDialog.displayNamePlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('organizations.addMemberDialog.email')}</Label>
            <Input
              type="email"
              {...form.register('email')}
              placeholder={t('organizations.addMemberDialog.emailPlaceholder')}
            />
            {form.formState.errors.email && (
              <p className="text-xs text-red-500">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t('organizations.addMemberDialog.password')}</Label>
            <Input
              type="password"
              {...form.register('password')}
              placeholder={t('organizations.addMemberDialog.passwordPlaceholder')}
            />
            {form.formState.errors.password && (
              <p className="text-xs text-red-500">
                {form.formState.errors.password.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t('organizations.addMemberDialog.role')}</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="operation"
                  {...form.register('role')}
                  className="size-4"
                />
                <span className="text-sm">
                  {t('organizations.addMemberDialog.roleOperation')}
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="admin"
                  {...form.register('role')}
                  className="size-4"
                />
                <span className="text-sm">
                  {t('organizations.addMemberDialog.roleAdmin')}
                </span>
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={addMember.isPending}
            >
              {t('organizations.addMemberDialog.cancel')}
            </Button>
            <Button
              type="submit"
              variant="filled"
              disabled={addMember.isPending}
            >
              {addMember.isPending
                ? t('organizations.addMemberDialog.adding')
                : t('organizations.addMemberDialog.add')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
