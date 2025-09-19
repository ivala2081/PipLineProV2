import React, { forwardRef, useState } from 'react';
import { Eye, EyeOff, AlertCircle, CheckCircle, HelpCircle } from 'lucide-react';

export interface MobileOptimizedInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  inputSize?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'error' | 'success' | 'warning';
  required?: boolean;
  optional?: boolean;
  helpText?: string;
  showPasswordToggle?: boolean;
  className?: string;
}

const MobileOptimizedInput = forwardRef<HTMLInputElement, MobileOptimizedInputProps>(
  (
    {
      label,
      error,
      success,
      helperText,
      leftIcon,
      rightIcon,
      inputSize = 'md',
      variant = 'default',
      required = false,
      optional = false,
      helpText,
      showPasswordToggle = false,
      className = '',
      type = 'text',
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const isPassword = type === 'password';
    const inputType = isPassword && showPassword ? 'text' : type;

    const baseInputClasses = 'business-input-field font-business transition-all duration-200';
    
    const sizeClasses = {
      sm: 'business-input-sm font-medium',
      md: 'business-input-md font-medium',
      lg: 'business-input-lg font-medium',
    };

    const variantClasses = {
      default: '',
      error: 'business-input-field-error',
      success: 'business-input-field-success',
      warning: 'business-input-field-warning',
    };

    const inputClasses = `
      ${baseInputClasses}
      ${sizeClasses[inputSize]}
      ${variantClasses[variant]}
      ${leftIcon ? 'pl-10' : ''}
      ${rightIcon || (isPassword && showPasswordToggle) ? 'pr-10' : ''}
      ${className}
    `.trim();

    const getLabelClass = () => {
      if (required) return 'business-form-label-required';
      if (optional) return 'business-form-label-optional';
      return 'business-form-label';
    };

    const getValidationIcon = () => {
      if (error) return <AlertCircle className="w-4 h-4 text-red-600" />;
      if (success) return <CheckCircle className="w-4 h-4 text-green-600" />;
      return null;
    };

    const getValidationMessage = () => {
      if (error) return error;
      if (success) return success;
      return helperText;
    };

    const getValidationClass = () => {
      if (error) return 'business-form-error';
      if (success) return 'business-form-success';
      return 'business-form-help';
    };

    const getValidationIconClass = () => {
      if (error) return 'business-form-error-icon';
      if (success) return 'business-form-success-icon';
      return '';
    };

    return (
      <div className="business-form-group">
        {label && (
          <label className={getLabelClass()}>
            {label}
            {helpText && (
              <span className="business-form-help-icon" title={helpText}>
                <HelpCircle className="w-3 h-3" />
              </span>
            )}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
              {leftIcon}
            </div>
          )}
          
          <input
            ref={ref}
            type={inputType}
            className={inputClasses}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            {...props}
          />
          
          {rightIcon && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
              {rightIcon}
            </div>
          )}
          
          {isPassword && showPasswordToggle && (
            <button
              type="button"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
        </div>
        
        {getValidationMessage() && (
          <div className={getValidationClass()}>
            {getValidationIcon() && (
              <span className={getValidationIconClass()}>
                {getValidationIcon()}
              </span>
            )}
            <span>{getValidationMessage()}</span>
          </div>
        )}
      </div>
    );
  }
);

MobileOptimizedInput.displayName = 'MobileOptimizedInput';

export default MobileOptimizedInput;
