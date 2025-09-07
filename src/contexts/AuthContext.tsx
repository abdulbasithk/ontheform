import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import AuthService, { LoginRequest, RegisterRequest } from '../services/auth';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateProfile: (data: { name?: string; email?: string }) => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start with loading true
  const [error, setError] = useState<string | null>(null);

  // Initialize authentication state on app startup
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const user = await AuthService.initializeAuth();
        setUser(user);
      } catch (error) {
        console.error('Auth initialization failed:', error);
        setError(AuthService.handleApiError(error));
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const credentials: LoginRequest = { email, password };
      const response = await AuthService.login(credentials);
      
      setUser(response.user);
      AuthService.storeUser(response.user);
      
      return true;
    } catch (error) {
      const errorMessage = AuthService.handleApiError(error);
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const userData: RegisterRequest = { name, email, password };
      const response = await AuthService.register(userData);
      
      setUser(response.user);
      AuthService.storeUser(response.user);
      
      return true;
    } catch (error) {
      const errorMessage = AuthService.handleApiError(error);
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      await AuthService.logout();
      setUser(null);
    } catch (error) {
      // Even if logout fails, clear local state
      console.error('Logout error:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (data: { name?: string; email?: string }): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await AuthService.updateProfile(data);
      
      setUser(response.user);
      AuthService.storeUser(response.user);
      
      return true;
    } catch (error) {
      const errorMessage = AuthService.handleApiError(error);
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      await AuthService.changePassword({ currentPassword, newPassword });
      return true;
    } catch (error) {
      const errorMessage = AuthService.handleApiError(error);
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value = {
    user,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    isLoading,
    error,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}