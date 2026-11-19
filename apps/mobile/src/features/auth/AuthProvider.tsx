import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase, authConfigurationError } from './client';
type AuthState = { session: Session | null; loading: boolean; error: string | null };
const Context = createContext<AuthState & {role:'owner'|'player'|'loading'|'error';retryRole:()=>void}>({role:'loading',retryRole:()=>{}, session: null, loading: true, error: null });
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ session: null, loading: !!supabase, error: authConfigurationError });
  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let active = true; let revision = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const restore = (expectedRevision: number) => {
      void client.auth.getSession().then(({ data, error }) => {
        if (active && revision === expectedRevision) setState({ session: error ? null : data.session, loading: false, error: error ? 'No pudimos restaurar tu sesión. Intenta iniciar sesión.' : null });
      }).catch(() => {
        if (active && revision === expectedRevision) setState({ session: null, loading: false, error: 'No pudimos restaurar tu sesión.' });
      });
    };
    const { data: { subscription } } = client.auth.onAuthStateChange(() => {
      const currentRevision = ++revision;
      // Broadcast events may belong to another tab. Read this client's storage,
      // outside the auth callback lock, before changing the visible identity.
      clearTimeout(timer);
      timer = setTimeout(() => restore(currentRevision), 0);
    });
    restore(revision);
    const refresh = (status: string) => { if (status === 'active') client.auth.startAutoRefresh(); else client.auth.stopAutoRefresh(); };
    if (Platform.OS !== 'web') refresh(AppState.currentState ?? "unknown");
    const listener = Platform.OS !== 'web' ? AppState.addEventListener('change', refresh) : null;
    return () => { active = false; clearTimeout(timer); subscription.unsubscribe(); listener?.remove(); if (Platform.OS !== 'web') client.auth.stopAutoRefresh(); };
  }, []);
  const actor=state.session?.user.id;
  const [membership,setMembership]=useState<{actor:string;role:'owner'|'player'|'error'}|null>(null);
  const [revision,setRevision]=useState(0);
  const retryRole=useCallback(()=>setRevision(v=>v+1),[]);
  useEffect(()=>{
    if(!actor||!supabase)return;
    const controller=new AbortController();
    supabase.from('venue_members').select('venue_id').eq('user_id',actor).limit(1).abortSignal(controller.signal).then(({data,error})=>{
      if(!controller.signal.aborted)setMembership({actor,role:error?'error':data?.length?'owner':'player'});
    });
    return()=>controller.abort();
  },[actor,revision]);
  const role=actor&&membership?.actor===actor?membership.role:'loading';
  return <Context.Provider value={{...state,role,retryRole}}>{children}</Context.Provider>;
}
export const useAuth = () => useContext(Context);
