import React, { useState, useEffect, useCallback } from 'react';
import { 
  CheckCircle, 
  AlertCircle, 
  Info, 
  X, 
  AlertTriangle,
  XCircle,
  Bell
} from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'neutral';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  };
  dismissible?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  persistent?: boolean;
}

interface ToastProps {
  toast: Toast;
  onDismiss: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

const ToastComponent: React.FC<ToastProps> = ({ toast, onDismiss, position = 'top-right' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (toast.duration && toast.duration > 0 && !toast.persistent) {
      const startTime = Date.now();
      const endTime = startTime + toast.duration;
      
      const progressTimer = setInterval(() => {
        const now = Date.now();
        const remaining = endTime - now;
        const newProgress = Math.max(0, (remaining / (toast.duration || 5000)) * 100);
        setProgress(newProgress);
        
        if (remaining <= 0) {
          clearInterval(progressTimer);
          handleDismiss();
        }
      }, 100);

      const dismissTimer = setTimeout(() => {
        handleDismiss();
      }, toast.duration);

      return () => {
        clearInterval(progressTimer);
        clearTimeout(dismissTimer);
      };
    }
    
    return undefined;
  }, [toast.duration, toast.persistent]);

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(toast.id);
    }, 300);
  }, [toast.id, onDismiss]);

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="business-toast-icon text-green-600" />;
      case 'error':
        return <XCircle className="business-toast-icon text-red-600" />;
      case 'warning':
        return <AlertTriangle className="business-toast-icon text-yellow-600" />;
      case 'info':
        return <Info className="business-toast-icon text-blue-600" />;
      case 'neutral':
        return <Bell className="business-toast-icon text-gray-600" />;
      default:
        return <Bell className="business-toast-icon text-gray-600" />;
    }
  };

  const getToastClasses = () => {
    const baseClasses = 'business-toast relative';
    const sizeClasses = {
      sm: 'business-toast-sm',
      md: 'business-toast-md',
      lg: 'business-toast-lg'
    };
    const variantClasses = {
      success: 'business-toast-success',
      error: 'business-toast-error',
      warning: 'business-toast-warning',
      info: 'business-toast-info',
      neutral: 'business-toast-neutral'
    };
    
    return `${baseClasses} ${sizeClasses[toast.size || 'md']} ${variantClasses[toast.type]}`;
  };

  const getAnimationClasses = () => {
    if (isExiting) {
      return 'business-toast-exit';
    }
    
    if (isVisible) {
      return 'business-toast-enter-active';
    }
    
    return 'business-toast-enter';
  };

  const getActionVariantClass = () => {
    switch (toast.action?.variant) {
      case 'primary':
        return 'business-toast-action-primary';
      case 'secondary':
        return 'business-toast-action-secondary';
      case 'success':
        return 'business-toast-action-success';
      case 'warning':
        return 'business-toast-action-warning';
      case 'error':
        return 'business-toast-action-error';
      default:
        return 'business-toast-action-primary';
    }
  };

  const getProgressClass = () => {
    switch (toast.type) {
      case 'success':
        return 'business-toast-progress-success';
      case 'error':
        return 'business-toast-progress-error';
      case 'warning':
        return 'business-toast-progress-warning';
      case 'info':
        return 'business-toast-progress-info';
      case 'neutral':
        return 'business-toast-progress-neutral';
      default:
        return 'business-toast-progress-neutral';
    }
  };

  return (
    <div className={`${getToastClasses()} ${getAnimationClasses()}`}>
      <div className="business-toast-header">
        <div className="business-toast-content">
          {getIcon()}
          
          <div className="business-toast-text">
            <h4 className="business-toast-title">
              {toast.title}
            </h4>
            {toast.message && (
              <p className="business-toast-message">
                {toast.message}
              </p>
            )}
          </div>
        </div>
        
        {toast.dismissible !== false && (
          <button
            onClick={handleDismiss}
            className="business-toast-close"
            aria-label="Dismiss notification"
          >
            <X className="business-toast-close-icon" />
          </button>
        )}
      </div>
      
      {toast.action && (
        <div className="business-toast-actions">
          <button
            onClick={toast.action.onClick}
            className={`business-toast-action ${getActionVariantClass()}`}
          >
            {toast.action.label}
          </button>
        </div>
      )}
      
      {toast.showProgress && toast.duration && !toast.persistent && (
        <div className="business-toast-progress">
          <div 
            className={`business-toast-progress-bar ${getProgressClass()}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

// Toast Container
interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  stacked?: boolean;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ 
  toasts, 
  onDismiss, 
  position = 'top-right',
  stacked = false
}) => {
  const getPositionClasses = () => {
    switch (position) {
      case 'top-right':
        return 'business-toast-container';
      case 'top-left':
        return 'business-toast-container-left';
      case 'bottom-right':
        return 'business-toast-container-bottom';
      case 'bottom-left':
        return 'business-toast-container-bottom business-toast-container-left';
      case 'top-center':
        return 'business-toast-container-center';
      case 'bottom-center':
        return 'business-toast-container-center business-toast-container-bottom';
      default:
        return 'business-toast-container';
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div className={`${getPositionClasses()} ${stacked ? 'business-toast-group-stacked' : 'business-toast-group'}`}>
      {toasts.map((toast) => (
        <ToastComponent
          key={toast.id}
          toast={toast}
          onDismiss={onDismiss}
          position={position}
        />
      ))}
    </div>
  );
};

// Toast Hook
export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newToast: Toast = {
      id,
      duration: 5000, // Default 5 seconds
      dismissible: true,
      size: 'md',
      showProgress: true,
      persistent: false,
      ...toast
    };

    setToasts(prev => [...prev, newToast]);
    return id;
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  const showSuccess = useCallback((title: string, message?: string, options?: Partial<Toast>) => {
    return addToast({ type: 'success', title, message, ...options });
  }, [addToast]);

  const showError = useCallback((title: string, message?: string, options?: Partial<Toast>) => {
    return addToast({ 
      type: 'error', 
      title, 
      message, 
      duration: 8000, // Longer duration for errors
      ...options 
    });
  }, [addToast]);

  const showWarning = useCallback((title: string, message?: string, options?: Partial<Toast>) => {
    return addToast({ 
      type: 'warning', 
      title, 
      message, 
      duration: 6000,
      ...options 
    });
  }, [addToast]);

  const showInfo = useCallback((title: string, message?: string, options?: Partial<Toast>) => {
    return addToast({ type: 'info', title, message, ...options });
  }, [addToast]);

  const showNeutral = useCallback((title: string, message?: string, options?: Partial<Toast>) => {
    return addToast({ type: 'neutral', title, message, ...options });
  }, [addToast]);

  return {
    toasts,
    addToast,
    dismissToast,
    dismissAll,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showNeutral
  };
};

export default ToastComponent;
