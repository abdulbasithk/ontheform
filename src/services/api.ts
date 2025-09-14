// API service for backend communication
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Utility function to get full banner URL
export const getBannerUrl = (bannerPath: string | undefined): string | undefined => {
  if (!bannerPath) return undefined;
  // If it's already a full URL, return as is
  if (bannerPath.startsWith('http')) return bannerPath;
  
  // For development (API_BASE_URL = '/api'), return the path as is for proxy
  if (API_BASE_URL === '/api') {
    return bannerPath;
  }
  
  // For production, construct full URL
  // API_BASE_URL should be like 'https://api.sodgroup.site/api'
  // bannerPath should be like '/api/forms/uploads/banner-123.png'
  // We need to replace '/api' in bannerPath with the full API_BASE_URL
  const fullUrl = bannerPath.replace('/api', API_BASE_URL);
  return fullUrl;
};

// API response types

// HTTP client class
class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('auth_token');
  }

  // Set authentication token
  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  // Get authentication token
  getToken(): string | null {
    return this.token || localStorage.getItem('auth_token');
  }

  // Build headers
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const token = this.getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }

  // Handle API response
  private async handleResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      
      if (!response.ok) {
        throw new ApiError(data.error || 'Request failed', response.status, data.code, data.details);
      }
      
      return data;
    } else {
      // Handle non-JSON responses (like CSV exports)
      if (!response.ok) {
        throw new ApiError('Request failed', response.status);
      }
      
      return response as any;
    }
  }

  // GET request
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(`${this.baseURL}${endpoint}`);
    
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          url.searchParams.append(key, params[key].toString());
        }
      });
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse<T>(response);
  }

  // POST request
  async post<T>(endpoint: string, data?: any): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  // POST request with FormData (for file uploads)
  async postFormData<T>(endpoint: string, formData: FormData): Promise<T> {
    const token = this.getToken();
    const headers: HeadersInit = {};
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    // Don't set Content-Type for FormData, let browser set it with boundary
    
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    return this.handleResponse<T>(response);
  }

  // PUT request
  async put<T>(endpoint: string, data?: any): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  // PATCH request
  async patch<T>(endpoint: string, data?: any): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  // DELETE request
  async delete<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    return this.handleResponse<T>(response);
  }

  // Download file (for CSV exports)
  async downloadFile(endpoint: string, filename?: string): Promise<void> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(errorData.error || 'Download failed', response.status, errorData.code);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'download';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
}

// Custom API Error class
export class ApiError extends Error {
  public status: number;
  public code?: string;
  public details?: any;

  constructor(message: string, status: number, code?: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  // Check if error is due to authentication
  isAuthError(): boolean {
    return this.status === 401 || this.code === 'TOKEN_EXPIRED' || this.code === 'TOKEN_INVALID';
  }

  // Check if error is due to authorization
  isForbiddenError(): boolean {
    return this.status === 403;
  }

  // Check if error is due to validation
  isValidationError(): boolean {
    return this.status === 400 && this.code === 'VALIDATION_ERROR';
  }

  // Check if error is due to not found
  isNotFoundError(): boolean {
    return this.status === 404;
  }
}

// Create API client instance
export const apiClient = new ApiClient(API_BASE_URL);

// API endpoints
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    ME: '/auth/me',
    LOGOUT: '/auth/logout',
    PROFILE: '/auth/profile',
    CHANGE_PASSWORD: '/auth/change-password',
  },
  
  USERS: {
    LIST: '/users',
    CREATE: '/users',
    GET: (id: string) => `/users/${id}`,
    UPDATE: (id: string) => `/users/${id}`,
    DELETE: (id: string) => `/users/${id}`,
    PROFILE: '/users/profile/me',
    CHANGE_PASSWORD: '/users/change-password',
  },
  // Forms
  FORMS: {
    LIST: '/forms',
    CREATE: '/forms',
    GET: (id: string) => `/forms/${id}`,
    UPDATE: (id: string) => `/forms/${id}`,
    DELETE: (id: string) => `/forms/${id}`,
    TOGGLE: (id: string) => `/forms/${id}/toggle`,
    DUPLICATE: (id: string) => `/forms/${id}/duplicate`,
    DISPLAYED: '/forms/displayed',
    TOGGLE_DISPLAY: (id: string) => `/forms/${id}/display`,
  },
  // Submissions
  SUBMISSIONS: {
    SUBMIT: '/submissions',
    LIST: '/submissions',
    BY_FORM: (formId: string) => `/submissions/form/${formId}`,
    GET: (id: string) => `/submissions/${id}`,
    UPDATE: (id: string) => `/submissions/${id}`,
    DELETE: (id: string) => `/submissions/${id}`,
    DELETE_SUBMISSION: (id: string) => `/submissions/submission/${id}`,
    EXPORT: (formId: string) => `/submissions/export/form/${formId}`,
  },
} as const;

export default apiClient;