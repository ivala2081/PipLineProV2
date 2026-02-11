import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Plus,
  EnvelopeSimple,
  Clock,
  CheckCircle,
  XCircle,
} from '@phosphor-icons/react'
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
} from '@ds'
import { useLocale } from '@ds/hooks'
import { useToast } from '@/hooks/useToast'
import { useOrgInvitationsQuery } from '@/hooks/queries/useOrgInvitationsQuery'
import { useRevokeInvitation } from '@/hooks/queries/useOrgMemberMutations'
import { InviteMemberDialog } from '../InviteMemberDialog'
import { ConfirmDialog } from '../ConfirmDialog'

interface InvitationsTabProps {
  orgId: string
}

type StatusFilter = 'all' | 'pending' | 'accepted' | 'expired'

const statusVariant: Record<string, 'default' | 'green' | 'red'> = {
  pending: 'default',
  accepted: 'green',
  expired: 'red',
}

const statusIcon: Record<string, React.ReactNode> = {
  pending: <Clock size={12} weight="bold" />,
  accepted: <CheckCircle size={12} weight="bold" />,
  expired: <XCircle size={12} weight="bold" />,
}

export function InvitationsTab({ orgId }: InvitationsTabProps) {
  const { t } = useTranslation('pages')
  const { toast } = useToast()
  const { locale } = useLocale()
  const { data: invitations = [], isLoading } = useOrgInvitationsQuery(orgId)
  const revokeInvitation = useRevokeInvitation(orgId)

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [revokeTarget, setRevokeTarget] = useState<{
    id: string
    email: string
  } | null>(null)

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return invitations
    return invitations.filter((inv) => inv.status === statusFilter)
  }, [invitations, statusFilter])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const handleRevoke = async () => {
    if (!revokeTarget) return
    try {
      await revokeInvitation.mutateAsync(revokeTarget.id)
      toast({
        title: t('organizations.toast.invitationRevoked'),
        variant: 'success',
      })
      setRevokeTarget(null)
    } catch (err) {
      toast({ title: (err as Error).message, variant: 'error' })
    }
  }

  const filterButtons: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: t('organizations.invitations.filterAll') },
    { key: 'pending', label: t('organizations.invitations.filterPending') },
    { key: 'accepted', label: t('organizations.invitations.filterAccepted') },
    { key: 'expired', label: t('organizations.invitations.filterExpired') },
  ]

  if (isLoading) {
    return (
      <div className="space-y-3 pt-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4 pt-4">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              {t('organizations.invitations.title')}
            </h2>
            <p className="text-sm text-black/60">
              {t('organizations.invitations.subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-black/40">
              {t('organizations.invitations.count', { count: invitations.length })}
            </span>
            <Button
              variant="filled"
              onClick={() => setInviteDialogOpen(true)}
            >
              <Plus size={16} weight="bold" />
              {t('organizations.invitations.invite')}
            </Button>
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex gap-1.5">
          {filterButtons.map(({ key, label }) => (
            <Button
              key={key}
              variant={statusFilter === key ? 'filled' : 'gray'}
              size="sm"
              onClick={() => setStatusFilter(key)}
            >
              {label}
            </Button>
          ))}
        </div>

        {/* Content */}
        {invitations.length === 0 ? (
          <Card className="flex flex-col items-center justify-center gap-4 border border-black/5 bg-bg1 py-20">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-black/5">
              <EnvelopeSimple size={28} className="text-black/40" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-black/60">
                {t('organizations.invitations.empty')}
              </p>
              <p className="mt-1 text-xs text-black/40">
                {t('organizations.invitations.emptyDescription')}
              </p>
            </div>
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="flex flex-col items-center justify-center gap-4 border border-black/5 bg-bg1 py-16">
            <p className="text-sm text-black/40">
              {t('organizations.invitations.empty')}
            </p>
          </Card>
        ) : (
          <div className="rounded-lg border border-black/5 bg-bg1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    {t('organizations.invitations.columns.email')}
                  </TableHead>
                  <TableHead>
                    {t('organizations.invitations.columns.role')}
                  </TableHead>
                  <TableHead>
                    {t('organizations.invitations.columns.status')}
                  </TableHead>
                  <TableHead>
                    {t('organizations.invitations.columns.createdAt')}
                  </TableHead>
                  <TableHead>
                    {t('organizations.invitations.columns.expiresAt')}
                  </TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.email}</TableCell>
                    <TableCell>
                      <Tag variant={inv.role === 'admin' ? 'green' : 'blue'}>
                        {t(`organizations.members.roles.${inv.role}`)}
                      </Tag>
                    </TableCell>
                    <TableCell>
                      <Tag variant={statusVariant[inv.status] ?? 'default'}>
                        <span className="flex items-center gap-1">
                          {statusIcon[inv.status]}
                          {t(`organizations.invitations.statuses.${inv.status}`)}
                        </span>
                      </Tag>
                    </TableCell>
                    <TableCell className="text-sm text-black/60">
                      {formatDate(inv.created_at)}
                    </TableCell>
                    <TableCell className="text-sm text-black/60">
                      {formatDate(inv.expires_at)}
                    </TableCell>
                    <TableCell>
                      {inv.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red hover:bg-red/5"
                          onClick={() =>
                            setRevokeTarget({ id: inv.id, email: inv.email })
                          }
                        >
                          {t('organizations.invitations.revoke')}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <InviteMemberDialog
        open={inviteDialogOpen}
        onClose={() => setInviteDialogOpen(false)}
        orgId={orgId}
      />

      <ConfirmDialog
        open={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        onConfirm={handleRevoke}
        title={t('organizations.invitations.revokeConfirm.title')}
        description={t('organizations.invitations.revokeConfirm.description', {
          email: revokeTarget?.email ?? '',
        })}
        confirmLabel={t('organizations.invitations.revoke')}
        cancelLabel={t('organizations.createDialog.cancel')}
        destructive
      />
    </>
  )
}
