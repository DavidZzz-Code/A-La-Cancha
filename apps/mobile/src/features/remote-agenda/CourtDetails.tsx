import {useEffect,useState} from 'react';
import {Alert,Image,View,ScrollView,Pressable,TextInput} from 'react-native';
import * as Picker from 'expo-image-picker';
import {randomUUID} from 'expo-crypto';
import {Button,Label,Sheet} from '../../components/ui';
import {useTheme} from '../../lib/theme';
import {supabase} from '../auth/client';

import {CourtCover} from './CourtCover';
type Review={rating:number;comment:string};
export function CourtDetails({id,manage=false,cover}:{id:string;manage?:boolean;cover?:string}){
 const [photos,setPhotos]=useState<string[]>([]),[reviews,setReviews]=useState<Review[]>([]);
 const [revision,refresh]=useState(0),[panel,show]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [loaded,setLoaded]=useState(false);
 useEffect(()=>{
  let active=true;
  async function loadPhotos(){
   const db=supabase!;
   const files:string[]=[];
   for(let offset=0;active;offset+=100){const page=await db.storage.from('court-gallery').list(id,{limit:100,offset,sortBy:{column:'name',order:'asc'}});if(page.error)throw page.error;files.push(...page.data.map(v=>id+'/'+v.name));if(page.data.length<100)break;}
   if(active)setPhotos(files);
  }
  async function loadReviews(){
   const db=supabase!;const rows:Review[]=[];
   for(let offset=0;active;offset+=100){const page=await db.from('court_reviews').select('rating,comment').eq('court_id',id).order('created_at',{ascending:false}).range(offset,offset+99);if(page.error)throw page.error;rows.push(...page.data);if(page.data.length<100)break;}
   if(active){setReviews(rows);setLoaded(true);}
  }
  Promise.all([loadPhotos(),loadReviews()]).then(()=>{if(active)setError('');}).catch(()=>{if(active)setError('No pudimos cargar fotos y reseñas.');});return()=>{active=false;};
 },[id,revision]);
 async function upload(){
  if(busy)return;setBusy(true);setError('');
  try{
   const result=await Picker.launchImageLibraryAsync({mediaTypes:['images'],quality:.8,base64:true});
   if(result.canceled)return;
   const encoded=result.assets[0].base64;if(!encoded)throw Error();
   if(encoded.length>6990508){setError('Elige una foto de menos de 5 MB.');return;}
   const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
   const res=await supabase!.storage.from('court-gallery').upload(id+'/'+randomUUID()+'.jpg',bytes.buffer,{contentType:'image/jpeg'});
   if(res.error)throw res.error;refresh(n=>n+1);
  }catch{setError('No pudimos subir la foto. Revisa la conexión y el tamaño.');}finally{setBusy(false);}
 }
 function removePhoto(path:string){
  Alert.alert('¿Retirar esta foto?', 'Se quitará de la galería de la cancha.',[
   {text:'Conservar',style:'cancel'},{text:'Retirar',style:'destructive',onPress:async()=>{
    setBusy(true);
    try{const result=await supabase!.storage.from('court-gallery').remove([path]);if(result.error)throw result.error;show('');refresh(n=>n+1);}
    catch{show('');setError('No pudimos retirar la foto.');}finally{setBusy(false);}
   }}]);
 }
 const url=(path:string)=>supabase!.storage.from('court-gallery').getPublicUrl(path).data.publicUrl;
 const avg=reviews.length?(reviews.reduce((sum,v)=>sum+v.rating,0)/reviews.length).toFixed(1).replace('.',','):'';
 return <View style={{padding:10,gap:8}}>
 {cover&&!photos.length&&<View style={{height:146,borderRadius:14,overflow:'hidden'}}><CourtCover name={cover}/></View>}
 {photos.length>0&&<ScrollView horizontal>{photos.map(path=><Pressable key={path} accessibilityLabel="Ampliar foto" onPress={()=>show(path)}><Image source={{uri:url(path)}} style={{width:244,height:142,marginRight:8,borderRadius:12}}/></Pressable>)}</ScrollView>}
 {loaded&&<Pressable accessibilityRole="button" onPress={()=>show('reviews')}><Label>{avg?'★ '+avg+' · '+reviews.length+' reseñas ›':'☆ 0 reseñas'}</Label></Pressable>}
 {manage&&<Button secondary disabled={busy} onPress={upload}>Subir foto</Button>}
 {!!error&&<Button secondary onPress={()=>refresh(n=>n+1)}>{error+' Reintentar'}</Button>}
 <Sheet visible={!!panel} title={panel==='reviews'?'Reseñas':'Fotos de la cancha'} onClose={()=>show('')}>
 {panel==='reviews'?(reviews.length?reviews.map((v,i)=><Label key={i}>{'★ '+v.rating+' / 5'+(v.comment?' · '+v.comment:'')}</Label>):<Label>Los jugadores podrán opinar después de completar su reserva.</Label>):panel&&<Image source={{uri:url(panel)}} resizeMode="contain" style={{height:320,width:'100%'}}/>}
 {manage&&!!panel&&panel!=='reviews'&&<Button secondary disabled={busy} onPress={()=>removePhoto(panel)}>Retirar foto</Button>}
 </Sheet></View>;
}
export function WriteReview({court,reservation}:{court:string;reservation:string}){
 const {colors}=useTheme();const [rating,setRating]=useState(0),[comment,setComment]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[done,setDone]=useState(false);
 async function send(){if(!rating||busy)return;setBusy(true);try{const {error}=await supabase!.from('court_reviews').insert({reservation_id:reservation,court_id:court,rating,comment:comment.trim()});if(error&&error.code!=='23505')throw error;setDone(true);setMessage(error?'Ya valoraste esta reserva.':'Reseña publicada.');}catch{setMessage('No pudimos publicar tu reseña.');}finally{setBusy(false);}}
 return <View style={{gap:8}}>{!done&&<><Label>¿Cómo estuvo la cancha?</Label><View style={{flexDirection:'row'}}>{[1,2,3,4,5].map(n=><Pressable key={n} accessibilityLabel={n+' estrellas'} style={{padding:8}} onPress={()=>setRating(n)}><Label style={{fontSize:22,color:colors.forest}}>{rating>=n?'★':'☆'}</Label></Pressable>)}</View><TextInput value={comment} onChangeText={setComment} placeholder="Tu experiencia (opcional)" placeholderTextColor={colors.muted} style={{color:colors.ink,padding:10}} maxLength={500}/><Button disabled={!rating||busy} onPress={send}>Publicar reseña</Button></>}{!!message&&<Label>{message}</Label>}</View>;
}
