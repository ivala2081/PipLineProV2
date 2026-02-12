/**
 * Password Strength Indicator Component
 *
 * Visual indicator showing password strength with progress bar and checklist.
 * Uses validation utils for strength calculation.
 *
 * @module PasswordStrengthIndicator
 */

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, X } from '@phosphor-icons/react'
import { calculatePasswordStrength, type PasswordStrength } from '@/lib/validationUtils'
import { cn } from '@ds/utils'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface PasswordStrengthIndicatorProps {
  /** Password value to evaluate */
  password: string
  /** Show detailed requirements checklist (default: true) */
  showRequirements?: boolean
  /** Optional class name */
  className?: string
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STRENGTH_CONFIG: Record<
  PasswordStrength,
  {
    label: string
    color: string
    barColor: string
    textColor: string
  }
> = {
  'very-weak': {
    label: 'passwordStrength.veryWeak',
    color: 'bg-red',
    barColor: 'bg-red',
    textColor: 'text-red',
  },
  weak: {
    label: 'passwordStrength.weak',
    color: 'bg-orange',
    barColor: 'bg-orange',
    textColor: 'text-orange',
  },
  medium: {
    label: 'passwordStrength.medium',
    color: 'bg-yellow',
    barColor: 'bg-yellow',
    textColor: 'text-yellow',
  },
  strong: {
    label: 'passwordStrength.strong',
    color: 'bg-green',
    barColor: 'bg-green',
    textColor: 'text-green',
  },
  'very-strong': {
    label: 'passwordStrength.veryStrong',
    color: 'bg-green',
    barColor: 'bg-green',
    textColor: 'text-green',
  },
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function PasswordStrengthIndicator({
  password,
  showRequirements = true,
  className,
}: PasswordStrengthIndicatorProps) {
  const { t } = useTranslation('components')

  // Calculate strength
  const result = useMemo(() => {
    return calculatePasswordStrength(password)
  }, [password])

  const config = STRENGTH_CONFIG[result.strength]

  // Don't show anything if password is empty
  if (password.length === 0) {
    return null
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* Strength bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-black/60">
            {t('passwordStrength.label')}
          </span>
          <span className={cn('font-medium', config.textColor)}>
            {t(config.label)}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/5">
          <div
            className={cn(
              'h-full transition-all duration-300 ease-out',
              config.barColor
            )}
            style={{ width: `${result.score}%` }}
          />
        </div>
      </div>

      {/* Requirements checklist */}
      {showRequirements && (
        <div className="space-y-1 rounded-md bg-black/5 p-3 text-xs">
          <RequirementItem
            met={result.hasMinLength}
            label={t('passwordStrength.minLength')}
          />
          <RequirementItem
            met={result.hasUppercase}
            label={t('passwordStrength.uppercase')}
          />
          <RequirementItem
            met={result.hasLowercase}
            label={t('passwordStrength.lowercase')}
          />
          <RequirementItem
            met={result.hasNumber}
            label={t('passwordStrength.number')}
          />
          <RequirementItem
            met={result.hasSpecialChar}
            label={t('passwordStrength.special')}
          />
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function RequirementItem({ met, label }: { met: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {met ? (
        <Check size={14} weight="bold" className="text-green shrink-0" />
      ) : (
        <X size={14} weight="bold" className="text-black/30 shrink-0" />
      )}
      <span className={cn(met ? 'text-black/80' : 'text-black/50')}>
        {label}
      </span>
    </div>
  )
}

PasswordStrengthIndicator.displayName = 'PasswordStrengthIndicator'
