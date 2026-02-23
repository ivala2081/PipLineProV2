import { useState } from 'react'
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
import { Eye, EyeSlash } from '@phosphor-icons/react'
import { useToast } from '@/hooks/useToast'
import { useInviteMember } from '@/hooks/queries/useOrgMemberMutations'
import { inviteMemberSchema, type InviteMemberValues } from '@/schemas/organizationSchema'
import type { OrgMemberRole } from '@/lib/database.types'

interface AddMemberDialogProps {
  open: boolean
  onClose: () => void
  orgId: string
  assignableRoles?: OrgMemberRole[]
}

export function AddMemberDialog({ open, onClose, orgId, assignableRoles }: AddMemberDialogProps) {
  const { t } = useTranslation('pages')
  const { toast } = useToast()
  const inviteMember = useInviteMember(orgId)
  const [showPassword, setShowPassword] = useState(false)

  const form = useForm<InviteMemberValues>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { email: '', password: '', role: 'operation', displayName: '' },
  })

  const handleOpenChange = (o: boolean) => {
    if (o) {
      form.reset({ email: '', password: '', role: 'operation', displayName: '' })
      setShowPassword(false)
    } else {
      onClose()
    }
  }

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      const result = await inviteMember.mutateAsync(data)
      if (result?.userAlreadyExisted) {
        toast({ title: t('organizations.toast.memberAdded'), variant: 'success' })
      } else {
        toast({ title: t('organizations.toast.memberAdded'), variant: 'success' })
      }
      onClose()
    } catch (err) {
      toast({ title: (err as Error).message, variant: 'error' })
    }
  })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{t('organizations.addMemberDialog.title')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-md">
          <div className="space-y-sm">
            <Label>{t('organizations.addMemberDialog.displayName')}</Label>
            <Input
              type="text"
              {...form.register('displayName')}
              placeholder={t('organizations.addMemberDialog.displayNamePlaceholder')}
            />
          </div>

          <div className="space-y-sm">
            <Label>{t('organizations.addMemberDialog.email')}</Label>
            <Input
              type="email"
              {...form.register('email')}
              placeholder={t('organizations.addMemberDialog.emailPlaceholder')}
            />
            {form.formState.errors.email && (
              <p className="text-xs text-red">{form.formState.errors.email.message}</p>
            )}
          </div>

          <div className="space-y-sm">
            <Label>{t('organizations.addMemberDialog.password')}</Label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                {...form.register('password')}
                placeholder={t('organizations.addMemberDialog.passwordPlaceholder')}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 hover:text-black/60"
              >
                {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {form.formState.errors.password && (
              <p className="text-xs text-red">{form.formState.errors.password.message}</p>
            )}
          </div>

          <div className="space-y-sm">
            <Label>{t('organizations.addMemberDialog.role')}</Label>
            <div className="flex gap-md">
              {(!assignableRoles || assignableRoles.includes('operation')) && (
                <label className="flex items-center gap-sm">
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
              )}
              {(!assignableRoles || assignableRoles.includes('manager')) && (
                <label className="flex items-center gap-sm">
                  <input
                    type="radio"
                    value="manager"
                    {...form.register('role')}
                    className="size-4"
                  />
                  <span className="text-sm">{t('organizations.addMemberDialog.roleManager')}</span>
                </label>
              )}
              {(!assignableRoles || assignableRoles.includes('admin')) && (
                <label className="flex items-center gap-sm">
                  <input type="radio" value="admin" {...form.register('role')} className="size-4" />
                  <span className="text-sm">{t('organizations.addMemberDialog.roleAdmin')}</span>
                </label>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={inviteMember.isPending}
            >
              {t('organizations.addMemberDialog.cancel')}
            </Button>
            <Button type="submit" variant="filled" disabled={inviteMember.isPending}>
              {inviteMember.isPending
                ? t('organizations.addMemberDialog.adding')
                : t('organizations.addMemberDialog.add')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
