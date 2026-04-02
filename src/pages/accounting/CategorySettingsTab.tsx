import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Lock, Trash, PencilSimple } from '@phosphor-icons/react'
import {
  useAccountingCategories,
  useAccountingCategoryMutations,
} from '@/hooks/queries/useAccountingCategories'
import { useAuth } from '@/app/providers/AuthProvider'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import type { AccountingCategory } from '@/lib/database.types'
import {
  Button,
  Input,
  Label,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Tag,
  Skeleton,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@ds'

/* ── Add/Edit Dialog ───────────────────────────────────── */

interface CategoryDialogProps {
  open: boolean
  onClose: () => void
  category: AccountingCategory | null
}

function CategoryDialog({ open, onClose, category }: CategoryDialogProps) {
  const { t } = useTranslation('pages')
  const { createCategory, updateCategory } = useAccountingCategoryMutations()
  const isEditing = !!category

  const [name, setName] = useState('')
  const [label, setLabel] = useState('')
  const [icon, setIcon] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleOpenChange = (v: boolean) => {
    if (v) {
      setName(category?.name ?? '')
      setLabel(category?.label ?? '')
      setIcon(category?.icon ?? '')
    }
    if (!v) onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      if (isEditing) {
        await updateCategory.mutateAsync({ id: category.id, label, icon: icon || undefined })
      } else {
        await createCategory.mutateAsync({
          name: name.toLowerCase().replace(/\s+/g, '_'),
          label,
          icon: icon || null,
        })
      }
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? t('accounting.settings.editCategory', 'Edit Category')
              : t('accounting.settings.addCategory', 'Add Category')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-md">
          {!isEditing && (
            <div className="space-y-sm">
              <Label>{t('accounting.settings.categoryName', 'Name (code)')}</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. rent"
                required
              />
            </div>
          )}
          <div className="space-y-sm">
            <Label>{t('accounting.settings.categoryLabel', 'Display Label')}</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Rent & Utilities"
              required
            />
          </div>
          <div className="space-y-sm">
            <Label>{t('accounting.settings.categoryIcon', 'Icon (Phosphor name)')}</Label>
            <Input
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="e.g. House"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('accounting.form.cancel')}
            </Button>
            <Button type="submit" variant="filled" disabled={isSubmitting}>
              {isSubmitting ? t('accounting.form.saving') : t('accounting.form.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ── Main Component ────────────────────────────────────── */

export function CategorySettingsTab() {
  const { t } = useTranslation('pages')
  const { isGod } = useAuth()
  const { membership } = useOrganization()
  const isAdmin = isGod || membership?.role === 'admin'

  const { data: categories = [], isLoading } = useAccountingCategories()
  const { deleteCategory } = useAccountingCategoryMutations()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<AccountingCategory | null>(null)

  const globalCategories = categories.filter((c) => c.organization_id === null)
  const customCategories = categories.filter((c) => c.organization_id !== null)

  const handleAdd = () => {
    setEditingCategory(null)
    setDialogOpen(true)
  }

  const handleEdit = (cat: AccountingCategory) => {
    setEditingCategory(cat)
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    await deleteCategory.mutateAsync(id)
  }

  if (isLoading) {
    return (
      <div className="space-y-sm">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  const renderTable = (items: AccountingCategory[], title: string, isCustom: boolean) => (
    <div className="space-y-sm">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-widest text-black/40">{title}</h4>
        {isCustom && isAdmin && (
          <Button variant="outline" size="sm" onClick={handleAdd}>
            <Plus size={14} weight="bold" />
            {t('accounting.settings.addCategory', 'Add Category')}
          </Button>
        )}
      </div>
      {items.length === 0 ? (
        <p className="py-4 text-center text-sm text-black/40">
          {isCustom
            ? t('accounting.settings.noCustomCategories', 'No custom categories yet.')
            : t('accounting.settings.noCategories', 'No categories found.')}
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-black/10">
          <Table>
            <TableHeader>
              <TableRow className="bg-black/[0.02] hover:bg-black/[0.02]">
                <TableHead>{t('accounting.settings.name', 'Name')}</TableHead>
                <TableHead>{t('accounting.settings.label', 'Label')}</TableHead>
                <TableHead>{t('accounting.settings.icon', 'Icon')}</TableHead>
                <TableHead>{t('accounting.settings.type', 'Type')}</TableHead>
                {isCustom && isAdmin && <TableHead className="w-24" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell className="font-mono text-sm">{cat.name}</TableCell>
                  <TableCell className="text-sm">{cat.label}</TableCell>
                  <TableCell className="text-sm text-black/50">{cat.icon || '—'}</TableCell>
                  <TableCell>
                    {cat.is_system ? (
                      <Tag variant="purple" className="gap-1">
                        <Lock size={10} />
                        {t('accounting.settings.system', 'System')}
                      </Tag>
                    ) : (
                      <Tag variant="default">{t('accounting.settings.custom', 'Custom')}</Tag>
                    )}
                  </TableCell>
                  {isCustom && isAdmin && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!cat.is_system && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="size-7 p-0"
                              onClick={() => handleEdit(cat)}
                            >
                              <PencilSimple size={14} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="size-7 p-0 text-red hover:text-red"
                              onClick={() => handleDelete(cat.id)}
                            >
                              <Trash size={14} />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-lg">
      {renderTable(
        globalCategories,
        t('accounting.settings.defaultCategories', 'Default Categories'),
        false,
      )}
      {renderTable(
        customCategories,
        t('accounting.settings.customCategories', 'Custom Categories'),
        true,
      )}

      <CategoryDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false)
          setEditingCategory(null)
        }}
        category={editingCategory}
      />
    </div>
  )
}
