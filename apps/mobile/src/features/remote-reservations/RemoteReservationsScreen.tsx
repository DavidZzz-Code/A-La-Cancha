import { useEffect, useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import { money } from '@alacancha/domain';
import { Button, Empty, Heading, Label, Page } from '../../components/ui';
import { useAuth } from '../auth/AuthProvider';
import { sessionStorage } from '../auth/storage';
import { cancelHold, createHold, fetchReservations } from './api';
import { holdError, readIntent, readSelection, reservationStatus, type HoldIntent, type RemoteReservation, type Selection } from './contracts';

export default function RemoteReservationsScreen() {
  const {session,loading} = useAuth(); const params = useLocalSearchParams(); const router = useRouter();
  return <Page back><Heading title="Mis bloqueos conectados" subtitle="Pruebas en desarrollo. Un bloqueo temporal no confirma una reserva ni acredita un pago."/>
    {loading ? <Label>Cargando sesión…</Label> : !session ? <><Empty title="Inicia sesión para continuar" message="Puedes explorar sin cuenta. Para bloquear un turno necesitas una cuenta de desarrollo."/><Button onPress={()=>router.push('/profile')}>Ir a mi cuenta</Button></>
      : <ReservationPanel key={session.user.id} actor={session.user.id} selection={readSelection(params)}/>}
  </Page>;
}
function ReservationPanel({actor,selection}:{actor:string;selection:Selection|null}) {
  const router = useRouter(); const storageKey = 'alacancha.hold-intent.'+actor;
  const [team,setTeam] = useState(''); const [players,setPlayers] = useState('10');
  const [intent,setIntent] = useState<HoldIntent|null>(null); const [ready,setReady] = useState(false);
  const [busy,setBusy] = useState(false); const [message,setMessage] = useState('');
  const [revision,setRevision] = useState(0); const [now,setNow] = useState(()=>Date.now());
  const [list,setList] = useState<{revision:number;rows:RemoteReservation[];error:string}>({revision:-1,rows:[],error:''});
  const [result,setResult] = useState<RemoteReservation|null>(null);
  const mounted = useRef(true); const pending = useRef(false);
  useEffect(()=>{mounted.current=true; return()=>{mounted.current=false;};},[]);
  useEffect(()=>{let active=true;
    Promise.resolve().then(()=>sessionStorage.getItem(storageKey)).then(raw=>{
      if(!active)return;
      if(raw)setIntent(readIntent(JSON.parse(raw),actor));
      setReady(true);
    }).catch(()=>{if(active)setMessage('No pudimos recuperar la solicitud guardada. Vuelve a abrir esta pantalla antes de crear otro bloqueo.');});
    return()=>{active=false;};
  },[storageKey,actor]);
  useEffect(()=>{const controller=new AbortController();
    fetchReservations(actor,controller.signal).then(rows=>{if(!controller.signal.aborted)setList({revision,rows,error:''});})
      .catch(()=>{if(!controller.signal.aborted)setList({revision,rows:[],error:'No pudimos consultar tus bloqueos. Actualiza para comprobar el estado.'});});
    return()=>controller.abort();
  },[actor,revision]);
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
  async function submit() {
    if(pending.current || !ready || (!intent && !selection))return;
    pending.current=true;setBusy(true);setMessage('');setResult(null);
    let request:HoldIntent|null=intent;
    try {
      request=intent ?? readIntent({...selection,actor,key:randomUUID(),team:team.trim(),players:Number(players)},actor);
      // Persist before sending. Storage failure must never result in a write without a retry key.
      await sessionStorage.setItem(storageKey,JSON.stringify(request));
      if(!mounted.current)return;
      setIntent(request);
      const row=await createHold(request);
      if(!mounted.current)return;
      setResult(row);
      await sessionStorage.removeItem(storageKey);
      if(!mounted.current)return;
      setIntent(null);setRevision(v=>v+1);
    } catch(error) {
      if(!mounted.current)return;
      const failure=holdError(error);setMessage(failure.message);
      if(failure.definitive) {
        try {await sessionStorage.removeItem(storageKey);if(mounted.current)setIntent(null);}
        catch {if(mounted.current)setMessage('No pudimos actualizar la solicitud guardada. Reintenta para comprobar su estado.');}
      }
    } finally {pending.current=false;if(mounted.current)setBusy(false);}
  }
  async function cancel(id:string) {
    if(pending.current)return;
    pending.current=true;setBusy(true);setMessage('');setResult(null);
    try {const row=await cancelHold(actor,id);if(mounted.current){setResult(row);setRevision(v=>v+1);}}
    catch {if(mounted.current){setMessage('No pudimos comprobar la cancelación. Actualiza o reintenta; verificaremos primero el estado guardado.');setRevision(v=>v+1);}}
    finally {pending.current=false;if(mounted.current)setBusy(false);}
  }
  const validPlayers=/^\d+$/.test(players) && Number(players)>=1 && Number(players)<=30;
  return <View style={{gap:18,maxWidth:800}}>
    <Button secondary onPress={()=>router.push('/remote-agenda')}>Elegir otro horario</Button>
    {!ready ? <Label>Recuperando solicitud pendiente…</Label> : intent ? <View style={{gap:12}}>
      <Label>Solicitud pendiente de comprobar: {intent.date} · {intent.time} · {intent.duration} min · {intent.team}</Label>
      <Label>Conservamos los mismos datos y la misma referencia aunque hayas cambiado de horario o recargado la página.</Label>
      <Button disabled={busy} onPress={()=>void submit()}>{busy?'Comprobando…':'Comprobar o reintentar solicitud'}</Button>
    </View> : selection && <View style={{gap:12,padding:20,borderRadius:20,backgroundColor:'#EAF1E6'}}>
      <Label accessibilityRole="header">Bloquear turno de prueba</Label>
      <Label>{selection.date} · {selection.time} · {selection.duration} min · hora de Colombia</Label>
      <Label>El servidor vuelve a comprobar disponibilidad y precio. Revisa el importe final después de crear el bloqueo; puedes cancelarlo. No se realizará ningún cobro.</Label>
      <Label>Nombre del equipo</Label><TextInput accessibilityLabel="Nombre del equipo conectado" value={team} onChangeText={setTeam} maxLength={40} editable={!busy} style={{borderWidth:1,borderColor:'#D9DFD5',borderRadius:12,padding:14}}/>
      <Label>Jugadores</Label><TextInput accessibilityLabel="Jugadores del turno conectado" value={players} onChangeText={setPlayers} maxLength={2} keyboardType="number-pad" editable={!busy} style={{borderWidth:1,borderColor:'#D9DFD5',borderRadius:12,padding:14}}/>
      <Label>El servidor verifica la capacidad de la cancha seleccionada.</Label>
      <Button disabled={busy || !team.trim() || !validPlayers} onPress={()=>void submit()}>{busy?'Creando bloqueo…':'Crear bloqueo de 10 minutos'}</Button>
    </View>}
    {!!message && <Label accessibilityRole="alert">{message}</Label>}
    {result && <View style={{gap:8,padding:20,borderRadius:20,backgroundColor:'#EAF1E6'}}>
      <Label accessibilityRole="header">Resultado comprobado</Label>
      <Label>{reservationStatus(result,now)}</Label>
      <Label>Total final del servidor: {money(result.total)} COP</Label>
      <Label>Descuento: {money(result.discount)} · anticipo previsto: {money(result.deposit)} · saldo previsto: {money(result.balance)}</Label>
      <Label>Importes informativos. No hay pago ni confirmación automática.</Label>
    </View>}
    <Heading title="Historial conectado" subtitle="Últimos 50 registros de esta cuenta. Separados de las reservas de demostración local."/>
    <Button secondary disabled={busy} onPress={()=>{setResult(null);setRevision(v=>v+1);}}>Actualizar mis bloqueos</Button>
    {list.revision!==revision ? <Label>Consultando tus bloqueos…</Label> : list.error ? <Label accessibilityRole="alert">{list.error}</Label> : !list.rows.length ? <Label>Aún no tienes bloqueos conectados.</Label> : list.rows.map(row=><View key={row.id} style={{gap:10,padding:18,borderWidth:1,borderColor:'#D9DFD5',borderRadius:18}}>
      <Label accessibilityRole="header">{row.team}</Label>
      <Label>{new Date(row.starts_at).toLocaleString('es-CO',{timeZone:'America/Bogota'})} · hora de Colombia</Label>
      <Label>{reservationStatus(row,now)}</Label><Label>{money(row.total)} COP · precio guardado</Label>
      {row.status==='held' && <><Label>Vence: {new Date(row.expires_at!).toLocaleTimeString('es-CO',{timeZone:'America/Bogota'})}. El servidor decide la vigencia.</Label><Button secondary disabled={busy || Date.parse(row.expires_at!)<=now} onPress={()=>void cancel(row.id)}>Cancelar bloqueo</Button></>}
    </View>)}
  </View>;
}
