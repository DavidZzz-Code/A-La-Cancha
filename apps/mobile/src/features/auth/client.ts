import 'react-native-url-polyfill/auto';
import { createClient, processLock } from '@supabase/supabase-js';
import { readAuthConfig } from './config';
import { sessionStorage } from './storage';
let configurationError: string | null = null;
let config: ReturnType<typeof readAuthConfig> = null;
try { config = readAuthConfig(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY); }
catch { configurationError = 'La conexión de cuentas no está configurada correctamente.'; }
export const authConfigurationError = configurationError;
export const supabase = config ? createClient(config.url, config.key, { auth: {
  storage: sessionStorage, persistSession: true, autoRefreshToken: true,
  detectSessionInUrl: false, lock: processLock,
} }) : null;
