import React, { useState, useEffect } from 'react';
import { Form } from '../../types';
import FormsService from '../../services/forms';
import { X, Settings, AlertCircle, Check } from 'lucide-react';

interface FormSettingsProps {
  form: Form;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedForm: Form) => void;
}

export function FormSettings({ form: initialForm, isOpen, onClose, onSave }: FormSettingsProps) {
  const [form, setForm] = useState<Form>(initialForm);

  const [uniqueConstraintType, setUniqueConstraintType] = useState<'none' | 'ip' | 'field'>('none');
  const [uniqueConstraintField, setUniqueConstraintField] = useState<string>('');
  const [showQrCode, setShowQrCode] = useState<boolean>(false);
  const [sendEmailNotification, setSendEmailNotification] = useState<boolean>(false);
  const [showTermsCheckbox, setShowTermsCheckbox] = useState<boolean>(false);
  const [termsText, setTermsText] = useState<string>('');
  const [termsSecondaryText, setTermsSecondaryText] = useState<string>('');
  const [termsLinkUrl, setTermsLinkUrl] = useState<string>('');
  const [termsLinkText, setTermsLinkText] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen && initialForm) {
      setForm(initialForm);
      setUniqueConstraintType(initialForm.unique_constraint_type || 'none');
      setUniqueConstraintField(initialForm.unique_constraint_field || '');
      setShowQrCode(initialForm.show_qr_code || false);
      setSendEmailNotification(initialForm.send_email_notification || false);
      setShowTermsCheckbox(initialForm.show_terms_checkbox || false);
      setTermsText(initialForm.terms_text || '');
      setTermsSecondaryText(initialForm.terms_secondary_text || '');
      setTermsLinkUrl(initialForm.terms_link_url || '');
      setTermsLinkText(initialForm.terms_link_text || '');
      setError(null);
      setSuccess(false);
    }
  }, [isOpen, initialForm]);



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsLoading(true);

    try {
      const settings = {
        uniqueConstraintType,
        uniqueConstraintField: uniqueConstraintType === 'field' ? uniqueConstraintField : undefined,
        showQrCode,
        sendEmailNotification,
        showTermsCheckbox,
        termsText: showTermsCheckbox ? termsText : undefined,
        termsSecondaryText: showTermsCheckbox ? termsSecondaryText : undefined,
        termsLinkUrl: showTermsCheckbox && termsLinkUrl ? termsLinkUrl : undefined,
        termsLinkText: showTermsCheckbox && termsLinkText ? termsLinkText : undefined
      };

      const response = await FormsService.updateFormSettings(form.id, settings);
      setSuccess(true);
      onSave(response.form);
      
      // Auto-close after success
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      const errorMessage = FormsService.handleApiError(error);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const availableFields = form.fields.filter(field => 
    field.type === 'text' || field.type === 'email' || field.type === 'number'
  );

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto"
      onClick={handleBackdropClick}
    >
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" />
        
        {/* Center the modal */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
          &#8203;
        </span>
        
        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          {/* Header */}
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Settings className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Form Settings
                  </h3>
                  <p className="text-sm text-gray-600">
                    Configure unique response constraints
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                disabled={isLoading}
                className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X size={20} />
              </button>
            </div>
          </div>
          
          {/* Content */}
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
              {/* Success Message */}
              {success && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-800">
                    <Check size={16} />
                    <span className="text-sm font-medium">Settings updated successfully!</span>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-800">
                    <AlertCircle size={16} />
                    <span className="text-sm font-medium">{error}</span>
                  </div>
                </div>
              )}



              {/* Form Settings */}
               <div className="mb-6">
                 {/* Unique Constraint Type */}
                 <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Unique Response Constraint
                    </label>
                <div className="space-y-3">
                  <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name="uniqueConstraint"
                      value="none"
                      checked={uniqueConstraintType === 'none'}
                      onChange={(e) => setUniqueConstraintType(e.target.value as 'none')}
                      className="mt-1"
                      disabled={isLoading}
                    />
                    <div>
                      <div className="font-medium text-gray-900">No Constraint</div>
                      <div className="text-sm text-gray-600">Allow multiple submissions from the same source</div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name="uniqueConstraint"
                      value="ip"
                      checked={uniqueConstraintType === 'ip'}
                      onChange={(e) => setUniqueConstraintType(e.target.value as 'ip')}
                      className="mt-1"
                      disabled={isLoading}
                    />
                    <div>
                      <div className="font-medium text-gray-900">Unique per IP Address</div>
                      <div className="text-sm text-gray-600">Only one submission allowed per IP address</div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name="uniqueConstraint"
                      value="field"
                      checked={uniqueConstraintType === 'field'}
                      onChange={(e) => setUniqueConstraintType(e.target.value as 'field')}
                      className="mt-1"
                      disabled={isLoading || availableFields.length === 0}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">Unique per Field Value</div>
                      <div className="text-sm text-gray-600 mb-2">
                        {availableFields.length > 0
                          ? 'Only one submission allowed per unique field value'
                          : 'No suitable fields available for unique constraint'
                        }
                      </div>
                      {uniqueConstraintType === 'field' && availableFields.length > 0 && (
                        <select
                          value={uniqueConstraintField}
                          onChange={(e) => setUniqueConstraintField(e.target.value)}
                          className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          disabled={isLoading}
                          required
                        >
                          <option value="">Select a field...</option>
                          {availableFields.map((field) => (
                            <option key={field.id} value={field.id}>
                              {field.label} ({field.type})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </label>
                </div>
              </div>

                  {/* QR Code & Email Notifications */}
                  <div className="space-y-6 mb-6">
                    {/* QR Code Setting */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-900 mb-2">QR Code Generation</h3>
                          <p className="text-sm text-gray-600 mb-4">
                            Generate a QR code containing the submission ID after form submission. Users can scan this code to access their submission details.
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer ml-4">
                          <input
                            type="checkbox"
                            checked={showQrCode}
                            onChange={(e) => setShowQrCode(e.target.checked)}
                            className="sr-only peer"
                            disabled={isLoading}
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>

                    {/* Email Notification Setting */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-900 mb-2">Email Notifications</h3>
                          <p className="text-sm text-gray-600 mb-4">
                            Send confirmation emails to users after form submission. If QR code is enabled, the email will include the QR code. Otherwise, it will contain the submission ID.
                          </p>
                          <div className="text-xs text-gray-500 space-y-1">
                            <p>• Requires an email field in your form</p>
                            <p>• Includes form banner if available</p>
                            <p>• Professional email template with submission details</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer ml-4">
                          <input
                            type="checkbox"
                            checked={sendEmailNotification}
                            onChange={(e) => setSendEmailNotification(e.target.checked)}
                            className="sr-only peer"
                            disabled={isLoading}
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>

                    {/* Terms and Conditions Setting */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-900 mb-2">Terms and Conditions Agreement</h3>
                          <p className="text-sm text-gray-600 mb-4">
                            Require users to accept terms and conditions before submitting the form. You can customize the agreement text and include links to external documents.
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer ml-4">
                          <input
                            type="checkbox"
                            checked={showTermsCheckbox}
                            onChange={(e) => setShowTermsCheckbox(e.target.checked)}
                            className="sr-only peer"
                            disabled={isLoading}
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      {/* Terms Configuration Fields */}
                      {showTermsCheckbox && (
                        <div className="space-y-4 pt-4 border-t border-gray-200">
                          {/* Primary Terms Text */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Primary Agreement Text (English)
                            </label>
                            <textarea
                              value={termsText}
                              onChange={(e) => setTermsText(e.target.value)}
                              placeholder="I have read and agree to the Terms and Conditions..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                              rows={3}
                              disabled={isLoading}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              URLs in this text will automatically become clickable links
                            </p>
                          </div>

                          {/* Secondary Terms Text */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Secondary Agreement Text (Optional - e.g., Indonesian)
                            </label>
                            <textarea
                              value={termsSecondaryText}
                              onChange={(e) => setTermsSecondaryText(e.target.value)}
                              placeholder="Dengan mengirimkan formulir ini, Anda setuju..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                              rows={3}
                              disabled={isLoading}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              This text will be displayed in italics below the primary text
                            </p>
                          </div>

                          {/* Terms Link */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Terms Document Link (Optional)
                              </label>
                              <input
                                type="url"
                                value={termsLinkUrl}
                                onChange={(e) => setTermsLinkUrl(e.target.value)}
                                placeholder="https://example.com/terms"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                disabled={isLoading}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Link Display Text
                              </label>
                              <input
                                type="text"
                                value={termsLinkText}
                                onChange={(e) => setTermsLinkText(e.target.value)}
                                placeholder="Read full Terms & Conditions"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                disabled={isLoading}
                              />
                            </div>
                          </div>

                          <div className="text-xs text-gray-500 space-y-1">
                            <p>• Users must check the agreement box before submitting</p>
                            <p>• URLs in text are automatically converted to clickable links</p>
                            <p>• Secondary text appears in italics for visual distinction</p>
                            <p>• External links open in new tabs for security</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Info Box */}
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-blue-800">
                        <p className="font-medium mb-1">Important Notes:</p>
                        <ul className="space-y-1 text-xs">
                          <li>• Unique constraints only apply to new submissions</li>
                          <li>• QR codes contain the unique submission ID for easy reference</li>
                          <li>• Email notifications require users to provide an email address</li>
                          <li>• Terms and conditions require user agreement before submission</li>
                          <li>• All features work independently and can be enabled separately</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
            </div>
            
            {/* Action buttons */}
             <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-3">
              <button
                type="submit"
                disabled={isLoading || (uniqueConstraintType === 'field' && !uniqueConstraintField)}
                className="w-full inline-flex justify-center items-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check size={16} className="mr-2" />
                    Save Settings
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleClose}
                disabled={isLoading}
                className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
             </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default FormSettings;