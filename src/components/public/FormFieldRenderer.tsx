import {
  AlertCircle,
  Calendar,
  CheckSquare,
  Hash,
  List,
  Mail,
  MessageSquare,
  Type,
  Upload,
} from "lucide-react";
import { FormField } from "../../types";
import { FileUploadField } from "../forms/FileUploadField";

interface FormFieldRendererProps {
  field: FormField;
  value: any;
  hasError: any;
  validationErrors: Record<string, string>;
  formData: Record<string, any>;
  filesMap: Record<string, File>;
  handleInputChange: (fieldId: string, value: any) => void;
  setFormData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
}

export function FormFieldRenderer({
  field,
  value,
  hasError,
  validationErrors,
  formData,
  filesMap,
  handleInputChange,
  setFormData,
}: FormFieldRendererProps) {
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
      case "multiselect":
        return List;
      case "checkbox":
        return CheckSquare;
      case "file":
        return Upload;
      default:
        return Type;
    }
  };

  const Icon = getFieldIcon(field.type);
  const baseInputClasses = `w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
    hasError ? "border-red-300 bg-red-50" : "border-gray-300"
  }`;
  const labelClasses = "block text-sm font-medium text-gray-700 mb-2";

  switch (field.type) {
    case "text":
    case "email":
    case "number":
      return (
        <div key={field.id} className="space-y-2 text-left">
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
                    {field.required && <span className="text-red-500">*</span>}
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
        <div key={field.id} className="space-y-2 text-left">
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
                    {field.required && <span className="text-red-500">*</span>}
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
        <div key={field.id} className="space-y-2 text-left">
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
                    {field.required && <span className="text-red-500">*</span>}
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

    case "multiselect":
      const showOtherInputMulti = formData[`${field.id}_other`] === true;
      return (
        <div key={field.id} className="space-y-3 text-left">
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
                    {field.required && <span className="text-red-500">*</span>}
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
            {field.allow_other && (
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOtherInputMulti}
                  onChange={(e) => {
                    setFormData((prev) => ({
                      ...prev,
                      [`${field.id}_other`]: e.target.checked,
                    }));
                    if (!e.target.checked) {
                      handleInputChange(field.id, value?.filter((v: string) => v !== "Other") || []);
                    }
                  }}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-gray-700">Other</span>
              </label>
            )}
          </div>
          {field.allow_other && showOtherInputMulti && (
            <input
              type="text"
              value={formData[`${field.id}_other_text`] || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  [`${field.id}_other_text`]: e.target.value,
                }))
              }
              placeholder="Please specify..."
              required={field.required && showOtherInputMulti}
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
        <div key={field.id} className="space-y-3 text-left">
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
                    {field.required && <span className="text-red-500">*</span>}
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
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
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
        <div key={field.id} className="space-y-3 text-left">
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
                    {field.required && <span className="text-red-500">*</span>}
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
        <div key={field.id} className="space-y-2 text-left">
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
        <div key={field.id} className="space-y-2 text-left">
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
                    {field.required && <span className="text-red-500">*</span>}
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
}
