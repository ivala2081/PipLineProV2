import React from 'react';
import { LucideIcon } from 'lucide-react';

// Base button interface
interface BaseButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost' | 'outline';
  fullWidth?: boolean;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
}

// Professional Primary Button
export const Button: React.FC<BaseButtonProps> = ({
  children,
  onClick,
  disabled = false,
  loading = false,
  className = '',
  size = 'md',
  variant = 'primary',
  fullWidth = false,
  icon: Icon,
  iconPosition = 'left'
}) => {
  const baseClasses = 'enterprise-btn';
  
  const sizeClasses = {
    sm: 'enterprise-btn-sm',
    md: '', // Default size
    lg: 'enterprise-btn-lg',
    xl: 'enterprise-btn-lg' // Use lg for xl for consistency
  };

  const variantClasses = {
    primary: 'enterprise-btn-primary',
    secondary: 'enterprise-btn-secondary',
    success: 'enterprise-btn-success',
    warning: 'enterprise-btn-warning',
    danger: 'enterprise-btn-danger',
    ghost: 'bg-transparent enterprise-body hover:bg-gray-100',
    outline: 'bg-transparent border enterprise-body hover:bg-gray-50'
  };

  const widthClass = fullWidth ? 'w-full' : '';
  
  // Enterprise icon sizing
  const getIconStyle = () => {
    const iconVar = size === 'sm' ? 'var(--icon-sm)' : size === 'lg' ? 'var(--icon-lg)' : 'var(--icon-default)';
    return { width: iconVar, height: iconVar };
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${widthClass} ${className}`}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      {loading && (
        <svg 
          className="animate-spin mr-2" 
          style={getIconStyle()}
          fill="none" 
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      
      {!loading && Icon && iconPosition === 'left' && (
        <Icon 
          style={{
            ...getIconStyle(),
            marginRight: children ? 'var(--space-2)' : '0'
          }} 
        />
      )}
      
      {children}
      
      {!loading && Icon && iconPosition === 'right' && (
        <Icon 
          style={{
            ...getIconStyle(),
            marginLeft: children ? 'var(--space-2)' : '0'
          }} 
        />
      )}
    </button>
  );
};

// Professional Icon Button
interface IconButtonProps {
  icon: LucideIcon;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost' | 'outline';
  tooltip?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon: Icon,
  onClick,
  disabled = false,
  loading = false,
  className = '',
  size = 'md',
  variant = 'ghost',
  tooltip
}) => {
  const baseClasses = 'business-btn';
  
  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3',
    xl: 'p-4'
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
    xl: 'h-7 w-7'
  };

  const variantClasses = {
    primary: 'business-btn-primary',
    secondary: 'business-btn-secondary',
    success: 'business-btn-success',
    warning: 'business-btn-warning',
    danger: 'business-btn-danger',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
    outline: 'bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      title={tooltip}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : (
        <Icon className={iconSizes[size]} />
      )}
    </button>
  );
};

// Professional Button Group
interface ButtonGroupProps {
  children: React.ReactNode;
  className?: string;
  vertical?: boolean;
}

export const ButtonGroup: React.FC<ButtonGroupProps> = ({
  children,
  className = '',
  vertical = false
}) => {
  const baseClasses = 'inline-flex';
  const directionClass = vertical ? 'flex-col' : 'flex-row';
  
  return (
    <div className={`${baseClasses} ${directionClass} ${className}`}>
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            className: `${child.props.className || ''} ${
              vertical 
                ? index === 0 ? 'rounded-b-none' : index === React.Children.count(children) - 1 ? 'rounded-t-none' : 'rounded-none'
                : index === 0 ? 'rounded-r-none' : index === React.Children.count(children) - 1 ? 'rounded-l-none' : 'rounded-none'
            } ${
              vertical
                ? index !== React.Children.count(children) - 1 ? 'border-b-0' : ''
                : index !== React.Children.count(children) - 1 ? 'border-r-0' : ''
            }`
          });
        }
        return child;
      })}
    </div>
  );
};

// Professional Action Button (with confirmation)
interface ActionButtonProps extends BaseButtonProps {
  confirmText?: string;
  confirmTitle?: string;
  onConfirm?: () => void;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  children,
  onClick,
  confirmText = 'Are you sure?',
  confirmTitle = 'Confirm Action',
  onConfirm,
  ...props
}) => {
  const [showConfirm, setShowConfirm] = React.useState(false);

  const handleClick = () => {
    if (onConfirm) {
      setShowConfirm(true);
    } else if (onClick) {
      onClick();
    }
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
      setShowConfirm(false);
    }
  };

  const handleCancel = () => {
    setShowConfirm(false);
  };

  return (
    <>
      <Button onClick={handleClick} {...props}>
        {children}
      </Button>
      
      {showConfirm && (
        <div className="business-modal-overlay flex items-center justify-center z-50 p-4">
          <div className="business-modal max-w-md w-full">
            <div className="business-modal-header">
              <h3 className="text-lg font-semibold text-gray-900">{confirmTitle}</h3>
            </div>
            <div className="business-modal-body">
              <p className="text-gray-600">{confirmText}</p>
            </div>
            <div className="business-modal-footer">
              <Button variant="danger" onClick={handleConfirm} className="flex-1">
                Confirm
              </Button>
              <Button variant="outline" onClick={handleCancel} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Export all button components
export default {
  Button,
  IconButton,
  ButtonGroup,
  ActionButton
};
