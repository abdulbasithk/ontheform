import { apiClient, API_ENDPOINTS, ApiError } from './api';
import { Form, FormField } from '../types';

// Form request/response types
export interface CreateFormRequest {
  title: string;
  description?: string;
  fields: FormField[];
  isActive?: boolean;
  isDisplayed?: boolean;
}

export interface UpdateFormRequest {
  title: string;
  description?: string;
  fields: FormField[];
  isActive?: boolean;
  isDisplayed?: boolean;
}

export interface FormResponse {
  message: string;
  form: Form;
}

export interface FormsListResponse {
  forms: Form[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalForms: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface FormListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive' | 'all';
}

// Forms service
export class FormsService {
  // Get all forms with pagination and filters
  static async getForms(params: FormListParams = {}): Promise<FormsListResponse> {
    try {
      const queryParams: Record<string, any> = {};
      
      if (params.page) queryParams.page = params.page;
      if (params.limit) queryParams.limit = params.limit;
      if (params.search) queryParams.search = params.search;
      if (params.status && params.status !== 'all') queryParams.status = params.status;

      return await apiClient.get<FormsListResponse>(API_ENDPOINTS.FORMS.LIST, queryParams);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to fetch forms', 500);
    }
  }

  // Get single form by ID
  static async getForm(id: string): Promise<{ form: Form }> {
    try {
      return await apiClient.get<{ form: Form }>(API_ENDPOINTS.FORMS.GET(id));
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to fetch form', 500);
    }
  }

  // Create new form
  static async createForm(formData: CreateFormRequest): Promise<FormResponse> {
    try {
      return await apiClient.post<FormResponse>(API_ENDPOINTS.FORMS.CREATE, formData);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to create form', 500);
    }
  }

  // Update existing form
  static async updateForm(id: string, formData: UpdateFormRequest): Promise<FormResponse> {
    try {
      return await apiClient.put<FormResponse>(API_ENDPOINTS.FORMS.UPDATE(id), formData);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to update form', 500);
    }
  }

  // Delete form
  static async deleteForm(id: string): Promise<{ message: string; deletedForm: { id: string; title: string } }> {
    try {
      return await apiClient.delete(API_ENDPOINTS.FORMS.DELETE(id));
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to delete form', 500);
    }
  }

  // Toggle form active status
  static async toggleFormStatus(id: string): Promise<{ message: string; form: { id: string; title: string; isActive: boolean; updatedAt: string } }> {
    try {
      return await apiClient.patch(API_ENDPOINTS.FORMS.TOGGLE(id));
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to toggle form status', 500);
    }
  }

  // Duplicate form
  static async duplicateForm(id: string): Promise<FormResponse> {
    try {
      return await apiClient.post<FormResponse>(API_ENDPOINTS.FORMS.DUPLICATE(id));
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to duplicate form', 500);
    }
  }

  // Update form settings
  static async updateFormSettings(id: string, settings: {
    uniqueConstraintType?: 'none' | 'ip' | 'field';
    uniqueConstraintField?: string;
    showQrCode?: boolean;
    sendEmailNotification?: boolean;
    showTermsCheckbox?: boolean;
    termsText?: string;
    termsSecondaryText?: string;
    termsLinkUrl?: string;
    termsLinkText?: string;
  }): Promise<{ message: string; form: Form }> {
    try {
      return await apiClient.put<{ message: string; form: Form }>(`${API_ENDPOINTS.FORMS.UPDATE(id)}/settings`, settings);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to update form settings', 500);
    }
  }

  // Upload form banner
  static async uploadBanner(id: string, file: File): Promise<{ message: string; form: Form; bannerUrl: string }> {
    try {
      const formData = new FormData();
      formData.append('banner', file);
      
      return await apiClient.postFormData<{ message: string; form: Form; bannerUrl: string }>(
        `${API_ENDPOINTS.FORMS.LIST}/${id}/banner`, 
        formData
      );
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to upload banner', 500);
    }
  }

  // Delete form banner
  static async deleteBanner(id: string): Promise<{ message: string; form: Form }> {
    try {
      return await apiClient.delete<{ message: string; form: Form }>(`${API_ENDPOINTS.FORMS.LIST}/${id}/banner`);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to delete banner', 500);
    }
  }

  // Validate form data before submission
  static validateFormData(formData: CreateFormRequest | UpdateFormRequest): string[] {
    const errors: string[] = [];

    // Validate title
    if (!formData.title || formData.title.trim().length === 0) {
      errors.push('Form title is required');
    } else if (formData.title.length > 255) {
      errors.push('Form title must be less than 255 characters');
    }

    // Validate description
    if (formData.description && formData.description.length > 1000) {
      errors.push('Form description must be less than 1000 characters');
    }

    // Validate fields
    if (!formData.fields || formData.fields.length === 0) {
      errors.push('At least one field is required');
    } else {
      // Check for duplicate field IDs
      const fieldIds = formData.fields.map(field => field.id);
      const uniqueFieldIds = [...new Set(fieldIds)];
      if (fieldIds.length !== uniqueFieldIds.length) {
        errors.push('Field IDs must be unique');
      }

      // Validate each field
      formData.fields.forEach((field, index) => {
        if (!field.id || field.id.trim().length === 0) {
          errors.push(`Field ${index + 1}: ID is required`);
        }
        
        if (!field.label || field.label.trim().length === 0) {
          errors.push(`Field ${index + 1}: Label is required`);
        }
        
        if (!field.type) {
          errors.push(`Field ${index + 1}: Type is required`);
        } else if (!['text', 'email', 'textarea', 'select', 'radio', 'checkbox', 'number', 'date', 'file'].includes(field.type)) {
          errors.push(`Field ${index + 1}: Invalid field type`);
        }
        
        // Validate options for select, radio, checkbox fields
        if (['select', 'radio', 'checkbox'].includes(field.type)) {
          if (!field.options || field.options.length === 0) {
            errors.push(`Field ${index + 1}: Options are required for ${field.type} fields`);
          }
        }
      });
    }

    return errors;
  }

  // Get the currently displayed form
  static async getDisplayedForm(): Promise<Form> {
    try {
      const response = await apiClient.get<{ form: Form }>(API_ENDPOINTS.FORMS.DISPLAYED);
      return response.form;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to fetch displayed form', 500);
    }
  }

  // Toggle form display status
  static async toggleFormDisplay(formId: string): Promise<FormResponse> {
    try {
      return await apiClient.patch<FormResponse>(API_ENDPOINTS.FORMS.TOGGLE_DISPLAY(formId));
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to toggle form display', 500);
    }
  }

  // Handle API errors with user-friendly messages
  static handleApiError(error: unknown): string {
    if (error instanceof ApiError) {
      if (error.isValidationError()) {
        if (error.details && Array.isArray(error.details)) {
          return error.details.map((detail: any) => detail.msg || detail.message).join(', ');
        }
        return error.message;
      }
      
      if (error.isNotFoundError()) {
        return 'Form not found or you do not have permission to access it.';
      }
      
      if (error.isForbiddenError()) {
        return 'You do not have permission to perform this action.';
      }
      
      return error.message;
    }
    
    if (error instanceof Error) {
      return error.message;
    }
    
    return 'An unexpected error occurred. Please try again.';
  }
}

export default FormsService;