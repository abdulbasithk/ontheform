import { useEffect, useState, useRef } from 'react';
import { X, Send, Mail, AlertCircle, CheckCircle, Loader, Copy } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import EmailBlastService from '../../services/emailBlast';
import { Form, EmailBlastPlaceholder, EmailBlastRecipient } from '../../types';

interface EmailBlastModalProps {
  form: Form;
  onClose: () => void;
}

export function EmailBlastModal({ form, onClose }: EmailBlastModalProps) {
  const [subject, setSubject] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [recipients, setRecipients] = useState<EmailBlastRecipient[]>([]);
  const [placeholders, setPlaceholders] = useState<EmailBlastPlaceholder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [blastId, setBlastId] = useState<string | null>(null);
  const [blastStatus, setBlastStatus] = useState<any>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const quillRef = useRef<ReactQuill>(null);

  useEffect(() => {
    fetchRecipients();
  }, [form.id]);

  useEffect(() => {
    if (blastId) {
      const interval = setInterval(() => {
        fetchBlastStatus();
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [blastId]);

  const fetchRecipients = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await EmailBlastService.getRecipients(form.id);
      setRecipients(data.recipients);
      setPlaceholders(data.placeholders);
    } catch (err) {
      setError(EmailBlastService.handleApiError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBlastStatus = async () => {
    if (!blastId) return;

    try {
      const status = await EmailBlastService.getBlastStatus(form.id, blastId);
      setBlastStatus(status);

      // Stop polling if completed or failed
      if (status.overallStatus === 'completed' || status.overallStatus === 'failed') {
        setBlastId(null);
      }
    } catch (err) {
      console.error('Error fetching blast status:', err);
    }
  };

  const insertPlaceholder = (placeholder: string) => {
    const quill = quillRef.current?.getEditor();
    if (quill) {
      const range = quill.getSelection();
      const position = range ? range.index : quill.getLength();
      quill.insertText(position, `{{${placeholder}}}`);
      quill.setSelection(position + placeholder.length + 4, 0);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) {
      setError('Please enter a test email address');
      return;
    }

    try {
      setIsSending(true);
      setError(null);
      setSuccess(null);

      // Use first recipient's data as test data
      const testData = recipients.length > 0 ? recipients[0].data : {};

      await EmailBlastService.sendTestEmail(form.id, {
        recipientEmail: testEmail,
        subject,
        htmlContent,
        testData,
      });

      setSuccess('Test email sent successfully!');
      setShowTestDialog(false);
      setTestEmail('');
    } catch (err) {
      setError(EmailBlastService.handleApiError(err));
    } finally {
      setIsSending(false);
    }
  };

  const handleSendBlast = async () => {
    if (!subject || !htmlContent) {
      setError('Please fill in both subject and content');
      return;
    }

    if (recipients.length === 0) {
      setError('No valid recipients found');
      return;
    }

    try {
      setIsSending(true);
      setError(null);
      setSuccess(null);

      const result = await EmailBlastService.sendEmailBlast(form.id, {
        subject,
        htmlContent,
      });

      setBlastId(result.blastId);
      setSuccess(`Email blast started! Sending to ${result.totalRecipients} recipients.`);
      setShowConfirmDialog(false);
    } catch (err) {
      setError(EmailBlastService.handleApiError(err));
    } finally {
      setIsSending(false);
    }
  };

  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ color: [] }, { background: [] }],
      [{ align: [] }],
      ['link'],
      ['clean'],
    ],
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-4xl w-full mx-4">
          <div className="flex items-center justify-center">
            <Loader className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-700">Loading recipients...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
        <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 my-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Email Blast</h2>
              <p className="text-sm text-gray-600 mt-1">
                Send bulk emails to {recipients.length} recipient{recipients.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={isSending}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
              <p className="text-sm text-green-800">{success}</p>
            </div>
          )}

          {/* Blast Status */}
          {blastStatus && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Blast Progress</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-blue-700">Total: {blastStatus.total}</span>
                  <span className="text-green-700">Completed: {blastStatus.completed}</span>
                  <span className="text-yellow-700">Active: {blastStatus.active}</span>
                  <span className="text-gray-700">Waiting: {blastStatus.waiting}</span>
                  <span className="text-red-700">Failed: {blastStatus.failed}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(blastStatus.completed / blastStatus.total) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Subject */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter email subject..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isSending || !!blastId}
            />
          </div>

          {/* Placeholders */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Available Placeholders
            </label>
            <div className="flex flex-wrap gap-2">
              {placeholders.map((placeholder) => (
                <button
                  key={placeholder.key}
                  onClick={() => insertPlaceholder(placeholder.key)}
                  className="inline-flex items-center px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-md transition-colors"
                  disabled={isSending || !!blastId}
                  title={placeholder.description}
                >
                  <Copy className="w-3 h-3 mr-1" />
                  {placeholder.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content Editor */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Content
            </label>
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <ReactQuill
                ref={quillRef}
                theme="snow"
                value={htmlContent}
                onChange={setHtmlContent}
                modules={modules}
                placeholder="Compose your email content..."
                className="bg-white"
                readOnly={isSending || !!blastId}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              disabled={isSending}
            >
              Close
            </button>
            <button
              onClick={() => setShowTestDialog(true)}
              className="px-4 py-2 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors inline-flex items-center"
              disabled={isSending || !!blastId || !subject || !htmlContent}
            >
              <Mail className="w-4 h-4 mr-2" />
              Send Test
            </button>
            <button
              onClick={() => setShowConfirmDialog(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors inline-flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSending || !!blastId || !subject || !htmlContent || recipients.length === 0}
            >
              {isSending ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Blast
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Test Email Dialog */}
      {showTestDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Send Test Email</h3>
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="Enter test email address..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowTestDialog(false);
                  setTestEmail('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                disabled={isSending}
              >
                Cancel
              </button>
              <button
                onClick={handleTestEmail}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors inline-flex items-center"
                disabled={isSending || !testEmail}
              >
                {isSending ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Test
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Email Blast</h3>
            <p className="text-gray-700 mb-6">
              Are you sure you want to send this email to <strong>{recipients.length}</strong> recipient{recipients.length !== 1 ? 's' : ''}?
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                disabled={isSending}
              >
                Cancel
              </button>
              <button
                onClick={handleSendBlast}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors inline-flex items-center"
                disabled={isSending}
              >
                {isSending ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Yes, Send Blast
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

