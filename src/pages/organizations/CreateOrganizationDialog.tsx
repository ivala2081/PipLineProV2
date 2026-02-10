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
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { useCreateOrganization } from '@/hooks/queries/useOrgMutations'
import {
  createOrganizationSchema,
  type CreateOrganizationValues,
} from '@/schemas/organizationSchema'

interface CreateOrganizationDialogProps {
  open: boolean
  onClose: () => void
}

export function CreateOrganizationDialog({
  open,
  onClose,
}: CreateOrganizationDialogProps) {
  const { t } = useTranslation('pages')
  const { toast } = useToast()
  const { refreshOrgs } = useOrganization()
  const createOrg = useCreateOrganization()

  const form = useForm<CreateOrganizationValues>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: { name: '', slug: '' },
  })

  const nameValue = form.watch('name')

  // Auto-generate slug from name
  useEffect(() => {
    if (!open) return
    const slug = nameValue
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
    form.setValue('slug', slug)
  }, [nameValue, open, form])

  // Reset form when dialog opens
  useEffect(() => {
    if (open) form.reset({ name: '', slug: '' })
  }, [open, form])

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      await createOrg.mutateAsync(data)
      await refreshOrgs()
      toast({ title: t('organizations.toast.created'), variant: 'success' })
      onClose()
    } catch (err) {
      toast({ title: (err as Error).message, variant: 'error' })
    }
  })

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('organizations.createDialog.title')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t('organizations.createDialog.name')}</Label>
            <Input
              {...form.register('name')}
              placeholder={t('organizations.createDialog.namePlaceholder')}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-red-500">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>{t('organizations.createDialog.slug')}</Label>
            <Input
              {...form.register('slug')}
              placeholder={t('organizations.createDialog.slugPlaceholder')}
              className="font-mono"
            />
            <p className="text-xs text-black/40">
              {t('organizations.createDialog.slugHint')}
            </p>
            {form.formState.errors.slug && (
              <p className="text-xs text-red-500">
                {form.formState.errors.slug.message}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={createOrg.isPending}
            >
              {t('organizations.createDialog.cancel')}
            </Button>
            <Button
              type="submit"
              variant="filled"
              disabled={createOrg.isPending}
            >
              {createOrg.isPending
                ? t('organizations.createDialog.creating')
                : t('organizations.createDialog.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
