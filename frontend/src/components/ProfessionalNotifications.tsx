import React, { useState, useEffect, useCallback } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Info, 
  X, 
  Bell,
  BellOff,
  Settings,
  RefreshCw,
  Download,
  Upload,
  Shield,
  Clock,
  Star,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Heart,
  Zap,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

// ===== PROFESSIONAL NOTIFICATION & FEEDBACK COMPONENTS =====
// These provide business-ready notification systems with advanced functionality

// ===== TOAST NOTIFICATION COMPONENT =====
interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  onClose: (id: string) => void;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: React.ReactNode;
}

export function Toast({
  id,
  type,
  title,
  message,
  duration = 5000,
  onClose,
  action,
  icon
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (duration === Infinity) return;

    // Progress bar animation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev <= 0) {
          clearInterval(progressInterval);
          return 0;
        }
        return prev - (100 / (duration / 100));
      });
    }, 100);

    // Auto-close timer
    const closeTimer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(closeTimer);
    };
  }, [duration]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(id), 300);
  };

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50 border-green-200',
          icon: 'text-green-500',
          title: 'text-green-800',
          message: 'text-green-700',
          progress: 'bg-green-500'
        };
      case 'error':
        return {
          bg: 'bg-red-50 border-red-200',
          icon: 'text-red-500',
          title: 'text-red-800',
          message: 'text-red-700',
          progress: 'bg-red-500'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50 border-yellow-200',
          icon: 'text-yellow-500',
          title: 'text-yellow-800',
          message: 'text-yellow-700',
          progress: 'bg-yellow-500'
        };
      case 'info':
        return {
          bg: 'bg-gray-50 border-gray-200',
          icon: 'text-gray-500',
          title: 'text-gray-800',
          message: 'text-gray-700',
          progress: 'bg-gray-500'
        };
      default:
        return {
          bg: 'bg-gray-50 border-gray-200',
          icon: 'text-gray-500',
          title: 'text-gray-800',
          message: 'text-gray-700',
          progress: 'bg-gray-500'
        };
    }
  };

  const getDefaultIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5" />;
      case 'error':
        return <XCircle className="w-5 h-5" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />;
      case 'info':
        return <Info className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const styles = getTypeStyles();

  return (
    <div
      className={`
        transform transition-all duration-300 ease-out
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
      <div className={`relative max-w-sm w-full bg-white border rounded-lg shadow-lg overflow-hidden ${styles.bg}`}>
        {/* Progress Bar */}
        {duration !== Infinity && (
          <div className="absolute top-0 left-0 w-full h-1 bg-gray-200">
            <div
              className={`h-full transition-all duration-100 ease-linear ${styles.progress}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <div className="p-4">
          <div className="flex items-start">
            <div className={`flex-shrink-0 ${styles.icon}`}>
              {icon || getDefaultIcon()}
            </div>
            
            <div className="ml-3 flex-1 min-w-0">
              <p className={`text-sm font-medium ${styles.title}`}>
                {title}
              </p>
              {message && (
                <p className={`mt-1 text-sm ${styles.message}`}>
                  {message}
                </p>
              )}
              
              {action && (
                <div className="mt-3">
                  <button
                    onClick={action.onClick}
                    className={`text-sm font-medium ${styles.title} hover:underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-${styles.bg.split('-')[1]}-50 focus:ring-${styles.bg.split('-')[1]}-500`}
                  >
                    {action.label}
                  </button>
                </div>
              )}
            </div>
            
            <div className="ml-4 flex-shrink-0">
              <button
                onClick={handleClose}
                className={`inline-flex ${styles.icon} hover:${styles.icon.replace('text-', 'bg-').replace('-500', '-100')} rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-${styles.bg.split('-')[1]}-50 focus:ring-${styles.bg.split('-')[1]}-500`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== TOAST CONTAINER COMPONENT =====
interface ToastContainerProps {
  toasts: ToastProps[];
  onClose: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

export function ToastContainer({ 
  toasts, 
  onClose, 
  position = 'top-right' 
}: ToastContainerProps) {
  const getPositionClasses = () => {
    switch (position) {
      case 'top-right':
        return 'top-4 right-4';
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'top-center':
        return 'top-4 left-1/2 transform -translate-x-1/2';
      case 'bottom-center':
        return 'bottom-4 left-1/2 transform -translate-x-1/2';
      default:
        return 'top-4 right-4';
    }
  };

  return (
    <div className={`fixed z-50 ${getPositionClasses()} space-y-3`}>
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={onClose} />
      ))}
    </div>
  );
}

// ===== ALERT BANNER COMPONENT =====
interface AlertBannerProps {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  onClose?: () => void;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
  dismissible?: boolean;
  className?: string;
}

export function AlertBanner({
  type,
  title,
  message,
  onClose,
  action,
  dismissible = true,
  className = ''
}: AlertBannerProps) {
  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50 border-green-200',
          icon: 'text-green-500',
          title: 'text-green-800',
          message: 'text-green-700',
          action: 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
        };
      case 'error':
        return {
          bg: 'bg-red-50 border-red-200',
          icon: 'text-red-500',
          title: 'text-red-800',
          message: 'text-red-700',
          action: 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50 border-yellow-200',
          icon: 'text-yellow-500',
          title: 'text-yellow-800',
          message: 'text-yellow-700',
          action: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
        };
      case 'info':
        return {
          bg: 'bg-gray-50 border-gray-200',
          icon: 'text-gray-500',
          title: 'text-gray-800',
          message: 'text-gray-700',
          action: 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-500'
        };
      default:
        return {
          bg: 'bg-gray-50 border-gray-200',
          icon: 'text-gray-500',
          title: 'text-gray-800',
          message: 'text-gray-700',
          action: 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-500'
        };
    }
  };

  const getDefaultIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5" />;
      case 'error':
        return <XCircle className="w-5 h-5" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />;
      case 'info':
        return <Info className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const styles = getTypeStyles();

  return (
    <div className={`border rounded-lg p-4 ${styles.bg} ${className}`}>
      <div className="flex items-start">
        <div className={`flex-shrink-0 ${styles.icon}`}>
          {getDefaultIcon()}
        </div>
        
        <div className="ml-3 flex-1 min-w-0">
          <h3 className={`text-sm font-medium ${styles.title}`}>
            {title}
          </h3>
          {message && (
            <p className={`mt-1 text-sm ${styles.message}`}>
              {message}
            </p>
          )}
          
          {action && (
            <div className="mt-3">
              <button
                onClick={action.onClick}
                className={`inline-flex items-center px-3 py-2 text-sm font-medium text-white rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-${styles.bg.split('-')[1]}-50 ${styles.action}`}
              >
                {action.label}
              </button>
            </div>
          )}
        </div>
        
        {dismissible && onClose && (
          <div className="ml-4 flex-shrink-0">
            <button
              onClick={onClose}
              className={`inline-flex ${styles.icon} hover:${styles.icon.replace('text-', 'bg-').replace('-500', '-100')} rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-${styles.bg.split('-')[1]}-50 focus:ring-${styles.bg.split('-')[1]}-500`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== PROGRESS INDICATOR COMPONENT =====
interface ProgressIndicatorProps {
  current: number;
  total: number;
  label?: string;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'error';
  className?: string;
}

export function ProgressIndicator({
  current,
  total,
  label,
  showPercentage = true,
  size = 'md',
  variant = 'default',
  className = ''
}: ProgressIndicatorProps) {
  const percentage = Math.min((current / total) * 100, 100);
  
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-2 text-xs';
      case 'md':
        return 'h-3 text-sm';
      case 'lg':
        return 'h-4 text-base';
      default:
        return 'h-3 text-sm';
    }
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'success':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between">
          {label && (
            <span className="text-sm font-medium text-gray-700">
              {label}
            </span>
          )}
          {showPercentage && (
            <span className="text-sm text-gray-500">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
      
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${getSizeClasses()}`}>
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${getVariantClasses()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{current} of {total}</span>
        <span>{Math.round(percentage)}% complete</span>
      </div>
    </div>
  );
}

// ===== STATUS INDICATOR COMPONENT =====
interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'busy' | 'away' | 'pending' | 'completed' | 'failed';
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function StatusIndicator({
  status,
  label,
  size = 'md',
  showLabel = true,
  className = ''
}: StatusIndicatorProps) {
  const getStatusStyles = () => {
    switch (status) {
      case 'online':
      case 'completed':
        return {
          dot: 'bg-green-400',
          ring: 'ring-green-400',
          text: 'text-green-800',
          bg: 'bg-green-100'
        };
      case 'offline':
      case 'failed':
        return {
          dot: 'bg-red-400',
          ring: 'ring-red-400',
          text: 'text-red-800',
          bg: 'bg-red-100'
        };
      case 'busy':
        return {
          dot: 'bg-yellow-400',
          ring: 'ring-yellow-400',
          text: 'text-yellow-800',
          bg: 'bg-yellow-100'
        };
      case 'away':
      case 'pending':
        return {
          dot: 'bg-gray-400',
          ring: 'ring-gray-400',
          text: 'text-gray-800',
          bg: 'bg-gray-100'
        };
      default:
        return {
          dot: 'bg-gray-400',
          ring: 'ring-gray-400',
          text: 'text-gray-800',
          bg: 'bg-gray-100'
        };
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-2 h-2 text-xs';
      case 'md':
        return 'w-3 h-3 text-sm';
      case 'lg':
        return 'w-4 h-4 text-base';
      default:
        return 'w-3 h-3 text-sm';
    }
  };

  const styles = getStatusStyles();

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className={`relative ${getSizeClasses()}`}>
        <div className={`w-full h-full rounded-full ${styles.dot}`} />
        <div className={`absolute inset-0 rounded-full ${styles.ring} ring-2 ring-offset-2 ring-offset-white animate-pulse`} />
      </div>
      
      {showLabel && (label || status) && (
        <span className={`text-sm font-medium capitalize ${styles.text}`}>
          {label || status}
        </span>
      )}
    </div>
  );
}

// ===== FEEDBACK RATING COMPONENT =====
interface FeedbackRatingProps {
  rating: number;
  maxRating?: number;
  onRatingChange?: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  disabled?: boolean;
  className?: string;
}

export function FeedbackRating({
  rating,
  maxRating = 5,
  onRatingChange,
  size = 'md',
  showLabel = true,
  disabled = false,
  className = ''
}: FeedbackRatingProps) {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-4 h-4';
      case 'md':
        return 'w-5 h-5';
      case 'lg':
        return 'w-6 h-6';
      default:
        return 'w-5 h-5';
    }
  };

  const getRatingLabel = (rating: number) => {
    if (rating === 0) return 'No rating';
    if (rating <= maxRating * 0.2) return 'Very poor';
    if (rating <= maxRating * 0.4) return 'Poor';
    if (rating <= maxRating * 0.6) return 'Fair';
    if (rating <= maxRating * 0.8) return 'Good';
    return 'Excellent';
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="flex items-center space-x-1">
        {Array.from({ length: maxRating }, (_, index) => (
          <button
            key={index}
            type="button"
            disabled={disabled}
            onClick={() => onRatingChange?.(index + 1)}
            className={`
              transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500
              ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-110'}
            `}
          >
            <Star
              className={`
                ${getSizeClasses()}
                ${index < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}
              `}
            />
          </button>
        ))}
      </div>
      
      {showLabel && (
        <span className="text-sm text-gray-600">
          {getRatingLabel(rating)}
        </span>
      )}
    </div>
  );
}

// ===== DEMO NOTIFICATION SYSTEM =====
export function DemoNotificationSystem() {
  const [toasts, setToasts] = useState<ToastProps[]>([]);
  const [showAlert, setShowAlert] = useState(true);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'online' | 'offline' | 'busy' | 'away'>('online');
  const [rating, setRating] = useState(0);

  const addToast = useCallback((type: ToastProps['type'], title: string, message?: string) => {
    const id = Date.now().toString();
    const newToast: ToastProps = {
      id,
      type,
      title,
      message,
      duration: 5000,
      onClose: (id: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
      }
    };
    setToasts(prev => [...prev, newToast]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const startProgress = useCallback(() => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          addToast('success', 'Progress Complete!', 'The operation has finished successfully.');
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  }, [addToast]);

  const cycleStatus = useCallback(() => {
    const statuses: Array<'online' | 'offline' | 'busy' | 'away'> = ['online', 'offline', 'busy', 'away'];
    const currentIndex = statuses.indexOf(status);
    const nextIndex = (currentIndex + 1) % statuses.length;
    setStatus(statuses[nextIndex]);
  }, [status]);

  return (
    <div className="business-chart-container-elevated">
      <div className="business-chart-header">
        <div>
          <h3 className="business-chart-title">Notification & Feedback System</h3>
          <p className="business-chart-subtitle">Professional notification components with interactive demos</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Alert Banner Demo */}
        {showAlert && (
          <AlertBanner
            type="info"
            title="System Update Available"
            message="A new version of the application is ready to install. This update includes performance improvements and bug fixes."
            action={{
              label: "Update Now",
              onClick: () => {
                addToast('success', 'Update Started', 'The system update is now downloading...');
                setShowAlert(false);
              }
            }}
            onClose={() => setShowAlert(false)}
          />
        )}

        {/* Progress Indicator Demo */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Progress Tracking</h4>
          <ProgressIndicator
            current={progress}
            total={100}
            label="System Operation Progress"
            variant={progress < 30 ? 'warning' : progress < 70 ? 'default' : 'success'}
            size="lg"
          />
          <div className="mt-4">
            <button
              onClick={startProgress}
              disabled={progress > 0 && progress < 100}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {progress === 0 ? 'Start Progress' : progress === 100 ? 'Reset' : 'Running...'}
            </button>
          </div>
        </div>

        {/* Status Indicators Demo */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Status Indicators</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <StatusIndicator status="online" size="lg" />
              <p className="text-sm text-gray-600 mt-2">Online</p>
            </div>
            <div className="text-center">
              <StatusIndicator status="offline" size="lg" />
              <p className="text-sm text-gray-600 mt-2">Offline</p>
            </div>
            <div className="text-center">
              <StatusIndicator status="busy" size="lg" />
              <p className="text-sm text-gray-600 mt-2">Busy</p>
            </div>
            <div className="text-center">
              <StatusIndicator status="away" size="lg" />
              <p className="text-sm text-gray-600 mt-2">Away</p>
            </div>
          </div>
          <div className="mt-4 text-center">
            <button
              onClick={cycleStatus}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Cycle Status
            </button>
            <p className="text-sm text-gray-600 mt-2">Current: {status}</p>
          </div>
        </div>

        {/* Feedback Rating Demo */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Feedback Rating</h4>
          <div className="text-center">
            <FeedbackRating
              rating={rating}
              onRatingChange={setRating}
              size="lg"
              showLabel={true}
            />
            <p className="text-sm text-gray-600 mt-2">
              {rating === 0 ? 'Click the stars to rate' : `You rated this ${rating} out of 5 stars`}
            </p>
          </div>
        </div>

        {/* Toast Notification Controls */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Toast Notifications</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              onClick={() => addToast('success', 'Success!', 'Operation completed successfully.')}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Success Toast
            </button>
            <button
              onClick={() => addToast('error', 'Error!', 'Something went wrong. Please try again.')}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Error Toast
            </button>
            <button
              onClick={() => addToast('warning', 'Warning!', 'Please review your input before proceeding.')}
              className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
            >
              Warning Toast
            </button>
            <button
              onClick={() => addToast('info', 'Information', 'Here is some helpful information.')}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Info Toast
            </button>
          </div>
        </div>
      </div>

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onClose={removeToast} position="top-right" />
    </div>
  );
}

// ===== MAIN SHOWCASE COMPONENT =====
export function ProfessionalNotificationsShowcase() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Professional Notification & Feedback Systems
        </h2>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          Business-ready notification components with advanced features and smooth animations. 
          Perfect for providing user feedback and system status updates.
        </p>
      </div>

      {/* Demo System */}
      <DemoNotificationSystem />

      {/* Features Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="text-center p-6 bg-white rounded-lg border border-gray-200">
          <div className="bg-gray-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Bell className="w-6 h-6 text-gray-600" />
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">Smart Toasts</h4>
          <p className="text-sm text-gray-600">Auto-dismissing notifications with progress bars and smooth animations</p>
        </div>
        
        <div className="text-center p-6 bg-white rounded-lg border border-gray-200">
          <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">Alert Banners</h4>
          <p className="text-sm text-gray-600">Persistent alerts with actions and dismissible options</p>
        </div>
        
        <div className="text-center p-6 bg-white rounded-lg border border-gray-200">
          <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-6 h-6 text-purple-600" />
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">Progress Tracking</h4>
          <p className="text-sm text-gray-600">Visual progress indicators with status variants and labels</p>
        </div>
        
        <div className="text-center p-6 bg-white rounded-lg border border-gray-200">
          <div className="bg-orange-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Shield className="w-6 h-6 text-orange-600" />
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">Status Indicators</h4>
          <p className="text-sm text-gray-600">Real-time status displays with animated indicators</p>
        </div>
        
        <div className="text-center p-6 bg-white rounded-lg border border-gray-200">
          <div className="bg-red-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Star className="w-6 h-6 text-red-600" />
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">Feedback Ratings</h4>
          <p className="text-sm text-gray-600">Interactive rating systems with visual feedback</p>
        </div>
        
        <div className="text-center p-6 bg-white rounded-lg border border-gray-200">
          <div className="bg-indigo-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Zap className="w-6 h-6 text-indigo-600" />
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">Smooth Animations</h4>
          <p className="text-sm text-gray-600">Professional transitions and micro-interactions</p>
        </div>
      </div>

      {/* Usage Instructions */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          💡 How to Use Professional Notifications
        </h3>
        <div className="text-gray-700 space-y-2 text-sm">
          <p><strong>1. Toast Notifications:</strong> Use ToastContainer for temporary messages with auto-dismiss</p>
          <p><strong>2. Alert Banners:</strong> Use AlertBanner for persistent important messages</p>
          <p><strong>3. Progress Tracking:</strong> Use ProgressIndicator for operation progress visualization</p>
          <p><strong>4. Status Display:</strong> Use StatusIndicator for real-time system status</p>
        </div>
      </div>
    </div>
  );
}

export default ProfessionalNotificationsShowcase;
