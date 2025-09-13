import { apiClient, API_ENDPOINTS, ApiError } from './api';
import { FormSubmission } from '../types';

// Submission request/response types
export interface SubmitFormRequest {
  formId: string;
  responses: Record<string, any>;
}

export interface SubmissionResponse {
  message: string;
  submission: FormSubmission;
}

export interface SubmissionsListResponse {
  submissions: FormSubmission[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalSubmissions: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface SubmissionListParams {
  page?: number;
  limit?: number;
  formId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

// Submissions service
export class SubmissionsService {
  // Submit a form
  static async submitForm(data: SubmitFormRequest): Promise<SubmissionResponse> {
    try {
      return await apiClient.post<SubmissionResponse>(API_ENDPOINTS.SUBMISSIONS.SUBMIT, data);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to submit form', 500);
    }
  }

  // Get all submissions with pagination and filters
  static async getSubmissions(params: SubmissionListParams = {}): Promise<SubmissionsListResponse> {
    try {
      const queryParams: Record<string, any> = {};
      
      if (params.page) queryParams.page = params.page;
      if (params.limit) queryParams.limit = params.limit;
      if (params.formId) queryParams.formId = params.formId;
      if (params.search) queryParams.search = params.search;
      if (params.startDate) queryParams.startDate = params.startDate;
      if (params.endDate) queryParams.endDate = params.endDate;

      return await apiClient.get<SubmissionsListResponse>(API_ENDPOINTS.SUBMISSIONS.LIST, queryParams);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to fetch submissions', 500);
    }
  }

  // Get submissions for a specific form
  static async getFormSubmissions(formId: string, params: SubmissionListParams = {}): Promise<SubmissionsListResponse> {
    try {
      const queryParams: Record<string, any> = {};
      
      if (params.page) queryParams.page = params.page;
      if (params.limit) queryParams.limit = params.limit;
      if (params.search) queryParams.search = params.search;
      if (params.startDate) queryParams.startDate = params.startDate;
      if (params.endDate) queryParams.endDate = params.endDate;

      return await apiClient.get<SubmissionsListResponse>(API_ENDPOINTS.SUBMISSIONS.BY_FORM(formId), queryParams);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to fetch form submissions', 500);
    }
  }

  // Get single submission by ID
  static async getSubmission(id: string): Promise<{ submission: FormSubmission }> {
    try {
      return await apiClient.get<{ submission: FormSubmission }>(API_ENDPOINTS.SUBMISSIONS.GET(id));
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to fetch submission', 500);
    }
  }

  // Delete submission
  static async deleteSubmission(id: string): Promise<{ message: string; deletedSubmission: { id: string; formTitle: string } }> {
    try {
      return await apiClient.delete(API_ENDPOINTS.SUBMISSIONS.DELETE(id));
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to delete submission', 500);
    }
  }

  // Export submissions as Excel
  static async exportSubmissions(formId: string): Promise<void> {
    try {
      await apiClient.downloadFile(API_ENDPOINTS.SUBMISSIONS.EXPORT(formId), `form-${formId}-submissions.xlsx`);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to export submissions', 500);
    }
  }

  // Update submission responses
  static async updateSubmission(id: string, responses: Record<string, any>): Promise<{
    message: string;
    submission: FormSubmission;
  }> {
    try {
      return await apiClient.put<{ message: string; submission: FormSubmission }>(API_ENDPOINTS.SUBMISSIONS.UPDATE(id), { responses });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to update submission', 500);
    }
  }

  // Delete submission (using the correct endpoint)
  static async deleteSubmissionById(id: string): Promise<{
    message: string;
    deletedSubmission: {
      id: string;
      formTitle: string;
      submitterEmail?: string;
    };
  }> {
    try {
      return await apiClient.delete<{
        message: string;
        deletedSubmission: {
          id: string;
          formTitle: string;
          submitterEmail?: string;
        };
      }>(API_ENDPOINTS.SUBMISSIONS.DELETE_SUBMISSION(id));
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to delete submission', 500);
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
        return 'Submission not found or you do not have permission to access it.';
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

export default SubmissionsService;