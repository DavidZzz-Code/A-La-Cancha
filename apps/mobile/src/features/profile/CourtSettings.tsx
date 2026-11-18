import {CourtDetails} from '../remote-agenda/CourtDetails';
import {useTheme} from '../../lib/theme';
import {useEffect,useState} from 'react';
import {TextInput,View} from 'react-native';
import {Button,Label} from '../../components/ui';
import {supabase} from '../auth/client';

type Court={id:string;name:string;published:boolean;hourly_price:number;open_minute:number;close_minute:number;capacity:number};
function clock(value:number){return String(Math.floor(value/60)).padStart(2,'0')+':'+String(value%60).padStart(2,'0');}
function minutes(value:string){
  if(!/^(?:[01]\d|2[0-3]):(?:00|30)$/.test(value) && value!=='24:00')return NaN;
  const [h,m]=value.split(':').map(Number);return h*60+m;
}
export function CourtSettings({venue}:{venue:string}){ const {colors:colors}=useTheme();
  const [courts,setCourts]=useState<Court[]>([]),[error,setError]=useState(false),[revision,setRevision]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();
    setError(false);
    supabase?.from('courts').select('id,name,published,hourly_price,open_minute,close_minute,capacity').eq('venue_id',venue).abortSignal(controller.signal)
      .then(({data,error})=>{if(!controller.signal.aborted){setError(!!error);setCourts(data??[]);}});
    return ()=>controller.abort();
  },[venue,revision]);
  return <View style={{gap:12}}>{error?<Button secondary onPress={()=>setRevision(v=>v+1)}>Reintentar carga de tarifas</Button>:courts.map(c=><Editor key={c.id} court={c}/>)}</View>;
}
function Editor({court}:{court:Court}){ const {colors:colors}=useTheme();
  const [open,setOpen]=useState(false),[price,setPrice]=useState(String(court.hourly_price));
  const [start,setStart]=useState(clock(court.open_minute)),[end,setEnd]=useState(clock(court.close_minute));
  const [capacity,setCapacity]=useState(String(court.capacity)),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const [published,setPublished]=useState(court.published);
  async function toggle(){
    if(!supabase||busy)return;setBusy(true);setMessage('');
    try{const {error}=await supabase.rpc('set_court_publication',{p_court:court.id,p_published:!published});
    if(error)throw error;setPublished(!published);setMessage(published?'Cancha pausada para nuevas reservas.':'Cancha publicada.');}
    catch{setMessage('No pudimos cambiar la publicación.');}finally{setBusy(false);}
  }
  const valid=/^\d+$/.test(price) && Number(price)<=10000000 && /^\d+$/.test(capacity) && Number(capacity)>=1 && Number(capacity)<=12 && minutes(start)<minutes(end);
  async function save(){
    if(!supabase||busy||!valid)return;
    setBusy(true);setMessage('');
    try{
      const {error}=await supabase.rpc('update_court_settings',{p_court:court.id,p_price:Number(price),p_open:minutes(start),p_close:minutes(end),p_capacity:Number(capacity)});
      if(error)throw error;
      setMessage('Cambios guardados para las nuevas reservas.');
    }catch{setMessage('No pudimos guardar. Revisa tu conexión e inténtalo de nuevo.');}
    finally{setBusy(false);}
  }
  return <View style={{gap:10}}>
    <Button secondary onPress={()=>setOpen(!open)}>{open?'Cerrar edición':'Editar cancha · Fotos, tarifa y horarios'}</Button>
    <Button secondary disabled={busy} onPress={toggle}>{published?'Pausar nuevas reservas':'Publicar cancha'}</Button>
    {!!message&&<Label>{message}</Label>}
    {open && <><CourtDetails id={court.id} manage/>
      {([{label:'Precio por hora (COP)',value:price,change:setPrice,numeric:true},{label:'Apertura (HH:MM)',value:start,change:setStart,numeric:false},{label:'Cierre (HH:MM)',value:end,change:setEnd,numeric:false},{label:'Capacidad máxima (1 a 12)',value:capacity,change:setCapacity,numeric:true}]).map(field=><View key={field.label} style={{gap:5}}><Label>{field.label}</Label><TextInput accessibilityLabel={field.label} value={field.value} onChangeText={field.change} keyboardType={field.numeric?'number-pad':'default'} editable={!busy} maxLength={field.numeric?8:5} style={{padding:14,borderRadius:12,borderWidth:1,borderColor:colors.border,color:colors.ink}}/></View>)}
      <Label>Hora de Colombia. Usa intervalos de 30 minutos, por ejemplo 10:00 o 15:30.</Label>
      <Button disabled={busy||!valid} onPress={save}>{busy?'Guardando…':'Guardar tarifa y horarios'}</Button>

    </>}
  </View>;
}
