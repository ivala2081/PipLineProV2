import React from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { DotsThree, PencilSimple, Trash, Eye, ClockCounterClockwise } from '@phosphor-icons/react'
import type { TransferRow } from '@/hooks/useTransfers'
import { formatNumber } from './transfersTableUtils'
import {
  TableRow,
  TableCell,
  Tag,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  Button,
} from '@ds'

interface TransferRowItemProps {
  row: TransferRow
  lang: string
  isSelected?: boolean
  onToggleSelect?: () => void
  onView: (row: TransferRow) => void
  onEdit: (row: TransferRow) => void
  onDelete: (row: TransferRow) => void
  onAudit: (row: TransferRow) => void
}

export const TransferRowItem = React.memo(function TransferRowItem({
  row,
  lang,
  isSelected,
  onToggleSelect,
  onView,
  onEdit,
  onDelete,
  onAudit,
}: TransferRowItemProps) {
  const { t } = useTranslation('pages')
  const isDeposit = row.category?.is_deposit ?? true
  const commission = isDeposit
    ? Math.round(Math.abs(row.amount) * (row.psp?.commission_rate ?? 0) * 100) / 100
    : 0
  const net = row.amount - commission

  const typeName = row.type?.name?.toLowerCase() ?? ''
  const isBlocked = typeName.includes('bloke') || typeName.includes('blocked')

  return (
    <TableRow className={`hover:bg-black/[0.015] ${isBlocked ? 'opacity-60' : ''}`}>
      {onToggleSelect && (
        <TableCell className="w-4 pl-3 pr-1">
          <input
            type="checkbox"
            checked={isSelected ?? false}
            onChange={onToggleSelect}
            className="size-3.5 cursor-pointer rounded border-black/20"
            onClick={(e) => e.stopPropagation()}
          />
        </TableCell>
      )}
      <TableCell className="whitespace-nowrap" data-label={t('transfers.columns.fullName')}>
        <span className="text-sm font-medium text-black/90">{row.full_name}</span>
      </TableCell>
      <TableCell
        className="whitespace-nowrap text-sm text-black/60"
        data-label={t('transfers.columns.paymentMethod')}
      >
        {row.payment_method?.name ?? '—'}
      </TableCell>
      <TableCell className="whitespace-nowrap" data-label={t('transfers.columns.category')}>
        <Tag variant={isDeposit ? 'default' : 'red'}>
          {row.category
            ? isDeposit
              ? t('transfers.categoryValues.deposit')
              : t('transfers.categoryValues.withdrawal')
            : '—'}
        </Tag>
      </TableCell>
      <TableCell
        className="whitespace-nowrap text-right"
        data-label={t('transfers.columns.amount')}
      >
        <span
          className={`font-mono text-sm font-medium tabular-nums ${row.amount >= 0 ? 'text-green' : 'text-red'}`}
        >
          {formatNumber(Math.abs(row.amount), lang)}
        </span>
      </TableCell>
      <TableCell
        className="whitespace-nowrap text-right"
        data-label={t('transfers.columns.commission')}
      >
        {isDeposit ? (
          <span className="font-mono text-sm tabular-nums text-black/50">
            {formatNumber(commission, lang)}
          </span>
        ) : (
          <span
            className="text-sm text-black/20"
            title={t(
              'transfers.table.commissionWithdrawalTooltip',
              'Withdrawals are not charged commission',
            )}
          >
            —
          </span>
        )}
      </TableCell>
      <TableCell className="whitespace-nowrap text-right" data-label={t('transfers.columns.net')}>
        <span
          className={`font-mono text-sm font-medium tabular-nums ${net >= 0 ? 'text-green' : 'text-red'}`}
        >
          {formatNumber(Math.abs(net), lang)}
        </span>
      </TableCell>
      <TableCell
        className="whitespace-nowrap text-right"
        data-label={t('transfers.table.netUsd', 'Net USD')}
      >
        <span className="font-mono text-xs tabular-nums text-black/30">
          {row.amount_usd != null ? `${formatNumber(Math.abs(row.amount_usd), lang)} $` : '—'}
        </span>
      </TableCell>
      <TableCell className="whitespace-nowrap" data-label={t('transfers.columns.currency')}>
        <Tag variant="default">{row.currency}</Tag>
      </TableCell>
      <TableCell className="whitespace-nowrap text-sm" data-label={t('transfers.columns.psp')}>
        {row.psp ? (
          <Link
            to={`/psps/${row.psp_id}`}
            className="font-medium text-black/70 underline decoration-black/20 underline-offset-2 hover:text-black hover:decoration-black/40"
          >
            {row.psp.name}
          </Link>
        ) : (
          <span className="text-black/40">—</span>
        )}
      </TableCell>
      <TableCell
        className="whitespace-nowrap text-sm text-black/60"
        data-label={t('transfers.columns.type')}
      >
        <span>
          {row.type?.name
            ? t(`transfers.typeValues.${row.type.name}`, {
                defaultValue: row.type.name,
              })
            : '—'}
        </span>
        {isBlocked && (
          <Tag variant="default" className="ml-1.5 text-[9px] opacity-60">
            {t('transfers.table.blocked', 'BLOCKED')}
          </Tag>
        )}
      </TableCell>
      <TableCell className="whitespace-nowrap px-2" isActions>
        <div className="flex items-center justify-end gap-0.5">
          <Button
            variant="ghost"
            className="size-7 p-0 text-black/30 hover:text-black/70"
            onClick={() => onView(row)}
            aria-label={`View details for ${row.full_name}`}
          >
            <Eye size={15} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="size-7 p-0 text-black/40 hover:text-black/70"
                aria-label={`Actions for ${row.full_name}`}
              >
                <DotsThree size={16} weight="bold" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={4}>
              <DropdownMenuItem onClick={() => onEdit(row)}>
                <PencilSimple size={14} />
                {t('transfers.settings.editItem')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAudit(row)}>
                <ClockCounterClockwise size={14} />
                {t('transfers.audit.button')}
              </DropdownMenuItem>
              <DropdownMenuItem className="text-red" onClick={() => onDelete(row)}>
                <Trash size={14} />
                {t('transfers.settings.deleteItem')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  )
})
