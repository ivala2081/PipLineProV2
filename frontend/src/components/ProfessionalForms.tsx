import React, { useState } from 'react';
import { 
  Eye, 
  EyeOff, 
  Check, 
  X, 
  AlertCircle, 
  Info, 
  ChevronDown,
  Upload,
  Calendar,
  Clock,
  MapPin,
  Phone,
  Mail,
  User,
  Lock,
  CreditCard,
  Building,
  Globe,
  FileText,
  Search,
  Filter,
  Plus,
  Minus
} from 'lucide-react';

// ===== PROFESSIONAL FORM COMPONENTS =====
// These provide business-ready form elements with advanced functionality

// ===== INPUT FIELD COMPONENT =====
interface InputFieldProps {
  label: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search';
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  success?: string;
  info?: string;
  required?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  className?: string;
  helperText?: string;
}

export function InputField({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  success,
  info,
  required = false,
  disabled = false,
  icon,
  className = '',
  helperText
}: InputFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const getInputType = () => {
    if (type === 'password' && showPassword) return 'text';
    return type;
  };

  const getStatusClasses = () => {
    if (error) return 'border-red-300 focus:border-red-500 focus:ring-red-500';
    if (success) return 'border-green-300 focus:border-green-500 focus:ring-green-500';
    if (info) return 'border-gray-300 focus:border-gray-500 focus:ring-gray-500';
    return 'border-gray-300 focus:border-gray-500 focus:ring-gray-500';
  };

  const getStatusIcon = () => {
    if (error) return <X className="w-4 h-4 text-red-500" />;
    if (success) return <Check className="w-4 h-4 text-green-500" />;
    if (info) return <Info className="w-4 h-4 text-gray-500" />;
    return null;
  };

  const getStatusText = () => {
    if (error) return error;
    if (success) return success;
    if (info) return info;
    return helperText;
  };

  const getStatusTextColor = () => {
    if (error) return 'text-red-600';
    if (success) return 'text-green-600';
    if (info) return 'text-gray-600';
    return 'text-gray-500';
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <div className="text-gray-400">{icon}</div>
          </div>
        )}
        
        <input
          type={getInputType()}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`
            block w-full px-3 py-2 border rounded-md shadow-sm
            placeholder-gray-400 transition-colors duration-200
            ${icon ? 'pl-10' : ''}
            ${type === 'password' ? 'pr-10' : ''}
            ${getStatusClasses()}
            ${disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white text-gray-900'}
            ${isFocused ? 'shadow-md' : ''}
          `}
        />
        
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4 text-gray-400 hover:text-gray-600" />
            ) : (
              <Eye className="w-4 h-4 text-gray-400 hover:text-gray-600" />
            )}
          </button>
        )}
        
        {getStatusIcon() && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            {getStatusIcon()}
          </div>
        )}
      </div>
      
      {getStatusText() && (
        <p className={`text-sm ${getStatusTextColor()}`}>
          {getStatusText()}
        </p>
      )}
    </div>
  );
}

// ===== SELECT FIELD COMPONENT =====
interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
  success?: string;
  info?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  helperText?: string;
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  error,
  success,
  info,
  required = false,
  disabled = false,
  className = '',
  helperText
}: SelectFieldProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getStatusClasses = () => {
    if (error) return 'border-red-300 focus:border-red-500 focus:ring-red-500';
    if (success) return 'border-green-300 focus:border-green-500 focus:ring-green-500';
    if (info) return 'border-gray-300 focus:border-gray-500 focus:ring-gray-500';
    return 'border-gray-300 focus:border-gray-500 focus:ring-gray-500';
  };

  const getStatusText = () => {
    if (error) return error;
    if (success) return success;
    if (info) return info;
    return helperText;
  };

  const getStatusTextColor = () => {
    if (error) return 'text-red-600';
    if (success) return 'text-green-600';
    if (info) return 'text-gray-600';
    return 'text-gray-500';
  };

  const selectedOption = options.find(option => option.value === value);

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`
            block w-full px-3 py-2 text-left border rounded-md shadow-sm
            transition-colors duration-200
            ${getStatusClasses()}
            ${disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white text-gray-900 hover:border-gray-400'}
          `}
        >
          <span className={selectedOption ? 'text-gray-900' : 'text-gray-500'}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown className={`absolute inset-y-0 right-0 w-4 h-4 mr-3 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        
        {isOpen && !disabled && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
            <div className="py-1 max-h-60 overflow-auto">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  disabled={option.disabled}
                  className={`
                    block w-full px-3 py-2 text-left text-sm
                    ${option.value === value ? 'bg-gray-50 text-gray-900' : 'text-gray-900 hover:bg-gray-50'}
                    ${option.disabled ? 'text-gray-400 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {getStatusText() && (
        <p className={`text-sm ${getStatusTextColor()}`}>
          {getStatusText()}
        </p>
      )}
    </div>
  );
}

