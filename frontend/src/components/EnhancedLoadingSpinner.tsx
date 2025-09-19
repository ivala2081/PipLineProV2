import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface LoadingState {
  status: 'loading' | 'success' | 'error';
  message: string;
  progress?: number;
}

interface EnhancedLoadingSpinnerProps {
  loading: boolean;
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  onComplete?: () => void;
  className?: string;
}

const EnhancedLoadingSpinner: React.FC<EnhancedLoadingSpinnerProps> = ({
  loading,
  message = 'Loading...',
  size = 'md',
  showProgress = false,
  onComplete,
  className = ''
}) => {
  const [progress, setProgress] = useState(0);
  const [loadingState, setLoadingState] = useState<LoadingState>({
    status: 'loading',
    message,
    progress: 0
  });

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  useEffect(() => {
    if (loading && showProgress) {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + Math.random() * 15;
        });
      }, 200);

      return () => clearInterval(interval);
    } else if (!loading && progress > 0) {
      setProgress(100);
      setTimeout(() => {
        setLoadingState(prev => ({ ...prev, status: 'success' }));
        onComplete?.();
      }, 500);
    }
    
    // Return undefined for the case when no cleanup is needed
    return undefined;
  }, [loading, showProgress, progress, onComplete]);

  useEffect(() => {
    setLoadingState(prev => ({ ...prev, message, progress }));
  }, [message, progress]);

  if (!loading && !showProgress) {
    return null;
  }

  const renderSpinner = () => {
    switch (loadingState.status) {
      case 'success':
        return (
          <div className="flex flex-col items-center">
            <CheckCircle className={`${sizeClasses[size]} text-green-500 animate-pulse`} />
            <p className={`${textSizeClasses[size]} text-green-600 mt-2 font-medium`}>
              {loadingState.message || 'Completed!'}
            </p>
          </div>
        );
      case 'error':
        return (
          <div className="flex flex-col items-center">
            <AlertCircle className={`${sizeClasses[size]} text-red-500 animate-pulse`} />
            <p className={`${textSizeClasses[size]} text-red-600 mt-2 font-medium`}>
              {loadingState.message || 'Error occurred'}
            </p>
          </div>
        );
      default:
        return (
          <div className="flex flex-col items-center">
            <Loader2 className={`${sizeClasses[size]} text-blue-500 animate-spin`} />
            <p className={`${textSizeClasses[size]} text-gray-600 mt-2`}>
              {loadingState.message}
            </p>
            {showProgress && (
              <div className="w-full max-w-xs mt-4">
                <div className="bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1 text-center">
                  {Math.round(progress)}%
                </p>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      {renderSpinner()}
    </div>
  );
};

// Full screen loading overlay
export const FullScreenLoader: React.FC<{
  loading: boolean;
  message?: string;
  showProgress?: boolean;
}> = ({ loading, message, showProgress }) => {
  if (!loading) return null;

  return (
    <div className="fixed inset-0 bg-white bg-opacity-90 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
        <EnhancedLoadingSpinner
          loading={loading}
          message={message}
          size="lg"
          showProgress={showProgress}
        />
      </div>
    </div>
  );
};

// Inline loading spinner
export const InlineLoader: React.FC<{
  loading: boolean;
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}> = ({ loading, message, size = 'sm' }) => {
  if (!loading) return null;

  return (
    <EnhancedLoadingSpinner
      loading={loading}
      message={message}
      size={size}
      className="py-4"
    />
  );
};

// Button loading state
export const ButtonLoader: React.FC<{
  loading: boolean;
  children: React.ReactNode;
  className?: string;
}> = ({ loading, children, className = '' }) => {
  return (
    <button
      className={`flex items-center justify-center gap-2 ${className}`}
      disabled={loading}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
};

export default EnhancedLoadingSpinner;
