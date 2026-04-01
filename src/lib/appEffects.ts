/**
 * Centralized Side-Effect Handlers
 *
 * Pure functions that orchestrate side effects for major app state transitions.
 * Providers call these instead of scattering localStorage / cache / DOM effects
 * across multiple useEffects and callbacks.
 *
 * Rules:
 * - No React hooks — called FROM hooks/providers
 * - Receive queryClient + state as arguments (testable, no hidden deps)
 * - Only handle side effects (storage, cache, DOM) — not business logic
 *
 * @module appEffects
 */

import type { QueryClient } from '@tanstack/react-query'

const ORG_KEY = 'piplinepro-org'

/* ── Org persistence helpers ──────────────────────────────────────── */

/** Read the persisted org selection. */
export function getSavedOrgId(): string | null {
  try {
    return localStorage.getItem(ORG_KEY)
  } catch {
    return null
  }
}

/** Persist an org selection (e.g. after initial load picks a default). */
export function saveOrgId(orgId: string): void {
  try {
    localStorage.setItem(ORG_KEY, orgId)
  } catch {
    /* ignore — storage full or unavailable */
  }
}

/** Clear the persisted org selection (e.g. optimistic sign-out cleanup). */
export function clearSavedOrg(): void {
  try {
    localStorage.removeItem(ORG_KEY)
  } catch {
    /* ignore */
  }
}

/* ── Orchestrators ────────────────────────────────────────────────── */

/**
 * Side effects for user-initiated org switch.
 * Persists selection + invalidates all queries so data re-fetches for the new org.
 */
export function onOrgSwitch(qc: QueryClient, orgId: string): void {
  saveOrgId(orgId)
  // Force all active queries to refetch for the new org context.
  // Query keys include orgId, so new keys trigger fresh fetches;
  // invalidation ensures no stale data lingers from the previous org.
  qc.invalidateQueries()
}

/**
 * Side effects for sign-out (called from onAuthStateChange SIGNED_OUT handler).
 * Clears all caches, removes persisted org, and hard-redirects to login.
 */
export function onSignedOut(qc: QueryClient): void {
  qc.clear()
  clearSavedOrg()
  window.location.replace('/login')
}

/**
 * Side effects for theme change.
 * Currently handled within the design system's ThemeProvider.
 * Exported for use if theme logic moves to app level in the future.
 */
export function onThemeChange(theme: string, resolved: 'light' | 'dark'): void {
  try {
    localStorage.setItem('piplinepro-theme', theme)
  } catch {
    /* ignore */
  }
  document.documentElement.setAttribute('data-theme', resolved)
}
