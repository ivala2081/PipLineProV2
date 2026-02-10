import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Card, Button, Input, Label } from '@ds'
import { useToast } from '@/hooks/useToast'
import { useUpdateOrganization } from '@/hooks/queries/useOrgMutations'
import {
  updateOrganizationSchema,
  type UpdateOrganizationValues,
} from '@/schemas/organizationSchema'
import type { Organization } from '@/lib/database.types'

interface SettingsTabProps {
  org: Organization
  orgId: string
}

export function SettingsTab({ org, orgId }: SettingsTabProps) {
  const { t } = useTranslation('pages')
  const { toast } = useToast()
  const updateOrg = useUpdateOrganization(orgId)

  const form = useForm<UpdateOrganizationValues>({
    resolver: zodResolver(updateOrganizationSchema),
    defaultValues: {
      name: org.name,
      is_active: org.is_active,
    },
  })

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      await updateOrg.mutateAsync(data)
      toast({ title: t('organizations.toast.updated'), variant: 'success' })
    } catch (err) {
      toast({ title: (err as Error).message, variant: 'error' })
    }
  })

  return (
    <Card className="mt-4 space-y-6 border border-black/5 bg-bg1 p-6">
      <div>
        <h2 className="text-lg font-semibold">
          {t('organizations.settings.title')}
        </h2>
        <p className="text-sm text-black/60">
          {t('organizations.settings.subtitle')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>{t('organizations.settings.name')}</Label>
          <Input {...form.register('name')} />
          {form.formState.errors.name && (
            <p className="text-xs text-red-500">
              {form.formState.errors.name.message}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is-active"
            {...form.register('is_active')}
            className="size-4 rounded border-black/20"
          />
          <Label htmlFor="is-active">
            {t('organizations.settings.isActive')}
          </Label>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => form.reset({ name: org.name, is_active: org.is_active })}
          >
            {t('organizations.createDialog.cancel')}
          </Button>
          <Button
            type="submit"
            variant="filled"
            disabled={updateOrg.isPending}
          >
            {updateOrg.isPending
              ? t('organizations.settings.saving')
              : t('organizations.settings.save')}
          </Button>
        </div>
      </form>
    </Card>
  )
}
