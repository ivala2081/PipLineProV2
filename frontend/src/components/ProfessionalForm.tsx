import React, { useState } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  Building, 
  MapPin, 
  Globe, 
  FileText, 
  Upload,
  Save,
  X,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import { Button } from './ProfessionalButtons';
import MobileOptimizedInput from './MobileOptimizedInput';

export interface ProfessionalFormProps {
  onSubmit?: (data: any) => void;
  onCancel?: () => void;
  initialData?: any;
  loading?: boolean;
}

export default function ProfessionalForm({ 
  onSubmit, 
  onCancel, 
  initialData = {}, 
  loading = false 
}: ProfessionalFormProps) {
  const [formData, setFormData] = useState({
    firstName: initialData.firstName || '',
    lastName: initialData.lastName || '',
    email: initialData.email || '',
    phone: initialData.phone || '',
    company: initialData.company || '',
    position: initialData.position || '',
    address: initialData.address || '',
    city: initialData.city || '',
    country: initialData.country || '',
    website: initialData.website || '',
    description: initialData.description || '',
    notifications: initialData.notifications || false,
    marketing: initialData.marketing || false,
    terms: initialData.terms || false,
    ...initialData
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState('personal');

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    if (!formData.company.trim()) {
      newErrors.company = 'Company name is required';
    }

    if (!formData.terms) {
      newErrors.terms = 'You must accept the terms and conditions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit?.(formData);
    }
  };

  const tabs = [
    { id: 'personal', label: 'Personal Info', icon: User },
    { id: 'company', label: 'Company Details', icon: Building },
    { id: 'preferences', label: 'Preferences', icon: CheckCircle }
  ];

  const renderPersonalInfoTab = () => (
    <div className="business-form-grid-2">
      <MobileOptimizedInput
        label="First Name"
        value={formData.firstName}
        onChange={(e) => handleInputChange('firstName', e.target.value)}
        error={errors.firstName}
        required
        leftIcon={<User className="w-4 h-4" />}
        placeholder="Enter your first name"
      />

      <MobileOptimizedInput
        label="Last Name"
        value={formData.lastName}
        onChange={(e) => handleInputChange('lastName', e.target.value)}
        error={errors.lastName}
        required
        leftIcon={<User className="w-4 h-4" />}
        placeholder="Enter your last name"
      />

      <MobileOptimizedInput
        label="Email Address"
        type="email"
        value={formData.email}
        onChange={(e) => handleInputChange('email', e.target.value)}
        error={errors.email}
        required
        leftIcon={<Mail className="w-4 h-4" />}
        placeholder="Enter your email address"
        helpText="We'll never share your email with anyone else"
      />

      <MobileOptimizedInput
        label="Phone Number"
        type="tel"
        value={formData.phone}
        onChange={(e) => handleInputChange('phone', e.target.value)}
        error={errors.phone}
        required
        leftIcon={<Phone className="w-4 h-4" />}
        placeholder="Enter your phone number"
      />
    </div>
  );

  const renderCompanyDetailsTab = () => (
    <div className="space-business-md">
      <div className="business-form-grid-2">
        <MobileOptimizedInput
          label="Company Name"
          value={formData.company}
          onChange={(e) => handleInputChange('company', e.target.value)}
          error={errors.company}
          required
          leftIcon={<Building className="w-4 h-4" />}
          placeholder="Enter company name"
        />

        <MobileOptimizedInput
          label="Job Position"
          value={formData.position}
          onChange={(e) => handleInputChange('position', e.target.value)}
          optional
          leftIcon={<User className="w-4 h-4" />}
          placeholder="Enter your job title"
        />
      </div>

      <div className="business-form-grid-2">
        <MobileOptimizedInput
          label="Address"
          value={formData.address}
          onChange={(e) => handleInputChange('address', e.target.value)}
          optional
          leftIcon={<MapPin className="w-4 h-4" />}
          placeholder="Enter street address"
        />

        <MobileOptimizedInput
          label="City"
          value={formData.city}
          onChange={(e) => handleInputChange('city', e.target.value)}
          optional
          leftIcon={<MapPin className="w-4 h-4" />}
          placeholder="Enter city"
        />
      </div>

      <div className="business-form-grid-2">
        <MobileOptimizedInput
          label="Country"
          value={formData.country}
          onChange={(e) => handleInputChange('country', e.target.value)}
          optional
          leftIcon={<Globe className="w-4 h-4" />}
          placeholder="Enter country"
        />

        <MobileOptimizedInput
          label="Website"
          type="url"
          value={formData.website}
          onChange={(e) => handleInputChange('website', e.target.value)}
          optional
          leftIcon={<Globe className="w-4 h-4" />}
          placeholder="https://example.com"
        />
      </div>

      <div className="business-form-group">
        <label className="business-form-label">Company Description</label>
        <textarea
          className="business-textarea business-textarea-md"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="Tell us about your company..."
          rows={4}
        />
      </div>

      <div className="business-form-group">
        <label className="business-form-label">Company Logo</label>
        <div className="business-file-upload-area">
          <Upload className="business-file-upload-icon" />
          <p className="business-file-upload-text">Click to upload or drag and drop</p>
          <p className="business-file-upload-hint">PNG, JPG, GIF up to 10MB</p>
        </div>
      </div>
    </div>
  );

  const renderPreferencesTab = () => (
    <div className="space-business-md">
      <div className="business-form-group">
        <label className="business-form-label">Communication Preferences</label>
        <div className="business-field-group-vertical">
          <div className="business-checkbox-group">
            <input
              type="checkbox"
              id="notifications"
              className="business-checkbox"
              checked={formData.notifications}
              onChange={(e) => handleInputChange('notifications', e.target.checked)}
            />
            <label htmlFor="notifications" className="business-checkbox-label">
              Receive email notifications about account activity
            </label>
          </div>

          <div className="business-checkbox-group">
            <input
              type="checkbox"
              id="marketing"
              className="business-checkbox"
              checked={formData.marketing}
              onChange={(e) => handleInputChange('marketing', e.target.checked)}
            />
            <label htmlFor="marketing" className="business-checkbox-label">
              Receive marketing communications and updates
            </label>
          </div>
        </div>
      </div>

      <div className="business-form-group">
        <div className="business-checkbox-group">
          <input
            type="checkbox"
            id="terms"
            className="business-checkbox"
            checked={formData.terms}
            onChange={(e) => handleInputChange('terms', e.target.checked)}
          />
          <label htmlFor="terms" className="business-checkbox-label">
            I agree to the <a href="#" className="text-gray-600 hover:text-gray-700 underline">Terms and Conditions</a> and <a href="#" className="text-gray-600 hover:text-gray-700 underline">Privacy Policy</a>
          </label>
        </div>
        {errors.terms && (
          <div className="business-form-error">
            <AlertCircle className="business-form-error-icon" />
            {errors.terms}
          </div>
        )}
      </div>

      <div className="business-card bg-gray-50 border-gray-200 p-4">
        <div className="flex items-start space-business-x-sm">
          <Info className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-gray-800">
            <p className="font-medium">Important Information</p>
            <p className="mt-1">By submitting this form, you agree to our terms and acknowledge that you have read our privacy policy. We may contact you regarding your submission.</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'personal':
        return renderPersonalInfoTab();
      case 'company':
        return renderCompanyDetailsTab();
      case 'preferences':
        return renderPreferencesTab();
      default:
        return renderPersonalInfoTab();
    }
  };

  const getCurrentTabIndex = () => tabs.findIndex(tab => tab.id === activeTab);

  const canGoNext = () => {
    const currentIndex = getCurrentTabIndex();
    if (currentIndex === 0) {
      return formData.firstName && formData.lastName && formData.email && formData.phone;
    }
    if (currentIndex === 1) {
      return formData.company;
    }
    return true;
  };

  const canGoPrevious = () => getCurrentTabIndex() > 0;

  const handleNext = () => {
    const currentIndex = getCurrentTabIndex();
    if (currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1].id);
    }
  };

  const handlePrevious = () => {
    const currentIndex = getCurrentTabIndex();
    if (currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1].id);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="business-form">
      {/* Form Header */}
      <div className="business-form-section">
        <div className="business-form-section-header">
          <h2 className="business-form-section-title">Business Profile Setup</h2>
          <p className="business-form-section-subtitle">
            Complete your business profile to get started with our services
          </p>
        </div>

        {/* Form Tabs */}
        <div className="business-form-tabs">
          <div className="business-form-tab-list">
            {tabs.map((tab, index) => {
              const isActive = activeTab === tab.id;
              const isCompleted = index < getCurrentTabIndex();
              const Icon = tab.icon;
              
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`business-form-tab ${
                    isActive ? 'business-form-tab-active' : 'business-form-tab-inactive'
                  }`}
                >
                  <div className="flex items-center space-business-x-sm">
                    {isCompleted ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                    <span>{tab.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="business-form-tab-content">
          {renderTabContent()}
        </div>

        {/* Form Actions */}
        <div className="business-form-actions">
          <div className="flex items-center space-business-x-sm">
            {canGoPrevious() && (
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={loading}
              >
                <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
                Previous
              </Button>
            )}

            {activeTab !== 'preferences' ? (
              <Button
                variant="primary"
                onClick={handleNext}
                disabled={!canGoNext() || loading}
              >
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                variant="primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="business-form-loading-spinner mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Profile
                  </>
                )}
              </Button>
            )}
          </div>

          {onCancel && (
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
