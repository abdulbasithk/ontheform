import { AlertCircle, ArrowLeft, Send } from "lucide-react";
import React, { useEffect, useState } from "react";
import SubmissionsService from "../../services/submissions";
import { getBannerUrl } from "../../services/api";
import { Form, FormField } from "../../types";
import { FormFieldRenderer } from "./FormFieldRenderer";

interface WizardFormPageProps {
  form: Form;
  onSubmitted: (response: any) => void;
  parseTextWithLinks: (text: string) => any;
}

export function WizardFormPage({
  form,
  onSubmitted,
  parseTextWithLinks,
}: WizardFormPageProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [filesMap, setFilesMap] = useState<Record<string, File>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Group fields by section/step
  // If a field does not have a section, default it to "General Info"
  const sectionsMap = form.fields.reduce((acc: Record<string, FormField[]>, field) => {
    const sectionName = field.section?.trim() || "General Info";
    if (!acc[sectionName]) {
      acc[sectionName] = [];
    }
    acc[sectionName].push(field);
    return acc;
  }, {});

  const sectionKeys = Object.keys(sectionsMap);
  const currentSectionName = sectionKeys[currentStep] || "General Info";
  const currentFields = sectionsMap[currentSectionName] || [];

  // Load saved data from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(`form_draft_${form.id}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFormData(parsed);
      } catch (err) {
        console.error("Failed to parse form draft from localStorage", err);
      }
    }
  }, [form.id]);

  // Save to localStorage whenever formData changes
  const saveDraft = (data: Record<string, any>) => {
    // Exclude file references/names if they are actual File objects in state (localStorage can't store File objects)
    const dataToSave: Record<string, any> = {};
    for (const [key, val] of Object.entries(data)) {
      if (!(val instanceof File)) {
        dataToSave[key] = val;
      }
    }
    localStorage.setItem(`form_draft_${form.id}`, JSON.stringify(dataToSave));
  };

  const handleInputChange = (fieldId: string, value: any) => {
    let updatedFormData = { ...formData };
    if (value instanceof File) {
      setFilesMap((prev) => ({
        ...prev,
        [fieldId]: value,
      }));
      updatedFormData[fieldId] = value.name;
    } else if (value === null) {
      setFilesMap((prev) => {
        const newFiles = { ...prev };
        delete newFiles[fieldId];
        return newFiles;
      });
      updatedFormData[fieldId] = "";
    } else {
      updatedFormData[fieldId] = value;
    }

    setFormData(updatedFormData);
    saveDraft(updatedFormData);

    // Clear validation error when user starts typing
    if (validationErrors[fieldId]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  const validateCurrentFields = (): boolean => {
    const errors: Record<string, string> = {};

    currentFields.forEach((field) => {
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

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateCurrentFields()) {
      setCurrentStep((prev) => Math.min(prev + 1, sectionKeys.length - 1));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Validate all fields in the form
    form.fields.forEach((field) => {
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

      if (field.type === "email" && formData[field.id]) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData[field.id])) {
          errors[field.id] = "Please enter a valid email address";
        }
      }
    });

    // Terms and conditions validation
    if (form.show_terms_checkbox && !termsAccepted) {
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
          formId: form.id,
          responses: formData,
        },
        Object.keys(filesMap).length > 0 ? filesMap : undefined
      );

      // Clear draft on successful submit
      localStorage.removeItem(`form_draft_${form.id}`);
      
      onSubmitted(response);
    } catch (error) {
      const errorMessage = SubmissionsService.handleApiError(error);
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLastStep = currentStep === sectionKeys.length - 1;
  const progressPercent = Math.round(((currentStep + 1) / sectionKeys.length) * 100);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Banner */}
          {getBannerUrl(form.banner_url) && (
            <div className="w-full">
              <img
                src={getBannerUrl(form.banner_url)}
                alt="Form banner"
                className="w-full h-auto object-contain rounded-t-lg max-h-64 sm:max-h-80 md:max-h-96"
              />
            </div>
          )}

          {/* Header */}
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <h1 className="text-2xl font-bold text-gray-900">{form.title}</h1>
            <p className="text-gray-600 mt-2 whitespace-pre-wrap">
              {form.description}
            </p>

            {/* Step Navigation / Progress Bar */}
            {sectionKeys.length > 1 && (
              <div className="mt-6 space-y-2">
                <div className="flex justify-between items-center text-sm font-semibold text-gray-700">
                  <span className="bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider">
                    {currentSectionName}
                  </span>
                  <span>
                    Step {currentStep + 1} of {sectionKeys.length} ({progressPercent}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-300 ease-out"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Form Fields */}
          <form onSubmit={handleSubmit} className="p-6">
            <div className="space-y-6 min-h-[16rem]">
              {currentFields.map((field) => (
                <FormFieldRenderer
                  key={field.id}
                  field={field}
                  value={formData[field.id] || ""}
                  hasError={validationErrors[field.id]}
                  validationErrors={validationErrors}
                  formData={formData}
                  filesMap={filesMap}
                  handleInputChange={handleInputChange}
                  setFormData={setFormData}
                />
              ))}
            </div>

            {/* Error Message */}
            {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertCircle size={16} />
                  <span className="font-medium">Error</span>
                </div>
                <p className="text-red-700 mt-1">{error}</p>
              </div>
            )}

            {/* Terms and Conditions (Only on the last step) */}
            {isLastStep && form.show_terms_checkbox && (
              <div className="mt-6 border-t border-gray-150 pt-6">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="terms-checkbox"
                    checked={termsAccepted}
                    onChange={(e) => {
                      setTermsAccepted(e.target.checked);
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
            <div className="mt-6 border-t border-gray-100 pt-4">
              <div className="text-sm text-gray-700 space-y-1">
                <p>
                  <strong>*All columns shouldn't be empty</strong>
                </p>
                <p className="italic">*Wajib di isi</p>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="mt-8 flex justify-between">
              <div>
                {currentStep > 0 && (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="inline-flex items-center px-5 py-2.5 border border-gray-300 text-gray-750 bg-white rounded-lg hover:bg-gray-100 transition-colors font-medium"
                  >
                    <ArrowLeft size={16} className="mr-2" />
                    Back
                  </button>
                )}
              </div>

              <div>
                {!isLastStep ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="inline-flex items-center px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={
                      isSubmitting || (form.show_terms_checkbox && !termsAccepted)
                    }
                    className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-sm"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send size={18} className="mr-2" />
                        Submit Form
                      </>
                    )}
                  </button>
                )}
              </div>
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
