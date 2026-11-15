import { useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Label } from '../../components/ui';
import { supabase } from '../auth/client';

type Request = {venue_name:string;status:'pending'|'approved'|'rejected'};
const labels = {pending:'En revisión',approved:'Aprobada',rejected:'Rechazada'};

export function VenueAccess({actor,initialOpen=false}:{actor:string;initialOpen?:boolean}) {
  const router=useRouter();
  const [open,setOpen]=useState(initialOpen);
  const [venue,setVenue]=useState('');
  const [state,setState]=useState<'loading'|'owner'|'ready'|'error'>('loading');
  const [request,setRequest]=useState<Request|null>(null);
  const [busy,setBusy]=useState(false);
  const [revision,setRevision]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();
    async function load(){
      if(!supabase)throw Error();
      const member=await supabase.from('venue_members').select('venue_id').eq('user_id',actor).limit(1).abortSignal(controller.signal);
      if(member.error)throw member.error;
      if(controller.signal.aborted)return;
      if(member.data.length){setState('owner');return;}
      const result=await supabase.from('venue_access_requests').select('venue_name,status').eq('user_id',actor).abortSignal(controller.signal).maybeSingle();
      if(result.error)throw result.error;
      if(!controller.signal.aborted){setRequest(result.data as Request|null);setState('ready');}
    }
    load().catch(()=>{if(!controller.signal.aborted)setState('error');});
    return ()=>controller.abort();
  },[actor,revision]);
  async function submit(){
    if(!supabase || busy || venue.trim().length<2)return;
    setBusy(true);
    try {
      const result=await supabase.from('venue_access_requests').insert({venue_name:venue.trim()});
      if(result.error && result.error.code!=='23505')throw result.error;
      setState('loading');setRevision(n=>n+1);
    } catch {setState('error');}
    finally {setBusy(false);}
  }
  if(state==='owner')return <Button onPress={()=>router.push('/owner-agenda')}>Agenda de mi establecimiento</Button>;
  if(state==='loading')return <Label>Consultando acceso al establecimiento…</Label>;
  if(state==='error')return <Button secondary onPress={()=>{setState('loading');setRevision(n=>n+1);}}>Reintentar consulta del establecimiento</Button>;
  if(request)return <Label>{request.venue_name} · Solicitud {labels[request.status].toLowerCase()}</Label>;
  if(!open)return <Button secondary onPress={()=>setOpen(true)}>Soy propietario de una cancha</Button>;
  return <View style={{gap:10}}>
    <Label>Solicita acceso para administrar tu establecimiento. Verificaremos la sede antes de habilitar su agenda.</Label>
    <TextInput accessibilityLabel="Nombre del establecimiento" placeholder="Nombre del establecimiento" value={venue} maxLength={100} onChangeText={setVenue} style={{borderWidth:1,borderRadius:12,padding:14,borderColor:'#9BAA99'}}/>
    <Button disabled={busy || venue.trim().length<2} onPress={submit}>Enviar solicitud</Button>
  </View>;
}
