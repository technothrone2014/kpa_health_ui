// kpa_health_ui/src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import api from '../api/client';
import { useNavigate } from 'react-router-dom';

interface User {
  Id: number;
  Email: string;
  FirstName?: string;
  LastName?: string;
  PhoneNumber?: string;
  UserName?: string;
  roles?: string[];
  StationId?: number;
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

// Constants for storage keys
const TOKEN_KEY = 'kpa_health_token';
const USER_KEY = 'kpa_health_user';
const AUTH_INITIALIZED_KEY = 'kpa_health_auth_initialized';

const normalizeRoles = (roles?: unknown): string[] => {
  if (Array.isArray(roles)) {
    return roles
      .filter((role): role is string | number => role !== null && role !== undefined)
      .map((role) => String(role).trim())
      .filter(Boolean);
  }

  if (typeof roles === 'string') {
    return roles.trim() ? [roles.trim()] : [];
  }

  return [];
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const isCheckingRef = useRef(false);
  const authCheckPromiseRef = useRef<Promise<boolean> | null>(null);

  // Helper to set token with expiry awareness
  const setToken = (token: string) => {
    localStorage.setItem(TOKEN_KEY, token);
    // Set axios default header
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  };

  // Helper to clear auth data
  const clearAuthData = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(AUTH_INITIALIZED_KEY);
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    setIsAuthenticated(false);
  };

  // Update loadUserFromStorage
  const loadUserFromStorage = (): User | null => {
    try {
      const userStr = localStorage.getItem(USER_KEY);
      if (userStr) {
        const parsed = JSON.parse(userStr);
        parsed.roles = normalizeRoles(parsed.roles ?? parsed.role ?? parsed.Roles);
        return parsed;
      }
    } catch (e) {
      console.error('Failed to parse stored user:', e);
    }
    return null;
  };

  // Update saveUserData
  const saveUserData = (userData: User) => {
    const normalizedRoles = normalizeRoles(userData.roles ?? (userData as any).role ?? (userData as any).Roles);
    
    const userToSave = {
      ...userData,
      roles: normalizedRoles
    };
    
    console.log('💾 saveUserData - Saving user with roles:', userToSave.roles);
    localStorage.setItem(USER_KEY, JSON.stringify(userToSave));
    setUser(userToSave);
    setIsAuthenticated(true);
  };

  const checkAuth = useCallback(async (): Promise<boolean> => {
    // If already checking, return the existing promise
    if (authCheckPromiseRef.current) {
      return authCheckPromiseRef.current;
    }

    // Prevent concurrent checks
    if (isCheckingRef.current) {
      return false;
    }

    isCheckingRef.current = true;

    const checkPromise = (async () => {
      const token = localStorage.getItem(TOKEN_KEY);
      
      if (!token) {
        clearAuthData();
        setIsLoading(false);
        return false;
      }

      // Set token in axios headers
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      try {
        console.log('🔍 checkAuth - Calling /auth/me endpoint...');
        const response = await api.get('/auth/me');
        
        console.log('🔍 checkAuth - Full response:', response);
        console.log('🔍 checkAuth - response.data:', response.data);
        console.log('🔍 checkAuth - response.data.success:', response.data.success);
        console.log('🔍 checkAuth - response.data.user:', response.data.user);
        
        if (response.data.success && response.data.user) {
          const userData = response.data.user;
          
          // ✅ DEBUG: Log the user data from /me endpoint
          console.log('🔍 /auth/me response:', userData);
          console.log('🔍 /auth/me roles:', userData.roles);
          console.log('🔍 /auth/me roles type:', typeof userData.roles);
          console.log('🔍 /auth/me is roles an array?', Array.isArray(userData.roles));
          
          userData.roles = normalizeRoles(userData.roles ?? userData.role ?? userData.Roles);
          
          saveUserData(userData);
          localStorage.setItem(AUTH_INITIALIZED_KEY, 'true');
          return true;
        } else {
          console.warn('🔍 checkAuth - No user in response or success false');
          clearAuthData();
          return false;
        }
      } catch (error: any) {
        console.warn('🔍 checkAuth - Auth check failed:', error.response?.status, error.response?.data?.message);
        console.warn('🔍 checkAuth - Full error:', error);
        
        // Only clear auth data if it's a 401 (unauthorized)
        // Network errors or 5xx errors shouldn't log the user out
        if (error.response?.status === 401) {
          clearAuthData();
        } else {
          // For network errors, keep the user data from storage if available
          const storedUser = loadUserFromStorage();
          if (storedUser) {
            setUser(storedUser);
            setIsAuthenticated(true);
            return true;
          }
        }
        return false;
      } finally {
        setIsLoading(false);
        isCheckingRef.current = false;
        authCheckPromiseRef.current = null;
      }
    })();

    authCheckPromiseRef.current = checkPromise;
    return checkPromise;
  }, []);

