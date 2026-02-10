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
import { useInviteMember } from '@/hooks/queries/useOrgMemberMutations'
import {
  inviteMemberSchema,
  type InviteMemberValues,
} from '@/schemas/organizationSchema'

interface InviteMemberDialogProps {
  open: boolean
  onClose: () => void
  orgId: string
}

export function InviteMemberDialog({
  open,
  onClose,
  orgId,
}: InviteMemberDialogProps) {
  const { t } = useTranslation('pages')
  const { toast } = useToast()
  const inviteMember = useInviteMember(orgId)

  const form = useForm<InviteMemberValues>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { email: '', role: 'operation' },
  })

  // Reset form when dialog opens
  useEffect(() => {
    if (open) form.reset({ email: '', role: 'operation' })
  }, [open, form])

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      await inviteMember.mutateAsync(data)
      toast({ title: t('organizations.toast.invited'), variant: 'success' })
      onClose()
    } catch (err) {
      toast({ title: (err as Error).message, variant: 'error' })
    }
  })

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('organizations.inviteDialog.title')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t('organizations.inviteDialog.email')}</Label>
            <Input
              type="email"
              {...form.register('email')}
              placeholder={t('organizations.inviteDialog.emailPlaceholder')}
            />
            {form.formState.errors.email && (
              <p className="text-xs text-red-500">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t('organizations.inviteDialog.role')}</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="operation"
                  {...form.register('role')}
                  className="size-4"
                />
                <span className="text-sm">
                  {t('organizations.inviteDialog.roleOperation')}
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
                  {t('organizations.inviteDialog.roleAdmin')}
                </span>
              </label>
            </div>
            {form.formState.errors.role && (
              <p className="text-xs text-red-500">
                {form.formState.errors.role.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={inviteMember.isPending}
            >
              {t('organizations.inviteDialog.cancel')}
            </Button>
            <Button
              type="submit"
              variant="filled"
              disabled={inviteMember.isPending}
            >
              {inviteMember.isPending
                ? t('organizations.inviteDialog.sending')
                : t('organizations.inviteDialog.invite')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
