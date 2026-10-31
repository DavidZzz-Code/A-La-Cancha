import { useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { Button, Label } from '../../components/ui';
import { useAuth } from './AuthProvider';
import { supabase } from './client';
export function AccountPanel() {
  const { session, loading, error } = useAuth();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  const pending = useRef(false);
  if (!supabase) return error ? <Label accessibilityRole="alert">{error}</Label> : null;
  async function submit(action: 'signIn' | 'signOut') {
    if (!supabase || pending.current) return;
    pending.current = true; setBusy(true); setMessage('');
    try {
      const result = action === 'signOut' ? await supabase.auth.signOut() : await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (result.error) setMessage(action === 'signOut' ? 'No pudimos cerrar sesión. Revisa tu conexión e inténtalo de nuevo.' : 'No pudimos iniciar sesión. Revisa tus datos y tu conexión.');
      else setPassword('');
    } catch { setMessage('No pudimos conectar. Inténtalo de nuevo.'); }
    finally { pending.current = false; setBusy(false); }
  }
  return <View style={{ gap: 12, padding: 20 }}>
    <Label accessibilityRole="header">Cuenta de desarrollo</Label>
    <Label>La sesión es real; las canchas y reservas de esta demostración siguen siendo ficticias.</Label>
    {loading ? <Label>Cargando sesión…</Label> : session ? <><Label>Sesión iniciada: {session.user.email}</Label><Button disabled={busy} onPress={() => void submit('signOut')}>Cerrar sesión</Button></> : <>
      <Label>Correo</Label><TextInput accessibilityLabel="Correo de la cuenta" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" editable={!busy} style={{ borderWidth: 1, borderColor: '#D9DFD5', borderRadius: 12, padding: 14 }}/>
      <Label>Contraseña</Label><TextInput accessibilityLabel="Contraseña de la cuenta" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete="current-password" editable={!busy} style={{ borderWidth: 1, borderColor: '#D9DFD5', borderRadius: 12, padding: 14 }}/>
      <Button disabled={busy || !email.trim() || !password} onPress={() => void submit('signIn')}>{busy ? 'Conectando…' : 'Iniciar sesión'}</Button>
      <Label>Acceso inicial para cuentas de prueba provisionadas en Supabase. Registro y recuperación están pendientes.</Label>
    </>}
    {!!(message || error) && <Label accessibilityRole="alert">{message || error}</Label>}
  </View>;
}
