import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/services';
import { session } from '../api/client';
import type { UserInfo } from '../api/types';
import { registerForPush, unregisterForPush } from '../push';

interface AuthState {
  user: UserInfo | null;
  ready: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    session.hydrate().then((u) => {
      setUser(u);
      setReady(true);
      if (u) registerForPush(); // oturum zaten açıksa cihazı kaydet
    });
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      ready,
      async login(username, password) {
        const auth = await authApi.login(username, password);
        await session.save(auth);
        setUser(auth.user);
        registerForPush(); // push cihazını kaydet (best-effort)
      },
      async logout() {
        await unregisterForPush(); // bu cihaza artık bildirim gitmesin
        await session.clear();
        setUser(null);
      },
    }),
    [user, ready]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth AuthProvider içinde kullanılmalı');
  return ctx;
}
