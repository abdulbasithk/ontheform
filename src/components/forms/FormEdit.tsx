import { AlertCircle, Loader, Plus, Trash2, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import FormsService, { CreateFormRequest, UpdateFormRequest } from '../../services/forms';
import { Form, FormField } from '../../types';
import { generateUUID } from '../../utils/uuid';
import { BannerUpload } from './BannerUpload';

interface FormEditProps {
  form: Form | null;
  onClose: () => void;
  onSave: (form: Form) => void;
}

export function FormEdit({ form: initialForm, onClose, onSave }: FormEditProps) {
  const [form, setForm] = useState<Form | null>(initialForm);
  const [title, setTitle] = useState(initialForm?.title || '');
  const [description, setDescription] = useState(initialForm?.description || '');
  const [isActive, setIsActive] = useState(initialForm?.is_active ?? true);
  const [fields, setFields] = useState<FormField[]>(initialForm?.fields || []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const isEditing = !!form;

  // Initialize form data when initialForm changes
  useEffect(() => {
    if (initialForm) {
      setForm(initialForm);
      setTitle(initialForm.title);
      setDescription(initialForm.description || '');
      setFields(initialForm.fields);
      setIsActive(initialForm.is_active);
    }
    setError(null);
    setValidationErrors([]);
  }, [initialForm]);

  const addField = () => {
    const newField: FormField = {
      id: generateUUID(),
      type: 'text',
      label: '',
      required: false,
      placeholder: ''
    };
    setFields([...fields, newField]);
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    const updatedFields = fields.map((field, i) => 
      i === index ? { ...field, ...updates } : field
    );
    setFields(updatedFields);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setValidationErrors([]);

    // Client-side validation
    const formData: CreateFormRequest | UpdateFormRequest = {
      title: title.trim(),
      description: description.trim() || undefined,
      fields,
      isActive
    };

    const errors = FormsService.validateFormData(formData);
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setIsLoading(true);

    try {
      let response;
      if (isEditing) {
        response = await FormsService.updateForm(form.id, formData);
      } else {
        response = await FormsService.createForm(formData);
      }
      
      onSave(response.form);
    } catch (error) {
      const errorMessage = FormsService.handleApiError(error);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const renderFieldEditor = (field: FormField, index: number) => {
    const needsOptions = ['select', 'radio', 'checkbox'].includes(field.type);
    
    return (
      <div key={field.id} className="p-4 border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-gray-900">
            Field {index + 1}
          </span>
          <button
            type="button"
            onClick={() => removeField(index)}
            className="text-red-500 hover:text-red-700 p-1"
            title="Remove field"
          >
            <Trash2 size={16} />
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Field Label *
            </label>
            <input
              type="text"
              value={field.label}
              onChange={(e) => updateField(index, { label: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter field label (English)"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Secondary Label
            </label>
            <input
              type="text"
              value={field.secondary_label || ''}
              onChange={(e) => updateField(index, { secondary_label: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter secondary label (Indonesian)"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Field Type
            </label>
            <select
              value={field.type}
              onChange={(e) => updateField(index, { 
                type: e.target.value as FormField['type'],
                options: ['select', 'radio', 'checkbox'].includes(e.target.value) ? ['Option 1'] : undefined
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="text">Text</option>
              <option value="email">Email</option>
              <option value="textarea">Textarea</option>
              <option value="select">Select</option>
              <option value="radio">Radio</option>
              <option value="checkbox">Checkbox</option>
              <option value="number">Number</option>
              <option value="date">Date</option>
              <option value="file">File Upload</option>
            </select>
          </div>
        </div>

        {!needsOptions && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Placeholder
            </label>
            <input
              type="text"
              value={field.placeholder || ''}
              onChange={(e) => updateField(index, { placeholder: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter placeholder text"
            />
          </div>
        )}

        {needsOptions && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Options *
            </label>
            <div className="space-y-2">
              {(field.options || []).map((option, optionIndex) => (
                <div key={optionIndex} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...(field.options || [])];
                      newOptions[optionIndex] = e.target.value;
                      updateField(index, { options: newOptions });
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={`Option ${optionIndex + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const newOptions = (field.options || []).filter((_, i) => i !== optionIndex);
                      updateField(index, { options: newOptions.length > 0 ? newOptions : ['Option 1'] });
                    }}
                    className="text-red-500 hover:text-red-700 p-1"
                    disabled={(field.options || []).length <= 1}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  const newOptions = [...(field.options || []), `Option ${(field.options || []).length + 1}`];
                  updateField(index, { options: newOptions });
                }}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                + Add Option
              </button>
            </div>
          </div>
        )}

        {field.type === 'file' && (
          <div className="space-y-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Accepted File Types
              </label>
              <input
                type="text"
                value={field.accept || ''}
                onChange={(e) => updateField(index, { accept: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., image/*, .pdf, .jpg,.png"
              />
              <p className="text-xs text-gray-500 mt-1">
                Comma-separated MIME types or file extensions
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Max File Size (bytes)
              </label>
              <input
                type="number"
                value={field.maxFileSize || 5242880}
                onChange={(e) => updateField(index, { maxFileSize: parseInt(e.target.value) || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="5242880 (5MB default)"
              />
              <p className="text-xs text-gray-500 mt-1">
                Default: 5242880 bytes (5MB). Suggested: 5242880 (5MB), 10485760 (10MB)
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={field.required}
              onChange={(e) => updateField(index, { required: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label className="ml-2 text-sm text-gray-700">
              Required field
            </label>
          </div>
          
          {field.type === 'select' && (
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={field.allow_other || false}
                onChange={(e) => updateField(index, { allow_other: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label className="ml-2 text-sm text-gray-700">
                Allow "Other" option
              </label>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black bg-opacity-25" onClick={onClose} />
        <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">
              {isEditing ? 'Edit Form' : 'Create New Form'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={isLoading}
            >
              <X size={20} />
            </button>
          </div>
          
          {/* Form Content */}
          <form onSubmit={handleSubmit}>
            <div className="p-6">
              {/* Error Messages */}
              {(error || validationErrors.length > 0) && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-800 mb-2">
                    <AlertCircle size={16} />
                    <span className="font-medium">Please fix the following errors:</span>
                  </div>
                  <ul className="text-sm text-red-700 space-y-1">
                    {error && <li>{error}</li>}
                    {validationErrors.map((err, index) => (
                      <li key={index}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Form Title *
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter form title"
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={isActive ? 'active' : 'inactive'}
                      onChange={(e) => setIsActive(e.target.value === 'active')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={isLoading}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter form description (optional)"
                    disabled={isLoading}
                  />
                </div>

                {/* Banner Upload */}
                 {form && (
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">
                       Form Banner
                     </label>
                     <BannerUpload
                       form={form}
                       onUpdate={(updatedForm) => {
                         setForm(updatedForm);
                       }}
                     />
                   </div>
                 )}

                {/* Form Fields */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Form Fields
                    </label>
                    <button
                      type="button"
                      onClick={addField}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      disabled={isLoading}
                    >
                      <Plus size={16} className="mr-1" />
                      Add Field
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {fields.length > 0 ? (
                      fields.map((field, index) => renderFieldEditor(field, index))
                    ) : (
                      <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                        <p className="mb-4">No fields added yet. Add fields to build your form.</p>
                        <button
                          type="button"
                          onClick={addField}
                          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          disabled={isLoading}
                        >
                          <Plus size={16} className="mr-2" />
                          Add Your First Field
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={addField}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      disabled={isLoading}
                    >
                      <Plus size={16} className="mr-1" />
                      Add Field
                    </button>
                  </div>
                </div>
              </div>
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
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader size={16} className="animate-spin mr-2" />
                    {isEditing ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  isEditing ? 'Update Form' : 'Create Form'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}