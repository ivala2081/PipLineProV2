import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { DotsThree, MagnifyingGlass, UserPlus, Star } from '@phosphor-icons/react'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Tag,
  Skeleton,
  Button,
  Card,
  Input,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@ds'
import { useLocale } from '@ds/hooks'
import { useAuth } from '@/app/providers/AuthProvider'
import { useToast } from '@/hooks/useToast'
import {
  useOrgMembersQuery,
  type MemberWithProfile,
} from '@/hooks/queries/useOrgMembersQuery'
import {
  useUpdateMemberRole,
  useRemoveMember,
} from '@/hooks/queries/useOrgMemberMutations'
import { ConfirmDialog } from '../ConfirmDialog'

interface MembersTabProps {
  orgId: string
  canManage: boolean
}

export function MembersTab({ orgId, canManage }: MembersTabProps) {
  const { t } = useTranslation('pages')
  const { toast } = useToast()
  const { user } = useAuth()
  const { locale } = useLocale()
  const { data: members = [], isLoading } = useOrgMembersQuery(orgId)
  const updateRole = useUpdateMemberRole(orgId)
  const removeMember = useRemoveMember(orgId)

  const [search, setSearch] = useState('')
  const [removeTarget, setRemoveTarget] = useState<MemberWithProfile | null>(null)

  const filtered = useMemo(() => {
    if (!search.trim()) return members
    const q = search.toLowerCase()
    return members.filter((m) =>
      (m.profile?.display_name ?? '').toLowerCase().includes(q),
    )
  }, [members, search])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const handleToggleRole = async (member: MemberWithProfile) => {
    const newRole = member.role === 'admin' ? 'operation' : 'admin'
    try {
      await updateRole.mutateAsync({ userId: member.user_id, role: newRole })
      toast({ title: t('organizations.toast.roleUpdated'), variant: 'success' })
    } catch (err) {
      toast({ title: (err as Error).message, variant: 'error' })
    }
  }

  const handleRemove = async () => {
    if (!removeTarget) return
    try {
      await removeMember.mutateAsync(removeTarget.user_id)
      toast({ title: t('organizations.toast.memberRemoved'), variant: 'success' })
      setRemoveTarget(null)
    } catch (err) {
      toast({ title: (err as Error).message, variant: 'error' })
    }
  }

  const getInitials = (name: string | null) => {
    if (!name) return '?'
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (isLoading) {
    return (
      <div className="space-y-3 pt-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (members.length === 0) {
    return (
      <Card className="mt-4 flex flex-col items-center justify-center gap-4 border border-black/5 bg-bg1 py-20">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-black/5">
          <UserPlus size={28} className="text-black/40" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-black/60">
            {t('organizations.members.empty')}
          </p>
          <p className="mt-1 text-xs text-black/40">
            {t('organizations.members.emptyDescription')}
          </p>
        </div>
      </Card>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-4 pt-4">
        {/* Header with search and count */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <MagnifyingGlass
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('organizations.members.searchPlaceholder')}
              className="pl-9"
            />
          </div>
          <span className="text-sm text-black/40">
            {t('organizations.members.count', { count: members.length })}
          </span>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-black/5 bg-bg1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('organizations.members.columns.name')}</TableHead>
                <TableHead>{t('organizations.members.columns.role')}</TableHead>
                <TableHead>{t('organizations.members.columns.joined')}</TableHead>
                {canManage && <TableHead className="w-12" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((member) => {
                const isSelf = member.user_id === user?.id
                const displayName = member.profile?.display_name ?? member.user_id
                const isGodUser = member.profile?.system_role === 'god'

                return (
                  <TableRow key={member.user_id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          {member.profile?.avatar_url && (
                            <AvatarImage src={member.profile.avatar_url} />
                          )}
                          <AvatarFallback className="text-xs">
                            {getInitials(member.profile?.display_name ?? null)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium">{displayName}</span>
                            {isGodUser && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Star size={14} weight="fill" className="text-yellow" />
                                </TooltipTrigger>
                                <TooltipContent>God</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Tag variant={member.role === 'admin' ? 'green' : 'blue'}>
                        {t(`organizations.members.roles.${member.role}`)}
                      </Tag>
                    </TableCell>
                    <TableCell className="text-sm text-black/60">
                      {formatDate(member.created_at)}
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        {!isSelf && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="borderless" size="sm">
                                <DotsThree size={18} weight="bold" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleToggleRole(member)}
                              >
                                {member.role === 'admin'
                                  ? t('organizations.members.actions.demoteToOperation')
                                  : t('organizations.members.actions.promoteToAdmin')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red"
                                onClick={() => setRemoveTarget(member)}
                              >
                                {t('organizations.members.actions.remove')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        <ConfirmDialog
          open={!!removeTarget}
          onClose={() => setRemoveTarget(null)}
          onConfirm={handleRemove}
          title={t('organizations.members.removeConfirm.title')}
          description={t('organizations.members.removeConfirm.description', {
            name: removeTarget?.profile?.display_name ?? removeTarget?.user_id ?? '',
          })}
          confirmLabel={t('organizations.members.actions.remove')}
          cancelLabel={t('organizations.createDialog.cancel')}
          destructive
        />
      </div>
    </TooltipProvider>
  )
}
