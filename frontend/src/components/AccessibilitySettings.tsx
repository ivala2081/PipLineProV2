/**
 * Professional Accessibility Settings Component
 * Clean, business-oriented accessibility controls
 */

import React, { useState } from 'react';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { 
  Settings, 
  Eye, 
  EyeOff, 
  MousePointer, 
  Keyboard, 
  Type, 
  Contrast,
  RotateCcw,
  Check,
  X
} from 'lucide-react';

interface AccessibilitySettingsProps {
  className?: string;
  compact?: boolean;
}

const AccessibilitySettings: React.FC<AccessibilitySettingsProps> = ({ 
  className = '',
  compact = false 
}) => {
  const { settings, updateSettings, resetSettings } = useAccessibility();
  const [isOpen, setIsOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleToggle = (key: keyof typeof settings) => {
    updateSettings({ [key]: !settings[key] });
  };

  const handleFontSizeChange = (size: 'small' | 'medium' | 'large') => {
    updateSettings({ fontSize: size });
  };

  const handleReset = () => {
    resetSettings();
    setShowResetConfirm(false);
    setIsOpen(false);
  };

  if (compact) {
    return (
      <div className={`accessibility-settings-compact ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="btn btn-outline"
          aria-label="Accessibility settings"
          aria-expanded={isOpen}
          aria-haspopup="menu"
        >
          <Settings className="w-4 h-4" />
        </button>

        {isOpen && (
          <div className="accessibility-dropdown">
            <div className="accessibility-dropdown-header">
              <h3>Accessibility</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="btn-close"
                aria-label="Close settings"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="accessibility-dropdown-content">
              {/* High Contrast Toggle */}
              <div className="setting-item">
                <button
                  onClick={() => handleToggle('highContrast')}
                  className={`setting-toggle ${settings.highContrast ? 'active' : ''}`}
                  aria-pressed={settings.highContrast}
                >
                  <Contrast className="w-4 h-4" />
                  <span>High Contrast</span>
                  {settings.highContrast && <Check className="w-4 h-4" />}
                </button>
              </div>

              {/* Reduced Motion Toggle */}
              <div className="setting-item">
                <button
                  onClick={() => handleToggle('reducedMotion')}
                  className={`setting-toggle ${settings.reducedMotion ? 'active' : ''}`}
                  aria-pressed={settings.reducedMotion}
                >
                  <EyeOff className="w-4 h-4" />
                  <span>Reduce Motion</span>
                  {settings.reducedMotion && <Check className="w-4 h-4" />}
                </button>
              </div>

              {/* Keyboard Navigation Toggle */}
              <div className="setting-item">
                <button
                  onClick={() => handleToggle('keyboardNavigation')}
                  className={`setting-toggle ${settings.keyboardNavigation ? 'active' : ''}`}
                  aria-pressed={settings.keyboardNavigation}
                >
                  <Keyboard className="w-4 h-4" />
                  <span>Keyboard Nav</span>
                  {settings.keyboardNavigation && <Check className="w-4 h-4" />}
                </button>
              </div>

              {/* Font Size */}
              <div className="setting-item">
                <label className="setting-label">
                  <Type className="w-4 h-4" />
                  Font Size
                </label>
                <div className="font-size-controls">
                  {(['small', 'medium', 'large'] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => handleFontSizeChange(size)}
                      className={`font-size-btn ${settings.fontSize === size ? 'active' : ''}`}
                      aria-pressed={settings.fontSize === size}
                    >
                      {size.charAt(0).toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reset */}
              <div className="setting-item">
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="setting-reset"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset Settings
                </button>
              </div>
            </div>
          </div>
        )}

        {showResetConfirm && (
          <div className="modal-overlay" onClick={() => setShowResetConfirm(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">Reset Accessibility Settings</h3>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="modal-close"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="modal-content">
                <p>Are you sure you want to reset all accessibility settings to their defaults?</p>
              </div>
              <div className="modal-footer">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReset}
                  className="btn btn-primary"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full settings panel
  return (
    <div className={`accessibility-settings-panel ${className}`}>
      <div className="accessibility-panel-header">
        <h2>Accessibility Settings</h2>
        <p className="accessibility-description">
          Customize your experience for better accessibility and usability.
        </p>
      </div>

      <div className="accessibility-panel-content">
        {/* Visual Settings */}
        <section className="settings-section">
          <h3>Visual</h3>
          
          <div className="setting-group">
            <div className="setting-item">
              <div className="setting-info">
                <label className="setting-label">
                  <Contrast className="w-5 h-5" />
                  High Contrast
                </label>
                <p className="setting-description">
                  Increase contrast for better visibility
                </p>
              </div>
              <button
                onClick={() => handleToggle('highContrast')}
                className={`setting-toggle ${settings.highContrast ? 'active' : ''}`}
                aria-pressed={settings.highContrast}
              >
                {settings.highContrast ? <Check className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </button>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label className="setting-label">
                  <Type className="w-5 h-5" />
                  Font Size
                </label>
                <p className="setting-description">
                  Adjust text size for better readability
                </p>
              </div>
              <div className="font-size-controls">
                {(['small', 'medium', 'large'] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => handleFontSizeChange(size)}
                    className={`font-size-btn ${settings.fontSize === size ? 'active' : ''}`}
                    aria-pressed={settings.fontSize === size}
                  >
                    {size.charAt(0).toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Interaction Settings */}
        <section className="settings-section">
          <h3>Interaction</h3>
          
          <div className="setting-group">
            <div className="setting-item">
              <div className="setting-info">
                <label className="setting-label">
                  <EyeOff className="w-5 h-5" />
                  Reduce Motion
                </label>
                <p className="setting-description">
                  Minimize animations and transitions
                </p>
              </div>
              <button
                onClick={() => handleToggle('reducedMotion')}
                className={`setting-toggle ${settings.reducedMotion ? 'active' : ''}`}
                aria-pressed={settings.reducedMotion}
              >
                {settings.reducedMotion ? <Check className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label className="setting-label">
                  <Keyboard className="w-5 h-5" />
                  Keyboard Navigation
                </label>
                <p className="setting-description">
                  Enhanced keyboard navigation support
                </p>
              </div>
              <button
                onClick={() => handleToggle('keyboardNavigation')}
                className={`setting-toggle ${settings.keyboardNavigation ? 'active' : ''}`}
                aria-pressed={settings.keyboardNavigation}
              >
                {settings.keyboardNavigation ? <Check className="w-5 h-5" /> : <MousePointer className="w-5 h-5" />}
              </button>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <label className="setting-label">
                  <MousePointer className="w-5 h-5" />
                  Focus Indicators
                </label>
                <p className="setting-description">
                  Show focus indicators for keyboard navigation
                </p>
              </div>
              <button
                onClick={() => handleToggle('focusVisible')}
                className={`setting-toggle ${settings.focusVisible ? 'active' : ''}`}
                aria-pressed={settings.focusVisible}
              >
                {settings.focusVisible ? <Check className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </section>

        {/* Actions */}
        <section className="settings-section">
          <div className="setting-actions">
            <button
              onClick={handleReset}
              className="btn btn-outline"
            >
              <RotateCcw className="w-4 h-4" />
              Reset to Defaults
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AccessibilitySettings;
