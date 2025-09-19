import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/apiClient';

interface User {
  id: number;
  username: string;
  role: string;
  admin_level: number;
  admin_title: string;
  is_active: boolean;
  email?: string;
  created_at?: string;
  last_login?: string;
  failed_login_attempts: number;
  account_locked_until?: string;
  created_by?: number;
  permissions: Record<string, boolean>;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (
    username: string,
    password: string,
    rememberMe?: boolean
  ) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
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
  const [isInitialized, setIsInitialized] = useState(false);
  const [lastAuthCheck, setLastAuthCheck] = useState<number>(0);
  const navigate = useNavigate();

  // Check if user is authenticated on app load
  useEffect(() => {
    checkAuth();
  }, []);

  // Throttle auth checks to prevent excessive requests
  const shouldCheckAuth = () => {
    const now = Date.now();
    const timeSinceLastCheck = now - lastAuthCheck;
    return timeSinceLastCheck > 120000; // Only check every 2 minutes (increased from 30 seconds)
  };

  const checkAuth = async (forceCheck = false) => {
    // Throttle auth checks unless forced
    if (!forceCheck && !shouldCheckAuth()) {
      return;
    }

    try {
      setIsLoading(true);
      setLastAuthCheck(Date.now());
      
      // Use direct fetch to avoid CSRF token issues during auth check
      const response = await fetch('/api/v1/auth/check', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Cache-Control': 'max-age=120', // Cache for 2 minutes (increased from 30 seconds)
          'X-Requested-With': 'XMLHttpRequest',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.authenticated && data.user) {
          // Only clear cache if user data has actually changed
          const userChanged = !user || user.id !== data.user.id || user.username !== data.user.username;
          if (userChanged) {
            setUser(data.user);
            // Only clear cache when user actually changes
            api.clearCache();
          } else {
            setUser(data.user);
          }
        } else {
          // Only clear cache if we were previously authenticated
          if (user) {
            setUser(null);
            api.clearToken();
            api.clearCache();
          }
        }
      } else {
        // Only clear cache if we were previously authenticated
        if (user) {
          setUser(null);
          api.clearToken();
          api.clearCache();
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      api.clearToken();
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  };

  const login = async (
    username: string,
    password: string,
    rememberMe = false
  ): Promise<{ success: boolean; message: string }> => {
    try {
      setIsLoading(true);

      // Use direct fetch for login to avoid CSRF token issues
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({
          username,
          password,
          remember_me: rememberMe,
        }),
      });

      const data = await response.json();

      if (response.ok && data.user) {
        setUser(data.user);
        // Clear cache and get fresh CSRF token after successful login
        api.clearCache();
        await api.refreshSession();
        return { success: true, message: data.message || 'Login successful' };
      } else {
        return { success: false, message: data.message || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Use direct fetch for logout
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      api.clearToken(); // Clear CSRF token
      api.clearCache(); // Clear all cached data
      setUser(null);
      navigate('/login');
    }
  };

  const clearAuth = () => {
    setUser(null);
    api.clearToken();
    api.clearCache();
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading: isLoading || !isInitialized,
    login,
    logout,
    checkAuth,
    clearAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
