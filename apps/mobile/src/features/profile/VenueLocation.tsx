import {useState} from 'react';
import {View} from 'react-native';
import {Button,Label} from '../../components/ui';
import {ZoneMap} from '../remote-agenda/ZoneMap';
import {supabase} from '../auth/client';

export function VenueLocation({site}:{site:{id:string;name:string;latitude:number|null;longitude:number|null}}){
  const [open,setOpen]=useState(false);
  const [center,setCenter]=useState({latitude:site.latitude??10.4,longitude:site.longitude??-75.5});
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
  async function save(){
    if(!supabase||busy)return;
    setBusy(true);
    try{
      const {error}=await supabase.rpc('set_venue_location',{p_venue:site.id,p_lat:center.latitude,p_lon:center.longitude});
      if(error)throw error;
      setMessage('Ubicación guardada.');setOpen(false);
    }catch{setMessage('No pudimos guardar la ubicación. Vuelve a intentarlo.');}
    finally{setBusy(false);}
  }
  return <View style={{gap:8}}><Button secondary onPress={()=>setOpen(!open)}>{'Ubicar entrada en el mapa'}</Button>
    {open && <><Label>Toca la entrada o centra el mapa sobre ella.</Label>
      <ZoneMap center={center} onCenter={setCenter} onPlace={setCenter} pins={[{...center,id:site.id,name:site.name}]} onPick={()=>{}}/>
      <Button disabled={busy} onPress={save}>Confirmar entrada de la cancha</Button></>}
    {!!message && <Label>{message}</Label>}
  </View>;
}
