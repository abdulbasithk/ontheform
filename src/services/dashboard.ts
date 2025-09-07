import { apiClient, ApiError } from './api';
import { DashboardStats, Form, FormSubmission } from '../types';

// Dashboard response types
export interface DashboardStatsResponse {
  stats: DashboardStats;
}

export interface RecentSubmissionsResponse {
  submissions: FormSubmission[];
}

export interface ActiveFormsResponse {
  forms: Form[];
}

// Dashboard service
export class DashboardService {
  // Get dashboard statistics
  static async getStats(): Promise<DashboardStats> {
    try {
      const response = await apiClient.get<DashboardStatsResponse>('/dashboard/stats');
      return response.stats;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to fetch dashboard statistics', 500);
    }
  }

  // Get recent submissions
  static async getRecentSubmissions(limit: number = 5): Promise<FormSubmission[]> {
    try {
      const response = await apiClient.get<RecentSubmissionsResponse>('/dashboard/recent-submissions', { limit });
      return response.submissions;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to fetch recent submissions', 500);
    }
  }

  // Get active forms
  static async getActiveForms(limit: number = 10): Promise<Form[]> {
    try {
      const response = await apiClient.get<ActiveFormsResponse>('/dashboard/active-forms', { limit });
      return response.forms;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to fetch active forms', 500);
    }
  }

  // Handle API errors with user-friendly messages
  static handleApiError(error: unknown): string {
    if (error instanceof ApiError) {
      if (error.isNotFoundError()) {
        return 'Dashboard data not found.';
      }
      
      if (error.isForbiddenError()) {
        return 'You do not have permission to view dashboard data.';
      }
      
      return error.message;
    }
    
    if (error instanceof Error) {
      return error.message;
    }
    
    return 'An unexpected error occurred while loading dashboard data.';
  }
}

export default DashboardService;