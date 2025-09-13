import { apiClient, API_ENDPOINTS, ApiError } from './api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'admin';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by_name?: string;
  created_by_email?: string;
  active_forms_count?: number;
  total_submissions_count?: number;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role?: 'super_admin' | 'admin';
  is_active?: boolean;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  password?: string;
  role?: 'super_admin' | 'admin';
  is_active?: boolean;
}

export interface UsersResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export class UsersService {
  // Get all users (super admin only)
  static async getUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    is_active?: string;
  }): Promise<UsersResponse> {
    try {
      const queryParams: Record<string, any> = {};
      
      if (params?.page) queryParams.page = params.page;
      if (params?.limit) queryParams.limit = params.limit;
      if (params?.search) queryParams.search = params.search;
      if (params?.role) queryParams.role = params.role;
      if (params?.is_active !== undefined) queryParams.is_active = params.is_active;

      return await apiClient.get<UsersResponse>(API_ENDPOINTS.USERS.LIST, queryParams);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to fetch users', 500);
    }
  }

  // Get user by ID (super admin only)
  static async getUserById(id: string): Promise<{ user: User }> {
    try {
      return await apiClient.get<{ user: User }>(API_ENDPOINTS.USERS.GET(id));
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to fetch user', 500);
    }
  }

  // Create new user (super admin only)
  static async createUser(userData: CreateUserRequest): Promise<{ message: string; user: User }> {
    try {
      return await apiClient.post<{ message: string; user: User }>(API_ENDPOINTS.USERS.CREATE, userData);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to create user', 500);
    }
  }

  // Update user (super admin only)
  static async updateUser(id: string, userData: UpdateUserRequest): Promise<{ message: string; user: User }> {
    try {
      return await apiClient.put<{ message: string; user: User }>(API_ENDPOINTS.USERS.UPDATE(id), userData);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to update user', 500);
    }
  }

  // Delete user (super admin only)
  static async deleteUser(id: string): Promise<{ message: string; deletedUser: User }> {
    try {
      return await apiClient.delete<{ message: string; deletedUser: User }>(API_ENDPOINTS.USERS.DELETE(id));
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to delete user', 500);
    }
  }

  // Get current user profile
  static async getCurrentUserProfile(): Promise<{ user: User }> {
    try {
      return await apiClient.get<{ user: User }>(API_ENDPOINTS.USERS.PROFILE);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to fetch user profile', 500);
    }
  }

  // Update current user profile
  static async updateCurrentUserProfile(userData: {
    name?: string;
    email?: string;
    password?: string;
  }): Promise<{ message: string; user: User }> {
    try {
      return await apiClient.put<{ message: string; user: User }>(API_ENDPOINTS.USERS.PROFILE, userData);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to update user profile', 500);
    }
  }

  // Change password with current password validation
  static async changePassword(passwordData: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<{ message: string }> {
    try {
      return await apiClient.put<{ message: string }>(API_ENDPOINTS.USERS.CHANGE_PASSWORD, passwordData);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to change password', 500);
    }
  }

  // Handle API errors with user-friendly messages
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

export default UsersService;