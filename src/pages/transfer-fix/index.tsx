import { useState } from 'react'
import { runAllCsvComparisons } from './comparisons'
import type { AllCsvCompareResults } from './comparisons'
import type { ParsedCsvData, Step, SystemDiscrepancy } from './types'
import { StepUpload } from './StepUpload'
import { StepCsvCompare } from './StepCsvCompare'
import { StepSystemCompare } from './StepSystemCompare'
import { StepFix } from './StepFix'
import { StepEmployeeAssign } from './StepEmployeeAssign'

const STEP_LABELS: Record<Step, string> = {
  upload: '1. CSV Yükle',
  'csv-compare': '2. CSV Karşılaştır',
  'system-compare': '3. Sistem Karşılaştır',
  fix: '4. Düzelt',
  'employee-assign': '5. Çalışan Ata',
}

export function TransferFixTab() {
  const [step, setStep] = useState<Step>('upload')
  const [parsedData, setParsedData] = useState<ParsedCsvData | null>(null)
  const [csvCompareResults, setCsvCompareResults] = useState<AllCsvCompareResults | null>(null)
  const [systemDiscrepancies, setSystemDiscrepancies] = useState<SystemDiscrepancy[]>([])

  const handleUploadComplete = (data: ParsedCsvData) => {
    setParsedData(data)
    const results = runAllCsvComparisons(
      data.kasa,
      data.orderSatis,
      data.ordRetDeposit,
      data.ordWithdrawal,
      data.period,
    )
    setCsvCompareResults(results)
    setStep('csv-compare')
  }

  const handleReset = () => {
    setStep('upload')
    setParsedData(null)
    setCsvCompareResults(null)
    setSystemDiscrepancies([])
  }

  return (
    <div className="space-y-lg">
      {/* Step indicator */}
      <div className="flex gap-1">
        {(Object.keys(STEP_LABELS) as Step[]).map((s) => (
          <div
            key={s}
            className={`flex-1 rounded-lg px-3 py-2 text-center text-xs font-medium transition-colors ${
              s === step
                ? 'bg-brand text-white'
                : Object.keys(STEP_LABELS).indexOf(s) < Object.keys(STEP_LABELS).indexOf(step)
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                  : 'bg-bg2 text-muted'
            }`}
          >
            {STEP_LABELS[s]}
          </div>
        ))}
      </div>

      {/* Step content */}
      {step === 'upload' && <StepUpload onComplete={handleUploadComplete} />}

      {step === 'csv-compare' && parsedData && csvCompareResults && (
        <StepCsvCompare
          results={csvCompareResults}
          data={parsedData}
          onNext={() => setStep('system-compare')}
          onBack={() => setStep('upload')}
        />
      )}

      {step === 'system-compare' && parsedData && (
        <StepSystemCompare
          data={parsedData}
          onNext={(discrepancies) => {
            setSystemDiscrepancies(discrepancies)
            setStep('fix')
          }}
          onBack={() => setStep('csv-compare')}
        />
      )}

      {step === 'fix' && parsedData && (
        <StepFix
          discrepancies={systemDiscrepancies}
          kasaExchangeRates={parsedData.kasaExchangeRates}
          onBack={() => setStep('system-compare')}
          onReset={handleReset}
          onNext={() => setStep('employee-assign')}
        />
      )}

      {step === 'employee-assign' && parsedData && (
        <StepEmployeeAssign
          data={parsedData}
          onBack={() => setStep('fix')}
          onReset={handleReset}
        />
      )}
    </div>
  )
}
