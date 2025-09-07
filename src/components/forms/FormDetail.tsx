import {
  ArrowLeft,
  CheckCircle,
  Copy,
  Download,
  Edit,
  ExternalLink,
  Eye,
  MessageSquare,
  Settings,
  Share2
} from 'lucide-react';
import { useEffect, useState } from 'react';
import SubmissionsService from '../../services/submissions';
import { Form, FormSubmission } from '../../types';
import { FormEdit } from './FormEdit';
import { FormPreview } from './FormPreview';
import { FormSettings } from './FormSettings';

interface FormDetailProps {
  form: Form;
  onBack: () => void;
}

export function FormDetail({ form: initialForm, onBack }: FormDetailProps) {
  const [form, setForm] = useState<Form>(initialForm);
  const [activeTab, setActiveTab] = useState<'summary' | 'responses'>('summary');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(true);
  const [submissionsError, setSubmissionsError] = useState<string | null>(null);
  
  const completedSubmissions = submissions.filter(sub => sub.responses);
  const submissionCount = form.submission_count || 0;
  const totalImpressions = submissionCount + Math.floor(submissionCount * 0.3); // Estimated impressions
  const completionRate = totalImpressions > 0 ? Math.round((completedSubmissions.length / totalImpressions) * 100) : 0;
  const dropOffs = totalImpressions - completedSubmissions.length;

  // Fetch submissions for this form
  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        setIsLoadingSubmissions(true);
        setSubmissionsError(null);
        const response = await SubmissionsService.getFormSubmissions(form.id, { limit: 50 });
        setSubmissions(response.submissions);
      } catch (error) {
        const errorMessage = SubmissionsService.handleApiError(error);
        setSubmissionsError(errorMessage);
      } finally {
        setIsLoadingSubmissions(false);
      }
    };

    fetchSubmissions();
  }, [form.id]);

  const handleExportResponses = async () => {
    try {
      await SubmissionsService.exportSubmissions(form.id);
    } catch (error) {
      const errorMessage = SubmissionsService.handleApiError(error);
      setSubmissionsError(errorMessage);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">{form.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                form.is_active 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {form.is_active ? 'Active' : 'Inactive'}
              </span>
              <span className="text-sm text-gray-500">
                Created {form.created_at ? new Date(form.created_at).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setShowEditModal(true)}
            title="Edit form"
            className="p-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => setShowPreviewModal(true)}
            title="Preview form"
            className="p-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={() => setShowSettingsModal(true)}
            title="Form settings"
            className="p-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Settings size={16} />
          </button>
          <button 
              onClick={() => setShowShareModal(true)}
              className="inline-flex items-center px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
            >
              <Share2 size={16} className="mr-2" />
              <span className="hidden sm:inline">Share form</span>
              <span className="sm:hidden">Share</span>
            </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('summary')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'summary'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Summary
          </button>
          <button
            onClick={() => setActiveTab('responses')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'responses'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Responses
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'summary' ? (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="text-2xl font-bold text-gray-900">{totalImpressions}</div>
              <div className="text-sm text-gray-600 mt-1">Opened</div>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{submissionCount}</div>
                  <div className="text-sm text-gray-600 mt-1">Starts</div>
                </div>
                <div className="text-sm text-gray-500">100%</div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{completedSubmissions.length}</div>
                  <div className="text-sm text-gray-600 mt-1">Completed</div>
                </div>
                <div className="text-sm text-gray-500">{completionRate}%</div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{dropOffs}</div>
                  <div className="text-sm text-gray-600 mt-1">Drop-Offs</div>
                </div>
                <div className="text-sm text-gray-500">{totalImpressions > 0 ? Math.round((dropOffs / totalImpressions) * 100) : 0}%</div>
              </div>
            </div>
          </div>

          {/* Form Fields Summary */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Form Fields</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {form.fields.map((field, index) => {
                  const fieldSubmissions = submissions.filter(sub => sub.responses[field.id]);
                  const responseRate = submissions.length > 0 ? Math.round((fieldSubmissions.length / submissions.length) * 100) : 0;
                  
                  return (
                    <div key={field.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{field.label}</div>
                          <div className="text-sm text-gray-500 capitalize">{field.type} {field.required && '• Required'}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">{fieldSubmissions.length} Responses</div>
                        <div className="text-sm text-gray-500">{responseRate}%</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {isLoadingSubmissions ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading submissions...</span>
            </div>
          ) : submissionsError ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare size={24} className="text-red-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading submissions</h3>
              <p className="text-gray-600 mb-4">{submissionsError}</p>
              <button 
                onClick={() => window.location.reload()}
                className="text-blue-600 hover:text-blue-800 underline"
              >
                Try again
              </button>
            </div>
          ) : (
            <>
              {/* Export Button */}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                  <select className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option>Filter</option>
                  </select>
                  <select className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option>All time</option>
                  </select>
                </div>
                <button
                   onClick={handleExportResponses}
                   className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors w-full sm:w-auto"
                 >
                   <Download size={16} className="mr-2" />
                   Download Excel
                 </button>
              </div>

              {/* Responses Table */}
              {submissions.length > 0 ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden overflow-x-auto">
                  <table className="w-full min-w-[800px]">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Person</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        {form.fields.slice(0, 3).map(field => (
                          <th key={field.id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {field.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {submissions.map((submission) => (
                        <tr key={submission.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(submission.submittedAt).toLocaleDateString()} {new Date(submission.submittedAt).toLocaleTimeString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {submission.submitterEmail || 'Anonymous'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Completed
                            </span>
                          </td>
                          {form.fields.slice(0, 3).map(field => (
                            <td key={field.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {Array.isArray(submission.responses[field.id]) 
                                ? submission.responses[field.id].join(', ')
                                : submission.responses[field.id] || '-'
                              }
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageSquare size={24} className="text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No responses yet</h3>
                  <p className="text-gray-600">Responses will appear here once people start submitting your form.</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Form Edit Modal */}
      {showEditModal && (
        <FormEdit
          form={form}
          onSave={() => setShowEditModal(false)}
          onClose={() => setShowEditModal(false)}
        />
      )}

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal
          form={form}
          onClose={() => {
            setShowShareModal(false);
            setCopySuccess(false);
          }}
          copySuccess={copySuccess}
          setCopySuccess={setCopySuccess}
        />
      )}

      {/* Preview Modal */}
      {showPreviewModal && (
        <FormPreview
          form={form}
          onClose={() => setShowPreviewModal(false)}
        />
      )}

      {/* Settings Modal */}
       {showSettingsModal && (
         <FormSettings
           form={form}
           isOpen={showSettingsModal}
           onSave={(updatedForm) => {
             setForm(updatedForm);
             setShowSettingsModal(false);
           }}
           onClose={() => setShowSettingsModal(false)}
         />
       )}
    </div>
  );
}

interface ShareModalProps {
  form: Form;
  onClose: () => void;
  copySuccess: boolean;
  setCopySuccess: (success: boolean) => void;
}

function ShareModal({ form, onClose, copySuccess, setCopySuccess }: ShareModalProps) {
  const publicUrl = `${window.location.origin}/form/${form.id}`;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  const handleOpenInNewTab = () => {
    window.open(publicUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black bg-opacity-25" onClick={onClose} />
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full relative">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Share Form</h3>
            <p className="text-sm text-gray-600 mt-1">Share this link with others to collect responses</p>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Public Form URL
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={publicUrl}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                  />
                  <button
                    onClick={handleCopyUrl}
                    className={`px-3 py-2 rounded-lg transition-colors ${
                      copySuccess 
                        ? 'bg-green-100 text-green-700 border border-green-300'
                        : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                    }`}
                    title="Copy URL"
                  >
                    {copySuccess ? (
                      <CheckCircle size={16} />
                    ) : (
                      <Copy size={16} />
                    )}
                  </button>
                </div>
                {copySuccess && (
                  <p className="text-sm text-green-600 mt-1">URL copied to clipboard!</p>
                )}
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button
                  onClick={handleOpenInNewTab}
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <ExternalLink size={16} className="mr-2" />
                  Preview
                </button>
                <button
                  onClick={handleCopyUrl}
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Copy size={16} className="mr-2" />
                  Copy Link
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}