import {Directions} from './Directions';
import {WriteReview} from '../remote-agenda/CourtDetails';
import {hourLabel} from '../remote-agenda/hour';
import {useTheme} from '../../lib/theme';
import { Reschedule } from '../reschedule/Reschedule';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Modal, ScrollView, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import { money } from '@alacancha/domain';
import { Button, Chip, Empty, Heading, Label, Page } from '../../components/ui';
import { useAuth } from '../auth/AuthProvider';
import { sessionStorage } from '../auth/storage';
import { cancelHold, createHold, fetchReservations } from './api';
import { decisionLabels, holdError, readIntent, readSelection, reservationStatus, type HoldIntent, type RemoteReservation, type Selection } from './contracts';

function MatchTime({row}:{row:RemoteReservation}){
 const date=new Date(row.starts_at);
 const zone='America/Bogota';
 const time=(value:string)=>new Date(value).toLocaleTimeString('es-CO',{timeZone:zone,hour:'numeric',minute:'2-digit',hour12:true});
 return <Label>{date.toLocaleDateString('es-CO',{timeZone:zone,weekday:'short',day:'numeric',month:'short'})} · {time(row.starts_at)} – {time(row.ends_at)}</Label>;
}
function Goal(){
 const [progress]=useState(()=>new Animated.Value(0));
 useEffect(()=>{const motion=Animated.timing(progress,{toValue:1,duration:650,useNativeDriver:true});motion.start();return()=>motion.stop();},[progress]);
 return <View accessible={false} style={{height:82,alignItems:'center',justifyContent:'center'}}><Animated.Text style={{fontSize:38,transform:[{translateX:progress.interpolate({inputRange:[0,1],outputRange:[-100,-22]})},{translateY:progress.interpolate({inputRange:[0,.5,1],outputRange:[6,-16,0]})}]}}>⚽</Animated.Text><Animated.Text style={{position:'absolute',fontSize:48,color:'#65bd26',opacity:progress,left:'53%'}}>✓</Animated.Text></View>;
}
export default function RemoteReservationsScreen() {
  const {session,loading} = useAuth(); const params = useLocalSearchParams(); const router = useRouter();
  return <Page back>
    {loading ? <Label>Cargando sesión…</Label> : !session ? <><Empty title="Inicia sesión para continuar" message="Puedes explorar sin cuenta. Para bloquear un turno necesitas una cuenta."/><Button onPress={()=>router.push('/profile')}>Ir a mi cuenta</Button></>
      : <ReservationPanel key={session.user.id+JSON.stringify(readSelection(params))} actor={session.user.id} selection={Number(params.duration)===60?readSelection(params):null}/>}
  </Page>;
}
function ReservationPanel({actor,selection}:{actor:string;selection:Selection|null}) { const {colors:themeColors}=useTheme();
  const router = useRouter(); const storageKey = 'alacancha.hold-intent.'+actor;
  const [team,setTeam] = useState(''); const [players,setPlayers] = useState('10');
  const [intent,setIntent] = useState<HoldIntent|null>(null); const [ready,setReady] = useState(false);
  const [operation,setOperation] = useState<string|null>(null); const busy = operation !== null; const [message,setMessage] = useState('');
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
    pending.current=true;setOperation('create');setMessage('');setResult(null);
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
    } finally {pending.current=false;if(mounted.current)setOperation(null);}
  }
  async function cancel(id:string) {
    if(pending.current)return;
    pending.current=true;setOperation(id);setMessage('');
    try {const row=await cancelHold(actor,id);if(mounted.current){setResult(row);setRevision(v=>v+1);}}
    catch {if(mounted.current){setMessage('No pudimos comprobar la cancelación. Actualiza o reintenta; verificaremos primero el estado guardado.');setRevision(v=>v+1);}}
    finally {pending.current=false;if(mounted.current)setOperation(null);}
  }
  useFocusEffect(useCallback(()=>{
    setRevision(n=>n+1);
    const timer=setInterval(()=>setRevision(n=>n+1),30000);
    return ()=>clearInterval(timer);
  },[]));
  const params=useLocalSearchParams();
  const [history,setHistory]=useState(false),[detail,setDetail]=useState('');
  const upcoming=(row:RemoteReservation)=>(row.status==='confirmed'||(row.status==='held'&&Date.parse(row.expires_at!)>now))&&Date.parse(row.ends_at)>now;
  const rows=list.rows.filter(row=>upcoming(row)!==history).sort((a,b)=>(Date.parse(a.starts_at)-Date.parse(b.starts_at))*(history?-1:1));
  const showReservations=()=>{setResult(null);router.replace('/remote-reservations');};
  if(result?.status==='confirmed')return <Modal visible animationType="fade" onRequestClose={showReservations}><ScrollView style={{backgroundColor:themeColors.background}} contentContainerStyle={{flexGrow:1,justifyContent:'center',padding:24,gap:18}}><Goal/><Heading title="¡Cancha reservada!"/><MatchTime row={result}/><Directions court={result.court_id}/><Button secondary onPress={showReservations}>Ver mis reservas</Button></ScrollView></Modal>;
  const validPlayers=/^\d+$/.test(players) && Number(players)>=1 && Number(players)<=Math.min(30,Number(params.capacity)||30);
  return <View style={{gap:18,maxWidth:800}}>
    <Heading title={selection?'Tu reserva':'Mis reservas'}/>
    {!ready ? <Label>Recuperando solicitud pendiente…</Label> : intent ? <View style={{gap:12}}>
      <Label>Solicitud pendiente de comprobar: {intent.date} · {intent.time} · {intent.duration} min · {intent.team}</Label>
      <Label>Conservamos los mismos datos y la misma referencia aunque hayas cambiado de horario o recargado la página.</Label>
      <Button disabled={busy} onPress={()=>void submit()}>{busy?'Comprobando…':'Comprobar o reintentar solicitud'}</Button>
    </View> : selection && !result && !(busy && operation !== 'create') && <View style={{gap:12,padding:20,borderRadius:20,backgroundColor:themeColors.soft}}>
      <Label style={{fontSize:21,fontWeight:'700'}}>{String(params.venue||'Cancha')}</Label>
      <Label>{selection.date} · {hourLabel(selection.time)} – {hourLabel(selection.time,60)}</Label>
      {params.total&&<Label>Total   {money(Number(params.total))}</Label>}{params.deposit&&<Label>Anticipo   {money(Number(params.deposit))}</Label>}
      <Label>Piloto · Sin cobro real</Label>
      <Label>Nombre del equipo</Label><TextInput placeholderTextColor={themeColors.muted} accessibilityLabel="Nombre del equipo conectado" value={team} onChangeText={setTeam} maxLength={40} editable={!busy} style={{color:themeColors.ink,backgroundColor:themeColors.paper,borderWidth:1,borderColor:themeColors.border,borderRadius:12,padding:14}}/>
      <Label>Jugadores</Label><TextInput placeholderTextColor={themeColors.muted} accessibilityLabel="Jugadores del turno conectado" value={players} onChangeText={setPlayers} maxLength={2} keyboardType="number-pad" editable={!busy} style={{color:themeColors.ink,backgroundColor:themeColors.paper,borderWidth:1,borderColor:themeColors.border,borderRadius:12,padding:14}}/>
      <Label>Hasta {Number(params.capacity)||30} jugadores</Label>
      <Button disabled={busy || !team.trim() || !validPlayers} onPress={()=>void submit()}>{busy?'Reservando…':'Reservar · '+hourLabel(selection.time)}</Button>
    </View>}
    {!!message && <Label accessibilityRole="alert">{message}</Label>}
    {result && <View style={{gap:8,padding:20,borderRadius:20,backgroundColor:themeColors.soft}}>
      <Label accessibilityRole="header">{reservationStatus(result,now)}</Label>
      <MatchTime row={result}/><Label>Total   {money(result.total)}</Label>
    </View>}
    {!!message&&selection&&<Button secondary onPress={()=>router.replace({pathname:'/remote-agenda',params:{court:selection.court}})}>Elegir otro horario</Button>}
    {(!selection||!!result)&&<><View style={{flexDirection:'row',gap:8}}><Chip active={!history} onPress={()=>setHistory(false)}>Próximas</Chip><Chip active={history} onPress={()=>setHistory(true)}>Historial</Chip></View>
    {list.error?<Button secondary onPress={()=>setRevision(v=>v+1)}>Reintentar</Button>:list.revision<0?<Label>Cargando reservas…</Label>:!rows.length?<Label>{history?'Aún no tienes partidos en el historial.':'Aún no tienes partidos próximos.'}</Label>:rows.map(row=><View key={row.id} style={{gap:12,padding:16,borderWidth:1,borderColor:themeColors.border,backgroundColor:themeColors.paper,borderRadius:20}}>
      <Label style={{fontWeight:'700',color:themeColors.forest}}>{reservationStatus(row,now)}</Label>
      <MatchTime row={row}/><Directions court={row.court_id}/>
      <Button secondary onPress={()=>setDetail(detail===row.id?'':row.id)}>{detail===row.id?'Ocultar detalle':'Ver detalle'}</Button>
      {detail===row.id&&<><Label>{row.team} · {row.players} jugadores</Label>
      {row.kind==='player' && row.status==='confirmed' && row.reschedule_requests?.[0] &&
        <Label>Última decisión: {decisionLabels[row.reschedule_requests[0].status]}</Label>}

      <Label>Referencia: {row.id.slice(0,8).toUpperCase()}</Label>

      {row.pilot_deposit_approved_at&&<Label>Anticipo simulado aprobado: {money(row.deposit)} · Recibido: {money((row.reservation_receipts??[]).reduce((a,v)=>a+v.amount,0))} · Restante: {money(row.reservation_receipts?.some(v=>v.part==='balance')?0:row.balance)}</Label>}
      {!row.pilot_deposit_approved_at&&['confirmed','completed'].includes(row.status)&&<Label>Pago registrado: {money((row.reservation_receipts??[]).reduce((sum,r)=>sum+r.amount,0))} · Pendiente: {money(row.total-(row.reservation_receipts??[]).reduce((sum,r)=>sum+r.amount,0))}</Label>}<Label>{money(row.total)} COP · precio guardado</Label>
      {row.kind==='player' && row.status==='confirmed' && <Reschedule row={row} onMoved={()=>setRevision(n=>n+1)}/>}
      {row.kind==='player' && row.status==='completed' && <WriteReview court={row.court_id} reservation={row.id}/>}
      {row.status==='held' && <><Label>Vence: {new Date(row.expires_at!).toLocaleTimeString('es-CO',{timeZone:'America/Bogota',hour12:true})}. El servidor decide la vigencia.</Label><Button secondary disabled={busy || Date.parse(row.expires_at!)<=now} onPress={()=>void cancel(row.id)}>{operation===row.id?'Cancelando bloqueo…':'Cancelar bloqueo'}</Button></>}
    </>}</View>)}</>}
  </View>;
}