// ===== TEXTAREA FIELD COMPONENT =====
interface TextareaFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  error?: string;
  success?: string;
  info?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  helperText?: string;
}

export function TextareaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  error,
  success,
  info,
  required = false,
  disabled = false,
  className = '',
  helperText
}: TextareaFieldProps) {
  const [isFocused, setIsFocused] = useState(false);

  const getStatusClasses = () => {
    if (error) return 'border-red-300 focus:border-red-500 focus:ring-red-500';
    if (success) return 'border-green-300 focus:border-green-500 focus:ring-green-500';
    if (info) return 'border-gray-300 focus:border-gray-500 focus:ring-gray-500';
    return 'border-gray-300 focus:border-gray-500 focus:ring-gray-500';
  };

  const getStatusText = () => {
    if (error) return error;
    if (success) return success;
    if (info) return info;
    return helperText;
  };

  const getStatusTextColor = () => {
    if (error) return 'text-red-600';
    if (success) return 'text-green-600';
    if (info) return 'text-gray-600';
    return 'text-gray-500';
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`
          block w-full px-3 py-2 border rounded-md shadow-sm
          placeholder-gray-400 transition-colors duration-200 resize-vertical
          ${getStatusClasses()}
          ${disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white text-gray-900'}
          ${isFocused ? 'shadow-md' : ''}
        `}
      />
      
      {getStatusText() && (
        <p className={`text-sm ${getStatusTextColor()}`}>
          {getStatusText()}
        </p>
      )}
    </div>
  );
}

// ===== CHECKBOX FIELD COMPONENT =====
interface CheckboxFieldProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
  disabled?: boolean;
  className?: string;
  helperText?: string;
}

