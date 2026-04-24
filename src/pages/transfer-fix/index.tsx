import { useState, useEffect, useCallback } from 'react'
import { runAllCsvComparisons } from './comparisons'
import type { AllCsvCompareResults } from './comparisons'
import type { ParsedCsvData, Step, SystemDiscrepancy } from './types'
import { StepUpload } from './StepUpload'
import { StepCsvCompare } from './StepCsvCompare'
import { StepSystemCompare } from './StepSystemCompare'
import { StepFix } from './StepFix'
import { StepEmployeeAssign } from './StepEmployeeAssign'

const STORAGE_KEY = 'transfer-fix-state'

const STEP_LABELS: Record<Step, string> = {
  upload: '1. CSV Yükle',
  'csv-compare': '2. CSV Karşılaştır',
  'system-compare': '3. Sistem Karşılaştır',
  fix: '4. Düzelt',
  'employee-assign': '5. Çalışan Ata',
}

/* ------------------------------------------------------------------ */
/*  localStorage helpers (Map & Set ↔ JSON)                            */
/* ------------------------------------------------------------------ */

interface PersistedState {
  step: Step
  parsedData:
    | (Omit<ParsedCsvData, 'kasaExchangeRates'> & {
        kasaExchangeRates: [string, number][]
      })
    | null
  csvCompareResults: AllCsvCompareResults | null
  systemDiscrepancies: SystemDiscrepancy[]
  resolved: string[]
}

function saveToStorage(
  step: Step,
  parsedData: ParsedCsvData | null,
  csvCompareResults: AllCsvCompareResults | null,
  systemDiscrepancies: SystemDiscrepancy[],
  resolved: Set<string>,
) {
  try {
    const state: PersistedState = {
      step,
      parsedData: parsedData
        ? {
            ...parsedData,
            kasaExchangeRates: Array.from(parsedData.kasaExchangeRates.entries()),
          }
        : null,
      csvCompareResults,
      systemDiscrepancies,
      resolved: Array.from(resolved),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

function loadFromStorage(): {
  step: Step
  parsedData: ParsedCsvData | null
  csvCompareResults: AllCsvCompareResults | null
  systemDiscrepancies: SystemDiscrepancy[]
  resolved: Set<string>
} | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const state: PersistedState = JSON.parse(raw)
    return {
      step: state.step,
      parsedData: state.parsedData
        ? {
            ...state.parsedData,
            kasaExchangeRates: new Map(state.parsedData.kasaExchangeRates),
          }
        : null,
      csvCompareResults: state.csvCompareResults,
      systemDiscrepancies: state.systemDiscrepancies,
      resolved: new Set(state.resolved),
    }
  } catch {
    return null
  }
}

function clearStorage() {
  localStorage.removeItem(STORAGE_KEY)
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function TransferFixTab() {
  const [initialized] = useState(() => loadFromStorage())

  const [step, setStep] = useState<Step>(initialized?.step ?? 'upload')
  const [parsedData, setParsedData] = useState<ParsedCsvData | null>(
    initialized?.parsedData ?? null,
  )
  const [csvCompareResults, setCsvCompareResults] = useState<AllCsvCompareResults | null>(
    initialized?.csvCompareResults ?? null,
  )
  const [systemDiscrepancies, setSystemDiscrepancies] = useState<SystemDiscrepancy[]>(
    initialized?.systemDiscrepancies ?? [],
  )
  const [resolved, setResolved] = useState<Set<string>>(initialized?.resolved ?? new Set())

  // Persist state to localStorage on every change
  useEffect(() => {
    saveToStorage(step, parsedData, csvCompareResults, systemDiscrepancies, resolved)
  }, [step, parsedData, csvCompareResults, systemDiscrepancies, resolved])

  const toggleResolved = useCallback((key: string) => {
    setResolved((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

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
    setResolved(new Set()) // Clear resolved marks for fresh CSV data
    setStep('csv-compare')
  }

  const handleReset = () => {
    setStep('upload')
    setParsedData(null)
    setCsvCompareResults(null)
    setSystemDiscrepancies([])
    setResolved(new Set())
    clearStorage()
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
          resolved={resolved}
          onToggleResolved={toggleResolved}
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
        <StepEmployeeAssign data={parsedData} onBack={() => setStep('fix')} onReset={handleReset} />
      )}
    </div>
  )
}
