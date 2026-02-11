import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Card, Button, Input, Label, Separator } from '@ds'
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
    <div className="space-y-6 pt-4">
      {/* General Settings */}
      <Card className="space-y-6 border border-black/5 bg-bg1 p-6">
        <div>
          <h2 className="text-lg font-semibold">
            {t('organizations.settings.title')}
          </h2>
          <p className="text-sm text-black/60">
            {t('organizations.settings.subtitle')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div className="space-y-2">
            <Label>{t('organizations.settings.name')}</Label>
            <Input {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="text-xs text-red">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          {/* Slug (read-only) */}
          <div className="space-y-2">
            <Label>{t('organizations.settings.slug')}</Label>
            <Input
              value={org.slug}
              disabled
              className="font-mono opacity-60"
            />
            <p className="text-xs text-black/40">
              {t('organizations.settings.slugDescription')}
            </p>
          </div>

          <Separator />

          {/* Active Toggle */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="is-active"
              {...form.register('is_active')}
              className="mt-0.5 size-4 rounded border-black/20"
            />
            <div>
              <Label htmlFor="is-active">
                {t('organizations.settings.isActive')}
              </Label>
              <p className="text-xs text-black/40">
                {t('organizations.settings.isActiveDescription')}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => form.reset({ name: org.name, is_active: org.is_active })}
            >
              {t('organizations.settings.reset')}
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

      {/* Danger Zone */}
      <Card className="space-y-4 border border-red/20 bg-bg1 p-6">
        <div>
          <h2 className="text-lg font-semibold text-red">
            {t('organizations.settings.dangerZone')}
          </h2>
          <p className="text-sm text-black/60">
            {t('organizations.settings.dangerZoneDescription')}
          </p>
        </div>
      </Card>
    </div>
  )
}
