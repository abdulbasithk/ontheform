import React, { useState, useRef } from 'react';
import { Form } from '../../types';
import FormsService from '../../services/forms';
import { getBannerUrl } from '../../services/api';
import { Upload, X, Image, AlertCircle, Trash2 } from 'lucide-react';

interface BannerUploadProps {
  form: Form;
  onUpdate: (updatedForm: Form) => void;
}

export function BannerUpload({ form, onUpdate }: BannerUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const response = await FormsService.uploadBanner(form.id, file);
      onUpdate(response.form);
    } catch (error) {
      const errorMessage = FormsService.handleApiError(error);
      setError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDeleteBanner = async () => {
    setError(null);
    setIsUploading(true);

    try {
      const response = await FormsService.deleteBanner(form.id);
      onUpdate(response.form);
    } catch (error) {
      const errorMessage = FormsService.handleApiError(error);
      setError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      {/* Current Banner Display */}
      {getBannerUrl(form.banner_url) && (
          <div className="relative group">
            <img
              src={getBannerUrl(form.banner_url)}
              alt="Form banner"
              className="w-full h-48 object-cover rounded-lg border border-gray-200"
            />
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded-lg flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
              <button
                onClick={openFileDialog}
                disabled={isUploading}
                className="p-2 bg-white rounded-lg shadow-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                title="Replace banner"
              >
                <Upload size={16} className="text-gray-700" />
              </button>
              <button
                onClick={handleDeleteBanner}
                disabled={isUploading}
                className="p-2 bg-white rounded-lg shadow-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                title="Delete banner"
              >
                <Trash2 size={16} className="text-red-600" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Area */}
      {!getBannerUrl(form.banner_url) && (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
            dragOver
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={!isUploading ? openFileDialog : undefined}
        >
          <div className="flex flex-col items-center gap-4">
            {isUploading ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            ) : (
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <Image size={24} className="text-gray-400" />
              </div>
            )}
            <div>
              <p className="text-lg font-medium text-gray-900 mb-1">
                {isUploading ? 'Uploading...' : 'Upload Form Banner'}
              </p>
              <p className="text-sm text-gray-600">
                {isUploading
                  ? 'Please wait while we upload your banner'
                  : 'Drag and drop an image here, or click to select'
                }
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Supports: JPG, PNG, GIF • Max size: 5MB
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span className="text-sm">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-600"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Info */}
      <div className="text-xs text-gray-500">
        <p>• The banner will be displayed at the top of your form</p>
        <p>• Recommended size: 1200x300 pixels for best results</p>
        <p>• The banner will be visible to all form respondents</p>
      </div>
    </div>
  );
}

export default BannerUpload;