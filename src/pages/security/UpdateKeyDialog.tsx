import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Key } from '@phosphor-icons/react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Button, Input } from '@ds'
import { useUpdateSecretsMutation } from '@/hooks/queries/useApiHealthQuery'

/* ── Secret name → form field mapping ────────────────────── */

const SERVICE_SECRETS: Record<string, string[]> = {
  tatum: ['TATUM_API_KEY'],
  exchangeRate: ['EXCHANGE_RATE_API_KEY'],
  gemini: ['GEMINI_API_KEY'],
  resend: ['RESEND_API_KEY'],
  uniPayment: ['UNIPAYMENT_CLIENT_ID', 'UNIPAYMENT_CLIENT_SECRET'],
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  service: string
  serviceName: string
}

export function UpdateKeyDialog({ open, onOpenChange, service, serviceName }: Props) {
  const { t } = useTranslation('pages')
  const mutation = useUpdateSecretsMutation()
  const secretNames = SERVICE_SECRETS[service] ?? []

  const [values, setValues] = useState<Record<string, string>>({})

  function handleClose() {
    setValues({})
    onOpenChange(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const secrets = secretNames
      .filter((name) => values[name]?.trim())
      .map((name) => ({ name, value: values[name].trim() }))

    if (secrets.length === 0) return

    mutation.mutate(secrets, {
      onSuccess: () => handleClose(),
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent size="md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-sm">
            <Key size={20} />
            {t('security.api.dialog.title', { service: serviceName })}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-md">
          <p className="text-sm text-black/50">{t('security.api.dialog.description')}</p>

          {secretNames.map((name) => (
            <div key={name} className="space-y-1">
              <label className="text-xs font-medium text-black/60">{name}</label>
              <Input
                type="password"
                placeholder={t('security.api.dialog.placeholder')}
                value={values[name] ?? ''}
                onChange={(e) => setValues((prev) => ({ ...prev, [name]: e.target.value }))}
                autoComplete="off"
              />
            </div>
          ))}

          <div className="rounded-lg bg-orange/10 px-3 py-2 text-xs text-orange">
            {t('security.api.dialog.warning')}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={handleClose}>
              {t('security.api.dialog.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending || secretNames.every((n) => !values[n]?.trim())}
            >
              {mutation.isPending ? t('security.api.dialog.saving') : t('security.api.dialog.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
