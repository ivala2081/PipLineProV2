import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye, EyeSlash, Copy, Check, SpinnerGap } from '@phosphor-icons/react'
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
import { useGetCredentials, useUpdateCredentials } from '@/hooks/queries/useOrgMemberMutations'

interface CredentialsDialogProps {
  open: boolean
  onClose: () => void
  userId: string
  displayName: string
}

export function CredentialsDialog({ open, onClose, userId, displayName }: CredentialsDialogProps) {
  const { t } = useTranslation('pages')
  const { toast } = useToast()
  const getCredentials = useGetCredentials()
  const updateCredentials = useUpdateCredentials()

  const [email, setEmail] = useState('')
  const [originalEmail, setOriginalEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (open && userId) {
      getCredentials.mutate(userId, {
        onSuccess: (data) => {
          setEmail(data.email)
          setOriginalEmail(data.email)
        },
      })
      setNewPassword('')
      setShowPassword(false)
      setCopied(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, userId])

  const handleCopyEmail = async () => {
    await navigator.clipboard.writeText(email)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSave = async () => {
    const updates: { userId: string; email?: string; password?: string } = { userId }

    if (email !== originalEmail) updates.email = email
    if (newPassword.length > 0) updates.password = newPassword

    if (!updates.email && !updates.password) {
      toast({ title: t('credentials.noChanges'), variant: 'error' })
      return
    }

    try {
      await updateCredentials.mutateAsync(updates)
      toast({ title: t('credentials.updated'), variant: 'success' })
      setOriginalEmail(email)
      setNewPassword('')
      onClose()
    } catch (err) {
      toast({ title: (err as Error).message, variant: 'error' })
    }
  }

  const isLoading = getCredentials.isPending
  const isSaving = updateCredentials.isPending

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>
            {t('credentials.title')} — {displayName}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <SpinnerGap className="h-6 w-6 animate-spin text-black/30" />
          </div>
        ) : (
          <div className="space-y-md">
            <div className="space-y-sm">
              <Label>{t('credentials.email')}</Label>
              <div className="flex gap-xs">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0 px-3"
                  onClick={handleCopyEmail}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </Button>
              </div>
            </div>

            <div className="space-y-sm">
              <Label>{t('credentials.newPassword')}</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t('credentials.passwordPlaceholder')}
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
              <p className="text-xs text-black/40">{t('credentials.passwordHint')}</p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
            {t('credentials.cancel')}
          </Button>
          <Button
            type="button"
            variant="filled"
            onClick={handleSave}
            disabled={isLoading || isSaving}
          >
            {isSaving ? t('credentials.saving') : t('credentials.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
