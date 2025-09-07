import { apiClient, API_ENDPOINTS, ApiError } from './api';
import { User } from '../types';

// Authentication request/response types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  user: User;
  token: string;
  expiresIn: string;
}

export interface ProfileUpdateRequest {
  name?: string;
  email?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// Authentication service
export class AuthService {
  // Login user
  static async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await apiClient.post<LoginResponse>(API_ENDPOINTS.AUTH.LOGIN, credentials);
      
      // Store token in API client
      apiClient.setToken(response.token);
      
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Login failed', 500);
    }
  }

  // Register new user
  static async register(userData: RegisterRequest): Promise<LoginResponse> {
    try {
      const response = await apiClient.post<LoginResponse>(API_ENDPOINTS.AUTH.REGISTER, userData);
      
      // Store token in API client
      apiClient.setToken(response.token);
      
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Registration failed', 500);
    }
  }

  // Get current user info
  static async getCurrentUser(): Promise<{ user: User }> {
    try {
      return await apiClient.get<{ user: User }>(API_ENDPOINTS.AUTH.ME);
    } catch (error) {
      if (error instanceof ApiError && error.isAuthError()) {
        // Clear invalid token
        this.logout();
      }
      throw error;
    }
  }

  // Update user profile
  static async updateProfile(data: ProfileUpdateRequest): Promise<{ message: string; user: User }> {
    try {
      return await apiClient.put<{ message: string; user: User }>(API_ENDPOINTS.AUTH.PROFILE, data);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Profile update failed', 500);
    }
  }

  // Change password
  static async changePassword(data: ChangePasswordRequest): Promise<{ message: string }> {
    try {
      return await apiClient.put<{ message: string }>(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, data);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Password change failed', 500);
    }
  }

  // Logout user
  static async logout(): Promise<void> {
    try {
      // Call logout endpoint if token exists
      const token = apiClient.getToken();
      if (token) {
        await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
      }
    } catch (error) {
      // Ignore logout errors, still clear local data
      console.warn('Logout request failed:', error);
    } finally {
      // Always clear token and local storage
      apiClient.setToken(null);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
    }
  }

  // Check if user is authenticated
  static isAuthenticated(): boolean {
    const token = apiClient.getToken();
    return !!token;
  }

  // Get stored user data
  static getStoredUser(): User | null {
    try {
      const userData = localStorage.getItem('user_data');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error parsing stored user data:', error);
      return null;
    }
  }

  // Store user data
  static storeUser(user: User): void {
    localStorage.setItem('user_data', JSON.stringify(user));
  }

  // Clear stored user data
  static clearStoredUser(): void {
    localStorage.removeItem('user_data');
  }

  // Initialize auth state (call on app startup)
  static async initializeAuth(): Promise<User | null> {
    const token = apiClient.getToken();
    
    if (!token) {
      return null;
    }

    try {
      // Verify token is still valid by fetching user data
      const response = await this.getCurrentUser();
      this.storeUser(response.user);
      return response.user;
    } catch (error) {
      // Token is invalid, clear auth data
      this.logout();
      return null;
    }
  }

  // Handle API errors globally
  static handleApiError(error: unknown): string {
    if (error instanceof ApiError) {
      // Handle specific error types
      if (error.isAuthError()) {
        this.logout();
        return 'Your session has expired. Please log in again.';
      }
      
      if (error.isForbiddenError()) {
        return 'You do not have permission to perform this action.';
      }
      
      if (error.isValidationError()) {
        if (error.details && Array.isArray(error.details)) {
          return error.details.map((detail: any) => detail.msg || detail.message).join(', ');
        }
        return error.message;
      }
      
      if (error.isNotFoundError()) {
        return 'The requested resource was not found.';
      }
      
      return error.message;
    }
    
    if (error instanceof Error) {
      return error.message;
    }
    
    return 'An unexpected error occurred. Please try again.';
  }
}

export default AuthService;