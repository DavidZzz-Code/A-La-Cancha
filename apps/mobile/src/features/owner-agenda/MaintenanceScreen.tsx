import { useEffect, useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import { clock, localDate, validDate } from '@alacancha/domain';
import { Button, Chip, Empty, Heading, Label, Page } from '../../components/ui';
import { useAuth } from '../auth/AuthProvider';
import { sessionStorage } from '../auth/storage';
import { fetchManagedCourts } from './api';
import { colombiaTime, type ManagedCourt } from './contracts';
import { cancelMaintenance, createMaintenance, fetchMaintenance } from './maintenance-api';
import { maintenanceFailure, readMaintenanceIntent, type MaintenanceBlock, type MaintenanceIntent } from './maintenance-contracts';

const inputStyle = { borderWidth:1, borderColor:'#D9DFD5', borderRadius:12, padding:14 };
const blockLabel = { confirmed:'Mantenimiento activo', cancelled:'Mantenimiento cancelado', completed:'Mantenimiento completado' };
export default function MaintenanceScreen() {
  const { session, loading } = useAuth(); const params = useLocalSearchParams(); const router = useRouter();
  const court = typeof params.court === 'string' ? params.court : '';
  const date = typeof params.date === 'string' && validDate(params.date) ? params.date : localDate();
  return <Page back><Heading title="Mantenimientos" subtitle="Bloquea un horario para trabajos en la cancha. No genera cobros ni una reserva de jugador."/>
    <Button secondary onPress={() => router.replace('/owner-agenda')}>Volver a la agenda del establecimiento</Button>
    {loading ? <Label>Cargando sesión.</Label> : !session ? <Empty title="Inicia sesión" message="Necesitas una cuenta autorizada por el establecimiento."/> : <MaintenancePanel key={session.user.id+court+date} actor={session.user.id} courtId={court} date={date}/>}
  </Page>;
}
function MaintenancePanel({ actor, courtId, date }: { actor:string; courtId:string; date:string }) {
  const storageKey = 'alacancha.maintenance-intent.'+actor;
  const [court,setCourt] = useState<ManagedCourt|null>(null), [access,setAccess] = useState('loading');
  const [time,setTime] = useState(''), [duration,setDuration] = useState(60), [reason,setReason] = useState('');
  const [intent,setIntent] = useState<MaintenanceIntent|null>(null), [ready,setReady] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const [operation,setOperation] = useState(''), [message,setMessage] = useState(''), [result,setResult] = useState('');
  const [cancelId,setCancelId] = useState(''), [cancelReason,setCancelReason] = useState('');
  const [revision,setRevision] = useState(0), [list,setList] = useState<{revision:number;rows:MaintenanceBlock[];error:string}>({revision:-1,rows:[],error:''});
  const mounted = useRef(true), pending = useRef(false); const busy = !!operation;
  useEffect(() => { mounted.current=true; return () => { mounted.current=false; }; }, []);
  useEffect(() => {
    const controller=new AbortController();
    fetchManagedCourts(actor,controller.signal).then(courts => { if (!controller.signal.aborted) { const c=courts.find(v=>v.id===courtId); setCourt(c??null);setAccess(c?'ready':'denied'); } })
      .catch(()=>{if(!controller.signal.aborted)setAccess('error');});
    return()=>controller.abort();
  },[actor,courtId,revision]);
  useEffect(()=>{let active=true;
    Promise.resolve().then(()=>sessionStorage.getItem(storageKey)).then(raw=>{if(!active)return;if(raw)setIntent(readMaintenanceIntent(JSON.parse(raw),actor));setReady(true);})
      .catch(()=>{if(active)setMessage('No pudimos recuperar la solicitud pendiente. Reabre esta pantalla antes de crear otro mantenimiento.');});
    return()=>{active=false;};
  },[actor,storageKey]);
  useEffect(()=>{if(access!=='ready')return;const controller=new AbortController();
    fetchMaintenance(actor,courtId,date,controller.signal).then(rows=>{if(!controller.signal.aborted)setList({revision,rows,error:''});})
      .catch(()=>{if(!controller.signal.aborted)setList({revision,rows:[],error:'No pudimos consultar los mantenimientos. Revisa conexión y permisos.'});});
    return()=>controller.abort();
  },[actor,courtId,date,revision,access]);
  async function submit() {
    if(pending.current || !ready || !court || access!=='ready')return;
    pending.current=true;setOperation('create');setMessage('');setResult('');
    try {
      const request=intent??readMaintenanceIntent({actor,court:courtId,date,time,duration,reason,key:randomUUID()},actor);
      try {
        await sessionStorage.setItem(storageKey,JSON.stringify(request));
      } catch {
        if (mounted.current) setMessage('No pudimos guardar la referencia en este dispositivo. Revisa el almacenamiento y vuelve a intentarlo.');
        return;
      }
      if(!mounted.current)return;setIntent(request);
      const row=await createMaintenance(request);
      if(!mounted.current)return;
      await sessionStorage.removeItem(storageKey);
      if(!mounted.current)return;
      setIntent(null);setTime('');setReason('');setResult(`${blockLabel[row.status]} · ${request.date} · ${request.time} · ${request.reason}`);setRevision(v=>v+1);
    } catch(error) {
      if(!mounted.current)return;
      const failure=maintenanceFailure(error);setMessage(failure.message);
      if(failure.clear)try{await sessionStorage.removeItem(storageKey);if(mounted.current)setIntent(null);}catch{if(mounted.current)setMessage('No pudimos actualizar la solicitud guardada. Reintenta para comprobarla.');}
    } finally {pending.current=false;if(mounted.current)setOperation('');}
  }
  async function cancel() {
    if(pending.current || !cancelId || !cancelReason.trim())return;
    pending.current=true;setOperation(cancelId);setMessage('');setResult('');
    try {
      await cancelMaintenance(actor,courtId,cancelId,cancelReason);
      if(mounted.current){setResult('Mantenimiento cancelado. Actualiza la agenda para consultar la disponibilidad.');setCancelId('');setCancelReason('');}
    } catch {if(mounted.current)setMessage('No pudimos comprobar la cancelación. Actualiza o reintenta; consultaremos primero su estado.');}
    finally {pending.current=false;if(mounted.current){setOperation('');setRevision(v=>v+1);}}
  }
  const times=court?Array.from({length:(court.close-court.open)/30},(_,i)=>court.open+i*30).filter(m=>m+duration<=court.close && Date.parse(`${date}T${clock(m)}:00-05:00`)>now).map(clock):[];
  return <View style={{gap:16,maxWidth:800,paddingTop:20}}>
    <Button secondary disabled={busy} onPress={()=>{setAccess('loading');setRevision(v=>v+1);}}>Actualizar mantenimientos</Button>
    {!!message && <Label accessibilityRole="alert">{message}</Label>}
    {!!result && <Label accessibilityLiveRegion="polite">{result}</Label>}
    {access==='loading'?<Label>Comprobando acceso.</Label>:access!=='ready'||!court?<Empty title="Sin acceso a esta cancha" message="Actualiza la conexión o vuelve a la agenda para elegir una cancha autorizada."/>:<>
      <Heading title={court.name} subtitle={`${date} · Hora de Colombia`}/>
      {!ready?<Label>Recuperando solicitud.</Label>:intent?<View style={{gap:12}}>
        <Label>Solicitud pendiente: {intent.date} · {intent.time} · {intent.duration} min · {intent.reason}</Label>
        {intent.court!==courtId&&<Label>Corresponde a otra cancha. Comprobaremos el resultado original antes de permitir otro mantenimiento.</Label>}
        <Button disabled={busy} onPress={()=>void submit()}>{busy?'Comprobando mantenimiento.':'Comprobar mantenimiento pendiente'}</Button>
      </View>:<View style={{gap:12}}>
        <Label accessibilityRole="header">Registrar mantenimiento</Label>
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{[30,60,90,120].map(n=><Chip key={n} active={duration===n} onPress={()=>{if(!busy){setDuration(n);setTime('');}}}>{`${n} min`}</Chip>)}</View>
        <Label>Hora de inicio. El servidor comprobará que no exista una reserva o bloqueo.</Label>
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{times.map(t=><Chip key={t} active={time===t} onPress={()=>{if(!busy)setTime(t);}}>{t}</Chip>)}</View>
        {!times.length&&<Label>No quedan horarios para esta fecha y duración. Elige otra fecha en la agenda.</Label>}
        <TextInput accessibilityLabel="Motivo del mantenimiento" placeholder="Ej.: Reparación de iluminación" value={reason} onChangeText={setReason} maxLength={40} editable={!busy} style={inputStyle}/>
        <Label>El bloqueo permanece hasta cancelarlo; no vence a los diez minutos.</Label>
        <Button disabled={busy||!reason.trim()||!times.includes(time)} onPress={()=>void submit()}>{busy?'Registrando mantenimiento.':'Confirmar mantenimiento'}</Button>
      </View>}
      <Label accessibilityRole="header">Mantenimientos del día</Label>
      {list.revision!==revision?<Label>Consultando mantenimientos.</Label>:list.error?<Label accessibilityRole="alert">{list.error}</Label>:!list.rows.length?<Label>No hay mantenimientos registrados.</Label>:list.rows.map(row=><View key={row.id} style={{gap:10,padding:16,borderWidth:1,borderColor:'#D9DFD5',borderRadius:16}}>
        <Label>{colombiaTime(row.starts_at)}–{colombiaTime(row.ends_at)} · {row.team}</Label><Label>{blockLabel[row.status]}</Label>
        {row.cancellation_reason&&<Label>Motivo de cancelación: {row.cancellation_reason}</Label>}
        {row.status==='confirmed'&&Date.parse(row.starts_at)>now&&(cancelId===row.id?<>
          <TextInput accessibilityLabel="Motivo de cancelación del mantenimiento" value={cancelReason} onChangeText={setCancelReason} maxLength={200} editable={!busy} style={inputStyle}/>
          <Button disabled={busy||!cancelReason.trim()} onPress={()=>void cancel()}>{operation===row.id?'Cancelando mantenimiento.':'Confirmar cancelación del mantenimiento'}</Button>
          <Button secondary disabled={busy} onPress={()=>{setCancelId('');setCancelReason('');}}>Conservar mantenimiento</Button>
        </>:<Button secondary disabled={busy} onPress={()=>{setCancelId(row.id);setCancelReason('');}}>Cancelar mantenimiento</Button>)}
      </View>)}
    </>}
  </View>;
}
