/**
 * Success Checkmark Component
 *
 * Animated checkmark shown after successful login.
 * Uses design system animations for smooth scaling and fade.
 *
 * @module SuccessCheckmark
 */

import { Check } from '@phosphor-icons/react'
import { cn } from '@ds/utils'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface SuccessCheckmarkProps {
  /** Optional class name */
  className?: string
  /** Size of the checkmark (default: 48) */
  size?: number
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function SuccessCheckmark({ className, size = 48 }: SuccessCheckmarkProps) {
  return (
    <div className={cn('flex items-center justify-center', 'animate-zoom-in-95', className)}>
      <div
        className={cn(
          'flex items-center justify-center rounded-full',
          'bg-green shadow-lg',
          'animate-pulse',
        )}
        style={{
          width: size * 1.5,
          height: size * 1.5,
        }}
      >
        <Check size={size} weight="bold" className="text-white" />
      </div>
    </div>
  )
}

SuccessCheckmark.displayName = 'SuccessCheckmark'