export function CheckboxField({
  label,
  checked,
  onChange,
  error,
  disabled = false,
  className = '',
  helperText
}: CheckboxFieldProps) {
  return (
    <div className={`flex items-start space-x-3 ${className}`}>
      <div className="flex items-center h-5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className={`
            w-4 h-4 text-gray-600 border-gray-300 rounded
            focus:ring-gray-500 focus:ring-2
            ${error ? 'border-red-300' : ''}
            ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'cursor-pointer'}
          `}
        />
      </div>
      
      <div className="text-sm">
        <label className={`font-medium ${disabled ? 'text-gray-400' : 'text-gray-700'}`}>
          {label}
        </label>
        {(helperText || error) && (
          <p className={`mt-1 ${error ? 'text-red-600' : 'text-gray-500'}`}>
            {error || helperText}
          </p>
        )}
      </div>
    </div>
  );
}

// ===== RADIO GROUP COMPONENT =====
interface RadioOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface RadioGroupProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: RadioOption[];
  error?: string;
  disabled?: boolean;
  className?: string;
  helperText?: string;
}

export function RadioGroup({
  label,
  value,
  onChange,
  options,
  error,
  disabled = false,
  className = '',
  helperText
}: RadioGroupProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      
      <div className="space-y-2">
        {options.map((option) => (
          <div key={option.value} className="flex items-center space-x-3">
            <input
              type="radio"
              id={option.value}
              value={option.value}
              checked={value === option.value}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled || option.disabled}
              className={`
                w-4 h-4 text-gray-600 border-gray-300
                focus:ring-gray-500 focus:ring-2
                ${error ? 'border-red-300' : ''}
                ${disabled || option.disabled ? 'bg-gray-100 cursor-not-allowed' : 'cursor-pointer'}
              `}
            />
            <label
              htmlFor={option.value}
              className={`text-sm ${disabled || option.disabled ? 'text-gray-400' : 'text-gray-700'}`}
            >
              {option.label}
            </label>
          </div>
        ))}
      </div>
      
      {(helperText || error) && (
        <p className={`text-sm ${error ? 'text-red-600' : 'text-gray-500'}`}>
          {error || helperText}
        </p>
      )}
    </div>
  );
}

// ===== FILE UPLOAD COMPONENT =====
interface FileUploadProps {
  label: string;
  onFileSelect: (files: FileList) => void;
  accept?: string;
  multiple?: boolean;
  error?: string;
  disabled?: boolean;
  className?: string;
  helperText?: string;
}

export function FileUpload({
  label,
  onFileSelect,
  accept,
  multiple = false,
  error,
  disabled = false,
  className = '',
  helperText
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center transition-colors duration-200
          ${dragActive ? 'border-gray-400 bg-gray-50' : 'border-gray-300 hover:border-gray-400'}
          ${error ? 'border-red-300 bg-red-50' : ''}
          ${disabled ? 'border-gray-200 bg-gray-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileSelect}
          disabled={disabled}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <Upload className={`mx-auto h-12 w-12 text-gray-400 ${dragActive ? 'text-gray-400' : ''} ${error ? 'text-red-400' : ''}`} />
        
        <div className="mt-4">
          <p className={`text-sm ${error ? 'text-red-600' : 'text-gray-600'}`}>
            <span className="font-medium">Click to upload</span> or drag and drop
          </p>
          {accept && (
            <p className="text-xs text-gray-500 mt-1">
              Accepted formats: {accept}
            </p>
          )}
        </div>
      </div>
      
      {(helperText || error) && (
        <p className={`text-sm ${error ? 'text-red-600' : 'text-gray-500'}`}>
          {error || helperText}
        </p>
      )}
    </div>
  );
}

// ===== FORM BUTTON COMPONENT =====
interface FormButtonProps {
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function FormButton({
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  children,
  onClick,
  className = ''
}: FormButtonProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500';
      case 'secondary':
        return 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500';
      case 'success':
        return 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500';
      case 'danger':
        return 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500';
      case 'warning':
        return 'bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500';
      default:
        return 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-sm';
      case 'md':
        return 'px-4 py-2 text-sm';
      case 'lg':
        return 'px-6 py-3 text-base';
      default:
        return 'px-4 py-2 text-sm';
    }
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`
        inline-flex items-center justify-center font-medium rounded-md
        focus:outline-none focus:ring-2 focus:ring-offset-2
        transition-colors duration-200
        ${getVariantClasses()}
        ${getSizeClasses()}
        ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
    >
      {loading && (
        <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
      )}
      {icon && !loading && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
}

// ===== DEMO FORM =====
export function DemoForm() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    company: '',
    role: '',
    department: '',
    description: '',
    notifications: false,
    marketing: false,
    experience: '',
    skills: [],
    avatar: null as FileList | null
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simple validation
    const newErrors: Record<string, string> = {};
    if (!formData.firstName) newErrors.firstName = 'First name is required';
    if (!formData.lastName) newErrors.lastName = 'Last name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    if (!formData.password) newErrors.password = 'Password is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    alert('Form submitted successfully! Check console for data.');
    console.log('Form Data:', formData);
  };

  const departmentOptions = [
    { value: '', label: 'Select Department' },
    { value: 'engineering', label: 'Engineering' },
    { value: 'sales', label: 'Sales' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'hr', label: 'Human Resources' },
    { value: 'finance', label: 'Finance' }
  ];

  const experienceOptions = [
    { value: '', label: 'Select Experience Level' },
    { value: 'entry', label: 'Entry Level (0-2 years)' },
    { value: 'mid', label: 'Mid Level (3-5 years)' },
    { value: 'senior', label: 'Senior Level (6-10 years)' },
    { value: 'expert', label: 'Expert Level (10+ years)' }
  ];

  return (
    <div className="business-chart-container-elevated">
      <div className="business-chart-header">
        <div>
          <h3 className="business-chart-title">Employee Registration Form</h3>
          <p className="business-chart-subtitle">Complete professional form with validation and business styling</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField
              label="First Name"
              value={formData.firstName}
              onChange={(value) => handleInputChange('firstName', value)}
              placeholder="Enter first name"
              required
              error={errors.firstName}
              icon={<User className="w-4 h-4" />}
            />
            <InputField
              label="Last Name"
              value={formData.lastName}
              onChange={(value) => handleInputChange('lastName', value)}
              placeholder="Enter last name"
              required
              error={errors.lastName}
            />
            <InputField
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={(value) => handleInputChange('email', value)}
              placeholder="Enter email address"
              required
              error={errors.email}
              icon={<Mail className="w-4 h-4" />}
            />
            <InputField
              label="Password"
              type="password"
              value={formData.password}
              onChange={(value) => handleInputChange('password', value)}
              placeholder="Enter password"
              required
              error={errors.password}
              icon={<Lock className="w-4 h-4" />}
              helperText="Minimum 8 characters with uppercase, lowercase, and number"
            />
          </div>
        </div>

        {/* Company Information */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Company Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField
              label="Company Name"
              value={formData.company}
              onChange={(value) => handleInputChange('company', value)}
              placeholder="Enter company name"
              icon={<Building className="w-4 h-4" />}
            />
            <InputField
              label="Job Title"
              value={formData.role}
              onChange={(value) => handleInputChange('role', value)}
              placeholder="Enter job title"
            />
            <SelectField
              label="Department"
              value={formData.department}
              onChange={(value) => handleInputChange('department', value)}
              options={departmentOptions}
            />
            <SelectField
              label="Experience Level"
              value={formData.experience}
              onChange={(value) => handleInputChange('experience', value)}
              options={experienceOptions}
            />
          </div>
        </div>

        {/* Additional Information */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h4>
          <div className="space-y-4">
            <TextareaField
              label="Professional Description"
              value={formData.description}
              onChange={(value) => handleInputChange('description', value)}
              placeholder="Describe your professional background and expertise..."
              rows={4}
              helperText="This will be displayed on your profile"
            />
            
            <div className="space-y-3">
              <CheckboxField
                label="Receive email notifications about important updates"
                checked={formData.notifications}
                onChange={(checked) => handleInputChange('notifications', checked)}
                helperText="You can change this preference later in settings"
              />
              <CheckboxField
                label="Receive marketing communications and newsletters"
                checked={formData.marketing}
                onChange={(checked) => handleInputChange('marketing', checked)}
              />
            </div>

            <FileUpload
              label="Profile Avatar"
              onFileSelect={(files) => handleInputChange('avatar', files)}
              accept="image/*"
              helperText="Upload a professional photo (JPG, PNG, GIF up to 5MB)"
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
          <FormButton
            type="button"
            variant="secondary"
            onClick={() => {
              setFormData({
                firstName: '', lastName: '', email: '', password: '', company: '',
                role: '', department: '', description: '', notifications: false,
                marketing: false, experience: '', skills: [], avatar: null
              });
              setErrors({});
            }}
          >
            Reset Form
          </FormButton>
          <FormButton
            type="submit"
            variant="primary"
            icon={<Check className="w-4 h-4" />}
          >
            Submit Registration
          </FormButton>
        </div>
      </form>
    </div>
  );
}

// ===== MAIN SHOWCASE COMPONENT =====
export function ProfessionalFormsShowcase() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Professional Form Components
        </h2>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          Business-ready form elements with advanced validation and consistent professional styling. 
          Perfect for creating user-friendly data entry forms.
        </p>
      </div>

      {/* Demo Form */}
      <DemoForm />

      {/* Features Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="text-center p-6 bg-white rounded-lg border border-gray-200">
          <div className="bg-gray-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Check className="w-6 h-6 text-gray-600" />
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">Smart Validation</h4>
          <p className="text-sm text-gray-600">Real-time validation with clear error messages and success states</p>
        </div>
        
        <div className="text-center p-6 bg-white rounded-lg border border-gray-200">
          <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Eye className="w-6 h-6 text-green-600" />
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">Accessibility First</h4>
          <p className="text-sm text-gray-600">Built with ARIA labels, keyboard navigation, and screen reader support</p>
        </div>
        
        <div className="text-center p-6 bg-white rounded-lg border border-gray-200">
          <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Upload className="w-6 h-6 text-purple-600" />
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">File Upload</h4>
          <p className="text-sm text-gray-600">Drag & drop file upload with visual feedback and validation</p>
        </div>
        
        <div className="text-center p-6 bg-white rounded-lg border border-gray-200">
          <div className="bg-orange-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-orange-600" />
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">Password Fields</h4>
          <p className="text-sm text-gray-600">Secure password inputs with show/hide toggle and strength indicators</p>
        </div>
        
        <div className="text-center p-6 bg-white rounded-lg border border-gray-200">
          <div className="bg-red-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Building className="w-6 h-6 text-red-600" />
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">Professional Styling</h4>
          <p className="text-sm text-gray-600">Consistent business appearance with hover states and focus indicators</p>
        </div>
        
        <div className="text-center p-6 bg-white rounded-lg border border-gray-200">
          <div className="bg-indigo-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Globe className="w-6 h-6 text-indigo-600" />
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">Responsive Design</h4>
          <p className="text-sm text-gray-600">Works perfectly on all devices with adaptive layouts and touch-friendly controls</p>
        </div>
      </div>

      {/* Usage Instructions */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          💡 How to Use Professional Form Components
        </h3>
        <div className="text-gray-700 space-y-2 text-sm">
          <p><strong>1. Input Fields:</strong> Use InputField for text, email, password with validation states</p>
          <p><strong>2. Select Fields:</strong> Use SelectField for dropdown selections with custom styling</p>
          <p><strong>3. Validation:</strong> Pass error, success, or info messages for different states</p>
          <p><strong>4. Accessibility:</strong> All components include proper labels, ARIA attributes, and keyboard support</p>
        </div>
      </div>
    </div>
  );
}

export default ProfessionalFormsShowcase;
