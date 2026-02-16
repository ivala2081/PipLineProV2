import { readFileSync } from 'fs'
import Papa from 'papaparse'

const csvText = readFileSync('./ocaktransfer.csv', 'utf-8')

const result = Papa.parse(csvText, {
  header: false,
  skipEmptyLines: false,
  dynamicTyping: false,
})

const allRows = result.data

// Find header row
let headerRowIndex = -1
for (let i = 0; i < Math.min(allRows.length, 10); i++) {
  const firstCell = (allRows[i]?.[0] ?? '').trim()
  if (firstCell === 'CRM ID') {
    headerRowIndex = i
    break
  }
}

console.log('Header row index:', headerRowIndex)
console.log('Header row:', allRows[headerRowIndex])
console.log('\n=== First 5 data rows ===\n')

const dataRows = allRows.slice(headerRowIndex + 1, headerRowIndex + 6)

dataRows.forEach((row, idx) => {
  const fullName = (row[2] ?? '').trim()
  const paymentMethod = (row[4] ?? '').trim()
  const category = (row[7] ?? '').trim()
  const type = (row[13] ?? '').trim()

  console.log(`Row ${idx + 1}:`)
  console.log(`  Full Name: "${fullName}"`)
  console.log(`  Payment Method: "${paymentMethod}"`)
  console.log(`  Category: "${category}"`)
  console.log(`  Type: "${type}"`)
  console.log()
})
