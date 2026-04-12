import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../api/client';

interface User {
  Id: number;
  Email: string;
  FirstName?: string;
  LastName?: string;
  PhoneNumber?: string;
  UserName?: string;
  roles?: string[];
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  loginWithPassword: (identifier: string, password: string) => Promise<{
    success: boolean;
    message: string;
    requiresOTP?: boolean;
    roles?: string[];
  }>;
  loginWithOTP: (identifier: string) => Promise<{
    success: boolean;
    message: string;
    requiresOTP?: boolean;
    roles?: string[];
  }>;
  verifyOTP: (identifier: string, otp: string) => Promise<{
    success: boolean;
    message: string;
    token?: string;
    user?: User;
    roles?: string[];
  }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const checkAuth = async (): Promise<boolean> => {
    const token = localStorage.getItem('token');
    if (!token) {
      setIsAuthenticated(false);
      setUser(null);
      return false;
    }

    try {
      const response = await api.get('/auth/me');
      if (response.data.success) {
        setUser(response.data.user);
        setIsAuthenticated(true);
        return true;
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        setIsAuthenticated(false);
        setUser(null);
        return false;
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      setIsAuthenticated(false);
      setUser(null);
      return false;
    }
  };

  const loginWithPassword = async (identifier: string, password: string) => {
    try {
      const response = await api.post('/auth/login/password', { identifier, password });
      return response.data;
    } catch (error: any) {
      console.error('Login error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed. Please try again.'
      };
    }
  };

  const loginWithOTP = async (identifier: string) => {
    try {
      const response = await api.post('/auth/login/otp', { identifier });
      return response.data;
    } catch (error: any) {
      console.error('OTP login error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'OTP login failed. Please try again.'
      };
    }
  };

  const verifyOTP = async (identifier: string, otp: string) => {
    try {
      const response = await api.post('/auth/verify-otp', { identifier, otp });
      if (response.data.success && response.data.token) {
        localStorage.setItem('token', response.data.token);
        if (response.data.refreshToken) {
          localStorage.setItem('refreshToken', response.data.refreshToken);
        }
        setUser(response.data.user);
        setIsAuthenticated(true);
      }
      return response.data;
    } catch (error: any) {
      console.error('OTP verification error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Verification failed. Please try again.'
      };
    }
  };

  const logout = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        await api.post('/auth/logout', {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    setUser(null);
    setIsAuthenticated(false);
  };

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      await checkAuth();
      setIsLoading(false);
    };
    initAuth();
  }, []);

  // Set up axios interceptor to add token to requests
  useEffect(() => {
    const interceptor = api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    return () => {
      api.interceptors.request.eject(interceptor);
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        loginWithPassword,
        loginWithOTP,
        verifyOTP,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
