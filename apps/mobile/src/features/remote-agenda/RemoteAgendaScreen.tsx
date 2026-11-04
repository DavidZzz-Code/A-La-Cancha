import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { addDays, localDate, money } from '@alacancha/domain';
import { Page, Heading, Label, Button, Chip, DateStrip, Empty } from '../../components/ui';
import { supabase } from '../auth/client';
import { fetchBusy, fetchCourts, fetchQuote } from './api';
import { openSlots, type RemoteCourt, type ServerQuote } from './contracts';
export default function RemoteAgendaScreen() {
  const router=useRouter();
  const [refresh,setRefresh]=useState(0);
  const [catalog,setCatalog]=useState<{revision:number;items:RemoteCourt[];error:string}>({revision:-1,items:[],error:''});
  const [courtId,setCourtId]=useState(''); const [date,setDate]=useState(()=>addDays(localDate(),1));
  const [duration,setDuration]=useState(60); const [time,setTime]=useState('');
  const [agenda,setAgenda]=useState<{key:string;times:string[];error:string}>({key:'',times:[],error:''});
  const [price,setPrice]=useState<{key:string;quote:ServerQuote|null;error:string}>({key:'',quote:null,error:''});
  const court=catalog.items.find(c=>c.id===courtId);
  const agendaKey=JSON.stringify([courtId,date,duration,refresh]); const priceKey=JSON.stringify([agendaKey,time]);
  useEffect(()=>{if(!supabase)return;const controller=new AbortController();
    fetchCourts(controller.signal).then(items=>{if(!controller.signal.aborted)setCatalog({revision:refresh,items,error:''});}).catch(()=>{if(!controller.signal.aborted)setCatalog({revision:refresh,items:[],error:'No pudimos cargar las canchas. Inténtalo de nuevo.'});});
    return()=>controller.abort();
  },[refresh]);
  useEffect(()=>{if(!court)return;const controller=new AbortController();
    fetchBusy(court.id,date,controller.signal).then(busy=>{if(!controller.signal.aborted)setAgenda({key:agendaKey,times:openSlots(court,date,duration,busy,Date.now()),error:''});}).catch(()=>{if(!controller.signal.aborted)setAgenda({key:agendaKey,times:[],error:'No pudimos consultar los horarios. No asumiremos que están libres.'});});
    return()=>controller.abort();
  },[court,date,duration,agendaKey]);
  useEffect(()=>{if(!court || !time)return;const controller=new AbortController();
    fetchQuote(court.id,date,time,duration,controller.signal).then(quote=>{if(!controller.signal.aborted)setPrice({key:priceKey,quote,error:''});}).catch(()=>{if(!controller.signal.aborted)setPrice({key:priceKey,quote:null,error:'No pudimos consultar el precio. Actualiza los horarios.'});});
    return()=>controller.abort();
  },[court,date,time,duration,priceKey]);
  return <Page back><Heading title="Agenda conectada" subtitle="Entorno de pruebas. Consulta horarios y precios; inicia sesión para crear un bloqueo temporal."/>
    {!supabase ? <Empty title="Conexión pendiente" message="Esta versión conserva la demostración local. La agenda en línea aún no está configurada."/> : <View style={{gap:18,maxWidth:800}}>
      <Button secondary onPress={()=>router.push('/remote-reservations')}>Ver mis bloqueos conectados</Button>
      <Button secondary onPress={()=>{setTime('');setRefresh(v=>v+1);}}>Actualizar agenda</Button>
      {catalog.revision!==refresh ? <Label>Cargando canchas…</Label> : catalog.error ? <Label accessibilityRole="alert">{catalog.error}</Label> : !catalog.items.length ? <Empty title="Aún no hay canchas publicadas" message="Cuando haya canchas de prueba publicadas aparecerán aquí."/> : <>
        <View style={{gap:10}}>{catalog.items.map(item=><Chip key={item.id} active={courtId===item.id} onPress={()=>{setCourtId(item.id);setTime('');}}>{item.name+' · '+item.venue+' · '+item.city}</Chip>)}</View>
        {court && <><Label>{court.capacity} jugadores como máximo</Label><DateStrip value={date} onChange={value=>{setDate(value);setTime('');}}/>
          <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>{[30,60,90,120].map(value=><Chip key={value} active={duration===value} onPress={()=>{setDuration(value);setTime('');}}>{value+' min'}</Chip>)}</View>
          {agenda.key!==agendaKey ? <Label>Consultando horarios…</Label> : agenda.error ? <Label accessibilityRole="alert">{agenda.error}</Label> : !agenda.times.length ? <Label>No hay turnos disponibles para esta fecha y duración.</Label> : <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>{agenda.times.map(value=><Chip key={value} active={time===value} onPress={()=>setTime(value)}>{value}</Chip>)}</View>}
          {!!time && (price.key!==priceKey ? <Label>Consultando precio…</Label> : price.error ? <Label accessibilityRole="alert">{price.error}</Label> : price.quote && <View style={{gap:8,padding:20,backgroundColor:'#EAF1E6',borderRadius:20}}><Label>Precio del servidor: {money(price.quote.total)} COP</Label><Label>Descuento incluido: {money(price.quote.discount)}</Label><Label>Consultar no bloquea el turno. El precio y la disponibilidad pueden cambiar hasta reservar.</Label><Button onPress={()=>router.push({pathname:'/remote-reservations',params:{court:court.id,date,time,duration:String(duration)}})}>Continuar con este horario</Button></View>)}
        </>}
      </>}
    </View>}
  </Page>;
}
