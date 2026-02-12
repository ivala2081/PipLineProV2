import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Buildings } from '@phosphor-icons/react'
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
  const slugValue = form.watch('slug')

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
      <DialogContent size="md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-brand/10">
              <Buildings size={20} className="text-brand" />
            </div>
            <DialogTitle>{t('organizations.createDialog.title')}</DialogTitle>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t('organizations.createDialog.name')}</Label>
            <Input
              {...form.register('name')}
              placeholder={t('organizations.createDialog.namePlaceholder')}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-red">
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
            {slugValue && (
              <div className="rounded-lg bg-black/5 px-3 py-2">
                <p className="text-xs text-black/40">
                  {t('organizations.createDialog.slugPreview')}
                </p>
                <p className="mt-0.5 font-mono text-sm font-medium">
                  /{slugValue}
                </p>
              </div>
            )}
            {form.formState.errors.slug && (
              <p className="text-xs text-red">
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
