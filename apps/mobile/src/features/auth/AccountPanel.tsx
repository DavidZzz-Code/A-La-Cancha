import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { Button, Heading, Label } from '../../components/ui';
import { useAuth } from './AuthProvider';
import { supabase } from './client';

const field = {borderWidth:1,borderColor:'#9BAA99',borderRadius:12,padding:14};
export function AccountPanel() {
  const { session, loading, error } = useAuth();
  const router = useRouter();
  const [register,setRegister] = useState(false);
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState('');
  const pending = useRef(false);
  if (!supabase) return error ? <Label accessibilityRole="alert">{error}</Label> : null;

  async function submit() {
    if (!supabase || pending.current) return;
    pending.current=true;
    setBusy(true);
    setMessage('');
    try {
      if (session) {
        const result=await supabase.auth.signOut();
        if(result.error) setMessage('No pudimos cerrar sesión. Revisa tu conexión e inténtalo de nuevo.');
        return;
      }
      const credentials={email:email.trim(),password};
      const result=register ? await supabase.auth.signUp(credentials) : await supabase.auth.signInWithPassword(credentials);
      if(result.error) {
        if(result.error.status===429) setMessage('Espera unos minutos antes de volver a intentarlo.');
        else if(result.error.code==='weak_password') setMessage('Elige una contraseña más segura e inténtalo de nuevo.');
        else setMessage(register ? 'No pudimos crear la cuenta. Revisa los datos o intenta iniciar sesión si ya tienes cuenta.' : 'No pudimos iniciar sesión. Revisa tus datos y tu conexión.');
        return;
      }
      setPassword('');
      if(result.data.session) router.replace('/');
      else {
        setRegister(false);
        setMessage('Revisa tu correo para confirmar la dirección. Después vuelve aquí e inicia sesión.');
      }
    } catch { setMessage('No pudimos conectar. Inténtalo de nuevo.'); }
    finally { pending.current=false;setBusy(false); }
  }

  return <View style={{gap:12,maxWidth:500,width:'100%',alignSelf:'center',padding:20}}>
    {loading ? <Label>Cargando sesión.</Label> : session ? <>
      <Label>Sesión iniciada: {session.user.email}</Label>
      <Button secondary onPress={()=>router.push('/remote-agenda')}>Consultar agenda conectada</Button>
      <Button secondary onPress={()=>router.push('/owner-agenda')}>Agenda de mi establecimiento</Button>
      <Button disabled={busy} onPress={submit}>Cerrar sesión</Button>
    </> : <>
      <Heading title={register?'Crea tu cuenta':'Entra a A-La-Cancha'}/>
      <Label>Correo electrónico</Label>
      <TextInput accessibilityLabel="Correo de la cuenta" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" editable={!busy} style={field}/>
      <Label>Contraseña{register?' (mínimo 8 caracteres)':''}</Label>
      <TextInput accessibilityLabel="Contraseña de la cuenta" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete={register?'new-password':'current-password'} editable={!busy} style={field}/>
      <Button disabled={busy || !email.trim() || !password || (register && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || password.length<8))} onPress={submit}>{busy?'Un momento…':register?'Registrar cuenta':'Iniciar sesión'}</Button>
      <Button secondary disabled={busy} onPress={()=>{setRegister(!register);setPassword('');setMessage('');}}>{register?'Ya tengo cuenta':'Crear cuenta'}</Button>
    </>}
    {!!(message || error) && <Label accessibilityRole="alert">{message || error}</Label>}
  </View>;
}
