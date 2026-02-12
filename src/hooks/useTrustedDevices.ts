/**
 * Trusted Devices Hook
 *
 * Manages trusted device tracking for enhanced security.
 * Allows users to trust devices and skip additional security checks.
 *
 * @module useTrustedDevices
 */

import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getDeviceId } from '@/lib/deviceFingerprinting'
import type { TrustedDevice } from '@/lib/database.types'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface UseTrustedDevicesReturn {
  /** Current device ID */
  deviceId: string
  /** Is current device trusted */
  isTrusted: boolean
  /** Is loading */
  isLoading: boolean
  /** Trust the current device */
  trustDevice: (label?: string) => Promise<{ error: Error | null }>
  /** Revoke trust for a device */
  revokeDevice: (deviceId: string) => Promise<{ error: Error | null }>
  /** Get all trusted devices for current user */
  getTrustedDevices: () => Promise<{ data: TrustedDevice[] | null; error: Error | null }>
  /** Refresh trust status */
  refreshTrustStatus: () => Promise<void>
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useTrustedDevices(): UseTrustedDevicesReturn {
  const [deviceId] = useState(() => getDeviceId())
  const [isTrusted, setIsTrusted] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  /**
   * Check if current device is trusted
   */
  const checkTrustStatus = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setIsTrusted(false)
        setIsLoading(false)
        return
      }

      // Check if device exists in trusted_devices
      const { data, error } = await supabase
        .from('trusted_devices')
        .select('id, last_used_at')
        .eq('user_id', user.id)
        .eq('device_id', deviceId)
        .maybeSingle()

      if (error) {
        console.error('[useTrustedDevices] Error checking trust status:', error)
        setIsTrusted(false)
      } else if (data) {
        // Check if device hasn't expired (30 days)
        const lastUsed = new Date(data.last_used_at)
        const now = new Date()
        const daysSinceUsed = (now.getTime() - lastUsed.getTime()) / (1000 * 60 * 60 * 24)

        setIsTrusted(daysSinceUsed <= 30)
      } else {
        setIsTrusted(false)
      }
    } catch (error) {
      console.error('[useTrustedDevices] Error in checkTrustStatus:', error)
      setIsTrusted(false)
    } finally {
      setIsLoading(false)
    }
  }, [deviceId])

  /**
   * Trust the current device
   */
  const trustDevice = useCallback(
    async (label?: string) => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          return { error: new Error('User not authenticated') }
        }

        // Insert or update trusted device
        const { error } = await supabase.from('trusted_devices').upsert(
          {
            user_id: user.id,
            device_id: deviceId,
            label: label || null,
            last_used_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,device_id',
          }
        )

        if (error) {
          console.error('[useTrustedDevices] Error trusting device:', error)
          return { error: new Error(error.message) }
        }

        setIsTrusted(true)

        if (import.meta.env.DEV) {
          console.log('[useTrustedDevices] Device trusted successfully')
        }

        return { error: null }
      } catch (error) {
        console.error('[useTrustedDevices] Error in trustDevice:', error)
        return { error: error as Error }
      }
    },
    [deviceId]
  )

  /**
   * Revoke trust for a device
   */
  const revokeDevice = useCallback(async (targetDeviceId: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        return { error: new Error('User not authenticated') }
      }

      const { error } = await supabase
        .from('trusted_devices')
        .delete()
        .eq('user_id', user.id)
        .eq('device_id', targetDeviceId)

      if (error) {
        console.error('[useTrustedDevices] Error revoking device:', error)
        return { error: new Error(error.message) }
      }

      // If revoking current device, update state
      if (targetDeviceId === deviceId) {
        setIsTrusted(false)
      }

      if (import.meta.env.DEV) {
        console.log('[useTrustedDevices] Device revoked successfully')
      }

      return { error: null }
    } catch (error) {
      console.error('[useTrustedDevices] Error in revokeDevice:', error)
      return { error: error as Error }
    }
  }, [deviceId])

  /**
   * Get all trusted devices for current user
   */
  const getTrustedDevices = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        return { data: null, error: new Error('User not authenticated') }
      }

      const { data, error } = await supabase
        .from('trusted_devices')
        .select('*')
        .eq('user_id', user.id)
        .order('last_used_at', { ascending: false })

      if (error) {
        console.error('[useTrustedDevices] Error fetching devices:', error)
        return { data: null, error: new Error(error.message) }
      }

      return { data: data as TrustedDevice[], error: null }
    } catch (error) {
      console.error('[useTrustedDevices] Error in getTrustedDevices:', error)
      return { data: null, error: error as Error }
    }
  }, [])

  /**
   * Refresh trust status (useful after login)
   */
  const refreshTrustStatus = useCallback(async () => {
    setIsLoading(true)
    await checkTrustStatus()
  }, [checkTrustStatus])

  /**
   * Mark device as used (update last_used_at)
   */
  const markDeviceUsed = useCallback(async () => {
    if (!isTrusted) return

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      await supabase
        .from('trusted_devices')
        .update({ last_used_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('device_id', deviceId)
    } catch (error) {
      console.error('[useTrustedDevices] Error marking device as used:', error)
    }
  }, [deviceId, isTrusted])

  // Check trust status on mount
  useEffect(() => {
    checkTrustStatus()
  }, [checkTrustStatus])

  // Mark device as used periodically (every 5 minutes) if trusted
  useEffect(() => {
    if (!isTrusted) return

    markDeviceUsed()

    const interval = setInterval(markDeviceUsed, 5 * 60 * 1000) // 5 minutes

    return () => clearInterval(interval)
  }, [isTrusted, markDeviceUsed])

  return {
    deviceId,
    isTrusted,
    isLoading,
    trustDevice,
    revokeDevice,
    getTrustedDevices,
    refreshTrustStatus,
  }
}
