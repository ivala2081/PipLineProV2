/**
 * Login Skeleton Component
 *
 * Skeleton loader matching the login card structure.
 * Shown during authentication check or form submission.
 *
 * @module LoginSkeleton
 */

import { Skeleton } from '@ds'

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function LoginSkeleton() {
  return (
    <div className="w-full max-w-md space-y-6 rounded-lg border border-black/10 bg-bg1 p-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>

      {/* Form skeleton */}
      <div className="space-y-4">
        {/* Email input */}
        <div className="space-y-2">
          <Skeleton className="h-11 w-full" />
        </div>

        {/* Password input */}
        <div className="space-y-2">
          <Skeleton className="h-11 w-full" />
        </div>

        {/* Remember me checkbox */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-24" />
        </div>

        {/* Submit button */}
        <Skeleton className="h-11 w-full" />
      </div>

      {/* Forgot password link */}
      <div className="flex justify-center">
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  )
}

LoginSkeleton.displayName = 'LoginSkeleton'
