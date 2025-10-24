import { Upload, X, Image as ImageIcon } from 'lucide-react';
import React, { useState } from 'react';
import { FormField } from '../../types';

interface FileUploadFieldProps {
  field: FormField;
  value: File | null;
  previewUrl?: string;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}

export function FileUploadField({
  field,
  value,
  previewUrl,
  onChange,
  disabled = false
}: FileUploadFieldProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isImageAccept = field.accept?.includes('image');
  const maxFileSize = field.maxFileSize || 5242880; // 5MB default

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize) {
      const sizeMB = (maxFileSize / 1024 / 1024).toFixed(2);
      return `File size exceeds maximum of ${sizeMB}MB`;
    }

    // Check file type if accept is specified
    if (field.accept) {
      const acceptArray = field.accept.split(',').map(a => a.trim());
      let isValid = false;

      for (const acceptType of acceptArray) {
        if (acceptType === '*/*') {
          isValid = true;
          break;
        } else if (acceptType.startsWith('.')) {
          // Extension-based check (e.g., '.pdf')
          if (file.name.toLowerCase().endsWith(acceptType.toLowerCase())) {
            isValid = true;
            break;
          }
        } else if (acceptType.includes('/*')) {
          // Wildcard type check (e.g., 'image/*')
          const [mainType] = acceptType.split('/');
          if (file.type.startsWith(mainType)) {
            isValid = true;
            break;
          }
        } else {
          // Exact type check
          if (file.type === acceptType) {
            isValid = true;
            break;
          }
        }
      }

      if (!isValid) {
        return `File type not allowed. Accepted types: ${field.accept}`;
      }
    }

    return null;
  };

  const handleFileSelect = (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    onChange(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRemove = () => {
    setError(null);
    onChange(null);
  };

  return (
    <div className="space-y-2">

      {/* File Preview */}
      {(value || previewUrl) && (
        <div className="mb-4 relative">
          {isImageAccept && (previewUrl || value) ? (
            <div className="relative inline-block">
              <img
                src={previewUrl || (value ? URL.createObjectURL(value) : '')}
                alt="Preview"
                className="max-w-xs max-h-40 rounded-lg border border-gray-200 object-cover"
              />
              <button
                type="button"
                onClick={handleRemove}
                disabled={disabled}
                className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-full p-1 shadow-lg"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2">
                <ImageIcon size={16} className="text-gray-400" />
                <span className="text-sm text-gray-700 truncate">
                  {value?.name || 'File uploaded'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleRemove}
                disabled={disabled}
                className="text-red-500 hover:text-red-700 disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Upload Area */}
      {!value && !previewUrl && (
        <>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${isDragging
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 bg-gray-50 hover:border-gray-400'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <input
              type="file"
              onChange={handleChange}
              disabled={disabled}
              accept={field.accept}
              required={field.required}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            
            <div className="space-y-2">
              <Upload
                size={32}
                className={`mx-auto ${isDragging ? 'text-blue-500' : 'text-gray-400'}`}
              />
              <div className="text-sm">
                <p className="font-medium text-gray-700">
                  {isDragging ? 'Drop file here' : 'Drag and drop or click to select'}
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  {field.accept && `Accepted formats: ${field.accept}`}
                </p>
                {maxFileSize && (
                  <p className="text-gray-500 text-xs">
                    Max file size: {(maxFileSize / 1024 / 1024).toFixed(2)}MB
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}
