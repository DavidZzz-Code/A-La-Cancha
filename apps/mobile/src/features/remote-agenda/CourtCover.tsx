import {useEffect,useState} from 'react';
import {Image,Text,View} from 'react-native';
import {PitchArt} from '../../components/PitchArt';
import {supabase} from '../auth/client';

const covers=[
 {name:'socorro',image:require('../../../assets/socorro.jpg')},
 {name:'jardines',image:require('../../../assets/jardines.jpg')},
 {name:'alameda',image:require('../../../assets/alameda.jpg')},
 {name:'fernando',image:require('../../../assets/fernando.jpg')},
];
export function CourtCover({name,court}:{name:string;court?:string}){
 const cover=covers.find(item=>name.toLowerCase().includes(item.name));
 const [uploaded,setUploaded]=useState('');
 useEffect(()=>{
   let active=true;setUploaded('');
   if(court&&supabase){
    const gallery=supabase.storage.from('court-gallery');
    gallery.list(court,{limit:1,sortBy:{column:'name',order:'asc'}}).then(({data})=>{
      if(active&&data?.[0])setUploaded(gallery.getPublicUrl(court+'/'+data[0].name).data.publicUrl);
    }).catch(()=>{});
   }
   return()=>{active=false;};
 },[court]);
 if(!cover&&!uploaded)return <PitchArt/>;
 return <View style={{flex:1}}><Image accessibilityLabel={name} resizeMode="cover" source={uploaded?{uri:uploaded}:cover?.image} style={{width:'100%',height:'100%'}}/>
 {!uploaded&&<Text style={{position:'absolute',left:5,bottom:5,color:'white',fontSize:10,backgroundColor:'#07131cda',borderRadius:5,paddingHorizontal:5,paddingVertical:2}}>Imagen ilustrativa</Text>}</View>;
}
