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
import { useAddMember } from '@/hooks/queries/useOrgMemberMutations'
import { addMemberSchema, type AddMemberValues } from '@/schemas/organizationSchema'

interface AddMemberDialogProps {
  open: boolean
  onClose: () => void
  orgId: string
}

export function AddMemberDialog({ open, onClose, orgId }: AddMemberDialogProps) {
  const { t } = useTranslation('pages')
  const { toast } = useToast()
  const addMember = useAddMember(orgId)
  const [showPassword, setShowPassword] = useState(false)

  const form = useForm<AddMemberValues>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: { email: '', password: '', role: 'operation', display_name: '' },
  })

  const handleOpenChange = (o: boolean) => {
    if (o) {
      form.reset({ email: '', password: '', role: 'operation', display_name: '' })
      setShowPassword(false)
    } else {
      onClose()
    }
  }

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
              {...form.register('display_name')}
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
              <label className="flex items-center gap-sm">
                <input
                  type="radio"
                  value="operation"
                  {...form.register('role')}
                  className="size-4"
                />
                <span className="text-sm">{t('organizations.addMemberDialog.roleOperation')}</span>
              </label>
              <label className="flex items-center gap-sm">
                <input type="radio" value="manager" {...form.register('role')} className="size-4" />
                <span className="text-sm">{t('organizations.addMemberDialog.roleManager')}</span>
              </label>
              <label className="flex items-center gap-sm">
                <input type="radio" value="admin" {...form.register('role')} className="size-4" />
                <span className="text-sm">{t('organizations.addMemberDialog.roleAdmin')}</span>
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
            <Button type="submit" variant="filled" disabled={addMember.isPending}>
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
