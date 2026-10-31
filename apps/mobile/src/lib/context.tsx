import { createContext, useContext, useState, useEffect, useSyncExternalStore, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, View, Text } from 'react-native';
import { decode, DemoStore } from './demo-store';
const Context = createContext<DemoStore | null>(null);
const KEY = 'alacancha:demo:v1';
export function Provider({ children }: { children:ReactNode }) {
  const [store] = useState(() => new DemoStore()); const [ready,setReady] = useState(false); const [error,setError] = useState(false);
  useEffect(() => { let active = true; AsyncStorage.getItem(KEY).then((raw) => { if (active) store.restore(decode(raw)); }).catch(() => { if (active) setError(true); }).finally(() => { if (active) setReady(true); }); return () => { active = false; }; },[store]);
  useEffect(() => { if (!ready) return; let queue = Promise.resolve(); return store.subscribe(() => { const raw = JSON.stringify(store.getSnapshot()); queue = queue.then(() => AsyncStorage.setItem(KEY,raw)).catch(() => setError(true)); }); },[ready,store]);
  if (!ready) return <ActivityIndicator accessibilityLabel="Cargando demostración"/>;
  return <Context.Provider value={store}>{error && <View style={{ padding:10,backgroundColor:'#F7E9DF' }}><Text accessibilityRole="alert">No pudimos guardar los cambios en este dispositivo. Se perderán al cerrar.</Text></View>}{children}</Context.Provider>;
}
export function useApp() { const store = useContext(Context); if (!store) throw Error('Falta Provider'); return { ...useSyncExternalStore(store.subscribe,store.getSnapshot,store.getSnapshot), store }; }
