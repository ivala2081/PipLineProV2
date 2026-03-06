import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  UserPlus,
  ShieldCheck,
  User,
  Eye,
  EyeSlash,
  Crown,
  EnvelopeSimple,
  IdentificationCard,
  Lock,
} from '@phosphor-icons/react'
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
import { inviteMemberSchema, type InviteMemberValues } from '@/schemas/organizationSchema'
import type { OrgMemberRole } from '@/lib/database.types'

interface InviteMemberDialogProps {
  open: boolean
  onClose: () => void
  orgId: string
  assignableRoles?: OrgMemberRole[]
}

function RoleCard({
  selected,
  onClick,
  icon,
  title,
  description,
}: {
  selected: boolean
  onClick: () => void
  icon: React.ReactNode
  title: string
  description?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-start gap-3 rounded-xl border-2 p-4 text-left transition-colors ${
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
      <div>
        <p className={`text-sm font-medium ${selected ? 'text-brand' : ''}`}>{title}</p>
        {description && <p className="mt-0.5 text-xs text-black/40">{description}</p>}
      </div>
    </button>
  )
}

type AddMethod = 'email' | 'direct'

export function InviteMemberDialog({
  open,
  onClose,
  orgId,
  assignableRoles,
}: InviteMemberDialogProps) {
  const { t } = useTranslation('pages')
  const { toast } = useToast()
  const inviteMember = useInviteMember(orgId)
  const [showPassword, setShowPassword] = useState(false)
  const [method, setMethod] = useState<AddMethod>('email')

  const form = useForm<InviteMemberValues>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: {
      email: '',
      role: 'operation',
      password: '',
      displayName: '',
      skipEmail: false,
    },
  })

  // eslint-disable-next-line react-hooks/incompatible-library -- react-hook-form watch
  const selectedRole = form.watch('role')

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      form.reset({ email: '', role: 'operation', password: '', displayName: '', skipEmail: false })
      setShowPassword(false)
      setMethod('email')
    }
  }, [open, form])

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      const result = await inviteMember.mutateAsync({ ...data, skipEmail: method === 'direct' })
      if (method === 'direct') {
        toast({ title: t('organizations.toast.memberAdded'), variant: 'success' })
      } else if (result?.userAlreadyExisted) {
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
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="md">
        <DialogHeader>
          <div className="flex items-center gap-sm">
            <div className="flex size-10 items-center justify-center rounded-lg bg-brand/10">
              <UserPlus size={20} className="text-brand" />
            </div>
            <DialogTitle>{t('organizations.inviteDialog.title')}</DialogTitle>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-md">
          {/* Method selection */}
          <div className="space-y-sm">
            <Label>{t('organizations.inviteDialog.method')}</Label>
            <div className="grid grid-cols-2 gap-sm">
              <RoleCard
                selected={method === 'email'}
                onClick={() => setMethod('email')}
                icon={<EnvelopeSimple size={18} />}
                title={t('organizations.inviteDialog.methodEmail')}
              />
              <RoleCard
                selected={method === 'direct'}
                onClick={() => setMethod('direct')}
                icon={<Lock size={18} />}
                title={t('organizations.inviteDialog.methodDirect')}
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-sm">
            <Label>{t('organizations.inviteDialog.email')}</Label>
            <Input
              type="email"
              {...form.register('email')}
              placeholder={t('organizations.inviteDialog.emailPlaceholder')}
            />
            {form.formState.errors.email && (
              <p className="text-xs text-red">{form.formState.errors.email.message}</p>
            )}
          </div>

          {/* Display Name */}
          <div className="space-y-sm">
            <Label>
              {t('organizations.inviteDialog.displayName')}
              <span className="ml-1 text-xs font-normal text-black/40">
                ({t('organizations.inviteDialog.optional')})
              </span>
            </Label>
            <Input
              type="text"
              {...form.register('displayName')}
              placeholder={t('organizations.inviteDialog.displayNamePlaceholder')}
            />
          </div>

          {/* Password */}
          <div className="space-y-sm">
            <Label>{t('organizations.inviteDialog.password')}</Label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                {...form.register('password')}
                placeholder={t('organizations.inviteDialog.passwordPlaceholder')}
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
            {form.formState.errors.password ? (
              <p className="text-xs text-red">{form.formState.errors.password.message}</p>
            ) : (
              <p className="text-xs text-black/40">
                {t('organizations.inviteDialog.passwordHint')}
              </p>
            )}
          </div>

          {/* Role */}
          <div className="space-y-sm">
            <Label>{t('organizations.inviteDialog.role')}</Label>
            <div className="grid gap-sm">
              {(!assignableRoles || assignableRoles.includes('operation')) && (
                <RoleCard
                  selected={selectedRole === 'operation'}
                  onClick={() => form.setValue('role', 'operation')}
                  icon={<User size={18} />}
                  title={t('organizations.inviteDialog.roleOperation')}
                  description={t('organizations.inviteDialog.roleOperationDescription')}
                />
              )}
              {(!assignableRoles || assignableRoles.includes('manager')) && (
                <RoleCard
                  selected={selectedRole === 'manager'}
                  onClick={() => form.setValue('role', 'manager')}
                  icon={<Crown size={18} />}
                  title={t('organizations.inviteDialog.roleManager')}
                  description={t('organizations.inviteDialog.roleManagerDescription')}
                />
              )}
              {(!assignableRoles || assignableRoles.includes('admin')) && (
                <RoleCard
                  selected={selectedRole === 'admin'}
                  onClick={() => form.setValue('role', 'admin')}
                  icon={<ShieldCheck size={18} />}
                  title={t('organizations.inviteDialog.roleAdmin')}
                  description={t('organizations.inviteDialog.roleAdminDescription')}
                />
              )}
              {(!assignableRoles || assignableRoles.includes('ik')) && (
                <RoleCard
                  selected={selectedRole === 'ik'}
                  onClick={() => form.setValue('role', 'ik')}
                  icon={<IdentificationCard size={18} />}
                  title={t('organizations.inviteDialog.roleIk')}
                  description={t('organizations.inviteDialog.roleIkDescription')}
                />
              )}
            </div>
            {form.formState.errors.role && (
              <p className="text-xs text-red">{form.formState.errors.role.message}</p>
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
            <Button type="submit" variant="filled" disabled={inviteMember.isPending}>
              {inviteMember.isPending
                ? t('organizations.inviteDialog.sending')
                : method === 'direct'
                  ? t('organizations.inviteDialog.createAccount')
                  : t('organizations.inviteDialog.invite')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
