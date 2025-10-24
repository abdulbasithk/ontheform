export interface User {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'admin';
}

export interface FormField {
  id: string;
  type: 'text' | 'email' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'number' | 'date' | 'file';
  label: string;
  secondary_label?: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  allow_other?: boolean;
  accept?: string; // For file fields: 'image/*', 'image/png', '.pdf', etc.
  maxFileSize?: number; // In bytes, e.g., 5242880 for 5MB
}

export interface Form {
  id: string;
  title: string;
  description: string;
  fields: FormField[];
  created_at: Date;
  updated_at: Date;
  is_active: boolean;
  is_displayed?: boolean;
  submission_count: number;
  unique_constraint_type?: 'none' | 'ip' | 'field';
  unique_constraint_field?: string;
  banner_url?: string;
  show_qr_code?: boolean;
  send_email_notification?: boolean;
  show_terms_checkbox?: boolean;
  terms_text?: string;
  terms_secondary_text?: string;
  terms_link_url?: string;
  terms_link_text?: string;
}

export interface FormSubmission {
  id: string;
  formId: string;
  formTitle: string;
  responses: Record<string, any>;
  submittedAt: Date;
  submitterEmail?: string;
}

export interface DashboardStats {
  totalForms: number;
  totalSubmissions: number;
  averageSubmissions: number;
  recentSubmissions: number;
}

export interface EmailBlastPlaceholder {
  key: string;
  label: string;
  description: string;
}

export interface EmailBlastRecipient {
  email: string;
  data: Record<string, any>;
}

export interface EmailBlastRecipientsResponse {
  formId: string;
  formTitle: string;
  totalSubmissions: number;
  validRecipients: number;
  recipients: EmailBlastRecipient[];
  placeholders: EmailBlastPlaceholder[];
}

export interface EmailBlastJobStatus {
  jobId: string;
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
  progress: number;
  recipientEmail?: string;
  failedReason?: string;
}

export interface EmailBlastStatus {
  blastId: string;
  total: number;
  completed: number;
  failed: number;
  active: number;
  waiting: number;
  overallStatus: 'processing' | 'completed' | 'failed' | 'partial';
  jobs: EmailBlastJobStatus[];
  metadata?: {
    formId: string;
    formTitle: string;
    subject: string;
    totalRecipients: number;
    startedAt: Date;
    userId: string;
    status: string;
  };
}