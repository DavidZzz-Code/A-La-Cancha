import {CourtDetails} from './CourtDetails';
import {useTheme} from '../../lib/theme';
import {money} from '@alacancha/domain';
import {useEffect,useMemo,useRef,useState} from 'react';
import {View,ScrollView} from 'react-native';
import {ZoneMap,type Point} from './ZoneMap';
import * as Location from 'expo-location';
import {Button,Label} from '../../components/ui';
import {distance,type MapProps} from './mapData';

export default function CourtMap({courts,onNearby,onSelect,height}:MapProps){
  const {colors}=useTheme();
  const [center,setCenter]=useState<Point>({latitude:10.4,longitude:-75.5});
  const [position,setPosition]=useState<{latitude:number;longitude:number}|null>(null);
  const [pin,setPin]=useState('');
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  const mapped=courts.filter(c=>c.latitude!==null && c.longitude!==null);
  const groups=new Map(mapped.map(c=>[String([c.latitude,c.longitude]),c]));
  const sorted=useMemo(()=>position ? courts.filter(c=>c.latitude!==null && c.longitude!==null).sort((a,b)=>distance(position.latitude,position.longitude,a)-distance(position.latitude,position.longitude,b)) : [],[courts,position]);
  const ids=JSON.stringify(sorted.map(c=>c.id));
  const previousOrder=useRef('');
  useEffect(()=>{if(previousOrder.current!==ids){previousOrder.current=ids;onNearby(sorted);}},[ids,onNearby,sorted]);
  async function locate(){
    setBusy(true);
    try {
      const permission=await Location.requestForegroundPermissionsAsync();
      if(!permission.granted){setMessage('Puedes mover el mapa para elegir una zona.');return;}
      const {coords}=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Balanced});
      const point={latitude:coords.latitude,longitude:coords.longitude};
      setPosition(point);setMessage('');
      setCenter(point);
    }catch{setMessage('No pudimos obtener tu ubicación. Puedes explorar el mapa.');}
    finally{setBusy(false);}
  }
  return <View style={{flex:1}}>
    <ZoneMap height={height} center={center} onCenter={setCenter} onPick={setPin} pins={[
      ...[...groups].map(([id,c])=>({id,selected:id===pin,price:money(c.hourlyPrice),name:c.venue+' · '+money(c.hourlyPrice),latitude:c.latitude!,longitude:c.longitude!})),
      ...(position?[{...position,id:'me',player:true,name:'Tu ubicación'}]:[])
    ]}/>
    <View style={{position:'absolute',right:10,top:10}}><Button secondary disabled={busy} onPress={locate}>{busy?'Buscando tu posición…':'Ubicarme en el mapa'}</Button></View>
    {(!!message||!mapped.length||mapped.some(c=>String([c.latitude,c.longitude])===pin))&&<ScrollView style={{position:'absolute',bottom:0,left:0,right:0,maxHeight:'62%',backgroundColor:colors.paper,borderRadius:18}} contentContainerStyle={{padding:12,gap:8}}>
    {!!message&&<Label>{message}</Label>}{!mapped.length&&<Label>No hay sedes con ubicación publicada en esta búsqueda.</Label>}
    {mapped.filter(c=>String([c.latitude,c.longitude])===pin).map(c=><View key={c.id} style={{gap:6}}><Label style={{fontSize:20,fontWeight:'700'}}>{c.venue}</Label><Label>{money(c.hourlyPrice)} / hora</Label><CourtDetails id={c.id} cover={c.venue}/><Button onPress={()=>onSelect(c.id)}>Ver horarios</Button></View>)}
    <Button secondary onPress={()=>{setPin('');setMessage('');}}>Volver al mapa</Button></ScrollView>}
  </View>;
}