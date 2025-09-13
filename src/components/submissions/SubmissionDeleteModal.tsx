import { AlertTriangle, Loader, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { FormSubmission } from '../../types';
import SubmissionsService from '../../services/submissions';

interface SubmissionDeleteModalProps {
  submission: FormSubmission;
  onClose: () => void;
  onSuccess: () => void;
}

export function SubmissionDeleteModal({ submission, onClose, onSuccess }: SubmissionDeleteModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      await SubmissionsService.deleteSubmissionById(submission.id);
      onSuccess();
    } catch (err) {
      const errorMessage = SubmissionsService.handleApiError(err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black bg-opacity-25" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Delete Submission</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={isLoading}
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Error Message */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertTriangle size={16} />
                  <span className="font-medium">Error</span>
                </div>
                <p className="text-red-700 mt-1">{error}</p>
              </div>
            )}

            {/* Warning Message */}
            <div className="mb-6">
              <p className="text-gray-900 font-medium mb-2">
                Are you sure you want to delete this submission?
              </p>
              <p className="text-gray-600 text-sm mb-4">
                This action cannot be undone. The submission data will be permanently removed from the system.
              </p>
              
              {/* Submission Details */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Form:</span>
                  <span className="text-sm text-gray-900">{submission.formTitle}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Submitted:</span>
                  <span className="text-sm text-gray-900">
                    {new Date(submission.submittedAt).toLocaleDateString()}
                  </span>
                </div>
                {submission.submitterEmail && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Email:</span>
                    <span className="text-sm text-gray-900">{submission.submitterEmail}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">ID:</span>
                  <span className="text-sm text-gray-500 font-mono">
                    {submission.id.substring(0, 8)}...
                  </span>
                </div>
              </div>
            </div>

            {/* Confirmation Checkbox */}
            <div className="mb-6">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500 mt-0.5"
                  disabled={isLoading}
                  required
                />
                <span className="text-sm text-gray-700">
                  I understand that this action is permanent and cannot be undone.
                </span>
              </label>
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
              type="button"
              onClick={handleDelete}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 size={16} className="mr-2" />
                  Delete Submission
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}