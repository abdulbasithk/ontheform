import { AlertCircle, Download, Loader, Save, X } from 'lucide-react';
import React, { useState } from 'react';
import { FormField, FormSubmission } from '../../types';
import SubmissionsService from '../../services/submissions';
import { getFileUrl } from '../../services/api';

interface SubmissionEditModalProps {
  submission: FormSubmission;
  formFields: FormField[];
  onClose: () => void;
  onSuccess: () => void;
}

export function SubmissionEditModal({ submission, formFields, onClose, onSuccess }: SubmissionEditModalProps) {
  const [responses, setResponses] = useState<Record<string, any>>(submission.responses || {});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const validateForm = (): boolean => {
    const errors: string[] = [];

    formFields.forEach(field => {
      if (field.required && (!responses[field.id] || responses[field.id] === '')) {
        errors.push(`${field.label} is required`);
      }

      // Email validation
      if (field.type === 'email' && responses[field.id]) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(responses[field.id])) {
          errors.push(`${field.label} must be a valid email address`);
        }
      }

      // Number validation
      if (field.type === 'number' && responses[field.id]) {
        if (isNaN(Number(responses[field.id]))) {
          errors.push(`${field.label} must be a valid number`);
        }
      }
    });

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      await SubmissionsService.updateSubmission(submission.id, responses);
      onSuccess();
    } catch (err) {
      const errorMessage = SubmissionsService.handleApiError(err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (fieldId: string, value: any) => {
    setResponses(prev => ({ ...prev, [fieldId]: value }));
    // Clear validation errors when user starts typing
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
    if (error) setError(null);
  };

  const renderField = (field: FormField) => {
    const value = responses[field.id] || '';

    switch (field.type) {
      case 'text':
      case 'email':
      case 'number':
        return (
          <input
            type={field.type}
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={field.placeholder}
            disabled={isLoading}
            required={field.required}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={field.placeholder}
            disabled={isLoading}
            required={field.required}
          />
        );

      case 'select':
        return (
          <div>
            <select
              value={value}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
              required={field.required}
            >
              <option value="">Select an option</option>
              {field.options?.map((option, index) => (
                <option key={index} value={option}>
                  {option}
                </option>
              ))}
              {field.allow_other && (
                <option value="Other">Other</option>
              )}
            </select>
            
            {/* Other option text input */}
            {field.allow_other && value === 'Other' && (
              <input
                type="text"
                value={responses[`${field.id}_other`] || ''}
                onChange={(e) => handleInputChange(`${field.id}_other`, e.target.value)}
                className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Please specify"
                disabled={isLoading}
                required={field.required}
              />
            )}
          </div>
        );

      case 'multiselect':
        const multiselectValues = Array.isArray(value) ? value : [];
        const showOtherMulti = responses[`${field.id}_other`] === true;
        return (
          <div className="space-y-2">
            {field.options?.map((option, index) => (
              <label key={index} className="flex items-center">
                <input
                  type="checkbox"
                  value={option}
                  checked={multiselectValues.includes(option)}
                  onChange={(e) => {
                    const newValues = e.target.checked
                      ? [...multiselectValues, option]
                      : multiselectValues.filter(v => v !== option);
                    handleInputChange(field.id, newValues);
                  }}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  disabled={isLoading}
                />
                <span className="ml-2 text-sm text-gray-700">{option}</span>
              </label>
            ))}
            {field.allow_other && (
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showOtherMulti}
                  onChange={(e) => {
                    handleInputChange(`${field.id}_other`, e.target.checked);
                  }}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  disabled={isLoading}
                />
                <span className="ml-2 text-sm text-gray-700">Other</span>
              </label>
            )}
            {field.allow_other && showOtherMulti && (
              <input
                type="text"
                value={responses[`${field.id}_other_text`] || ''}
                onChange={(e) => handleInputChange(`${field.id}_other_text`, e.target.value)}
                className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Please specify"
                disabled={isLoading}
                required={field.required && showOtherMulti}
              />
            )}
          </div>
        );

      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map((option, index) => (
              <label key={index} className="flex items-center">
                <input
                  type="radio"
                  name={field.id}
                  value={option}
                  checked={value === option}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  disabled={isLoading}
                  required={field.required}
                />
                <span className="ml-2 text-sm text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'checkbox':
        const checkboxValues = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-2">
            {field.options?.map((option, index) => (
              <label key={index} className="flex items-center">
                <input
                  type="checkbox"
                  value={option}
                  checked={checkboxValues.includes(option)}
                  onChange={(e) => {
                    const newValues = e.target.checked
                      ? [...checkboxValues, option]
                      : checkboxValues.filter(v => v !== option);
                    handleInputChange(field.id, newValues);
                  }}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  disabled={isLoading}
                />
                <span className="ml-2 text-sm text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
            required={field.required}
          />
        );

      case 'file':
        // File field is read-only in submissions
        const fileData = typeof value === 'object' && value?.path ? value : null;
        return (
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            {fileData ? (
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="font-medium text-gray-700">File: </span>
                  <span className="text-gray-900">{fileData.filename}</span>
                </div>
                <div className="text-sm">
                  <span className="font-medium text-gray-700">Size: </span>
                  <span className="text-gray-900">
                    {(fileData.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
                <div>
                  <a
                    href={getFileUrl(fileData.path)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Download size={16} className="mr-2" />
                    Download File
                  </a>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No file uploaded</p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black bg-opacity-25" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Edit Submission</h2>
              <p className="text-sm text-gray-600 mt-1">
                Form: {submission.formTitle}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-800 mb-2">
                  <AlertCircle size={16} />
                  <span className="font-medium">Please fix the following errors:</span>
                </div>
                <ul className="text-red-700 text-sm space-y-1">
                  {validationErrors.map((err, index) => (
                    <li key={index}>• {err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* API Error */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertCircle size={16} />
                  <span className="font-medium">Error</span>
                </div>
                <p className="text-red-700 mt-1">{error}</p>
              </div>
            )}

            {/* Submission Info */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Submitted:</span>
                  <span className="ml-2 text-gray-600">
                    {new Date(submission.submittedAt).toLocaleString()}
                  </span>
                </div>
                {submission.submitterEmail && (
                  <div>
                    <span className="font-medium text-gray-700">Email:</span>
                    <span className="ml-2 text-gray-600">{submission.submitterEmail}</span>
                  </div>
                )}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {formFields.map((field) => (
                <div key={field.id}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {field.label}
                    {field.secondary_label && (
                      <span className="block text-sm text-gray-500 italic">
                        {field.secondary_label}
                      </span>
                    )}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {renderField(field)}
                </div>
              ))}
            </form>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Updating...
                </>
              ) : (
                <>
                  <Save size={16} className="mr-2" />
                  Update Submission
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}