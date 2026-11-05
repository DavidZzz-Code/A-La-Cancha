import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { localDate } from '@alacancha/domain';
import { Button, Chip, DateStrip, Label } from '../../components/ui';
import { supabase } from '../auth/client';
import { fetchBusy } from '../remote-agenda/api';
import { openSlots } from '../remote-agenda/contracts';

type Booking = {id:string; court_id:string; starts_at:string; ends_at:string};
type Change = {id:string; original_start:string; proposed_start:string; status:keyof typeof labels};
const labels = {pending:'Pendiente', approved:'Aprobado', rejected:'Rechazado', unavailable:'Horario no disponible'};
function stamp(value:string) {
  return new Date(value).toLocaleString('es-CO',{timeZone:'America/Bogota',dateStyle:'short',timeStyle:'short'});
}
export function Reschedule({row, owner=false, onMoved}:{row:Booking; owner?:boolean; onMoved:()=>void}) {
  const [open,setOpen]=useState(false);
  return <View style={{gap:8}}>
    <Button secondary onPress={()=>setOpen(!open)}>{open?'Cerrar cambios de horario':owner?'Revisar cambios de horario':'Solicitar o consultar cambio de horario'}</Button>
    {open && <ChangePanel row={row} owner={owner} onMoved={onMoved}/>}
  </View>;
}
function ChangePanel({row,owner,onMoved}:{row:Booking;owner:boolean;onMoved:()=>void}) {
  const [history,setHistory]=useState<Change[]|null>(null);
  const [revision,setRevision]=useState(0);
  const [date,setDate]=useState(localDate);
  const [slots,setSlots]=useState<{date:string;times:string[]}|null>(null);
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  const lock=useRef(false);
  const active=useRef(true);
  const key=useRef<{start:string;id:string}|null>(null);
  const pending=history?.some(item=>item.status==='pending');
  const duration=(Date.parse(row.ends_at)-Date.parse(row.starts_at))/60000;
  useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
  useEffect(()=>{
    const controller=new AbortController();
    async function read() {
      if (!supabase) throw Error();
      const result=await supabase.from('reschedule_requests').select('id,original_start,proposed_start,status')
        .eq('reservation_id',row.id).order('created_at',{ascending:false}).limit(50).abortSignal(controller.signal);
      if(result.error) throw result.error;
      if(!controller.signal.aborted) setHistory(result.data as Change[]);
    }
    read().catch(()=>{if(!controller.signal.aborted)setMessage('No pudimos consultar los cambios. Vuelve a actualizar.');});
    return ()=>controller.abort();
  },[row.id,revision]);
  useEffect(()=>{
    if(owner || pending || !history) return;
    const controller=new AbortController();
    async function read() {
      if(!supabase) throw Error();
      const court=await supabase.from('courts').select('open_minute,close_minute').eq('id',row.court_id).abortSignal(controller.signal).single();
      if(court.error) throw court.error;
      const occupied=await fetchBusy(row.court_id,date,controller.signal);
      const times=openSlots({open:court.data.open_minute,close:court.data.close_minute},date,duration,occupied,Date.now());
      if(!controller.signal.aborted)setSlots({date,times});
    }
    read().catch(()=>{if(!controller.signal.aborted)setMessage('No pudimos consultar los horarios. Vuelve a actualizar.');});
    return ()=>controller.abort();
  },[owner,pending,history,row.court_id,date,duration]);
  function refresh() {setMessage('');setHistory(null);setSlots(null);setRevision(n=>n+1);}
  async function submit(action:{time:string}|{id:string;accept:boolean}) {
    if(!supabase || lock.current)return;
    lock.current=true;setBusy(true);setMessage('');
    try {
      let result;
      if('time' in action) {
        const start=date+'T'+action.time+':00-05:00';
        if(key.current?.start!==start)key.current={start,id:randomUUID()};
        result=await supabase.rpc('request_reschedule',{p_id:row.id,p_start:start,p_key:key.current.id}).single();
      } else result=await supabase.rpc('decide_reschedule',{p_key:action.id,p_accept:action.accept}).single();
      if(result.error)throw result.error;
      if(!active.current)return;
      key.current=null;
      refresh();
      if((result.data as Change).status==='approved')onMoved();
    } catch(error) {
      if(active.current)setMessage((error as {message?:string}).message==='price_changed'?'El precio de ese horario es distinto. Elige otro turno.':'No pudimos verificar el cambio. Actualiza para consultar su estado.');
    } finally {lock.current=false;if(active.current)setBusy(false);}
  }
  return <View style={{gap:10}}>
    <Button secondary disabled={busy} onPress={refresh}>Actualizar cambios</Button>
    {!!message && <Label accessibilityRole="alert">{message}</Label>}
    {history?.map(item=><View key={item.id} style={{gap:6}}>
      <Label>{stamp(item.original_start)} → {stamp(item.proposed_start)} · {labels[item.status]}</Label>
      {owner && item.status==='pending' && <><Button disabled={busy} onPress={()=>submit({id:item.id,accept:true})}>Aprobar cambio</Button>
        <Button secondary disabled={busy} onPress={()=>submit({id:item.id,accept:false})}>Rechazar cambio</Button></>}
    </View>)}
    {owner && history?.length===0 && <Label>Sin solicitudes para esta reserva.</Label>}
    {!owner && history && !pending && <><Label>Elige el horario que quieres solicitar. Tu reserva actual sigue confirmada mientras el encargado decide.</Label>
      <DateStrip value={date} onChange={setDate}/>
      {slots?.date===date && <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
        {slots.times.length===0 && <Label>Sin horarios libres para esta duración.</Label>}
        {slots.times.map(time=><Chip key={time} active={false} onPress={()=>submit({time})}>{'Solicitar ' + time}</Chip>)}
      </View>}
    </>}
  </View>;
}
