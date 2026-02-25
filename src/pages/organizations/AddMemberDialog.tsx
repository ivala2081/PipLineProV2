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
import { Eye, EyeSlash, EnvelopeSimple, Lock } from '@phosphor-icons/react'
import { useToast } from '@/hooks/useToast'
import { useInviteMember } from '@/hooks/queries/useOrgMemberMutations'
import { inviteMemberSchema, type InviteMemberValues } from '@/schemas/organizationSchema'
import type { OrgMemberRole } from '@/lib/database.types'

type AddMethod = 'email' | 'direct'

function MethodCard({
  selected,
  onClick,
  icon,
  title,
}: {
  selected: boolean
  onClick: () => void
  icon: React.ReactNode
  title: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition-colors ${
        selected ? 'border-brand bg-brand/5' : 'border-black/10 hover:border-black/20'
      }`}
    >
      <div
        className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
          selected ? 'bg-brand/10 text-brand' : 'bg-black/5 text-black/40'
        }`}
      >
        {icon}
      </div>
      <p className={`text-sm font-medium ${selected ? 'text-brand' : ''}`}>{title}</p>
    </button>
  )
}

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
  const [method, setMethod] = useState<AddMethod>('email')

  const form = useForm<InviteMemberValues>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: {
      email: '',
      password: '',
      role: 'operation',
      displayName: '',
      skipEmail: false,
    },
  })

  const handleOpenChange = (o: boolean) => {
    if (!o) onClose()
  }

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      await inviteMember.mutateAsync({ ...data, skipEmail: method === 'direct' })
      if (method === 'direct') {
        toast({ title: t('organizations.toast.memberAdded'), variant: 'success' })
      } else {
        toast({ title: t('organizations.toast.invited'), variant: 'success' })
      }
      onClose()
    } catch (err) {
      const message = (err as Error).message
      if (message.includes('DUPLICATE_INVITATION')) {
        toast({ title: t('organizations.toast.duplicateInvitation'), variant: 'error' })
      } else {
        toast({ title: message, variant: 'error' })
      }
    }
  })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{t('organizations.addMemberDialog.title')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-md">
          {/* Method selection */}
          <div className="space-y-sm">
            <Label>{t('organizations.inviteDialog.method')}</Label>
            <div className="grid grid-cols-2 gap-sm">
              <MethodCard
                selected={method === 'email'}
                onClick={() => setMethod('email')}
                icon={<EnvelopeSimple size={18} />}
                title={t('organizations.inviteDialog.methodEmail')}
              />
              <MethodCard
                selected={method === 'direct'}
                onClick={() => setMethod('direct')}
                icon={<Lock size={18} />}
                title={t('organizations.inviteDialog.methodDirect')}
              />
            </div>
          </div>

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
                : method === 'direct'
                  ? t('organizations.inviteDialog.createAccount')
                  : t('organizations.addMemberDialog.add')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
