import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind classes safely.
 * Combines `clsx` (conditional classes) with `tailwind-merge`
 * (deduplicates / resolves conflicting utility classes).
 *
 * @example
 * cn('px-4 py-2', isActive && 'bg-brand', className)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
