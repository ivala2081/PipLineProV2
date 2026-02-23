import type { PspMonthlyRow } from '@/hooks/queries/usePspMonthlyQuery'
import { downloadCsv } from './exportLedgerCsv'

export function exportPspMonthlyCsv(rows: PspMonthlyRow[], pspName: string, currency: string) {
  const headers = [
    'Month',
    'Deposits',
    'Withdrawals',
    `Commission (${currency})`,
    `Net (${currency})`,
    `Settlement (${currency})`,
    'Transfers',
    'Deposits #',
    'Withdrawals #',
    'Avg Daily Volume',
  ]

  const csvRows = rows.map((r) =>
    [
      r.monthLabel,
      r.depositTotal.toFixed(2),
      r.withdrawalTotal.toFixed(2),
      r.commissionTotal.toFixed(2),
      r.netTotal.toFixed(2),
      r.settlementTotal.toFixed(2),
      r.transferCount,
      r.depositCount,
      r.withdrawalCount,
      r.avgDailyVolume.toFixed(2),
    ].join(','),
  )

  const csv = [headers.join(','), ...csvRows].join('\n')
  const filename = `${pspName.replace(/\s+/g, '_')}_monthly_${new Date().toISOString().slice(0, 10)}.csv`
  downloadCsv(csv, filename)
}
