import {useState} from 'react';
import {View} from 'react-native';
import {money} from '@alacancha/domain';
import {Label,Button,Sheet} from '../../components/ui';
import {supabase} from '../auth/client';
import type {AgendaEntry} from './contracts';

export function ReceiptAction({row,onSaved}:{row:AgendaEntry;onSaved:()=>void}){
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const receipts=row.receipts??[];
 const part=row.pilot||receipts.some(r=>r.part==='deposit')?'balance':'deposit';
 const amount=(part==='deposit'?row.deposit:row.balance)??0;
 const received=receipts.reduce((sum,r)=>sum+r.amount,0);
 if(row.kind!=='player'||!['held','confirmed','completed'].includes(row.status))return null;
 const pending=amount>0&&!receipts.some(r=>r.part===part);
 async function save(){
  if(busy)return;setBusy(true);setError('');
  try{const result=await supabase!.rpc('record_booking_receipt',{p_id:row.id,p_part:part});if(result.error)throw result.error;setOpen(false);onSaved();}
  catch{setError('No pudimos verificar el registro. Actualiza la agenda antes de reintentar.');}finally{setBusy(false);}
 }
 async function complete(){
  if(busy)return;setBusy(true);setError('');
  try{const result=await supabase!.rpc('transition_reservation',{p_id:row.id,p_status:'completed'});if(result.error)throw result.error;onSaved();}
  catch{setError('Actualiza la agenda para comprobar el estado del partido.');}finally{setBusy(false);}
 }
 return <View style={{gap:8}}>{row.status==='confirmed'&&Date.parse(row.ends_at)<=Date.now()&&<Button secondary disabled={busy} onPress={complete}>Marcar partido como jugado</Button>}{!!error&&!open&&<Label>{error}</Label>}<Label>{row.pilot?'Anticipo de prueba: '+money(row.deposit??0)+' · Recibido: '+money(received):null}</Label>{!row.pilot&&<Label>Recibido: {money(received)} · Por cobrar: {money((row.total??0)-received)}</Label>}{pending&&<Button secondary onPress={()=>setOpen(true)}>{part==='deposit'?'Registrar anticipo recibido':'Recibir restante'}</Button>}
 <Sheet visible={open} title="Registrar pago recibido" onClose={()=>setOpen(false)}><Label>{'Confirma que recibiste '+money(amount)+' por esta reserva.'}{row.status==='held'?' La reserva quedará confirmada.':''}</Label><Button disabled={busy} onPress={save}>Ya recibí el pago</Button>{!!error&&<Label>{error}</Label>}</Sheet></View>;
}
