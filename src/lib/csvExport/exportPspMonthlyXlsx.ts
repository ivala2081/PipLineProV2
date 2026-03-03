import type { PspMonthlyRow } from '@/hooks/queries/usePspMonthlyQuery'
import { exportToExcelFromRows } from '@/lib/excelExport'

/**
 * Export PSP monthly summary to an Excel (.xlsx) file.
 * Mirrors exportPspMonthlyCsv but with proper Excel formatting.
 */
export function exportPspMonthlyXlsx(
  rows: PspMonthlyRow[],
  pspName: string,
  currency: string,
): void {
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

  const dataRows = rows.map(
    (r) =>
      [
        r.monthLabel,
        r.depositTotal,
        r.withdrawalTotal,
        r.commissionTotal,
        r.netTotal,
        r.settlementTotal,
        r.transferCount,
        r.depositCount,
        r.withdrawalCount,
        r.avgDailyVolume,
      ] as (string | number)[],
  )

  const safePspName = pspName.replace(/\s+/g, '_')
  const filename = `${safePspName}_monthly_${new Date().toISOString().slice(0, 10)}`

  exportToExcelFromRows({
    headers,
    rows: dataRows,
    sheetName: `${pspName} Monthly`,
    filename,
  })
}