  useEffect(() => {
    if (user) {
      // This ensures any component using useAuth() gets updated
      // when user is updated with roles
      setIsAuthenticated(true);
    }
  }, [user]);

  // AuthContext.tsx - FIXED loginWithPassword function
  const loginWithPassword = async (identifier: string, password: string) => {
    try {
      const response = await api.post('/auth/login/password', { identifier, password });
      
      // ❌ REMOVE REDIRECTION FROM HERE - token isn't available yet!
      // The redirection should happen after OTP verification
      
      return response.data;
    } catch (error: any) {
      console.error('Login error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed. Please try again.'
      };
    }
  };

  // AuthContext.tsx - FIXED loginWithOTP function
  const loginWithOTP = async (identifier: string) => {
    try {
      const response = await api.post('/auth/login/otp', { identifier });
      // No redirection here - wait for OTP verification
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
      
      console.log('🔍 verifyOTP - Full response:', response.data);
      console.log('🔍 verifyOTP - Response roles:', response.data.roles);
      
      if (response.data.success && response.data.token) {
        setToken(response.data.token);
        
        // ✅ CRITICAL FIX: Extract roles from the response
        const roles = normalizeRoles(response.data.roles ?? response.data.user?.roles ?? response.data.user?.role ?? response.data.user?.Roles);
        
        if (response.data.user) {
          // ✅ Merge roles into user data
          const userData = {
            ...response.data.user,
            roles,
          };
          console.log('🔍 verifyOTP - User data with roles being saved:', userData);
          saveUserData(userData);
        } else {
          // Fallback: If no user object, try to fetch it
          console.warn('🔍 verifyOTP - No user object in response, fetching from /me');
          await checkAuth();
        }
        
        return {
          ...response.data,
          roles: roles
        };
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
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      try {
        await api.post('/auth/logout');
      } catch (error) {
        console.error('Logout API error:', error);
        // Continue with local logout even if API fails
      }
    }
    clearAuthData();
    // Redirect handled by router
  };

  // Initialize auth on mount
  useEffect(() => {
    const initAuth = async () => {
      console.log('🔄 initAuth - Starting auth initialization...');
      // First, try to load user from storage for immediate UI
      const storedUser = loadUserFromStorage();
      const storedToken = localStorage.getItem(TOKEN_KEY);
      
      if (storedUser && storedToken) {
        console.log('🔄 initAuth - Found stored user and token, setting initial state...');
        setUser(storedUser);
        setIsAuthenticated(true);
        api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      }
      
      // Then validate with server
      setIsLoading(true);
      await checkAuth();
      console.log('🔄 initAuth - Auth initialization complete');
    };
    
    initAuth();
  }, [checkAuth]);

  // Set up axios interceptor for token handling
  useEffect(() => {
    // Request interceptor - add token
    const requestInterceptor = api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem(TOKEN_KEY);
        if (token && !config.headers.Authorization) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle 401 errors
    const responseInterceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        // Don't handle 401 for auth endpoints (prevents loops)
        const isAuthEndpoint = error.config?.url?.includes('/auth/');
        
        if (error.response?.status === 401 && !isAuthEndpoint && !error.config?._retry) {
          error.config._retry = true;
          
          // Clear auth data on 401
          clearAuthData();
          
          // Redirect to login if not already there
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
        }
        
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.request.eject(requestInterceptor);
      api.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  const value = {
    user,
    isLoading,
    isAuthenticated,
    loginWithPassword,
    loginWithOTP,
    verifyOTP,
    logout,
    checkAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};