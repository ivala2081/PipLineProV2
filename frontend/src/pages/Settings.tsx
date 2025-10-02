import { useState, useEffect, lazy, Suspense } from 'react';
import { getRadius, getSectionSpacing } from '../utils/spacingUtils';
import {
  Settings as SettingsIcon,
  Shield,
  Users,
  Lock,
  Activity,
  Database,
  FileText,
  Bell,
  Globe,
  Zap,
  Calendar,
  UserCheck,
  Building,
  TrendingUp,
  List,
  Plus,
  Edit,
  Trash2,
  X,
  Mail,
  Phone,
  RefreshCw,
  Monitor,
  BarChart3,
  Download,
  CheckCircle,
  Clock,
  Circle,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  AlertCircle,
  Percent,
  Save,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { api } from '../utils/apiClient';
import { useUniqueToast } from '../hooks/useUniqueToast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { UnifiedCard, UnifiedButton, UnifiedBadge, UnifiedSection, UnifiedGrid } from '../design-system';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
  Breadcrumb, 
  QuickActions,
  useKeyboardShortcuts,
  COMMON_SHORTCUTS
} from '../components/ui';

// Lazy load SystemMonitor component
const SystemMonitor = lazy(() => import('./SystemMonitor'));

interface Tab {
  id: string;
  name: string;
  icon: any;
  content: React.ReactNode;
}

interface DropdownOption {
  id: number;
  value: string;
  commission_rate?: number;
  created_at?: string;
}

interface GroupedOptions {
  [fieldName: string]: DropdownOption[];
}

interface FieldType {
  value: string;
  label: string;
  requiresCommission: boolean;
  isStatic?: boolean;
  staticValues?: string[];
  isProtected?: boolean;
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState('general');
  const [showSystemMonitor, setShowSystemMonitor] = useState(false);
  const { t, currentLanguage, setLanguage, supportedLanguages } = useLanguage();
  const { showUniqueSuccess, showUniqueError, showUniqueInfo } = useUniqueToast();
  
  // Fallback values in case language context is not available
  const safeCurrentLanguage = currentLanguage || 'en';
  const safeSupportedLanguages = supportedLanguages || { en: { flag: '🇺🇸', name: 'English' }, tr: { flag: '🇹🇷', name: 'Türkçe' } };

  // Check URL parameters for initial tab and monitor view
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    const viewParam = urlParams.get('view');
    
    if (
      tabParam &&
      [
        'general',
        'dropdowns',
        'departments',
        'admin',
        'notifications',
        'integrations',
        'translations',
      ].includes(tabParam)
    ) {
      setActiveTab(tabParam);
    }
    
