import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Lock,
  GitBranch,
  CreditCard,
  Warning,
  Trash,
  PencilSimple,
  Plus,
  ArrowRight,
  ShieldCheck,
} from '@phosphor-icons/react'
import type { useLookupQueries } from '@/hooks/queries/useLookupQueries'
import type { TransferType, PaymentMethod } from '@/lib/transferLookups'
import {
  useCreateTransferType,
  useUpdateTransferType,
  useDeleteTransferType,
  useCreatePaymentMethod,
  useUpdatePaymentMethod,
  useDeletePaymentMethod,
} from '@/hooks/queries/useLookupMutations'
import { useAuth } from '@/app/providers/AuthProvider'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { useTransfersQuery } from '@/hooks/queries/useTransfersQuery'
import { useToast } from '@/hooks/useToast'
import { BulkDeleteConfirmDialog } from './BulkDeleteConfirmDialog'
import { LookupItemDialog } from './LookupItemDialog'
import { Card, Tag, Button, cn } from '@ds'

interface LookupSettingsProps {
  lookupData: ReturnType<typeof useLookupQueries>
}

export function LookupSettings({ lookupData }: LookupSettingsProps) {
  const { t } = useTranslation('pages')
  const { isGod } = useAuth()
  const { membership } = useOrganization()
  const transfers = useTransfersQuery()
  const { toast } = useToast()

  const isAdmin = isGod || membership?.role === 'admin'

  // Dialog state
  const [typeDialog, setTypeDialog] = useState<{
    open: boolean
    editing: TransferType | null
  }>({ open: false, editing: null })

  const [methodDialog, setMethodDialog] = useState<{
    open: boolean
    editing: PaymentMethod | null
  }>({ open: false, editing: null })

  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)

  // Mutations
  const createType = useCreateTransferType()
  const updateType = useUpdateTransferType()
  const deleteType = useDeleteTransferType()
  const createMethod = useCreatePaymentMethod()
  const updateMethod = useUpdatePaymentMethod()
  const deleteMethod = useDeletePaymentMethod()

  // Partition: global defaults vs org-custom
  const systemTypes = lookupData.transferTypes.filter((tt) => !tt.organization_id)
  const customTypes = lookupData.transferTypes.filter((tt) => !!tt.organization_id)
  const systemMethods = lookupData.paymentMethods.filter((m) => !m.organization_id)
  const customMethods = lookupData.paymentMethods.filter((m) => !!m.organization_id)

  const handleDeleteType = async (type: TransferType) => {
    try {
      await deleteType.mutateAsync(type.id)
      toast({ title: t('transfers.toast.lookupDeleted'), variant: 'success' })
    } catch (err) {
      const msg = (err as Error).message
      if (msg.startsWith('in_use:')) {
        const count = msg.split(':')[1]
        toast({
          title: t('transfers.settings.deleteInUse', { count, entity: type.name }),
          variant: 'error',
        })
      } else {
        toast({ title: t('transfers.toast.error'), variant: 'error' })
      }
    }
  }

  const handleDeleteMethod = async (method: PaymentMethod) => {
    try {
      await deleteMethod.mutateAsync(method.id)
      toast({ title: t('transfers.toast.lookupDeleted'), variant: 'success' })
    } catch (err) {
      const msg = (err as Error).message
      if (msg.startsWith('in_use:')) {
        const count = msg.split(':')[1]
        toast({
          title: t('transfers.settings.deleteInUse', { count, entity: method.name }),
          variant: 'error',
        })
      } else {
        toast({ title: t('transfers.toast.error'), variant: 'error' })
      }
    }
  }

  return (
    <div className="space-y-3">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">{t('transfers.settings.title')}</h2>
          <p className="mt-0.5 text-sm text-black/40">
            {isAdmin
              ? t('transfers.settings.subtitleAdmin')
              : t('transfers.settings.subtitleReadOnly')}
          </p>
        </div>
        {!isAdmin && (
          <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-black/[0.04] px-3 py-1.5 text-xs text-black/40">
            <Lock size={12} weight="bold" />
            {t('transfers.settings.readOnly')}
          </div>
        )}
      </div>

      {/* ── Transfer Types ──────────────────────────────────────────── */}
      <LookupSection
        icon={<GitBranch size={16} weight="duotone" />}
        accentClass="bg-indigo/15 text-indigo"
        title={t('transfers.settings.types')}
        totalCount={lookupData.transferTypes.length}
        addLabel={isAdmin ? t('transfers.settings.addType') : undefined}
        onAdd={() => setTypeDialog({ open: true, editing: null })}
      >
        <SystemGroup label={t('transfers.settings.systemDefaults')}>
          {systemTypes.map((type) => (
            <LookupRow
              key={type.id}
              item={type}
              customAvatarClass="bg-black/[0.06] text-black/35"
              isDefault
              isSystem={!!type.is_system}
            />
          ))}
        </SystemGroup>

        {(customTypes.length > 0 || isAdmin) && (
          <CustomGroup
            label={t('transfers.settings.custom')}
            count={customTypes.length}
            isEmpty={customTypes.length === 0}
            emptyLabel={t('transfers.settings.noCustomTypes')}
            emptyAction={isAdmin ? t('transfers.settings.addFirstType') : undefined}
            onEmptyAction={() => setTypeDialog({ open: true, editing: null })}
          >
            {customTypes.map((type) => (
              <LookupRow
                key={type.id}
                item={type}
                customAvatarClass="bg-indigo/15 text-indigo"
                isDefault={false}
                isSystem={false}
                onEdit={isAdmin ? () => setTypeDialog({ open: true, editing: type }) : undefined}
                onDelete={isAdmin ? () => handleDeleteType(type) : undefined}
                isDeleting={deleteType.isPending}
              />
            ))}
          </CustomGroup>
        )}
      </LookupSection>

      {/* ── Payment Methods ─────────────────────────────────────────── */}
      <LookupSection
        icon={<CreditCard size={16} weight="duotone" />}
        accentClass="bg-cyan/15 text-cyan"
        title={t('transfers.settings.paymentMethods')}
        totalCount={lookupData.paymentMethods.length}
        addLabel={isAdmin ? t('transfers.settings.addMethod') : undefined}
        onAdd={() => setMethodDialog({ open: true, editing: null })}
      >
        <SystemGroup label={t('transfers.settings.systemDefaults')}>
          {systemMethods.map((method) => (
            <LookupRow
              key={method.id}
              item={method}
              customAvatarClass="bg-black/[0.06] text-black/35"
              isDefault
              isSystem={false}
            />
          ))}
        </SystemGroup>

        {(customMethods.length > 0 || isAdmin) && (
          <CustomGroup
            label={t('transfers.settings.custom')}
            count={customMethods.length}
            isEmpty={customMethods.length === 0}
            emptyLabel={t('transfers.settings.noCustomMethods')}
            emptyAction={isAdmin ? t('transfers.settings.addFirstMethod') : undefined}
            onEmptyAction={() => setMethodDialog({ open: true, editing: null })}
          >
            {customMethods.map((method) => (
              <LookupRow
                key={method.id}
                item={method}
                customAvatarClass="bg-cyan/15 text-cyan"
                isDefault={false}
                isSystem={false}
                onEdit={
                  isAdmin ? () => setMethodDialog({ open: true, editing: method }) : undefined
                }
                onDelete={isAdmin ? () => handleDeleteMethod(method) : undefined}
                isDeleting={deleteMethod.isPending}
              />
            ))}
          </CustomGroup>
        )}
      </LookupSection>

      {/* ── Categories — always fixed ───────────────────────────────── */}
      <Card padding="default" className="border border-black/[0.06] bg-bg1">
        <div className="mb-2.5 flex items-center gap-2">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-black/[0.05] text-black/40">
            <ShieldCheck size={14} weight="duotone" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold">{t('transfers.settings.categories')}</h3>
            <p className="text-[11px] text-black/35">{t('transfers.settings.categoriesFixed')}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {lookupData.categories.map((cat) => (
            <div
              key={cat.id}
              className={cn(
                'flex items-center gap-1.5 rounded-lg border px-3 py-1.5',
                cat.is_deposit ? 'border-green/20 bg-green/[0.06]' : 'border-red/20 bg-red/[0.06]',
              )}
            >
              <div
                className={cn('size-1.5 rounded-full', cat.is_deposit ? 'bg-green' : 'bg-red')}
              />
              <span
                className={cn('text-sm font-semibold', cat.is_deposit ? 'text-green' : 'text-red')}
              >
                {cat.name}
              </span>
              <span className="text-xs text-black/40">
                {cat.is_deposit
                  ? t('transfers.settings.deposit')
                  : t('transfers.settings.withdrawal')}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Danger Zone — God only ──────────────────────────────────── */}
      {isGod && (
        <Card padding="default" className="border border-red/20 bg-red/[0.02]">
          <div className="mb-2.5 flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-red/10 text-red">
              <Warning size={14} weight="duotone" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-red">
                {t('transfers.bulkDelete.dangerZone', 'Danger Zone')}
              </h3>
              <p className="text-[11px] text-black/40">
                {t(
                  'transfers.bulkDelete.dangerDescription',
                  'Destructive actions that cannot be undone.',
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-red/10 bg-white px-3 py-2.5">
            <div>
              <p className="text-sm font-medium text-black/80">
                {t('transfers.bulkDelete.deleteAll', 'Delete all transfers')}
              </p>
              <p className="text-xs text-black/40">
                {t(
                  'transfers.bulkDelete.deleteAllDescription',
                  'Permanently remove all {{count}} transfers from the database.',
                  { count: transfers.total },
                )}
              </p>
            </div>
            <Button
              variant="filled"
              size="sm"
              className="gap-1.5 bg-red hover:bg-red/80"
              onClick={() => setBulkDeleteOpen(true)}
              disabled={transfers.total === 0}
            >
              <Trash size={14} />
              {t('transfers.bulkDelete.deleteAllButton', 'Delete All Transfers')}
            </Button>
          </div>
        </Card>
      )}

      {/* ── Dialogs ─────────────────────────────────────────────────── */}
      <LookupItemDialog
        open={typeDialog.open}
        onClose={() => setTypeDialog({ open: false, editing: null })}
        editingItem={typeDialog.editing}
        title={
          typeDialog.editing
            ? t('transfers.settings.editTypeDialog')
            : t('transfers.settings.addTypeDialog')
        }
        onSave={async (data) => {
          if (typeDialog.editing) {
            await updateType.mutateAsync({ id: typeDialog.editing.id, payload: data })
            toast({ title: t('transfers.toast.lookupUpdated'), variant: 'success' })
          } else {
            await createType.mutateAsync(data)
            toast({ title: t('transfers.toast.lookupCreated'), variant: 'success' })
          }
        }}
        isSaving={createType.isPending || updateType.isPending}
      />

      <LookupItemDialog
        open={methodDialog.open}
        onClose={() => setMethodDialog({ open: false, editing: null })}
        editingItem={methodDialog.editing}
        title={
          methodDialog.editing
            ? t('transfers.settings.editMethodDialog')
            : t('transfers.settings.addMethodDialog')
        }
        onSave={async (data) => {
          if (methodDialog.editing) {
            await updateMethod.mutateAsync({ id: methodDialog.editing.id, payload: data })
            toast({ title: t('transfers.toast.lookupUpdated'), variant: 'success' })
          } else {
            await createMethod.mutateAsync(data)
            toast({ title: t('transfers.toast.lookupCreated'), variant: 'success' })
          }
        }}
        isSaving={createMethod.isPending || updateMethod.isPending}
      />

      {isGod && (
        <BulkDeleteConfirmDialog
          ids={bulkDeleteOpen ? ['__all__'] : null}
          count={transfers.total}
          onClose={() => setBulkDeleteOpen(false)}
          onConfirm={async () => {
            const count = transfers.total
            await transfers.bulkDeleteTransfers(['__all__'])
            toast({ title: t('transfers.toast.bulkDeleted', { count }), variant: 'success' })
            setBulkDeleteOpen(false)
          }}
          isDeleting={transfers.isBulkDeleting}
        />
      )}
    </div>
  )
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function LookupSection({
  icon,
  accentClass,
  title,
  totalCount,
  addLabel,
  onAdd,
  children,
}: {
  icon: React.ReactNode
  accentClass: string
  title: string
  totalCount: number
  addLabel?: string
  onAdd?: () => void
  children: React.ReactNode
}) {
  return (
    <Card padding="default" className="border border-black/[0.06] bg-bg1">
      <div className="mb-3 flex items-center gap-2">
        <div
          className={cn('flex size-7 shrink-0 items-center justify-center rounded-lg', accentClass)}
        >
          {icon}
        </div>
        <h3 className="flex-1 text-sm font-semibold">{title}</h3>
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-black/[0.06] px-1.5 text-[10px] font-medium text-black/40">
          {totalCount}
        </span>
        {addLabel && onAdd && (
          <Button variant="outline" size="sm" onClick={onAdd} className="gap-1 text-xs">
            <Plus size={12} weight="bold" />
            {addLabel}
          </Button>
        )}
      </div>
      <div className="space-y-2">{children}</div>
    </Card>
  )
}

// ── System defaults group ─────────────────────────────────────────────────────

function SystemGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-black/30">
          {label}
        </span>
        <div className="h-px flex-1 bg-black/[0.06]" />
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

// ── Custom entries group ──────────────────────────────────────────────────────

function CustomGroup({
  label,
  count,
  isEmpty,
  emptyLabel,
  emptyAction,
  onEmptyAction,
  children,
}: {
  label: string
  count: number
  isEmpty: boolean
  emptyLabel: string
  emptyAction?: string
  onEmptyAction?: () => void
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-black/30">
          {label}
        </span>
        {count > 0 && (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-black/[0.06] px-1 text-[9px] font-medium text-black/40">
            {count}
          </span>
        )}
        <div className="h-px flex-1 bg-black/[0.06]" />
      </div>

      {isEmpty ? (
        <button
          type="button"
          onClick={onEmptyAction}
          className={cn(
            'group w-full rounded-xl border border-dashed border-black/15 px-4 py-3 text-left transition-colors',
            onEmptyAction
              ? 'cursor-pointer hover:border-black/25 hover:bg-black/[0.015]'
              : 'cursor-default',
          )}
        >
          <p className="text-xs text-black/35">{emptyLabel}</p>
          {emptyAction && (
            <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-black/50 transition-colors group-hover:text-black/70">
              {emptyAction}
              <ArrowRight
                size={11}
                weight="bold"
                className="transition-transform group-hover:translate-x-0.5"
              />
            </p>
          )}
        </button>
      ) : (
        <div className="space-y-1">{children}</div>
      )}
    </div>
  )
}

// ── Individual row ────────────────────────────────────────────────────────────

function LookupRow({
  item,
  customAvatarClass,
  isDefault,
  isSystem,
  onEdit,
  onDelete,
  isDeleting,
}: {
  item: TransferType | PaymentMethod
  customAvatarClass: string
  isDefault: boolean
  isSystem: boolean
  onEdit?: () => void
  onDelete?: () => void
  isDeleting?: boolean
}) {
  const { t } = useTranslation('pages')
  const MAX_ALIASES = 4
  const isBlockedSystem = isSystem && item.id === 'blocked'

  return (
    <div
      className={cn(
        'group flex items-center gap-3 rounded-xl px-3 py-2 transition-colors',
        isDefault ? 'bg-black/[0.025]' : 'hover:bg-black/[0.015]',
        isBlockedSystem && 'bg-red/[0.03]',
      )}
    >
      {/* Initial avatar */}
      <div
        className={cn(
          'flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold',
          isBlockedSystem ? 'bg-red/10 text-red/50' : customAvatarClass,
        )}
      >
        {item.name[0]?.toUpperCase()}
      </div>

      {/* Name + aliases */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={cn('text-sm font-medium', isDefault ? 'text-black/60' : 'text-black/85')}
          >
            {item.name}
          </span>
          {isSystem && (
            <Tag variant="red" className="py-0 text-[10px]">
              {t('transfers.settings.systemBadge')}
            </Tag>
          )}
        </div>
        {item.aliases.length > 0 && (
          <div className="mt-0.5 flex flex-wrap items-center gap-1">
            {item.aliases.slice(0, MAX_ALIASES).map((alias) => (
              <span
                key={alias}
                className="inline-flex rounded-md bg-black/[0.05] px-1.5 py-0.5 font-mono text-[10px] text-black/35"
              >
                {alias}
              </span>
            ))}
            {item.aliases.length > MAX_ALIASES && (
              <span className="text-[10px] text-black/25">
                +{item.aliases.length - MAX_ALIASES}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right side actions */}
      {isDefault ? (
        <Lock size={13} weight="bold" className="shrink-0 text-black/20" />
      ) : (
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              className="h-7 w-7 p-0 text-black/40 hover:text-black/70"
            >
              <PencilSimple size={13} />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              disabled={isDeleting}
              className="h-7 w-7 p-0 text-black/40 hover:bg-red/8 hover:text-red"
            >
              <Trash size={13} />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
