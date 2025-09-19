import React, { useState } from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  XCircle, 
  User, 
  Settings, 
  FileText, 
  Download,
  Trash2,
  Edit,
  Eye,
  Plus,
  Save,
  X,
  ArrowRight,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { Button } from './ProfessionalButtons';
import Modal from './Modal';

// Confirmation Dialog Component
export interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'success' | 'warning' | 'error' | 'info';
  loading?: boolean;
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'warning',
  loading = false,
}: ConfirmationDialogProps) {
  const getVariantIcon = () => {
    switch (variant) {
      case 'success':
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-yellow-600" />;
      case 'error':
        return <XCircle className="w-6 h-6 text-red-600" />;
      case 'info':
        return <Info className="w-6 h-6 text-blue-600" />;
      default:
        return <AlertTriangle className="w-6 h-6 text-yellow-600" />;
    }
  };

  const getVariantButtonVariant = () => {
    switch (variant) {
      case 'success':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
        return 'danger';
      case 'info':
        return 'primary';
      default:
        return 'warning';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="sm"
      showCloseButton={false}
      closeOnBackdropClick={false}
      closeOnEscape={false}
      className="business-dialog-confirmation"
    >
      <div className="text-center">
        <div className="mb-4">
          {getVariantIcon()}
        </div>
        <h3 className="business-alert-title">{title}</h3>
        <p className="business-alert-message">{message}</p>
      </div>
      
      <div className="business-modal-footer">
        <Button
          variant="outline"
          onClick={onClose}
          disabled={loading}
        >
          {cancelText}
        </Button>
        <Button
          variant={getVariantButtonVariant()}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? (
            <>
              <div className="business-form-loading-spinner mr-2" />
              Processing...
            </>
          ) : (
            confirmText
          )}
        </Button>
      </div>
    </Modal>
  );
}

// Alert Dialog Component
export interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  variant?: 'success' | 'warning' | 'error' | 'info';
  actionText?: string;
  onAction?: () => void;
}

export function AlertDialog({
  isOpen,
  onClose,
  title,
  message,
  variant = 'info',
  actionText,
  onAction,
}: AlertDialogProps) {
  const getVariantIcon = () => {
    switch (variant) {
      case 'success':
        return <CheckCircle className="w-16 h-16 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-16 h-16 text-yellow-600" />;
      case 'error':
        return <XCircle className="w-16 h-16 text-red-600" />;
      case 'info':
        return <Info className="w-16 h-16 text-blue-600" />;
      default:
        return <Info className="w-16 h-16 text-blue-600" />;
    }
  };

  const getVariantIconClass = () => {
    switch (variant) {
      case 'success':
        return 'business-alert-icon-success';
      case 'warning':
        return 'business-alert-icon-warning';
      case 'error':
        return 'business-alert-icon-error';
      case 'info':
        return 'business-alert-icon-info';
      default:
        return 'business-alert-icon-info';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="sm"
      showCloseButton={false}
      closeOnBackdropClick={false}
      closeOnEscape={false}
      className="business-alert-dialog"
    >
      <div className="text-center">
        <div className={getVariantIconClass()}>
          {getVariantIcon()}
        </div>
        <h3 className="business-alert-title">{title}</h3>
        <p className="business-alert-message">{message}</p>
      </div>
      
      <div className="business-modal-footer">
        {actionText && onAction ? (
          <>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button variant="primary" onClick={onAction}>
              {actionText}
            </Button>
          </>
        ) : (
          <Button variant="primary" onClick={onClose}>
            OK
          </Button>
        )}
      </div>
    </Modal>
  );
}

// Form Modal Component
export interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onSubmit?: () => void;
  submitText?: string;
  cancelText?: string;
  loading?: boolean;
  submitDisabled?: boolean;
}

export function FormModal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  size = 'md',
  onSubmit,
  submitText = 'Save',
  cancelText = 'Cancel',
  loading = false,
  submitDisabled = false,
}: FormModalProps) {
  const footer = (
    <>
      <Button variant="outline" onClick={onClose} disabled={loading}>
        {cancelText}
      </Button>
      {onSubmit && (
        <Button
          variant="primary"
          onClick={onSubmit}
          disabled={loading || submitDisabled}
        >
          {loading ? (
            <>
              <div className="business-form-loading-spinner mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              {submitText}
            </>
          )}
        </Button>
      )}
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      size={size}
      footer={footer}
    >
      {children}
    </Modal>
  );
}

// Side Panel Component
export interface SidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  position?: 'left' | 'right';
}

export function SidePanel({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  position = 'right',
}: SidePanelProps) {
  const sizeClasses = {
    sm: 'business-side-panel-sm',
    md: 'business-side-panel-md',
    lg: 'business-side-panel-lg',
    xl: 'business-side-panel-xl',
  };

  const panelClasses = position === 'left' ? 'business-drawer' : 'business-side-panel';
  const panelSizeClasses = position === 'left' ? {
    sm: 'business-drawer-sm',
    md: 'business-drawer-md',
    lg: 'business-drawer-lg',
    xl: 'business-drawer-xl',
  } : sizeClasses;

  const openClass = position === 'left' ? 'business-drawer-open' : 'business-side-panel-open';
  const closedClass = position === 'left' ? 'business-drawer-closed' : 'business-side-panel-closed';

  if (!isOpen) return null;

  return (
    <>
      <div className="business-side-panel-overlay" onClick={onClose} />
      <div className={`${panelClasses} ${panelSizeClasses[size]} ${openClass}`}>
        <div className="business-modal-header">
          <h2 className="business-modal-header-title">{title}</h2>
          <button onClick={onClose} className="business-modal-close">
            <X className="business-modal-close-icon" />
          </button>
        </div>
        <div className="business-modal-body">
          {children}
        </div>
      </div>
    </>
  );
}

