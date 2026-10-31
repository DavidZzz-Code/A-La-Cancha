import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase, authConfigurationError } from './client';
type AuthState = { session: Session | null; loading: boolean; error: string | null };
const Context = createContext<AuthState>({ session: null, loading: true, error: null });
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ session: null, loading: !!supabase, error: authConfigurationError });
  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let active = true; let revision = 0;
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      revision++;
      if (active) setState({ session, loading: false, error: null });
    });
    const initialRevision = revision;
    client.auth.getSession().then(({ data, error }) => {
      if (active && revision === initialRevision) setState({ session: error ? null : data.session, loading: false, error: error ? 'No pudimos restaurar tu sesión. Intenta iniciar sesión.' : null });
    }).catch(() => { if (active && revision === initialRevision) setState({ session: null, loading: false, error: 'No pudimos restaurar tu sesión.' }); });
    const refresh = (status: string) => { if (status === 'active') client.auth.startAutoRefresh(); else client.auth.stopAutoRefresh(); };
    if (Platform.OS !== 'web') refresh(AppState.currentState);
    const listener = Platform.OS !== 'web' ? AppState.addEventListener('change', refresh) : null;
    return () => { active = false; subscription.unsubscribe(); listener?.remove(); if (Platform.OS !== 'web') client.auth.stopAutoRefresh(); };
  }, []);
  return <Context.Provider value={state}>{children}</Context.Provider>;
}
export const useAuth = () => useContext(Context);
