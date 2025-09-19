/**
 * Hook for managing unique toast notifications to prevent spam and duplicates
 */

import { useCallback, useRef } from 'react';
import { useToastContext } from '../components/ToastProvider';
import { Toast } from '../components/Toast';

type ToastOptions = Partial<Toast>;

export const useUniqueToast = () => {
  const { showSuccess, showError, showWarning, showInfo, dismissToast } = useToastContext();
  const activeToasts = useRef<Map<string, string>>(new Map()); // key -> toastId
  const toastTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const showUniqueToast = useCallback((
    type: 'success' | 'error' | 'warning' | 'info',
    key: string,
    title: string,
    message?: string,
    options?: ToastOptions
  ) => {
    // Clear existing toast with the same key
    const existingToastId = activeToasts.current.get(key);
    if (existingToastId) {
      dismissToast(existingToastId);
      
      // Clear the timer if it exists
      const timer = toastTimers.current.get(key);
      if (timer) {
        clearTimeout(timer);
        toastTimers.current.delete(key);
      }
    }

    // Show new toast
    let toastId: string;
    switch (type) {
      case 'success':
        toastId = showSuccess(title, message, options);
        break;
      case 'error':
        toastId = showError(title, message, options);
        break;
      case 'warning':
        toastId = showWarning(title, message, options);
        break;
      case 'info':
        toastId = showInfo(title, message, options);
        break;
      default:
        toastId = showInfo(title, message, options);
    }

    // Track the new toast
    activeToasts.current.set(key, toastId);

    // Set up cleanup timer
    const duration = options?.duration || (type === 'error' ? 8000 : type === 'warning' ? 6000 : 5000);
    if (!options?.persistent) {
      const timer = setTimeout(() => {
        activeToasts.current.delete(key);
        toastTimers.current.delete(key);
      }, duration);
      toastTimers.current.set(key, timer);
    }

    return toastId;
  }, [showSuccess, showError, showWarning, showInfo, dismissToast]);

  const showUniqueSuccess = useCallback((key: string, title: string, message?: string, options?: ToastOptions) => {
    return showUniqueToast('success', key, title, message, options);
  }, [showUniqueToast]);

  const showUniqueError = useCallback((key: string, title: string, message?: string, options?: ToastOptions) => {
    return showUniqueToast('error', key, title, message, options);
  }, [showUniqueToast]);

  const showUniqueWarning = useCallback((key: string, title: string, message?: string, options?: ToastOptions) => {
    return showUniqueToast('warning', key, title, message, options);
  }, [showUniqueToast]);

  const showUniqueInfo = useCallback((key: string, title: string, message?: string, options?: ToastOptions) => {
    return showUniqueToast('info', key, title, message, options);
  }, [showUniqueToast]);

  const clearToast = useCallback((key: string) => {
    const toastId = activeToasts.current.get(key);
    if (toastId) {
      dismissToast(toastId);
      activeToasts.current.delete(key);
    }

    const timer = toastTimers.current.get(key);
    if (timer) {
      clearTimeout(timer);
      toastTimers.current.delete(key);
    }
  }, [dismissToast]);

  const clearAllToasts = useCallback(() => {
    // Clear all tracked toasts
    activeToasts.current.forEach((toastId) => {
      dismissToast(toastId);
    });
    activeToasts.current.clear();

    // Clear all timers
    toastTimers.current.forEach((timer) => {
      clearTimeout(timer);
    });
    toastTimers.current.clear();
  }, [dismissToast]);

  return {
    showUniqueSuccess,
    showUniqueError,
    showUniqueWarning,
    showUniqueInfo,
    clearToast,
    clearAllToasts
  };
};