    // If tab is admin and view is monitor, show system monitor
    if (tabParam === 'admin' && viewParam === 'monitor') {
      setActiveTab('admin');
      setShowSystemMonitor(true);
    }
  }, []);

  // Dropdown management state
  const [dropdownOptions, setDropdownOptions] = useState<GroupedOptions>({});
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedOption, setSelectedOption] = useState<DropdownOption | null>(
    null
  );
  const [editingOption, setEditingOption] = useState<DropdownOption | null>(
    null
  );
  const [formData, setFormData] = useState({
    field_name: '',
    value: '',
    commission_rate: '',
  });
  const [securityCode, setSecurityCode] = useState('');

  // Department management state
  const [departments, setDepartments] = useState<string[]>([
    'Conversion', 'Retention', 'Marketing', 'Research', 'Operation', 'Management', 'Facility'
  ]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<string>('');
  const [newDepartment, setNewDepartment] = useState('');
  const [isEditingDepartment, setIsEditingDepartment] = useState(false);

  // Commission rates management state
  const [commissionRates, setCommissionRates] = useState<any[]>([]);
  const [loadingCommissionRates, setLoadingCommissionRates] = useState(false);
  const [showCommissionRateModal, setShowCommissionRateModal] = useState(false);
  const [editingCommissionRate, setEditingCommissionRate] = useState<any>(null);
  const [commissionRateForm, setCommissionRateForm] = useState({
    psp_name: '',
    commission_rate: '',
    effective_from: '',
    effective_until: '',
  });

  const fieldTypes = [
    // Static fields (cannot be modified)
    { 
      value: 'payment_method', 
      label: 'Payment Method', 
      requiresCommission: false,
      isStatic: true,
      staticValues: ['Bank', 'Credit card', 'Tether']
    },
    { 
      value: 'currency', 
      label: 'Currency', 
      requiresCommission: false,
      isStatic: true,
      staticValues: ['TL', 'USD', 'EUR']
    },
    { 
      value: 'category', 
      label: 'Category', 
      requiresCommission: false,
      isStatic: true,
      staticValues: ['DEP', 'WD']
    },
    // Dynamic fields (can be managed)
    { value: 'psp', label: 'PSP/KASA', requiresCommission: true, isStatic: false, isProtected: true },
    { value: 'company', label: 'Company', requiresCommission: false, isStatic: false, isProtected: true },
  ];

  // Fetch dropdown options
  const fetchDropdownOptions = async () => {
    try {
      setLoadingOptions(true);
      const response = await api.get('/api/v1/transactions/dropdown-options');

      if (response.ok) {
        const data = await api.parseResponse(response);
        // Debug logging removed for production
        setDropdownOptions(data || {});
      } else {
        console.error('Failed to fetch dropdown options');
      }
    } catch (error) {
      console.error('Error fetching dropdown options:', error);
    } finally {
      setLoadingOptions(false);
    }
  };

  // Department management functions
  const fetchDepartments = async () => {
    try {
      setLoadingDepartments(true);
      // Load departments from localStorage or use default
      const savedDepartments = localStorage.getItem('systemDepartments');
      if (savedDepartments) {
        setDepartments(JSON.parse(savedDepartments));
      } else {
        // Default departments
        const defaultDepartments = [
          'Conversion', 'Retention', 'Marketing', 'Research', 'Operation', 'Management', 'Facility'
        ];
        setDepartments(defaultDepartments);
        localStorage.setItem('systemDepartments', JSON.stringify(defaultDepartments));
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    } finally {
      setLoadingDepartments(false);
    }
  };

  const handleAddDepartment = async () => {
    if (!newDepartment.trim()) return;
    
    try {
      // Check if department already exists
      if (departments.includes(newDepartment.trim())) {
        alert('Department already exists!');
        return;
      }
      
      const updatedDepartments = [...departments, newDepartment.trim()];
      setDepartments(updatedDepartments);
      
      // Save to localStorage
      localStorage.setItem('systemDepartments', JSON.stringify(updatedDepartments));
      
      setNewDepartment('');
      setShowDepartmentModal(false);
      
      // Department added successfully
    } catch (error) {
      console.error('Error adding department:', error);
    }
  };

  const handleEditDepartment = async () => {
    if (!editingDepartment.trim()) return;
    
    try {
      // Find the original department name being edited
      const originalDepartment = departments.find(dept => dept !== editingDepartment);
      if (!originalDepartment) {
        alert('Department not found!');
        return;
      }
      
      // Check if new name already exists
      if (departments.includes(editingDepartment.trim()) && editingDepartment.trim() !== originalDepartment) {
        alert('Department name already exists!');
        return;
      }
      
      const updatedDepartments = departments.map(dept => 
        dept === originalDepartment ? editingDepartment.trim() : dept
      );
      setDepartments(updatedDepartments);
      
      // Save to localStorage
      localStorage.setItem('systemDepartments', JSON.stringify(updatedDepartments));
      
      setEditingDepartment('');
      setIsEditingDepartment(false);
      setShowDepartmentModal(false);
      
      // Department updated successfully
    } catch (error) {
      console.error('Error updating department:', error);
    }
  };

  const handleDeleteDepartment = async (department: string) => {
    if (!confirm(`Are you sure you want to delete the department "${department}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const updatedDepartments = departments.filter(dept => dept !== department);
      setDepartments(updatedDepartments);
      
      // Save to localStorage
      localStorage.setItem('systemDepartments', JSON.stringify(updatedDepartments));
      
      // Department deleted successfully
    } catch (error) {
      console.error('Error deleting department:', error);
    }
  };

  const openDepartmentModal = (department?: string) => {
    if (department) {
      setEditingDepartment(department);
      setIsEditingDepartment(true);
    } else {
      setNewDepartment('');
      setIsEditingDepartment(false);
    }
    setShowDepartmentModal(true);
  };

  useEffect(() => {
    if (activeTab === 'dropdowns') {
      fetchDropdownOptions();
    }
    if (activeTab === 'departments') {
      fetchDepartments();
    }
    if (activeTab === 'commission-rates') {
      fetchCommissionRates();
    }
  }, [activeTab]);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: '1',
      ctrlKey: true,
      action: () => setActiveTab('general')
    },
    {
      key: '2',
      ctrlKey: true,
      action: () => setActiveTab('dropdowns')
    },
    {
      key: '3',
      ctrlKey: true,
      action: () => setActiveTab('departments')
    },
    {
      key: '4',
      ctrlKey: true,
      action: () => setActiveTab('admin')
    },
    {
      key: '5',
      ctrlKey: true,
      action: () => setActiveTab('notifications')
    },
    {
      key: '6',
      ctrlKey: true,
      action: () => setActiveTab('integrations')
    },
    {
      key: '7',
      ctrlKey: true,
      action: () => setActiveTab('translations')
    }
  ]);

  const handleLanguageChange = async (language: string) => {
    try {
      await setLanguage(language as any);
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  };

  // Function to update URL when navigating to monitor view
  const navigateToMonitor = () => {
    setShowSystemMonitor(true);
    // Update URL to reflect the monitor view
    const url = new URL(window.location.href);
    url.searchParams.set('tab', 'admin');
    url.searchParams.set('view', 'monitor');
    window.history.pushState({}, '', url.toString());
  };

  const navigateBackToAdmin = () => {
    setShowSystemMonitor(false);
    // Update URL to remove monitor view
    const url = new URL(window.location.href);
    url.searchParams.set('tab', 'admin');
    url.searchParams.delete('view');
    window.history.pushState({}, '', url.toString());
  };

  // Dropdown management functions
  const handleAddOption = async () => {
    // Validate form data before sending
    if (!formData.field_name) {
      showUniqueError('dropdown-validation', 'Validation Error', 'Please select a field type');
      return;
    }

    // Check if this is a protected field and validate security code
    const fieldType = fieldTypes.find(f => f.value === formData.field_name);
    if (fieldType?.isProtected) {
      if (!securityCode.trim()) {
        showUniqueError('security-code-required', 'Security Required', 'Security code is required for adding protected options');
        return;
      }
      if (securityCode.trim() !== '4561') {
        showUniqueError('invalid-security-code', 'Invalid Code', 'Invalid security code');
        return;
      }
    }

    if (!formData.value.trim()) {
      showUniqueError('option-value-required', 'Validation Error', 'Option value is required');
      return;
    }

    // Check for duplicate values
    const currentOptions = dropdownOptions[formData.field_name] || [];
    const duplicateOption = currentOptions.find(option => 
      option.value === formData.value.trim()
    );
    
    if (duplicateOption) {
      showUniqueError('duplicate-option', 'Duplicate Option', `An option with the value "${formData.value.trim()}" already exists for ${fieldType?.label || formData.field_name} field`);
      return;
    }

    // For PSP options, validate commission rate
    if (formData.field_name === 'psp') {
      if (!formData.commission_rate || formData.commission_rate.trim() === '') {
        showUniqueError('commission-required', 'Commission Required', 'Commission rate is required for PSP options');
        return;
      }

      const commissionRate = parseFloat(formData.commission_rate);
      if (isNaN(commissionRate)) {
        showUniqueError('invalid-commission', 'Invalid Commission', 'Commission rate must be a valid number');
        return;
      }

      if (commissionRate < 0 || commissionRate > 1) {
        showUniqueError('commission-range', 'Invalid Range', 'Commission rate must be between 0 and 1 (e.g., 0.05 for 5%)');
        return;
      }
    }

    try {
      // The API client automatically handles CSRF tokens
      const response = await api.post(
        '/api/v1/transactions/dropdown-options',
        {
          field_name: formData.field_name,
          value: formData.value.trim(),
          commission_rate: formData.commission_rate && formData.commission_rate.trim() ? formData.commission_rate.trim() : null,
        }
      );
      
      if (response.ok) {
        setShowAddModal(false);
        setFormData({ field_name: '', value: '', commission_rate: '' });
        setSecurityCode('');
        await fetchDropdownOptions();
        showUniqueSuccess('option-added', 'Success', 'Option added successfully!');
      } else {
        console.error('Add failed - response status:', response.status);
        
        // Handle error response directly without parseResponse
        let errorMessage = 'Failed to add option';
        try {
          const errorText = await response.text();
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
        }
        
        console.error('Add failed - error message:', errorMessage);
        showUniqueError('add-option-failed', 'Add Failed', errorMessage);
      }
    } catch (error) {
      console.error('Error adding option:', error);
      showUniqueError('add-option-error', 'Error', 'Failed to add option. Please try again.');
    }
  };

  const handleEditOption = async () => {
    if (!editingOption) return;

    // Check if this is a protected field and validate security code
    const fieldType = fieldTypes.find(f => f.value === formData.field_name);
    if (fieldType?.isProtected) {
      if (!securityCode.trim()) {
        alert('Security code is required for editing protected options');
        return;
      }
      if (securityCode.trim() !== '4561') {
        alert('Invalid security code');
        return;
      }
    }

    // Check for duplicate values (excluding current option)
    const currentOptions = dropdownOptions[formData.field_name] || [];
    // Debug logging removed for production
    
    const duplicateOption = currentOptions.find(option => 
      option.value === formData.value.trim() && option.id !== editingOption.id
    );
    
    if (duplicateOption) {
      // Duplicate option found
      alert(`An option with the value "${formData.value.trim()}" already exists for ${fieldType?.label || formData.field_name} field`);
      return;
    }

    // Validate form data before sending
    if (!formData.value.trim()) {
      showUniqueError('option-value-required', 'Validation Error', 'Option value is required');
      return;
    }

    // For PSP options, validate commission rate
    if (formData.field_name === 'psp') {
      if (!formData.commission_rate || formData.commission_rate.trim() === '') {
        showUniqueError('commission-required', 'Commission Required', 'Commission rate is required for PSP options');
        return;
      }

      const commissionRate = parseFloat(formData.commission_rate);
      if (isNaN(commissionRate)) {
        showUniqueError('invalid-commission', 'Invalid Commission', 'Commission rate must be a valid number');
        return;
      }

      if (commissionRate < 0 || commissionRate > 1) {
        showUniqueError('commission-range', 'Invalid Range', 'Commission rate must be between 0 and 1 (e.g., 0.05 for 5%)');
        return;
      }
    }

    try {
      const response = await api.put(
        `/api/v1/transactions/dropdown-options/${editingOption.id}`,
        {
          value: formData.value.trim(),
          commission_rate: formData.commission_rate && formData.commission_rate.trim() ? formData.commission_rate.trim() : null,
        }
      );
      
      if (response.ok) {
        setShowEditModal(false);
        setEditingOption(null);
        setFormData({ field_name: '', value: '', commission_rate: '' });
        setSecurityCode('');
        await fetchDropdownOptions();
        showUniqueSuccess('option-updated', 'Success', 'Option updated successfully!');
      } else {
        console.error('Update failed - response status:', response.status);
        console.error('Update failed - response:', response);
        
        // Handle error response directly without parseResponse
        let errorMessage = 'Failed to update option';
        try {
          const errorText = await response.text();
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
        }
        
        console.error('Update failed - error message:', errorMessage);
        showUniqueError('update-option-failed', 'Update Failed', errorMessage);
      }
    } catch (error) {
      console.error('Error updating option:', error);
      // Check if it's a parsed error with a specific message
      const errorMessage = error instanceof Error ? error.message : 'Failed to update option. Please try again.';
      alert(errorMessage);
    }
  };

  const handleDeleteOption = async (option: DropdownOption, fieldName: string) => {
    // Check if this is a protected field (PSP or Company)
    const fieldType = fieldTypes.find(f => f.value === fieldName);
    const isProtected = fieldType?.isProtected || false;
    
    if (isProtected) {
      // Enhanced confirmation for protected fields
      const confirmMessage = t('settings.delete_protected_warning', { field: fieldType?.label || 'Unknown' });
      
      const userInput = prompt(confirmMessage);
      if (userInput !== 'DELETE') {
        alert(t('settings.must_type_delete'));
        return;
      }
      
      // Second confirmation for critical options
      const finalConfirm = confirm(t('settings.final_delete_warning', { 
        option: option.value, 
        field: fieldType?.label || 'Unknown'
      }));
      
      if (!finalConfirm) {
        alert(t('settings.deletion_cancelled'));
        return;
      }
    } else {
      // Standard confirmation for non-protected fields
      if (!confirm('Are you sure you want to delete this option?')) return;
    }

    try {
      const response = await api.delete(
        `/api/v1/transactions/dropdown-options/${option.id}`
      );
      if (response.ok) {
        await fetchDropdownOptions();
        showUniqueSuccess('option-deleted', 'Success', 'Option deleted successfully!');
      } else {
        console.error('Delete failed - response status:', response.status);
        
        // Handle error response directly without parseResponse
        let errorMessage = 'Failed to delete option';
        try {
          const errorText = await response.text();
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
        }
        
        showUniqueError('update-option-failed', 'Update Failed', errorMessage);
      }
    } catch (error) {
      console.error('Error deleting option:', error);
      showUniqueError('delete-option-error', 'Error', 'Failed to delete option. Please try again.');
    }
  };

  const openEditModal = (option: DropdownOption, fieldName: string) => {
    setEditingOption(option);
    setFormData({
      field_name: fieldName,
      value: option.value,
      commission_rate: option.commission_rate?.toString() || '',
    });
    setSecurityCode(''); // Clear security code when opening modal
    setShowEditModal(true);
  };

  // Commission rates management functions
  const fetchCommissionRates = async () => {
    setLoadingCommissionRates(true);
    try {
      const response = await api.get('/api/v1/commission-rates');
      if (response.ok) {
        const data = await api.parseResponse(response);
        setCommissionRates(data.rates || []);
      } else {
        console.error('Failed to fetch commission rates');
      }
    } catch (error) {
      console.error('Error fetching commission rates:', error);
    } finally {
      setLoadingCommissionRates(false);
    }
  };

  const handleAddCommissionRate = async () => {
    if (!commissionRateForm.psp_name || !commissionRateForm.commission_rate || !commissionRateForm.effective_from) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const response = await api.post('/api/v1/commission-rates', {
        psp_name: commissionRateForm.psp_name,
        commission_rate: parseFloat(commissionRateForm.commission_rate) / 100, // Convert percentage to decimal
        effective_from: commissionRateForm.effective_from,
        effective_until: commissionRateForm.effective_until || null,
      });

      if (response.ok) {
        await fetchCommissionRates();
        setShowCommissionRateModal(false);
        setCommissionRateForm({
          psp_name: '',
          commission_rate: '',
          effective_from: '',
          effective_until: '',
        });
        alert('Commission rate added successfully!');
      } else {
        const errorData = await api.parseResponse(response);
        alert(`Failed to add commission rate: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error adding commission rate:', error);
      alert('Failed to add commission rate. Please try again.');
    }
  };

  const handleEditCommissionRate = async () => {
    if (!editingCommissionRate) return;

    try {
      const response = await api.put(`/api/v1/commission-rates/${editingCommissionRate.id}`, {
        commission_rate: parseFloat(commissionRateForm.commission_rate) / 100,
        effective_from: commissionRateForm.effective_from,
        effective_until: commissionRateForm.effective_until || null,
      });

      if (response.ok) {
        await fetchCommissionRates();
        setShowCommissionRateModal(false);
        setEditingCommissionRate(null);
        setCommissionRateForm({
          psp_name: '',
          commission_rate: '',
          effective_from: '',
          effective_until: '',
        });
        alert('Commission rate updated successfully!');
      } else {
        const errorData = await api.parseResponse(response);
        alert(`Failed to update commission rate: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating commission rate:', error);
      alert('Failed to update commission rate. Please try again.');
    }
  };

  const handleDeleteCommissionRate = async (rateId: number) => {
    if (!confirm('Are you sure you want to delete this commission rate? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await api.delete(`/api/v1/commission-rates/${rateId}`);
      if (response.ok) {
        await fetchCommissionRates();
        alert('Commission rate deleted successfully!');
      } else {
        const errorData = await api.parseResponse(response);
        alert(`Failed to delete commission rate: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting commission rate:', error);
      alert('Failed to delete commission rate. Please try again.');
    }
  };

  const openCommissionRateModal = (rate: any = null) => {
    if (rate) {
      setEditingCommissionRate(rate);
      setCommissionRateForm({
        psp_name: rate.psp_name,
        commission_rate: (rate.commission_rate * 100).toString(),
        effective_from: rate.effective_from,
        effective_until: rate.effective_until || '',
      });
    } else {
      setEditingCommissionRate(null);
      setCommissionRateForm({
        psp_name: '',
        commission_rate: '',
        effective_from: '',
        effective_until: '',
      });
    }
    setShowCommissionRateModal(true);
  };

  const tabs = [
    {
      id: 'general',
      label: t('settings.general'),
      icon: SettingsIcon,
      content: (
        <div className="space-y-6">
          {/* Company Information */}
          <UnifiedCard variant="elevated" className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gray-100 rounded-full -translate-y-16 translate-x-16"></div>
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-gray-700 to-gray-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Building className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-gray-900">
                    Company Information
                  </CardTitle>
                  <CardDescription className="text-gray-600 font-medium">Order Invest & PipLine Collaboration</CardDescription>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Company Name
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-900">Order Invest</span>
                    <span className="text-gray-500">×</span>
                    <span className="text-lg font-bold text-gray-600">PipLine</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Strategic Financial Technology Partnership</p>
                </div>
                
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Contact Email
                  </label>
                  <Input
                    type="email"
                    placeholder="contact@orderinvest.com"
                  />
                </div>
              </div>
              
              <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center mt-0.5">
                    <span className="text-gray-600 text-xs font-bold">ℹ</span>
                  </div>
                  <div className="text-sm text-gray-800">
                    <p className="font-medium mb-1">Partnership Overview</p>
                    <p className="text-xs leading-relaxed">
                      Order Invest provides strategic financial insights while PipLine delivers cutting-edge technology solutions. 
                      This collaboration creates a powerful platform for modern financial management and investment tracking.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </UnifiedCard>

          {/* System Preferences */}
          <UnifiedCard variant="elevated" className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100 rounded-full -translate-y-16 translate-x-16"></div>
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-600 to-green-700 rounded-xl flex items-center justify-center shadow-lg">
                  <Globe className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-gray-900">
                    System Preferences
                  </CardTitle>
                  <CardDescription className="text-gray-600 font-medium">Configure your system settings and preferences</CardDescription>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg p-4 border border-emerald-200">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Timezone
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors duration-200">
                    <option>Europe/Istanbul (UTC+3)</option>
                    <option>UTC</option>
                    <option>Europe/London (UTC+0)</option>
                    <option>America/New_York (UTC-5)</option>
                    <option>Asia/Dubai (UTC+4)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Default: Europe/Istanbul</p>
                </div>
                
                <div className="bg-white rounded-lg p-4 border border-emerald-200">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Language
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors duration-200"
                    value={safeCurrentLanguage}
                    onChange={e => handleLanguageChange(e.target.value)}
                  >
                    {Object.entries(safeSupportedLanguages).map(([code, lang]) => (
                      <option key={code} value={code}>
                        {lang.flag} {lang.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Primary: Türkçe</p>
                </div>
              </div>
              
              <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center mt-0.5">
                    <span className="text-emerald-600 text-xs font-bold">₺</span>
                  </div>
                  <div className="text-sm text-emerald-800">
                    <p className="font-medium mb-1">Currency Standard</p>
                    <p className="text-xs leading-relaxed">
                      All financial transactions and calculations are standardized in Turkish Lira (₺) for consistency 
                      across the Order Invest & PipLine platform.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </UnifiedCard>

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <UnifiedButton
              variant="primary"
              size="lg"
              icon={<SettingsIcon className="h-5 w-5" />}
              iconPosition="left"
              className="px-8 py-3 font-semibold shadow-lg hover:shadow-lg"
            >
              Save Configuration Changes
            </UnifiedButton>
          </div>
        </div>
      ),
    },
    {
      id: 'dropdowns',
      label: t('settings.dropdown_management'),
      icon: List,
      content: (
        <div className="space-y-6">
          {/* Professional Header */}
          <UnifiedCard variant="elevated" className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gray-100 rounded-full -translate-y-16 translate-x-16"></div>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-gray-700 to-gray-600 rounded-xl flex items-center justify-center shadow-lg">
                    <List className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold text-gray-900">
                      Dropdown Management
                    </CardTitle>
                    <CardDescription className="text-gray-600 font-medium">
                      Enterprise-grade configuration management for transaction systems
                    </CardDescription>
                  </div>
                </div>
                <UnifiedButton
                  variant="primary"
                  size="lg"
                  onClick={() => {
                    setSecurityCode(''); // Clear security code when opening modal
                    setShowAddModal(true);
                  }}
                  icon={<Plus className="h-5 w-5" />}
                  iconPosition="left"
                  className="px-6 py-3 font-semibold shadow-lg hover:shadow-lg"
                >
                  Add New Option
                </UnifiedButton>
              </div>
            </CardContent>
          </UnifiedCard>

          {/* Statistics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <UnifiedCard variant="outlined" className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-gray-100 rounded-full -translate-y-8 translate-x-8"></div>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <span className="text-gray-600 font-bold text-lg">₺</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Currency Options</p>
                    <p className="text-xl font-bold text-gray-900">
                      {dropdownOptions['currency']?.length || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </UnifiedCard>
            
            <UnifiedCard variant="outlined" className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-100 rounded-full -translate-y-8 translate-x-8"></div>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <span className="text-emerald-600 font-bold text-lg">💳</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Payment Methods</p>
                    <p className="text-xl font-bold text-gray-900">
                      {dropdownOptions['payment_method']?.length || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </UnifiedCard>
            
            <UnifiedCard variant="outlined" className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-purple-100 rounded-full -translate-y-8 translate-x-8"></div>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <span className="text-purple-600 font-bold text-lg">🏢</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">PSP/KASA</p>
                    <p className="text-xl font-bold text-gray-900">
                      {dropdownOptions['psp']?.length || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </UnifiedCard>
            
            <UnifiedCard variant="outlined" className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-orange-100 rounded-full -translate-y-8 translate-x-8"></div>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <span className="text-orange-600 font-bold text-lg">📊</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Total Options</p>
                    <p className="text-xl font-bold text-gray-900">
                      {Object.values(dropdownOptions).reduce((acc, curr) => acc + (curr?.length || 0), 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </UnifiedCard>
          </div>

          {/* Main Content */}
          {loadingOptions ? (
            <UnifiedCard variant="outlined" className="p-8">
              <CardContent className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto mb-4"></div>
                <p className="text-gray-600 font-medium">Loading configuration data...</p>
                <p className="text-sm text-gray-500 mt-1">Please wait while we retrieve your settings</p>
              </CardContent>
            </UnifiedCard>
          ) : (
            <UnifiedCard variant="outlined" className="overflow-hidden">
              {/* Table Header */}
              <CardHeader className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    Configuration Categories
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {Object.values(dropdownOptions).reduce((acc, curr) => acc + (curr?.length || 0), 0)} Total Items
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              {/* Configuration Categories */}
              <CardContent className="p-0">
                <div className="divide-y divide-gray-100">
                  {fieldTypes.map(fieldType => (
                    <div key={fieldType.value} className="p-6 hover:bg-gray-50 transition-colors duration-200">
                    <div className='flex items-center justify-between mb-4'>
                      <div className='flex items-center gap-4'>
                        <div className='w-12 h-12 bg-gradient-to-br from-gray-600 to-gray-600 rounded-lg flex items-center justify-center shadow-sm'>
                          <List className='h-6 w-6 text-white' />
                        </div>
                        <div>
                          <div className='flex items-center gap-2'>
                            <h5 className='text-lg font-bold text-gray-900'>
                              {fieldType.label}
                            </h5>
                            {fieldType.isProtected && (
                              <div className='flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium'>
                                <Shield className='h-3 w-3' />
                                {t('settings.protected')}
                              </div>
                            )}
                          </div>
                          <div className='flex items-center gap-3 mt-1'>
                            <span className='text-sm text-gray-600'>
                              {fieldType.isStatic 
                                ? `${fieldType.staticValues?.length || 0} fixed options`
                                : `${dropdownOptions[fieldType.value]?.length || 0} options configured`
                              }
                            </span>
                            {fieldType.isStatic && (
                              <span className='inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800'>
                                Fixed Values
                              </span>
                            )}
                            {fieldType.isProtected && !fieldType.isStatic && (
                              <span className='inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800'>
                                <Shield className='h-3 w-3 mr-1' />
                                {t('settings.protected')}
                              </span>
                            )}
                            {fieldType.requiresCommission && (
                              <span className='inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800'>
                                Commission Required
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {!fieldType.isStatic && (
                        <UnifiedButton
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, field_name: fieldType.value }));
                            setShowAddModal(true);
                          }}
                          icon={<Plus className="h-4 w-4" />}
                          iconPosition="left"
                        >
                          Add {fieldType.label}
                        </UnifiedButton>
                      )}
                    </div>

                    {fieldType.isStatic ? (
                      /* Static fields - show fixed values */
                      <div className='bg-gray-50 rounded-lg p-4'>
                        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'>
                          {fieldType.staticValues?.map((value, index) => (
                            <div
                              key={index}
                              className='bg-white rounded-lg p-3 border border-gray-200 shadow-sm'
                            >
                              <div className='flex items-center justify-between'>
                                <div className='flex-1'>
                                  <div className='flex items-center gap-2 mb-1'>
                                    <span className='font-semibold text-gray-900 text-sm'>
                                      {value}
                                    </span>
                                    <span className='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800'>
                                      Fixed
                                    </span>
                                  </div>
                                  <p className='text-xs text-gray-500'>
                                    Static value - cannot be modified
                                  </p>
                                </div>
                                <div className='flex items-center gap-1'>
                                  <Lock className='h-4 w-4 text-gray-400' />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : dropdownOptions[fieldType.value]?.length > 0 ? (
                      /* Dynamic fields - show manageable options */
                      <div className='bg-gray-50 rounded-lg p-4'>
                        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'>
                          {dropdownOptions[fieldType.value].map(option => (
                            <div
                              key={option.id}
                              className='bg-white rounded-lg p-3 border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all duration-200'
                            >
                              <div className='flex items-center justify-between'>
                                <div className='flex-1'>
                                  <div className='flex items-center gap-2 mb-1'>
                                    <span className='font-semibold text-gray-900 text-sm'>
                                      {option.value}
                                    </span>
                                    {option.value.toUpperCase() === 'TETHER' ? (
                                      <span className='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800'>
                                        Internal KASA
                                      </span>
                                    ) : option.commission_rate && option.commission_rate !== null ? (
                                      <span className='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800'>
                                        {(parseFloat(option.commission_rate.toString()) * 100).toFixed(1)}%
                                      </span>
                                    ) : null}
                                    {fieldType.isProtected && (
                                      <span className='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800'>
                                        <Shield className='h-3 w-3 mr-1' />
                                        {t('settings.protected')}
                                      </span>
                                    )}
                                  </div>
                                  <p className='text-xs text-gray-500'>
                                    ID: {option.id} • Created: {option.created_at ? new Date(option.created_at).toLocaleDateString() : 'N/A'}
                                  </p>
                                </div>
                                <div className='flex items-center gap-1'>
                                  <button
                                    onClick={() => openEditModal(option, fieldType.value)}
                                    className='p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded transition-colors duration-200'
                                    title='Edit option'
                                  >
                                    <Edit className='h-4 w-4' />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteOption(option, fieldType.value)}
                                    className={`p-1.5 rounded transition-colors duration-200 ${
                                      fieldType.isProtected 
                                        ? 'text-red-400 hover:text-red-600 hover:bg-red-50' 
                                        : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                                    }`}
                                    title={fieldType.isProtected ? t('settings.protected_option_warning') : 'Delete option'}
                                  >
                                    <Trash2 className='h-4 w-4' />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className='text-center py-8 bg-gray-50 rounded-lg'>
                        <div className='w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3'>
                          <List className='h-8 w-8 text-gray-400' />
                        </div>
                        <h6 className='text-gray-600 font-medium mb-1'>No {fieldType.label} configured</h6>
                        <p className='text-sm text-gray-500 mb-3'>
                          Start building your {fieldType.label.toLowerCase()} configuration
                        </p>
                        <button
                          onClick={() => setShowAddModal(true)}
                          className='inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200 font-medium text-sm'
                        >
                          <Plus className='h-4 w-4' />
                          Add First {fieldType.label}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                </div>
              </CardContent>
            </UnifiedCard>
          )}
        </div>
      ),
    },
    {
      id: 'departments',
      label: t('settings.departments'),
      icon: Building,
      content: (
        <div className="space-y-6">
          {/* Professional Header */}
          <UnifiedCard variant="elevated" className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gray-100 rounded-full -translate-y-16 translate-x-16"></div>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-gray-700 to-gray-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Building className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold text-gray-900">
                      Department Management
                    </CardTitle>
                    <CardDescription className="text-gray-600 font-medium">
                      Organizational structure management for Order Invest & PipLine operations
                    </CardDescription>
                  </div>
                </div>
                <UnifiedButton
                  variant="primary"
                  size="lg"
                  onClick={() => openDepartmentModal()}
                  icon={<Plus className="h-5 w-5" />}
                  iconPosition="left"
                  className="px-6 py-3 font-semibold shadow-lg hover:shadow-lg"
                >
                  Add New Department
                </UnifiedButton>
              </div>
            </CardContent>
          </UnifiedCard>

          {/* Statistics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <UnifiedCard variant="outlined" className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-gray-100 rounded-full -translate-y-8 translate-x-8"></div>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Building className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Total Departments</p>
                    <p className="text-xl font-bold text-gray-900">
                      {departments.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </UnifiedCard>
            
            <UnifiedCard variant="outlined" className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-100 rounded-full -translate-y-8 translate-x-8"></div>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <Users className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Active Teams</p>
                    <p className="text-xl font-bold text-gray-900">
                      {departments.filter(dept => ['Conversion', 'Retention', 'Marketing', 'Research', 'Operation'].includes(dept)).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </UnifiedCard>
            
            <UnifiedCard variant="outlined" className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-purple-100 rounded-full -translate-y-8 translate-x-8"></div>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Support Functions</p>
                    <p className="text-xl font-bold text-gray-900">
                      {departments.filter(dept => ['Management', 'Facility'].includes(dept)).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </UnifiedCard>
          </div>

          {/* Main Content */}
          {loadingDepartments ? (
            <UnifiedCard variant="outlined" className="p-8">
              <CardContent className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto mb-4"></div>
                <p className="text-gray-600 font-medium">Loading organizational structure...</p>
                <p className="text-sm text-gray-500 mt-1">Please wait while we retrieve your department configuration</p>
              </CardContent>
            </UnifiedCard>
          ) : (
            <UnifiedCard variant="outlined" className="overflow-hidden">
              {/* Table Header */}
              <div className='px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-50'>
                <div className='flex items-center justify-between'>
                  <h4 className='text-lg font-semibold text-gray-900'>
                    Organizational Structure
                  </h4>
                  <div className='flex items-center gap-2'>
                    <span className='text-xs text-gray-500 bg-white px-2 py-1 rounded-full border border-gray-200'>
                      {departments.length} Departments
                    </span>
                  </div>
                </div>
              </div>
              
              {departments.length === 0 ? (
                <div className='text-center py-12 px-6'>
                  <div className='w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4'>
                    <Building className='h-10 w-10 text-gray-400' />
                  </div>
                  <h3 className='text-lg font-semibold text-gray-900 mb-2'>
                    No departments configured
                  </h3>
                  <p className='text-gray-500 mb-6 max-w-md mx-auto text-sm'>
                    Start building your organizational structure to organize agents and team operations 
                    across the Order Invest & PipLine platform.
                  </p>
                  <button 
                    onClick={() => openDepartmentModal()}
                    className='inline-flex items-center px-6 py-3 border border-transparent rounded-lg text-sm font-medium text-white bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-800 hover:to-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors shadow-sm'
                  >
                    <Plus className='h-4 w-4 mr-2' />
                    Create Your First Department
                  </button>
                </div>
              ) : (
                <div className='divide-y divide-gray-100'>
                  {departments.map((department, index) => (
                    <div key={index} className='p-6 hover:bg-gray-50 transition-colors duration-200'>
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-4'>
                          <div className='w-12 h-12 bg-gradient-to-br from-gray-600 to-gray-600 rounded-lg flex items-center justify-center shadow-sm'>
                            <Building className='h-6 w-6 text-white' />
                          </div>
                          <div>
                            <h4 className='text-lg font-bold text-gray-900'>
                              {department}
                            </h4>
                            <div className='flex items-center gap-3 mt-1'>
                              <span className='text-sm text-gray-600'>
                                Department ID: {index + 1}
                              </span>
                              {['Conversion', 'Retention', 'Marketing', 'Research', 'Operation'].includes(department) && (
                                <span className='inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800'>
                                  Core Team
                                </span>
                              )}
                              {['Management', 'Facility'].includes(department) && (
                                <span className='inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800'>
                                  Support Function
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className='flex items-center gap-2'>
                          <button
                            onClick={() => openDepartmentModal(department)}
                            className='inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200 font-medium text-sm'
                            title='Edit department'
                          >
                            <Edit className='h-4 w-4' />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteDepartment(department)}
                            className='inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors duration-200 font-medium text-sm'
                            title='Delete department'
                          >
                            <Trash2 className='h-4 w-4' />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </UnifiedCard>
          )}
        </div>
      ),
    },
    {
      id: 'admin',
      label: t('settings.system_administration'),
      icon: Shield,
      content: (
        <div className='space-y-5'>
          {!showSystemMonitor ? (
            <div className='space-y-5'>
              <div className='flex items-center justify-between'>
                <div>
                  <h3 className='text-lg font-medium text-gray-900'>
                    System Administration
                  </h3>
                  <p className='text-sm text-gray-600'>
                    Manage system settings, monitoring, and administrative functions
                  </p>
                </div>
              </div>
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                <div className='p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-all duration-200 hover:border-gray-300 hover:shadow-sm'>
                  <Users className='h-7 w-7 text-gray-600 mb-2' />
                  <h4 className='font-medium text-gray-900 text-sm'>
                    {t('settings.user_management')}
                  </h4>
                  <p className='text-xs text-gray-500'>
                    {t('settings.manage_system_users')}
                  </p>
                </div>
                <div className='p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-all duration-200 hover:border-green-300 hover:shadow-sm'>
                  <Lock className='h-7 w-7 text-green-600 mb-2' />
                  <h4 className='font-medium text-gray-900 text-sm'>
                    {t('settings.permissions')}
                  </h4>
                  <p className='text-xs text-gray-500'>
                    {t('settings.configure_access_controls')}
                  </p>
                </div>
                <div 
                  className='p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-all duration-200 hover:border-purple-300 hover:shadow-md'
                  onClick={navigateToMonitor}
                >
                  <Monitor className='h-7 w-7 text-purple-600 mb-2' />
                  <h4 className='font-medium text-gray-900 text-sm'>
                    System Monitor
                  </h4>
                  <p className='text-xs text-gray-500'>
                    Real-time system performance and health monitoring
                  </p>
                </div>
                <div className='p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-all duration-200 hover:border-orange-300 hover:shadow-sm'>
                  <Database className='h-7 w-7 text-orange-600 mb-2' />
                  <h4 className='font-medium text-gray-900 text-sm'>
                    {t('settings.database')}
                  </h4>
                  <p className='text-xs text-gray-500'>
                    {t('settings.database_management')}
                  </p>
                </div>
                <div className='p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-all duration-200 hover:border-red-300 hover:shadow-sm'>
                  <Database className='h-7 w-7 text-red-600 mb-2' />
                  <h4 className='font-medium text-gray-900 text-sm'>
                    {t('settings.backup_restore')}
                  </h4>
                  <p className='text-xs text-gray-500'>
                    {t('settings.data_backup_recovery')}
                  </p>
                </div>
                <div className='p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-all duration-200 hover:border-indigo-300 hover:shadow-sm'>
                  <Shield className='h-7 w-7 text-indigo-600 mb-2' />
                  <h4 className='font-medium text-gray-900 text-sm'>
                    {t('settings.security')}
                  </h4>
                  <p className='text-xs text-gray-500'>
                    {t('settings.security_settings')}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className='space-y-4'>
              {/* Back Button */}
              <div className='flex items-center gap-4'>
                <button
                  onClick={navigateBackToAdmin}
                  className='inline-flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors duration-200'
                >
                  <span>←</span>
                  Back to Administration
                </button>
                <div className='h-6 w-px bg-gray-300'></div>
                <div className='flex items-center gap-2'>
                  <Monitor className='h-5 w-5 text-purple-600' />
                  <h3 className='text-lg font-medium text-gray-900'>System Monitor</h3>
                </div>
              </div>
              
              {/* System Monitor Component */}
              <div className='bg-white rounded-lg border border-gray-200 overflow-hidden'>
                <Suspense fallback={<LoadingSpinner />}>
                  <SystemMonitor />
                </Suspense>
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'notifications',
      label: t('settings.notifications'),
      icon: Bell,
      content: (
        <div className='space-y-6'>
          <div className='bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-6 border border-orange-100'>
            <div className='flex items-center gap-3 mb-5'>
              <div className='w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center shadow-sm'>
                <Bell className='h-5 w-5 text-white' />
              </div>
              <div>
                <h3 className='text-lg font-bold text-gray-900'>
                  Notification Settings
                </h3>
                <p className='text-sm text-gray-600'>Configure how you receive notifications and alerts</p>
              </div>
            </div>
            <div className='space-y-4'>
              <div className='bg-white rounded-lg p-5 border border-orange-200'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-3'>
                    <div className='w-8 h-8 bg-gradient-to-br from-gray-500 to-gray-600 rounded-lg flex items-center justify-center'>
                      <Mail className='h-4 w-4 text-white' />
                    </div>
                    <div>
                      <h4 className='font-semibold text-gray-900 text-sm'>
                        Email Notifications
                      </h4>
                      <p className='text-xs text-gray-500'>
                        Receive important updates via email
                      </p>
                    </div>
                  </div>
                  <label className='relative inline-flex items-center cursor-pointer'>
                    <input type='checkbox' className='sr-only peer' />
                    <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
                  </label>
                </div>
              </div>
              
              <div className='bg-white rounded-lg p-5 border border-orange-200'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-3'>
                    <div className='w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center'>
                      <Phone className='h-4 w-4 text-white' />
                    </div>
                    <div>
                      <h4 className='font-semibold text-gray-900 text-sm'>
                        SMS Notifications
                      </h4>
                      <p className='text-xs text-gray-500'>
                        Get urgent alerts via text message
                      </p>
                    </div>
                  </div>
                  <label className='relative inline-flex items-center cursor-pointer'>
                    <input type='checkbox' className='sr-only peer' />
                    <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
                  </label>
                </div>
              </div>
              
              <div className='bg-white rounded-lg p-5 border border-orange-200'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-3'>
                    <div className='w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center'>
                      <Bell className='h-4 w-4 text-white' />
                    </div>
                    <div>
                      <h4 className='font-semibold text-gray-900 text-sm'>
                        Push Notifications
                      </h4>
                      <p className='text-xs text-gray-500'>
                        Receive real-time browser notifications
                      </p>
                    </div>
                  </div>
                  <label className='relative inline-flex items-center cursor-pointer'>
                    <input type='checkbox' className='sr-only peer' />
                    <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'integrations',
      label: t('settings.integrations'),
      icon: Globe,
      content: (
        <div className='space-y-6'>
          {/* Professional Header */}
          <div className='bg-gradient-to-r from-gray-50 to-gray-50 rounded-xl p-6 border border-gray-200'>
            <div className='flex items-center gap-4'>
              <div className='w-12 h-12 bg-gradient-to-br from-gray-700 to-gray-600 rounded-xl flex items-center justify-center shadow-lg'>
                <Globe className='h-6 w-6 text-white' />
              </div>
              <div>
                <h3 className='text-2xl font-bold text-gray-900'>
                  System Integrations
                </h3>
                <p className='text-gray-600 font-medium'>
                  Connect external services and APIs to enhance Order Invest & PipLine functionality
                </p>
              </div>
            </div>
          </div>

          {/* Integration Categories */}
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
            {/* API Integrations */}
            <div className='bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden'>
              <div className='px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-50'>
                <h4 className='text-lg font-semibold text-gray-900'>
                  API Integrations
                </h4>
                <p className='text-sm text-gray-600'>Connect external financial data sources</p>
              </div>
              <div className='p-6 space-y-4'>
                <div className='p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-3'>
                      <div className='w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center'>
                        <TrendingUp className='h-5 w-5 text-gray-600' />
                      </div>
                      <div>
                        <h5 className='font-semibold text-gray-900 text-sm'>
                          Exchange Rate APIs
                        </h5>
                        <p className='text-xs text-gray-500'>
                          Real-time currency conversion data
                        </p>
                      </div>
                    </div>
                    <div className='flex items-center gap-2'>
                      <span className='inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800'>
                        Active
                      </span>
                      <button className='px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200 text-xs font-medium'>
                        Configure
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className='p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-3'>
                      <div className='w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center'>
                        <Building className='h-5 w-5 text-emerald-600' />
                      </div>
                      <div>
                        <h5 className='font-semibold text-gray-900 text-sm'>
                          Banking APIs
                        </h5>
                        <p className='text-xs text-gray-500'>
                          Account balance and transaction sync
                        </p>
                      </div>
                    </div>
                    <div className='flex items-center gap-2'>
                      <span className='inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800'>
                        Pending
                      </span>
                      <button className='px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200 text-xs font-medium'>
                        Setup
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className='p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-3'>
                      <div className='w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center'>
                        <BarChart3 className='h-5 w-5 text-purple-600' />
                      </div>
                      <div>
                        <h5 className='font-semibold text-gray-900 text-sm'>
                          Market Data APIs
                        </h5>
                        <p className='text-xs text-gray-500'>
                          Stock prices and market analytics
                        </p>
                      </div>
                    </div>
                    <div className='flex items-center gap-2'>
                      <span className='inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600'>
                        Inactive
                      </span>
                      <button className='px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200 text-xs font-medium'>
                        Enable
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Data Integrations */}
            <div className='bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden'>
              <div className='px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-emerald-50'>
                <h4 className='text-lg font-semibold text-gray-900'>
                  Data Integrations
                </h4>
                <p className='text-sm text-gray-600'>Import and export data from external sources</p>
              </div>
              <div className='p-6 space-y-4'>
                <div className='p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-3'>
                      <div className='w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center'>
                        <FileText className='h-5 w-5 text-orange-600' />
                      </div>
                      <div>
                        <h5 className='font-semibold text-gray-900 text-sm'>
                          Excel/CSV Import
                        </h5>
                        <p className='text-xs text-gray-500'>
                          Bulk transaction data import
                        </p>
                      </div>
                    </div>
                    <div className='flex items-center gap-2'>
                      <span className='inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800'>
                        Active
                      </span>
                      <button className='px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200 text-xs font-medium'>
                        Manage
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className='p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-3'>
                      <div className='w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center'>
                        <RefreshCw className='h-5 w-5 text-indigo-600' />
                      </div>
                      <div>
                        <h5 className='font-semibold text-gray-900 text-sm'>
                          Database Sync
                        </h5>
                        <p className='text-xs text-gray-500'>
                          Real-time data synchronization
                        </p>
                      </div>
                    </div>
                    <div className='flex items-center gap-2'>
                      <span className='inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800'>
                        Active
                      </span>
                      <button className='px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200 text-xs font-medium'>
                        Monitor
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className='p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-3'>
                      <div className='w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center'>
                        <Download className='h-5 w-5 text-red-600' />
                      </div>
                      <div>
                        <h5 className='font-semibold text-gray-900 text-sm'>
                          Report Export
                        </h5>
                        <p className='text-xs text-gray-500'>
                          Automated report generation
                        </p>
                      </div>
                    </div>
                    <div className='flex items-center gap-2'>
                      <span className='inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800'>
                        Active
                      </span>
                      <button className='px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200 text-xs font-medium'>
                        Configure
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Integration Status Overview */}
          <div className='bg-white rounded-xl shadow-sm border border-gray-200 p-6'>
            <h4 className='text-lg font-semibold text-gray-900 mb-4'>
              Integration Health Status
            </h4>
            <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
              <div className='text-center p-4 bg-green-50 rounded-lg border border-green-200'>
                <div className='w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2'>
                  <CheckCircle className='h-5 w-5 text-green-600' />
                </div>
                <p className='text-sm font-medium text-green-800'>Active</p>
                <p className='text-xs text-green-600'>4 Integrations</p>
              </div>
              
              <div className='text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200'>
                <div className='w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2'>
                  <Clock className='h-5 w-5 text-yellow-600' />
                </div>
                <p className='text-sm font-medium text-yellow-800'>Pending</p>
                <p className='text-xs text-yellow-600'>1 Integration</p>
              </div>
              
              <div className='text-center p-4 bg-gray-50 rounded-lg border border-gray-200'>
                <div className='w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2'>
                  <Circle className='h-5 w-5 text-gray-600' />
                </div>
                <p className='text-sm font-medium text-gray-800'>Inactive</p>
                <p className='text-xs text-gray-600'>1 Integration</p>
              </div>
              
              <div className='text-center p-4 bg-gray-50 rounded-lg border border-gray-200'>
                <div className='w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2'>
                  <BarChart3 className='h-5 w-5 text-gray-600' />
                </div>
                <p className='text-sm font-medium text-gray-800'>Total</p>
                <p className='text-xs text-gray-600'>6 Integrations</p>
              </div>
            </div>
          </div>

          {/* Integration Actions */}
          <div className='bg-gradient-to-r from-gray-50 to-gray-50 rounded-xl p-6 border border-gray-200'>
            <div className='flex items-center justify-between'>
              <div>
                <h4 className='text-lg font-semibold text-gray-900 mb-2'>
                  Need More Integrations?
                </h4>
                <p className='text-sm text-gray-600'>
                  Contact our integration team to add custom APIs and services
                </p>
              </div>
              <div className='flex items-center gap-3'>
                <button className='px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200 font-medium text-sm'>
                  View Documentation
                </button>
                <button className='px-6 py-2 bg-gradient-to-r from-gray-700 to-gray-600 text-white rounded-lg hover:from-gray-800 hover:to-gray-700 transition-all duration-200 font-medium text-sm'>
                  Request Integration
                </button>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'commission-rates',
      label: 'Commission Rates',
      icon: Percent,
      content: (
        <div className="space-y-6">
          {/* Commission Rates Management */}
          <UnifiedCard variant="elevated" className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 rounded-full -translate-y-16 translate-x-16"></div>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Percent className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-900">
                      PSP Commission Rates
                    </CardTitle>
                    <CardDescription className="text-gray-600 font-medium">
                      Manage time-based commission rates for PSPs
                    </CardDescription>
                  </div>
                </div>
                <UnifiedButton
                  variant="primary"
                  size="sm"
                  onClick={() => openCommissionRateModal()}
                  icon={<Plus className="h-4 w-4" />}
                  iconPosition="left"
                >
                  Add Rate
                </UnifiedButton>
              </div>

              {/* Commission Rates Table */}
              <div className="space-y-4">
                {loadingCommissionRates ? (
                  <div className="flex items-center justify-center py-8">
                    <LoadingSpinner size="md" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">PSP</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Rate</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Effective From</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Effective Until</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                          <th className="text-right py-3 px-4 font-semibold text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {commissionRates.map((rate) => (
                          <tr key={rate.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <div className="font-medium text-gray-900">{rate.psp_name}</div>
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                {(rate.commission_rate * 100).toFixed(1)}%
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-gray-600">
                              {new Date(rate.effective_from).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4 text-gray-600">
                              {rate.effective_until ? new Date(rate.effective_until).toLocaleDateString() : 'Current'}
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant={rate.is_active ? "default" : "secondary"}>
                                {rate.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openCommissionRateModal(rate)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteCommissionRate(rate.id)}
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {commissionRates.length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-gray-500">
                              No commission rates found. Click "Add Rate" to create one.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </CardContent>
          </UnifiedCard>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">

      {/* Page Header with Tabs */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <SettingsIcon className="h-8 w-8 text-gray-600" />
              Settings
            </h1>
            <p className="text-gray-600">Application settings and configuration</p>
          </div>
            <div className="flex items-center gap-3">
              <UnifiedButton
                variant="outline"
                size="sm"
                onClick={() => {
                  if (activeTab === 'dropdowns') {
                    fetchDropdownOptions();
                  } else if (activeTab === 'departments') {
                    fetchDepartments();
                  } else {
                    window.location.reload();
                  }
                }}
                icon={<RefreshCw className="h-4 w-4" />}
                iconPosition="left"
              >
                Refresh
              </UnifiedButton>
            </div>
          </div>
          
          {/* Tab Navigation */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className={`grid w-full grid-cols-8 bg-gray-50/80 border border-gray-200/60 ${getRadius('md')} shadow-sm`}>
              <TabsTrigger value="general" className="flex items-center gap-2">
                <SettingsIcon className="h-4 w-4" />
                General
              </TabsTrigger>
              <TabsTrigger value="dropdowns" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                Dropdowns
              </TabsTrigger>
              <TabsTrigger value="departments" className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                Departments
              </TabsTrigger>
              <TabsTrigger value="admin" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Admin
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="integrations" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Integrations
              </TabsTrigger>
              <TabsTrigger value="translations" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Translations
              </TabsTrigger>
              <TabsTrigger value="commission-rates" className="flex items-center gap-2">
                <Percent className="h-4 w-4" />
                Commission Rates
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

      {/* Tab Content */}
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {tabs.map(tab => (
            <TabsContent key={tab.id} value={tab.id} className={`${getSectionSpacing('lg').margin} ${getSectionSpacing('lg').padding}`}>
              {tab.content}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Add Option Modal */}
      {showAddModal && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4' onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {t('settings.add_option')}
                </h3>
                <UnifiedButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                  icon={<X className="h-4 w-4" />}
                >
                  Close
                </UnifiedButton>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('settings.field_type')}
                </label>
                <select
                  value={formData.field_name}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      field_name: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                >
                  <option value=''>Select field type...</option>
                  {fieldTypes.filter(field => !field.isStatic).map(field => (
                    <option key={field.value} value={field.value}>
                      {field.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('settings.option_value')}
                </label>
                <Input
                  type='text'
                  value={formData.value}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, value: e.target.value }))
                  }
                  placeholder='Enter option value...'
                />
              </div>
              {fieldTypes.find(f => f.value === formData.field_name)
                ?.requiresCommission && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('settings.commission_rate_required')}
                  </label>
                  <Input
                    type='number'
                    step='0.01'
                    min='0'
                    max='1'
                    value={formData.commission_rate}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        commission_rate: e.target.value,
                      }))
                    }
                    placeholder='0.025 (2.5%)'
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter as decimal (0.025 = 2.5%, 0.1 = 10%)
                  </p>
                </div>
              )}
              {fieldTypes.find(f => f.value === formData.field_name)
                ?.isProtected && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Security Code <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="password"
                    value={securityCode}
                    onChange={e => setSecurityCode(e.target.value)}
                    placeholder="Enter security code..."
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Required for adding protected options
                  </p>
                </div>
              )}
            </div>
            <div className='p-5 border-t border-gray-100 flex gap-3'>
              <UnifiedButton
                variant="outline"
                onClick={() => setShowAddModal(false)}
                className="flex-1"
              >
                Cancel
              </UnifiedButton>
              <UnifiedButton
                variant="primary"
                onClick={handleAddOption}
                disabled={
                  !formData.field_name ||
                  !formData.value ||
                  (fieldTypes.find(f => f.value === formData.field_name)
                    ?.requiresCommission &&
                    !formData.commission_rate) ||
                  (fieldTypes.find(f => f.value === formData.field_name)
                    ?.isProtected &&
                    !securityCode)
                }
                className="flex-1"
              >
                {t('settings.add_option')}
              </UnifiedButton>
            </div>
          </div>
        </div>
      )}

      {/* Edit Option Modal */}
      {showEditModal && editingOption && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4' onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {t('settings.edit_option')}
                </h3>
                <UnifiedButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEditModal(false)}
                  icon={<X className="h-4 w-4" />}
                >
                  Close
                </UnifiedButton>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('settings.field_type')}
                </label>
                <Input
                  type="text"
                  value={
                    fieldTypes.find(f => f.value === formData.field_name)
                      ?.label || formData.field_name
                  }
                  className="bg-gray-50"
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('settings.option_value')}
                </label>
                <Input
                  type="text"
                  value={formData.value}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, value: e.target.value }))
                  }
                  placeholder="Enter option value..."
                />
              </div>
              {fieldTypes.find(f => f.value === formData.field_name)
                ?.requiresCommission && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('settings.commission_rate_required')}
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={formData.commission_rate}
                    onChange={e =>
                      setFormData(prev => ({
                        ...prev,
                        commission_rate: e.target.value,
                      }))
                    }
                    placeholder="0.025 (2.5%)"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter as decimal (0.025 = 2.5%, 0.1 = 10%)
                  </p>
                </div>
              )}
              {fieldTypes.find(f => f.value === formData.field_name)
                ?.isProtected && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Security Code <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="password"
                    value={securityCode}
                    onChange={e => setSecurityCode(e.target.value)}
                    placeholder="Enter security code..."
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Required for editing protected options
                  </p>
                </div>
              )}
            </div>
            <div className="p-5 border-t border-gray-100 flex gap-3">
              <UnifiedButton
                variant="outline"
                onClick={() => setShowEditModal(false)}
                className="flex-1"
              >
                Cancel
              </UnifiedButton>
              <UnifiedButton
                variant="primary"
                onClick={handleEditOption}
                disabled={
                  !formData.value ||
                  (fieldTypes.find(f => f.value === formData.field_name)
                    ?.requiresCommission &&
                    !formData.commission_rate) ||
                  (fieldTypes.find(f => f.value === formData.field_name)
                    ?.isProtected &&
                    !securityCode)
                }
                className="flex-1"
              >
                {t('settings.edit_option')}
              </UnifiedButton>
            </div>
          </div>
        </div>
      )}

      {/* Department Modal */}
      {showDepartmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowDepartmentModal(false)}>
          <div className="bg-white rounded-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {isEditingDepartment ? 'Edit Department' : 'Add New Department'}
                </h3>
                <UnifiedButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDepartmentModal(false)}
                  icon={<X className="h-4 w-4" />}
                >
                  Close
                </UnifiedButton>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department Name
                </label>
                <Input
                  type="text"
                  value={isEditingDepartment ? editingDepartment : newDepartment}
                  onChange={e => 
                    isEditingDepartment 
                      ? setEditingDepartment(e.target.value)
                      : setNewDepartment(e.target.value)
                  }
                  placeholder="Enter department name..."
                  autoFocus
                />
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center mt-0.5">
                    <span className="text-gray-600 text-xs font-bold">i</span>
                  </div>
                  <div className="text-sm text-gray-800">
                    <p className="font-medium mb-1">Department Management</p>
                    <p className="text-xs">
                      {isEditingDepartment 
                        ? 'Editing a department will update it across the entire system, including all existing agents assigned to this department.'
                        : 'New departments will be available immediately for assigning to agents and will appear in the department tabs.'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 flex gap-3">
              <UnifiedButton
                variant="outline"
                onClick={() => setShowDepartmentModal(false)}
                className="flex-1"
              >
                Cancel
              </UnifiedButton>
              <UnifiedButton
                variant="primary"
                onClick={isEditingDepartment ? handleEditDepartment : handleAddDepartment}
                disabled={
                  isEditingDepartment 
                    ? !editingDepartment.trim()
                    : !newDepartment.trim()
                }
                className="flex-1"
              >
                {isEditingDepartment ? 'Update Department' : 'Add Department'}
              </UnifiedButton>
            </div>
          </div>
        </div>
      )}

      {/* Commission Rate Modal */}
      {showCommissionRateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full border border-gray-200/50 animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-br from-white via-blue-50/30 to-blue-50/20 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center shadow-sm">
                    <Percent className="h-6 w-6 text-blue-700" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 tracking-tight">
                      {editingCommissionRate ? 'Edit Commission Rate' : 'Add Commission Rate'}
                    </h3>
                    <p className="text-sm text-gray-600 font-medium">
                      {editingCommissionRate ? 'Update commission rate details' : 'Set up a new time-based commission rate'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCommissionRateModal(false)}
                  className="w-10 h-10 rounded-xl bg-gray-100/80 hover:bg-gray-200/80 flex items-center justify-center transition-all duration-200 hover:scale-105"
                >
                  <X className="h-5 w-5 text-gray-600" />
                </button>
              </div>
            </div>
            
            {/* Content */}
            <div className="px-8 py-6">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    PSP Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={commissionRateForm.psp_name}
                    onChange={(e) => setCommissionRateForm(prev => ({ ...prev, psp_name: e.target.value }))}
                    className="w-full"
                    placeholder="Enter PSP name (e.g., SİPAY, KUYUMCU)"
                    disabled={!!editingCommissionRate}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    {editingCommissionRate ? 'PSP name cannot be changed' : 'Enter the PSP name for this commission rate'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Commission Rate (%) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    value={commissionRateForm.commission_rate}
                    onChange={(e) => setCommissionRateForm(prev => ({ ...prev, commission_rate: e.target.value }))}
                    className="w-full"
                    placeholder="15.0"
                    step="0.1"
                    min="0"
                    max="100"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Enter as percentage (15.0 = 15%)
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Effective From <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="date"
                      value={commissionRateForm.effective_from}
                      onChange={(e) => setCommissionRateForm(prev => ({ ...prev, effective_from: e.target.value }))}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      When this rate becomes effective
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Effective Until
                    </label>
                    <Input
                      type="date"
                      value={commissionRateForm.effective_until}
                      onChange={(e) => setCommissionRateForm(prev => ({ ...prev, effective_until: e.target.value }))}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Leave empty for current rate
                    </p>
                  </div>
                </div>

                {/* Info Box */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                      <span className="text-blue-600 text-xs font-bold">i</span>
                    </div>
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Time-Based Commission Rates</p>
                      <p className="text-xs">
                        Commission rates can change over time. The system will automatically use the correct rate based on the transaction date. 
                        When adding a new rate, any existing current rate will be automatically closed.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="px-8 py-6 border-t border-gray-100 bg-gray-50/50 rounded-b-lg">
              <div className="flex items-center gap-4">
                <UnifiedButton
                  variant="outline"
                  onClick={() => setShowCommissionRateModal(false)}
                  className="flex-1"
                >
                  Cancel
                </UnifiedButton>
                <UnifiedButton
                  variant="primary"
                  onClick={editingCommissionRate ? handleEditCommissionRate : handleAddCommissionRate}
                  disabled={
                    !commissionRateForm.psp_name ||
                    !commissionRateForm.commission_rate ||
                    !commissionRateForm.effective_from
                  }
                  className="flex-1"
                  icon={<Save className="h-4 w-4" />}
                  iconPosition="left"
                >
                  {editingCommissionRate ? 'Update Rate' : 'Add Rate'}
                </UnifiedButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
