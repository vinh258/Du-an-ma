import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { api, Tokens, tokenStore } from '../lib/api';
import { Role, User } from '../lib/types';

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; fullName: string; studentCode?: string; facultyId?: number }) => Promise<void>;
  logout: () => void;
  reload: () => Promise<void>;
  hasRole: (...roles: Role[]) => boolean;
}

const Ctx = createContext<AuthCtx>(null as unknown as AuthCtx);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!tokenStore.get()) { setUser(null); return; }
    try { setUser((await api.get<User>('/users/me')).data); } catch { tokenStore.clear(); setUser(null); }
  }, []);

  useEffect(() => { reload().finally(() => setLoading(false)); }, [reload]);
  useEffect(() => {
    const out = () => { tokenStore.clear(); setUser(null); };
    window.addEventListener('hub:logout', out);
    return () => window.removeEventListener('hub:logout', out);
  }, []);

  const finish = (d: Tokens & { user: User }) => { tokenStore.set({ accessToken: d.accessToken, refreshToken: d.refreshToken }); setUser(d.user); };

  const value: AuthCtx = {
    user, loading, reload,
    login: async (email, password) => finish((await api.post('/auth/login', { email, password })).data),
    register: async (data) => finish((await api.post('/auth/register', data)).data),
    logout: () => { tokenStore.clear(); setUser(null); },
    hasRole: (...roles) => !!user && roles.includes(user.role),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
