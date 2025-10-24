import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  CheckSquare,
  Eye,
  Hash,
  List,
  Mail,
  MessageSquare,
  Send,
  Type,
  Upload
} from 'lucide-react';
import React, { useState } from 'react';
import { Form, FormField } from '../../types';
import { getBannerUrl } from '../../services/api';
import { FileUploadField } from './FileUploadField';
import { SubmissionsService } from '../../services/submissions';

interface FormPreviewProps {
  form: Form;
  onClose: () => void;
}

export function FormPreview({ form, onClose }: FormPreviewProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleInputChange = (fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      // Collect file uploads and text responses separately
      const filesMap: Record<string, File> = {};
      const responses: Record<string, any> = {};

      for (const [fieldId, value] of Object.entries(formData)) {
        if (value instanceof File) {
          filesMap[fieldId] = value;
        } else {
          responses[fieldId] = value;
        }
      }

      // Submit the form with files
      await SubmissionsService.submitForm(
        {
          formId: form.id,
          responses
        },
        filesMap
      );

      setIsSubmitting(false);
      setSubmitted(true);
      
      // Reset after 3 seconds
      setTimeout(() => {
        setSubmitted(false);
        setFormData({});
      }, 3000);
    } catch (error) {
      setIsSubmitting(false);
      setSubmitError(
        error instanceof Error ? error.message : 'Failed to submit form. Please try again.'
      );
    }
  };

  const getFieldIcon = (type: FormField['type']) => {
    switch (type) {
      case 'email': return Mail;
      case 'textarea': return MessageSquare;
      case 'number': return Hash;
      case 'date': return Calendar;
      case 'select': return List;
      case 'checkbox': return CheckSquare;
      case 'file': return Upload;
      default: return Type;
    }
  };

  const renderField = (field: FormField) => {
    const Icon = getFieldIcon(field.type);
    const value = formData[field.id] || '';

    const baseInputClasses = "w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors";
    const labelClasses = "block text-sm font-medium text-gray-700 mb-2";

    switch (field.type) {
      case 'text':
      case 'email':
      case 'number':
        return (
          <div key={field.id} className="space-y-2">
            <label className={labelClasses}>
              <div className="flex items-center gap-2">
                <Icon size={16} className="text-gray-500" />
                {field.label}
                {field.required && <span className="text-red-500">*</span>}
              </div>
            </label>
            <input
              type={field.type}
              value={value}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
              className={baseInputClasses}
            />
          </div>
        );

      case 'textarea':
        return (
          <div key={field.id} className="space-y-2">
            <label className={labelClasses}>
              <div className="flex items-center gap-2">
                <Icon size={16} className="text-gray-500" />
                {field.label}
                {field.required && <span className="text-red-500">*</span>}
              </div>
            </label>
            <textarea
              value={value}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
              rows={4}
              className={baseInputClasses}
            />
          </div>
        );

      case 'select':
        return (
          <div key={field.id} className="space-y-2">
            <label className={labelClasses}>
              <div className="flex items-center gap-2">
                <Icon size={16} className="text-gray-500" />
                {field.label}
                {field.required && <span className="text-red-500">*</span>}
              </div>
            </label>
            <select
              value={value}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              required={field.required}
              className={baseInputClasses}
            >
              <option value="">Select an option...</option>
              {field.options?.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        );

      case 'radio':
        return (
          <div key={field.id} className="space-y-3">
            <label className={labelClasses}>
              <div className="flex items-center gap-2">
                <Icon size={16} className="text-gray-500" />
                {field.label}
                {field.required && <span className="text-red-500">*</span>}
              </div>
            </label>
            <div className="space-y-2">
              {field.options?.map((option) => (
                <label key={option} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name={field.id}
                    value={option}
                    checked={value === option}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    required={field.required}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">{option}</span>
                </label>
              ))}
            </div>
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.id} className="space-y-3">
            <label className={labelClasses}>
              <div className="flex items-center gap-2">
                <Icon size={16} className="text-gray-500" />
                {field.label}
                {field.required && <span className="text-red-500">*</span>}
              </div>
            </label>
            <div className="space-y-2">
              {field.options?.map((option) => (
                <label key={option} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    value={option}
                    checked={(value || []).includes(option)}
                    onChange={(e) => {
                      const currentValues = value || [];
                      if (e.target.checked) {
                        handleInputChange(field.id, [...currentValues, option]);
                      } else {
                        handleInputChange(field.id, currentValues.filter((v: string) => v !== option));
                      }
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-gray-700">{option}</span>
                </label>
              ))}
            </div>
          </div>
        );

      case 'date':
        return (
          <div key={field.id} className="space-y-2">
            <label className={labelClasses}>
              <div className="flex items-center gap-2">
                <Icon size={16} className="text-gray-500" />
                {field.label}
                {field.required && <span className="text-red-500">*</span>}
              </div>
            </label>
            <input
              type="date"
              value={value}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              required={field.required}
              className={baseInputClasses}
            />
          </div>
        );

      case 'file':
        return (
          <div key={field.id}>
            <FileUploadField
              field={field}
              value={formData[field.id] || null}
              previewUrl={formData[field.id] ? URL.createObjectURL(formData[field.id]) : undefined}
              onChange={(file) => handleInputChange(field.id, file)}
            />
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
        <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Form Preview</h2>
                <p className="text-gray-600">Previewing: {form.title}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              <Eye size={16} />
              Preview Mode
            </div>
          </div>

          {/* Form Content */}
          <div className="p-6">
            {submitted ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} className="text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Thank you!</h3>
                <p className="text-gray-600">Your form submission has been received successfully.</p>
              </div>
            ) : (
              <>
                {/* Banner */}
                {getBannerUrl(form.banner_url) && (
                  <div className="w-full mb-6">
                    <img
                      src={getBannerUrl(form.banner_url)}
                      alt="Form banner"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  </div>
                )}
                
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-900">{form.title}</h3>
                  <p className="text-gray-600 mt-2">{form.description}</p>
                </div>

                {/* Error Message */}
                {submitError && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{submitError}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="space-y-6">
                    {form.fields.map(renderField)}
                  </div>
                  <div className="mt-8 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={isSubmitting}
                      className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Close Preview
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send size={20} className="mr-2" />
                          Submit Form
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}