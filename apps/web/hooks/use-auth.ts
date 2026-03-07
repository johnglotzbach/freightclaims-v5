'use client';

import { create } from 'zustand';
import { post, get } from '@/lib/api-client';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId: string | null;
  roleName: string | null;
  corporateId: string | null;
  corporateName: string | null;
  corporateCode: string | null;
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
  _loaded: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; firstName: string; lastName: string; companyName?: string; jobTitle?: string; companySize?: string; phone?: string }) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  canEdit: (module: string) => boolean;
}

export const useAuth = create<AuthState>((set, getState) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  _loaded: false,

  login: async (email: string, password: string) => {
    const result = await post<AuthResponse>('/users/login', { email, password });
    localStorage.setItem('accessToken', result.accessToken);
    localStorage.setItem('refreshToken', result.refreshToken);
    set({ user: result.user, isAuthenticated: true, _loaded: true, isLoading: false });
  },

  register: async (data) => {
    await post('/users/register', data);
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('fc-impersonate-corporate');
    set({ user: null, isAuthenticated: false, _loaded: false, isLoading: false });
    window.location.href = '/login';
  },

  loadUser: async () => {
    const state = getState();
    if (state._loaded && state.isAuthenticated) return;

    try {
      if (typeof window === 'undefined') { set({ isLoading: false }); return; }
      const token = localStorage.getItem('accessToken');
      if (!token) {
        set({ isLoading: false, _loaded: true });
        return;
      }
      const user = await get<User>('/users/me');
      set({ user, isAuthenticated: true, isLoading: false, _loaded: true });
    } catch {
      if (typeof window !== 'undefined') localStorage.removeItem('accessToken');
      set({ user: null, isAuthenticated: false, isLoading: false, _loaded: true });
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
