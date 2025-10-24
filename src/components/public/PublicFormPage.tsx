import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle,
  CheckSquare,
  Hash,
  List,
  Mail,
  MessageSquare,
  Send,
  Type,
  Upload,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import FormsService from "../../services/forms";
import SubmissionsService from "../../services/submissions";
import { getBannerUrl } from "../../services/api";
import { Form, FormField } from "../../types";
import { FileUploadField } from "../forms/FileUploadField";

interface PublicFormPageProps {
  formId: string;
  form?: Form; // Optional pre-fetched form data
}

// Function to parse text and convert URLs to clickable links
const parseTextWithLinks = (text: string) => {
  if (!text) return null;

  // Regular expression to match URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline break-all"
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

export function PublicFormPage({
  formId,
  form: preloadedForm,
}: PublicFormPageProps) {
  const [form, setForm] = useState<Form | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [filesMap, setFilesMap] = useState<Record<string, File>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [submissionResponse, setSubmissionResponse] = useState<any>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    const fetchForm = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Use preloaded form if available, otherwise fetch from API
        if (preloadedForm && preloadedForm.is_active) {
          setForm(preloadedForm);
        } else if(preloadedForm && !preloadedForm.is_active){
          setError(
            "For any assistance or inquiries, please contact your hello.ontheground@gmail.com"
          );
        } 
        else {
          const response = await FormsService.getForm(formId);
          if (response.form && response.form.is_active) {
            setForm(response.form);
          } else {
            setError(
              "For any assistance or inquiries, please contact your hello.ontheground@gmail.com"
            );
          }
        }
      } catch (error) {
        const errorMessage = FormsService.handleApiError(error);
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchForm();
  }, [formId, preloadedForm]);

  const handleInputChange = (fieldId: string, value: any) => {
    // Check if the value is a File object
    if (value instanceof File) {
      setFilesMap((prev) => ({
        ...prev,
        [fieldId]: value,
      }));
      setFormData((prev) => ({
        ...prev,
        [fieldId]: value.name,
      }));
    } else if (value === null) {
      // File was removed
      setFilesMap((prev) => {
        const newFiles = { ...prev };
        delete newFiles[fieldId];
        return newFiles;
      });
      setFormData((prev) => ({
        ...prev,
        [fieldId]: "",
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [fieldId]: value,
      }));
    }

    // Clear validation error when user starts typing
    if (validationErrors[fieldId]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    form?.fields.forEach((field) => {
      if (field.required) {
        const value = formData[field.id];
        if (
          !value ||
          (Array.isArray(value) && value.length === 0) ||
          value.toString().trim() === ""
        ) {
          errors[field.id] = `${field.label} is required`;
        }
      }

      // Email validation
      if (field.type === "email" && formData[field.id]) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData[field.id])) {
          errors[field.id] = "Please enter a valid email address";
        }
      }
    });

    // Terms and conditions validation
    if (form?.show_terms_checkbox && !termsAccepted) {
      errors["terms"] = "You must accept the terms and conditions to proceed";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Submit to backend
      const response = await SubmissionsService.submitForm(
        {
          formId: form!.id,
          responses: formData,
        },
        Object.keys(filesMap).length > 0 ? filesMap : undefined
      );

      setSubmissionResponse(response);
      setSubmitted(true);
      setFormData({});
      setFilesMap({});
    } catch (error) {
      const errorMessage = SubmissionsService.handleApiError(error);
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFieldIcon = (type: FormField["type"]) => {
    switch (type) {
      case "email":
        return Mail;
      case "textarea":
        return MessageSquare;
      case "number":
        return Hash;
      case "date":
        return Calendar;
      case "select":
        return List;
      case "checkbox":
        return CheckSquare;
      case "file":
        return Upload;
      default:
        return Type;
    }
  };

  const renderField = (field: FormField) => {
    const Icon = getFieldIcon(field.type);
    const value = formData[field.id] || "";
    const hasError = validationErrors[field.id];

    const baseInputClasses = `w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
      hasError ? "border-red-300 bg-red-50" : "border-gray-300"
    }`;
    const labelClasses = "block text-sm font-medium text-gray-700 mb-2";

    switch (field.type) {
      case "text":
      case "email":
      case "number":
        return (
          <div key={field.id} className="space-y-2">
            <label className={labelClasses}>
              <div className="flex items-center gap-2">
                <Icon size={16} className="text-gray-500" />
                <div>
                  <div>
                    {field.label}
                    {field.required && <span className="text-red-500">*</span>}
                  </div>
                  {field.secondary_label && (
                    <div className="text-sm text-gray-600 italic">
                      {field.secondary_label}
                      {field.required && (
                        <span className="text-red-500">*</span>
                      )}
                    </div>
                  )}
                </div>
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
            {hasError && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle size={14} />
                {validationErrors[field.id]}
              </p>
            )}
          </div>
        );

      case "textarea":
        return (
          <div key={field.id} className="space-y-2">
            <label className={labelClasses}>
              <div className="flex items-center gap-2">
                <Icon size={16} className="text-gray-500" />
                <div>
                  <div>
                    {field.label}
                    {field.required && <span className="text-red-500">*</span>}
                  </div>
                  {field.secondary_label && (
                    <div className="text-sm text-gray-600 italic">
                      {field.secondary_label}
                      {field.required && (
                        <span className="text-red-500">*</span>
                      )}
                    </div>
                  )}
                </div>
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
            {hasError && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle size={14} />
                {validationErrors[field.id]}
              </p>
            )}
          </div>
        );

      case "select":
        const showOtherInput = formData[`${field.id}_other`] === true;
        return (
          <div key={field.id} className="space-y-2">
            <label className={labelClasses}>
              <div className="flex items-center gap-2">
                <Icon size={16} className="text-gray-500" />
                <div>
                  <div>
                    {field.label}
                    {field.required && <span className="text-red-500">*</span>}
                  </div>
                  {field.secondary_label && (
                    <div className="text-sm text-gray-600 italic">
                      {field.secondary_label}
                      {field.required && (
                        <span className="text-red-500">*</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </label>
            <select
              value={
                showOtherInput
                  ? "Other"
                  : field.options?.includes(value)
                  ? value
                  : ""
              }
              onChange={(e) => {
                if (e.target.value === "Other") {
                  setFormData((prev) => ({
                    ...prev,
                    [`${field.id}_other`]: true,
                  }));
                  handleInputChange(field.id, "");
                } else {
                  setFormData((prev) => ({
                    ...prev,
                    [`${field.id}_other`]: false,
                  }));
                  handleInputChange(field.id, e.target.value);
                }
              }}
              required={field.required}
              className={baseInputClasses}
            >
              <option value="">Select an option...</option>
              {field.options?.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
              {field.allow_other && <option value="Other">Other</option>}
            </select>
            {field.allow_other && showOtherInput && (
              <input
                type="text"
                value={value}
                onChange={(e) => handleInputChange(field.id, e.target.value)}
                placeholder="Please specify..."
                required={field.required}
                className={baseInputClasses}
                autoFocus
              />
            )}
            {hasError && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle size={14} />
                {validationErrors[field.id]}
              </p>
            )}
          </div>
        );

      case "radio":
        return (
          <div key={field.id} className="space-y-3">
            <label className={labelClasses}>
              <div className="flex items-center gap-2">
                <Icon size={16} className="text-gray-500" />
                <div>
                  <div>
                    {field.label}
                    {field.required && <span className="text-red-500">*</span>}
                  </div>
                  {field.secondary_label && (
                    <div className="text-sm text-gray-600 italic">
                      {field.secondary_label}
                      {field.required && (
                        <span className="text-red-500">*</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </label>
            <div className="space-y-2">
              {field.options?.map((option) => (
                <label
                  key={option}
                  className="flex items-center space-x-3 cursor-pointer"
                >
                  <input
                    type="radio"
                    name={field.id}
                    value={option}
                    checked={value === option}
                    onChange={(e) =>
                      handleInputChange(field.id, e.target.value)
                    }
                    required={field.required}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">{option}</span>
                </label>
              ))}
            </div>
            {hasError && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle size={14} />
                {validationErrors[field.id]}
              </p>
            )}
          </div>
        );

      case "checkbox":
        return (
          <div key={field.id} className="space-y-3">
            <label className={labelClasses}>
              <div className="flex items-center gap-2">
                <Icon size={16} className="text-gray-500" />
                <div>
                  <div>
                    {field.label}
                    {field.required && <span className="text-red-500">*</span>}
                  </div>
                  {field.secondary_label && (
                    <div className="text-sm text-gray-600 italic">
                      {field.secondary_label}
                      {field.required && (
                        <span className="text-red-500">*</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </label>
            <div className="space-y-2">
              {field.options?.map((option) => (
                <label
                  key={option}
                  className="flex items-center space-x-3 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    value={option}
                    checked={(value || []).includes(option)}
                    onChange={(e) => {
                      const currentValues = value || [];
                      if (e.target.checked) {
                        handleInputChange(field.id, [...currentValues, option]);
                      } else {
                        handleInputChange(
                          field.id,
                          currentValues.filter((v: string) => v !== option)
                        );
                      }
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-gray-700">{option}</span>
                </label>
              ))}
            </div>
            {hasError && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle size={14} />
                {validationErrors[field.id]}
              </p>
            )}
          </div>
        );

      case "date":
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
            {hasError && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle size={14} />
                {validationErrors[field.id]}
              </p>
            )}
          </div>
        );

      case "file":
        return (
          <div key={field.id} className="space-y-2">
            <label className={labelClasses}>
              <div className="flex items-center gap-2">
                <Icon size={16} className="text-gray-500" />
                <div>
                  <div>
                    {field.label}
                    {field.required && <span className="text-red-500">*</span>}
                  </div>
                  {field.secondary_label && (
                    <div className="text-sm text-gray-600 italic">
                      {field.secondary_label}
                      {field.required && (
                        <span className="text-red-500">*</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </label>
            <FileUploadField
              field={field}
              value={filesMap[field.id] || null}
              onChange={(file) => handleInputChange(field.id, file)}
            />
            {hasError && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle size={14} />
                {validationErrors[field.id]}
              </p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} className="text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Registration Closed
          </h2>
          <div className="text-gray-600 mb-6 whitespace-pre-line">{error}</div>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft size={16} className="mr-2" />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Loading Form
          </h2>
          <p className="text-gray-600">Please wait while we load the form...</p>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Thank you!
          </h2>
          <p className="text-gray-600 mb-6">
            Your response has been submitted successfully. We appreciate your
            time.
          </p>

          {/* Submission Details */}
          {submissionResponse && (
            <div className="mb-6">
              {/* QR Code Display */}
              {submissionResponse.qrCode && (
                <div className="bg-white rounded-lg p-6 border border-gray-200 mb-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Your QR Code
                  </h3>
                  <img
                    src={submissionResponse.qrCode}
                    alt="Submission QR Code"
                    className="mx-auto mb-4"
                  />
                  <p className="text-sm text-gray-600">
                    Save this QR code to easily access your submission details.
                  </p>
                </div>
              )}

              {/* Email Notification Status */}
              {submissionResponse.emailSent !== undefined && (
                <div
                  className={`p-3 rounded-lg ${
                    submissionResponse.emailSent
                      ? "bg-green-50 text-green-800 border border-green-200"
                      : "bg-yellow-50 text-yellow-800 border border-yellow-200"
                  }`}
                >
                  <p className="text-sm">
                    {submissionResponse.emailSent
                      ? "✅ Confirmation email sent successfully"
                      : "⚠️ Could not send confirmation email"}
                  </p>
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => {
              setSubmitted(false);
              setFormData({});
              setSubmissionResponse(null);
            }}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Submit Another Response
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Banner */}
          {getBannerUrl(form.banner_url) && (
            <div className="w-full mb-6">
              <img
                src={getBannerUrl(form.banner_url)}
                alt="Form banner"
                className="w-full h-auto object-contain rounded-lg max-h-64 sm:max-h-80 md:max-h-96"
              />
            </div>
          )}

          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">{form.title}</h1>
            <p className="text-gray-600 mt-2 whitespace-pre-wrap">
              {form.description}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6">
            <div className="space-y-6">{form.fields.map(renderField)}</div>

            {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertCircle size={16} />
                  <span className="font-medium">Error</span>
                </div>
                <p className="text-red-700 mt-1">{error}</p>
              </div>
            )}

            {/* Terms and Conditions */}
            {form.show_terms_checkbox && (
              <div className="mt-6">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="terms-checkbox"
                    checked={termsAccepted}
                    onChange={(e) => {
                      setTermsAccepted(e.target.checked);
                      // Clear validation error when checkbox is checked
                      if (e.target.checked && validationErrors["terms"]) {
                        setValidationErrors((prev) => {
                          const newErrors = { ...prev };
                          delete newErrors["terms"];
                          return newErrors;
                        });
                      }
                    }}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <label
                    htmlFor="terms-checkbox"
                    className="text-sm text-gray-700 leading-relaxed"
                  >
                    {form.terms_text && (
                      <div className="block mb-3 text-justify">
                        {parseTextWithLinks(form.terms_text)}
                      </div>
                    )}
                    {form.terms_secondary_text && (
                      <div className="block mb-3 text-justify italic text-gray-600">
                        {parseTextWithLinks(form.terms_secondary_text)}
                      </div>
                    )}
                    {form.terms_link_url && form.terms_link_text && (
                      <div className="block">
                        <a
                          href={form.terms_link_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline font-medium"
                        >
                          {form.terms_link_text}
                        </a>
                      </div>
                    )}
                  </label>
                </div>
                {validationErrors["terms"] && (
                  <p className="mt-2 text-sm text-red-600">
                    {validationErrors["terms"]}
                  </p>
                )}
              </div>
            )}

            {/* Mandatory field notices */}
            <div className="mt-6">
              <div className="text-sm text-gray-700 space-y-1">
                <p>
                  <strong>*All columns shouldn't be empty</strong>
                </p>
                <p className="italic">*Wajib di isi</p>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                type="submit"
                disabled={
                  isSubmitting || (form.show_terms_checkbox && !termsAccepted)
                }
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
                    Submit
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          Powered by OnTheForm
        </div>
      </div>
    </div>
  );
}
