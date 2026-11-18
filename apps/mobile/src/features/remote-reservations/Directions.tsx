import {useEffect,useState} from 'react';
import {Image,Linking,View} from 'react-native';
import {Button,Label} from '../../components/ui';
import {CourtCover} from '../remote-agenda/CourtCover';
import {supabase} from '../auth/client';

type Venue={name:string;city:string;address:string|null;latitude:number|null;longitude:number|null;entrance_confirmed:boolean};
export function Directions({court}:{court:string}){
 const [venue,setVenue]=useState<Venue|null>(null);
 const [photo,setPhoto]=useState('');
 const [error,setError]=useState('');
 const [retry,setRetry]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();
  supabase!.storage.from('court-gallery').list(court,{limit:1}).then(({data})=>{if(!controller.signal.aborted && data?.[0])setPhoto(supabase!.storage.from('court-gallery').getPublicUrl(court+'/'+data[0].name).data.publicUrl);}).catch(()=>{});
  async function load(){
   const result=await supabase!.from('courts').select('venue:venues!inner(name,city,address,latitude,longitude,entrance_confirmed)').eq('id',court).abortSignal(controller.signal).single();
   if(result.error)throw result.error;
   if(!controller.signal.aborted){setVenue(result.data.venue as unknown as Venue);setError('');}
  }
  load().catch(()=>{if(!controller.signal.aborted)setError('No pudimos consultar la entrada.');});
  return()=>controller.abort();
 },[court,retry]);
 async function open(){
  if(!venue)return;
  const address=[venue.name,venue.address,venue.city,'Colombia'].filter(Boolean).join(', ');
  const url=venue.latitude!=null && venue.longitude!=null
   ? 'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(venue.latitude+','+venue.longitude)
   : 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(address);
  try{await Linking.openURL(url);}catch{setError('No se pudo abrir Google Maps.');}
 }
 return <View style={{gap:10}}>{venue&&<>
 <View style={{height:112,overflow:'hidden',borderRadius:16}}>{photo?<Image source={{uri:photo}} style={{width:'100%',height:'100%'}}/>:<CourtCover name={venue.name}/>}</View>
 <Label style={{fontSize:21,fontWeight:'700'}}>{venue.name}</Label>
 <Label>{[venue.address,venue.city].filter(Boolean).join(', ')}</Label>
 <Button onPress={open}>{venue.latitude!=null&&venue.longitude!=null?'Cómo llegar':'Ver dirección'}</Button></>}{!!error&&<Button secondary onPress={()=>setRetry(n=>n+1)}>{error+' Reintentar'}</Button>}</View>;
}
