import { apiClient, API_ENDPOINTS, ApiError } from './api';
import {
  EmailBlastRecipientsResponse,
  EmailBlastStatus,
  EmailBlastPlaceholder,
} from '../types';

export interface SendTestEmailRequest {
  recipientEmail: string;
  subject: string;
  htmlContent: string;
  testData?: Record<string, any>;
}

export interface SendEmailBlastRequest {
  subject: string;
  htmlContent: string;
}

export interface EmailBlastResponse {
  message: string;
  blastId: string;
  totalRecipients: number;
  status: string;
}

class EmailBlastService {
  // Get recipients with valid emails
  static async getRecipients(formId: string): Promise<EmailBlastRecipientsResponse> {
    try {
      return await apiClient.get<EmailBlastRecipientsResponse>(
        API_ENDPOINTS.EMAIL_BLAST.RECIPIENTS(formId)
      );
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to fetch recipients', 500);
    }
  }

  // Get available placeholders
  static async getPlaceholders(formId: string): Promise<{ placeholders: EmailBlastPlaceholder[] }> {
    try {
      return await apiClient.get<{ placeholders: EmailBlastPlaceholder[] }>(
        API_ENDPOINTS.EMAIL_BLAST.PLACEHOLDERS(formId)
      );
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to fetch placeholders', 500);
    }
  }

  // Send test email
  static async sendTestEmail(
    formId: string,
    data: SendTestEmailRequest
  ): Promise<{ message: string; result: any }> {
    try {
      return await apiClient.post<{ message: string; result: any }>(
        API_ENDPOINTS.EMAIL_BLAST.TEST(formId),
        data
      );
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to send test email', 500);
    }
  }

  // Start email blast
  static async sendEmailBlast(
    formId: string,
    data: SendEmailBlastRequest
  ): Promise<EmailBlastResponse> {
    try {
      return await apiClient.post<EmailBlastResponse>(
        API_ENDPOINTS.EMAIL_BLAST.SEND(formId),
        data
      );
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to start email blast', 500);
    }
  }

  // Get blast status
  static async getBlastStatus(formId: string, blastId: string): Promise<EmailBlastStatus> {
    try {
      return await apiClient.get<EmailBlastStatus>(
        API_ENDPOINTS.EMAIL_BLAST.STATUS(formId, blastId)
      );
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to fetch blast status', 500);
    }
  }

  // Handle API errors
  static handleApiError(error: unknown): string {
    if (error instanceof ApiError) {
      return error.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'An unexpected error occurred';
  }
}

export default EmailBlastService;

