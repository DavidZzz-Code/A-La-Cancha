export type AuthConfig = { url: string; key: string } | null;
export function readAuthConfig(url?: string, key?: string): AuthConfig {
  if (!url && !key) return null;
  if (!url || !key) throw new Error('Falta completar la configuración pública de Supabase.');
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) throw new Error('La URL de Supabase debe ser un origen HTTPS.');
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) throw new Error('Usa únicamente una clave publicable de Supabase.');
  return { url: parsed.origin, key };
}
