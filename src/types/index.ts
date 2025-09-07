export interface User {
  id: string;
  name: string;
  email: string;
}

export interface FormField {
  id: string;
  type: 'text' | 'email' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'number' | 'date';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
}

export interface Form {
  id: string;
  title: string;
  description: string;
  fields: FormField[];
  created_at: Date;
  updated_at: Date;
  is_active: boolean;
  submission_count: number;
  unique_constraint_type?: 'none' | 'ip' | 'field';
  unique_constraint_field?: string;
  banner_url?: string;
  show_qr_code?: boolean;
  send_email_notification?: boolean;
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