import { createContext, useContext, useMemo, useState, ReactNode } from 'react';
import { authApi } from '../api/services';
import { tokenStore } from '../api/client';
import type { UserInfo } from '../api/types';

interface AuthState {
  user: UserInfo | null;
  isAuthenticated: boolean;
  isManager: boolean;
  canPayroll: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(() => tokenStore.getUser());

  const value = useMemo<AuthState>(
    () => ({
      user,
      isAuthenticated: !!user,
      isManager: user?.role === 'Admin' || user?.role === 'Manager',
      canPayroll: !!user?.canDistributePayroll,
      async login(username, password) {
        const auth = await authApi.login(username, password);
        tokenStore.set(auth);
        setUser(auth.user);
      },
      logout() {
        tokenStore.clear();
        setUser(null);
      },
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth AuthProvider içinde kullanılmalı');
  return ctx;
}