// Bottom Sheet Component
export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
}: BottomSheetProps) {
  const sizeClasses = {
    sm: 'business-bottom-sheet-sm',
    md: 'business-bottom-sheet-md',
    lg: 'business-bottom-sheet-lg',
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="business-bottom-sheet-overlay" onClick={onClose} />
      <div className={`business-bottom-sheet ${sizeClasses[size]} business-bottom-sheet-open`}>
        <div className="business-bottom-sheet-handle" />
        <div className="business-modal-header">
          <h2 className="business-modal-header-title">{title}</h2>
          <button onClick={onClose} className="business-modal-close">
            <X className="business-modal-close-icon" />
          </button>
        </div>
        <div className="business-modal-body">
          {children}
        </div>
      </div>
    </>
  );
}

// Demo Component to showcase all modal types
export function ModalShowcase() {
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);

  const openModal = (modalType: string) => setActiveModal(modalType);
  const closeModal = () => setActiveModal(null);

  return (
    <div className="space-business-md">
      <div className="business-card">
        <div className="business-card-header">
          <h2 className="text-xl font-semibold text-gray-900">Modal & Dialog Showcase</h2>
          <p className="text-gray-600">Professional business modal components</p>
        </div>
        <div className="business-card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button variant="outline" onClick={() => openModal('confirmation')}>
              <AlertTriangle className="w-4 h-4 mr-2" />
              Confirmation Dialog
            </Button>
            
            <Button variant="outline" onClick={() => openModal('alert-success')}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Success Alert
            </Button>
            
            <Button variant="outline" onClick={() => openModal('alert-warning')}>
              <AlertTriangle className="w-4 h-4 mr-2" />
              Warning Alert
            </Button>
            
            <Button variant="outline" onClick={() => openModal('alert-error')}>
              <XCircle className="w-4 h-4 mr-2" />
              Error Alert
            </Button>
            
            <Button variant="outline" onClick={() => openModal('form')}>
              <FileText className="w-4 h-4 mr-2" />
              Form Modal
            </Button>
            
            <Button variant="outline" onClick={() => setSidePanelOpen(true)}>
              <ChevronRight className="w-4 h-4 mr-2" />
              Side Panel
            </Button>
            
            <Button variant="outline" onClick={() => setBottomSheetOpen(true)}>
              <ChevronDown className="w-4 h-4 mr-2" />
              Bottom Sheet
            </Button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={activeModal === 'confirmation'}
        onClose={closeModal}
        onConfirm={() => {
          console.log('Confirmed!');
          closeModal();
        }}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="error"
      />

      {/* Success Alert */}
      <AlertDialog
        isOpen={activeModal === 'alert-success'}
        onClose={closeModal}
        title="Success!"
        message="Your transaction has been successfully processed and saved to the system."
        variant="success"
      />

      {/* Warning Alert */}
      <AlertDialog
        isOpen={activeModal === 'alert-warning'}
        onClose={closeModal}
        title="Warning"
        message="You have unsaved changes. Are you sure you want to leave this page?"
        variant="warning"
        actionText="Save Changes"
        onAction={() => {
          console.log('Saving changes...');
          closeModal();
        }}
      />

      {/* Error Alert */}
      <AlertDialog
        isOpen={activeModal === 'alert-error'}
        onClose={closeModal}
        title="Error"
        message="An error occurred while processing your request. Please try again or contact support."
        variant="error"
      />

      {/* Form Modal */}
      <FormModal
        isOpen={activeModal === 'form'}
        onClose={closeModal}
        title="Edit Transaction"
        subtitle="Update the transaction details below"
        size="lg"
        onSubmit={() => {
          console.log('Form submitted!');
          closeModal();
        }}
        submitText="Update Transaction"
      >
        <div className="space-business-md">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="business-form-label">Transaction ID</label>
              <input className="business-input-field" placeholder="TRX-001" />
            </div>
            <div>
              <label className="business-form-label">Amount</label>
              <input className="business-input-field" placeholder="₺0.00" />
            </div>
          </div>
          <div>
            <label className="business-form-label">Description</label>
            <textarea className="business-textarea business-textarea-md" placeholder="Enter transaction description..." />
          </div>
        </div>
      </FormModal>

      {/* Side Panel */}
      <SidePanel
        isOpen={sidePanelOpen}
        onClose={() => setSidePanelOpen(false)}
        title="Transaction Details"
        size="lg"
      >
        <div className="space-business-md">
          <div className="business-card">
            <div className="business-card-header">
              <h3 className="text-lg font-semibold text-gray-900">Transaction Information</h3>
            </div>
            <div className="business-card-body">
              <div className="space-business-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Transaction ID:</span>
                  <span className="font-medium">TRX-001</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium">₺1,250.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="business-badge business-badge-success">Completed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidePanel>

      {/* Bottom Sheet */}
      <BottomSheet
        isOpen={bottomSheetOpen}
        onClose={() => setBottomSheetOpen(false)}
        title="Quick Actions"
        size="md"
      >
        <div className="space-business-md">
          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline" className="h-20 flex-col">
              <Plus className="w-6 h-6 mb-2" />
              <span>New Transaction</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <Download className="w-6 h-6 mb-2" />
              <span>Export Data</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <Eye className="w-6 h-6 mb-2" />
              <span>View Reports</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <Settings className="w-6 h-6 mb-2" />
              <span>Settings</span>
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
