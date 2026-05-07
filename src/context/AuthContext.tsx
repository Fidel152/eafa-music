import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthState, UserRole } from '../types';
import { api } from '../lib/api';

interface AuthContextType extends AuthState {
  login: (name: string) => Promise<{ success: boolean; role?: UserRole }>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<AuthState['user']>) => void;
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
        const user = JSON.parse(savedUser);
        // Migration: Ensure user has 'id' even if stored as 'uid'
        if (user && user.uid && !user.id) {
          user.id = user.uid;
        }
        
        setState({
          user: user,
          loading: false,
        });

        // Background sync to ensure ID is still valid/correct in members table
        if (user.displayName) {
          api.auth.loginByName(user.displayName)
            .then(res => {
              if (res.success && res.user.id !== user.id) {
                console.log("Syncing user ID:", user.id, "->", res.user.id);
                updateUser({ id: res.user.id, role: res.user.role });
              }
            })
            .catch(err => console.warn("Failed to background sync user:", err));
        }
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
          id: response.user.id,
          displayName: response.user.displayName,
          role: response.user.role as UserRole,
          avatarUrl: response.user.avatarUrl,
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

  const updateUser = (updates: any) => {
    setState(prev => {
      if (!prev.user) return prev;
      const newUser = { ...prev.user, ...updates };
      localStorage.setItem('app_user', JSON.stringify(newUser));
      return { ...prev, user: newUser };
    });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, updateUser }}>
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
