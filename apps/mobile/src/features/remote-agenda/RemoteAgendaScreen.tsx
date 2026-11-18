import {CourtDetails} from './CourtDetails';
import {hourLabel} from './hour';
import {NeonPitch} from '../../components/NeonPitch';
import {BrandIcon} from '../../components/BrandIcon';
import {NextMatch} from './NextMatch';
import {useCourtFavorites} from '../profile/CourtFavorites';
import {useTheme} from '../../lib/theme';
import CourtMap from './CourtMap';
import { CourtCover } from './CourtCover';
import { useEffect, useState } from 'react';
import {  Modal, Pressable, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts } from '@alacancha/design-tokens';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { addDays, localDate, money } from '@alacancha/domain';
import { Page, Heading, Label, Button, Chip, DateStrip, Empty, Sheet } from '../../components/ui';
import { supabase } from '../auth/client';
import { fetchBusy, fetchCourts, fetchQuote } from './api';
import { openSlots, type RemoteCourt, type ServerQuote } from './contracts';
export default function RemoteAgendaScreen(){
 const {court}=useLocalSearchParams<{court?:string}>();
 return <Agenda key={court} initialCourt={court}/>;
}
function Agenda({initialCourt}:{initialCourt?:string}) { const {colors:colors}=useTheme();
  const router=useRouter();const favorites=useCourtFavorites();
  const [mapOpen,setMapOpen]=useState(false);
  const {height}=useWindowDimensions();
  const insets=useSafeAreaInsets();
  const [search,setSearch]=useState('');
  const [near,setNear]=useState<RemoteCourt[]>([]);
  const [refresh,setRefresh]=useState(0);
  const [catalog,setCatalog]=useState<{revision:number;items:RemoteCourt[];error:string}>({revision:-1,items:[],error:''});
  const [courtId,setCourtId]=useState(initialCourt||''); const [date,setDate]=useState(()=>addDays(localDate(),1));
  const [now,setNow]=useState(Date.now);
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),60000);return()=>clearInterval(timer);},[]);
  const [period,setPeriod]=useState('');
  const duration=60; const [time,setTime]=useState('');
  const [agenda,setAgenda]=useState<{key:string;times:string[];error:string}>({key:'',times:[],error:''});
  const [price,setPrice]=useState<{key:string;quote:ServerQuote|null;error:string}>({key:'',quote:null,error:''});
  const court=catalog.items.find(c=>c.id===courtId);
  const candidates=court?openSlots(court,date,duration,[],now):[];
  const periodOf=(v:string)=>Number(v.slice(0,2))<12?'Mañana':Number(v.slice(0,2))<18?'Tarde':'Noche';
  const periods=['Mañana','Tarde','Noche'].filter(label=>candidates.some(v=>periodOf(v)===label));
  const activePeriod=periods.includes(period)?period:periods[0];
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
  const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const visible=catalog.items.filter(item=>normalize([item.name,item.venue,item.city].join(' ')).includes(normalize(search.trim())));
  return <Page><View style={{backgroundColor:'#061D31',padding:24,borderRadius:28,marginBottom:24,borderWidth:1,borderColor:'#164364',overflow:'hidden'}}>
    <Label accessibilityRole="header" style={{fontFamily:fonts.display,fontSize:34,color:'#FFFFFF',letterSpacing:-1}}>Menos charla,</Label>
    <Label style={{fontFamily:fonts.display,fontSize:34,color:'#B4FF19',letterSpacing:-1}}>más cancha.</Label>
    <View style={{height:100,alignSelf:'flex-end',width:190,marginTop:4}}><NeonPitch/></View>
  </View>
    {!supabase ? <Empty title="Conexión pendiente" message="Esta versión conserva la demostración local. La agenda en línea aún no está configurada."/> : <View style={{gap:18,maxWidth:800}}>
      <Pressable accessibilityRole="button" accessibilityLabel="Encuentra dónde jugar. Abrir mapa" onPress={()=>setMapOpen(true)} style={{flexDirection:'row',alignItems:'center',gap:14,padding:18,minHeight:60,borderRadius:32,backgroundColor:colors.paper,borderWidth:1,borderColor:colors.border}}><BrandIcon kind="search" color={colors.ink}/><Label style={{fontSize:17,color:colors.muted}}>Encuentra dónde jugar</Label></Pressable>
      <Modal visible={mapOpen} animationType="slide" onRequestClose={()=>setMapOpen(false)}>
        <View style={{flex:1,paddingTop:insets.top,paddingBottom:insets.bottom,backgroundColor:colors.paper}}>
          <View style={{padding:12,gap:8}}>
            <Button secondary onPress={()=>setMapOpen(false)}>Volver a las canchas</Button>
      <TextInput accessibilityLabel="Buscar por cancha, sede o ciudad" placeholder="Buscar cancha, sede o ciudad" placeholderTextColor={colors.muted} value={search} onChangeText={value=>{setSearch(value);setCourtId('');setTime('');}} style={{padding:16,borderRadius:16,backgroundColor:colors.paper,color:colors.ink,borderWidth:1,borderColor:colors.border}}/>
          </View>
          <CourtMap height={Math.max(240,height-insets.top-insets.bottom-166)} courts={visible} onNearby={setNear} onSelect={id=>{setCourtId(id);setTime('');setMapOpen(false);}}/>
        </View>
      </Modal>
      {catalog.revision!==refresh ? <Label>Cargando canchas…</Label> : catalog.error ? <Label accessibilityRole="alert">{catalog.error}</Label> : !catalog.items.length ? <Empty title="Aún no hay canchas publicadas" message="Las sedes aparecerán aquí cuando publiquen sus horarios."/> : <>
        {!visible.length && <Label>Ninguna cancha coincide con tu búsqueda.</Label>}
        <Heading title="Canchas en Cartagena"/>
        <View style={{gap:14}}>
        {[...catalog.items].sort((a,b)=>{const rank=(id:string)=>{const i=near.findIndex(c=>c.id===id);return i<0?Infinity:i;};return rank(a.id)-rank(b.id);}).map(item=><View key={item.id} style={{borderRadius:24,borderWidth:1,borderColor:colors.border,backgroundColor:colors.paper,overflow:'hidden'}}>
        <Pressable accessibilityRole="button" accessibilityLabel={item.venue+', '+money(item.hourlyPrice)+' por hora. Ver horarios'} onPress={()=>{setCourtId(item.id);setTime('');}} style={{flexDirection:'row',padding:10,gap:14,alignItems:'center'}}>
          <View style={{height:112,width:'38%',borderRadius:16,overflow:'hidden'}}><CourtCover name={item.venue} court={item.id}/></View>
          <View style={{flex:1,gap:7}}><Label style={{fontFamily:fonts.display,fontSize:19}}>{item.venue}</Label><Label style={{fontFamily:fonts.bold,color:colors.forest,fontSize:16}}>{money(item.hourlyPrice)} <Label style={{color:colors.muted}}>/ hora</Label></Label><Label style={{color:colors.muted,fontSize:12}}>Hasta {item.capacity} jugadores · Ver horarios ›</Label></View>
        </Pressable>
        <CourtDetails id={item.id}/>
        <Pressable accessibilityRole="button" accessibilityLabel={favorites.ids.includes(item.id)?'Quitar de favoritos':'Guardar cancha en favoritos'} accessibilityState={{selected:favorites.ids.includes(item.id),disabled:!favorites.ready}} disabled={!favorites.ready} onPress={()=>favorites.toggle(item.id)} style={{alignSelf:'flex-end',flexDirection:'row',gap:8,minHeight:44,paddingHorizontal:16,alignItems:'center'}}><BrandIcon kind="heart" size={20} color={favorites.ids.includes(item.id)?colors.forest:colors.muted}/><Label style={{fontSize:12,color:colors.muted}}>{favorites.ids.includes(item.id)?'Guardada':'Guardar'}</Label></Pressable>
        </View>)}
        </View>
        {!!favorites.error&&<Label accessibilityRole="alert">{favorites.error}</Label>}
        <NextMatch/>
        {court && <Sheet visible={!!court} title={court.name} onClose={()=>{setCourtId('');setTime('');}}><CourtDetails id={court.id} cover={court.venue}/><Label>{court.capacity} jugadores como máximo</Label><DateStrip value={date} onChange={value=>{setDate(value);setTime('');}}/>
          <Label>Horarios · 1 hora</Label>
          <View style={{flexDirection:'row',gap:8}}>{periods.map(label=><Chip key={label} active={activePeriod===label} onPress={()=>{setPeriod(label);setTime('');}}>{label}</Chip>)}</View>
          {agenda.key!==agendaKey ? <Label>Consultando horarios…</Label> : agenda.error ? <Label accessibilityRole="alert">{agenda.error}</Label> : !openSlots(court,date,duration,[],now).length ? <Label>No hay turnos disponibles para esta fecha y duración.</Label> : <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>{candidates.filter(v=>periodOf(v)===activePeriod).map(value=>agenda.times.includes(value)?<Chip key={value} active={time===value} onPress={()=>setTime(value)}>{hourLabel(value)}</Chip>:<View key={value} accessibilityState={{disabled:true}} style={{borderColor:colors.danger,borderWidth:1,borderRadius:14,padding:10}}><Label style={{color:colors.danger}}>{hourLabel(value)} · Ocupado</Label></View>)}</View>}
          {!!time && (price.key!==priceKey ? <Label>Consultando precio…</Label> : price.error ? <Label accessibilityRole="alert">{price.error}</Label> : price.quote && <View style={{gap:8,padding:20,backgroundColor:colors.soft,borderRadius:20}}><Label>{hourLabel(time)} – {hourLabel(time,60)}</Label><Label style={{fontSize:20,fontWeight:'700'}}>Total   {money(price.quote.total)}</Label><Label>Anticipo   {money(price.quote.deposit)}</Label>{price.quote.discount>0&&<Label>Descuento   {money(price.quote.discount)}</Label>}<Button onPress={()=>{setCourtId('');router.push({pathname:'/remote-reservations',params:{court:court.id,date,time,duration:String(duration),venue:court.venue,capacity:String(court.capacity),total:String(price.quote!.total),deposit:String(price.quote!.deposit)}});}}>{'Continuar · '+hourLabel(time)}</Button></View>)}
        </Sheet>}
      </>}
      <Button secondary onPress={()=>{setTime('');setRefresh(v=>v+1);}}>Actualizar agenda</Button>
    </View>}
  </Page>;
}
