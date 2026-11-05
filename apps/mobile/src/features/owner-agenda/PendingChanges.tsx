import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Button, Label } from '../../components/ui';
import { decidePendingChange, fetchPendingChanges } from './api';
import type { ManagedCourt } from './contracts';

const format = (value:string) => new Date(value).toLocaleString('es-CO',{timeZone:'America/Bogota',dateStyle:'short',timeStyle:'short'});

export function PendingChanges({actor,courts,onDecision}:{actor:string;courts:ManagedCourt[];onDecision:(message:string)=>void}) {
  const [page,setPage]=useState(0);
  const [result,setResult]=useState<Awaited<ReturnType<typeof fetchPendingChanges>>|null>(null);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const lock=useRef(false);
  const active=useRef(true);
  useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
  useEffect(()=>{
    const controller=new AbortController();
    fetchPendingChanges(actor,courts,page,controller.signal).then(data=>{
      if(!controller.signal.aborted)setResult(data);
    }).catch(()=>{if(!controller.signal.aborted)setError('No pudimos consultar las solicitudes. Actualiza la agenda.');});
    return ()=>controller.abort();
  },[actor,courts,page]);
  function navigate(next:number) {setError('');setResult(null);setPage(next);}
  async function decide(id:string,accept:boolean) {
    if(lock.current)return;
    lock.current=true;setBusy(true);setError('');
    try {
      const status=await decidePendingChange(actor,id,accept);
      if(active.current)onDecision(status==='approved'?'Cambio aprobado.':status==='rejected'?'Cambio rechazado.':'El cambio ya no está disponible. Consulta el horario original.');
    } catch {
      if(active.current)setError('No pudimos comprobar la decisión. Actualiza la agenda antes de reintentar.');
    } finally {lock.current=false;if(active.current)setBusy(false);}
  }
  return <View style={{gap:10}}>
    <Label accessibilityRole="header">Solicitudes de cambio pendientes{result ? ' ('+result.total+')' : ''}</Label>
    {!!error && <Label accessibilityRole="alert">{error}</Label>}
    {!result && !error && <Label>Consultando solicitudes.</Label>}
    {result?.total===0 && <Label>No hay solicitudes pendientes.</Label>}
    {result?.rows.map(item=>{
      const court=courts.find(c=>c.id===item.reservations.court_id)!;
      return <View key={item.id} style={{gap:7,padding:14,borderWidth:1,borderColor:'#D9DFD5',borderRadius:12}}>
        <Label>{item.reservations.team} · {court.venue} · {court.name}</Label>
        <Label>Turno original: {format(item.original_start)}</Label>
        <Label>Turno solicitado: {format(item.proposed_start)}</Label>
        <Button disabled={busy || !!error} onPress={()=>decide(item.id,true)}>Aprobar solicitud</Button>
        <Button secondary disabled={busy || !!error} onPress={()=>decide(item.id,false)}>Rechazar solicitud</Button>
      </View>;
    })}
    {page>0 && <Button secondary disabled={busy} onPress={()=>navigate(page-1)}>Solicitudes anteriores</Button>}
    {result && (page+1)*10<result.total && <Button secondary disabled={busy} onPress={()=>navigate(page+1)}>Más solicitudes</Button>}
  </View>;
}
