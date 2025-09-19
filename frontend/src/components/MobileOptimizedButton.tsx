import React from 'react';
import { clsx } from 'clsx';

interface MobileOptimizedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  className?: string;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const MobileOptimizedButton: React.FC<MobileOptimizedButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  loading = false,
  icon,
  iconPosition = 'left',
  disabled,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none';
  
  const variantClasses = {
    primary: 'bg-gradient-to-r from-gray-600 to-indigo-600 hover:from-gray-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl focus:ring-gray-500',
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-300 hover:border-gray-400 focus:ring-gray-500',
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl focus:ring-red-500',
    success: 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl focus:ring-green-500',
    warning: 'bg-yellow-600 hover:bg-yellow-700 text-white shadow-lg hover:shadow-xl focus:ring-yellow-500'
  };

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm min-h-[44px] min-w-[44px]', // Mobile touch target minimum
    md: 'px-4 py-3 text-base min-h-[48px] min-w-[48px]', // Enhanced mobile touch target
    lg: 'px-6 py-4 text-lg min-h-[52px] min-w-[52px]', // Large mobile touch target
    xl: 'px-8 py-5 text-xl min-h-[56px] min-w-[56px]' // Extra large for important actions
  };

  const iconClasses = 'transition-transform duration-200 group-hover:scale-105';
  
  const iconSizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
    xl: 'h-7 w-7'
  };

  return (
    <button
      className={clsx(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full border-2 border-current border-t-transparent h-4 w-4" />
          <span>Loading...</span>
        </div>
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <span className={clsx('mr-2', iconClasses, iconSizeClasses[size])}>
              {icon}
            </span>
          )}
          <span>{children}</span>
          {icon && iconPosition === 'right' && (
            <span className={clsx('ml-2', iconClasses, iconSizeClasses[size])}>
              {icon}
            </span>
          )}
        </>
      )}
    </button>
  );
};

// Export as default for easier imports
export default MobileOptimizedButton;
