import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthState, UserRole } from '../types';
import { api } from '../lib/api';

interface AuthContextType extends AuthState {
  login: (name: string) => Promise<{ success: boolean; role?: UserRole }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
  });

  useEffect(() => {
    // Basic session recovery from localStorage
    const savedUser = localStorage.getItem('app_user');
    if (savedUser) {
      try {
        setState({
          user: JSON.parse(savedUser),
          loading: false,
        });
      } catch (e) {
        localStorage.removeItem('app_user');
        renderDefault();
      }
    } else {
      renderDefault();
    }
    
    function renderDefault() {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  const login = async (name: string) => {
    try {
      const response = await api.auth.loginByName(name);
      if (response.success) {
        const user = {
          uid: response.user.id,
          displayName: response.user.displayName,
          role: response.user.role as UserRole,
        };
        localStorage.setItem('app_user', JSON.stringify(user));
        setState({ user, loading: false });
        return { success: true, role: user.role };
      }
      return { success: false };
    } catch (error: any) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const logout = async () => {
    await api.auth.logout();
    localStorage.removeItem('app_user');
    setState({ user: null, loading: false });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
