'use client';

import { create } from 'zustand';
import { post, get } from '@/lib/api-client';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId: string | null;
  corporateId: string | null;
  customerId: string | null;
  isSuperAdmin: boolean;
  permissions: string[];
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; firstName: string; lastName: string }) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  canEdit: (module: string) => boolean;
}

export const useAuth = create<AuthState>((set, getState) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email: string, password: string) => {
    const result = await post<AuthResponse>('/users/login', { email, password });
    localStorage.setItem('accessToken', result.accessToken);
    localStorage.setItem('refreshToken', result.refreshToken);
    set({ user: result.user, isAuthenticated: true });
  },

  register: async (data) => {
    await post('/users/register', data);
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null, isAuthenticated: false });
    window.location.href = '/login';
  },

  loadUser: async () => {
    try {
      if (typeof window === 'undefined') { set({ isLoading: false }); return; }
      const token = localStorage.getItem('accessToken');
      if (!token) {
        set({ isLoading: false });
        return;
      }
      const user = await get<User>('/users/me');
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      if (typeof window !== 'undefined') localStorage.removeItem('accessToken');
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  hasPermission: (permission: string) => {
    const user = getState().user;
    if (!user) return false;
    if (user.isSuperAdmin) return true;
    return user.permissions?.includes(permission) ?? false;
  },

  canEdit: (module: string) => {
    const user = getState().user;
    if (!user) return false;
    if (user.isSuperAdmin) return true;
    return user.permissions?.includes(`${module}.edit`) || user.permissions?.includes(`${module}.manage`) || false;
  },
}));
