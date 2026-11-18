import {Text,View} from 'react-native';
import {useEffect,useRef} from 'react';
import MapView,{Marker,PROVIDER_GOOGLE} from 'react-native-maps';
import {useTheme} from '../../lib/theme';

export type Point={latitude:number;longitude:number};
type Pin=Point & {id:string;name:string;player?:boolean;selected?:boolean;price?:string};
const night=[
 {elementType:'geometry',stylers:[{color:'#172a3b'}]},
 {elementType:'labels.text.fill',stylers:[{color:'#b5c5d2'}]},
 {elementType:'labels.text.stroke',stylers:[{color:'#102033'}]},
 {featureType:'road',elementType:'geometry',stylers:[{color:'#40566a'}]},
 {featureType:'water',elementType:'geometry',stylers:[{color:'#08223e'}]}
];
export function ZoneMap({center,onCenter,pins,onPick,onPlace,height=280}:{center:Point;onCenter:(p:Point)=>void;pins:Pin[];onPick:(id:string)=>void;onPlace?:(p:Point)=>void;height?:number}){
 const {dark}=useTheme();
 const ref=useRef<MapView>(null);
 const last=useRef(center);
 useEffect(()=>{
  if(Math.abs(center.latitude-last.current.latitude)+Math.abs(center.longitude-last.current.longitude)>0.00001){
   last.current=center;ref.current?.animateCamera({center},{duration:350});
  }
 },[center]);
 return <MapView ref={ref} provider={PROVIDER_GOOGLE} style={{height,width:'100%'}} customMapStyle={dark?night:[]} toolbarEnabled={false} onPress={e=>{if(onPlace)onPlace(e.nativeEvent.coordinate);}}
 initialRegion={{...center,latitudeDelta:.065,longitudeDelta:.065}}
 onRegionChangeComplete={r=>{last.current={latitude:r.latitude,longitude:r.longitude};onCenter(last.current);}}>
 {pins.map(pin=><Marker key={pin.id} coordinate={pin} accessibilityLabel={pin.name} pinColor={pin.player?'#287EFF':'#138749'} onPress={()=>onPick(pin.id)}>{pin.price?<View style={{backgroundColor:pin.selected?'#0864aa':dark?'#BCFF26':'#FFFFFF',borderColor:'#216438',borderWidth:1,paddingHorizontal:9,paddingVertical:4,borderRadius:14}}><Text style={{color:pin.selected?'white':'#092315',fontWeight:'bold'}}>{pin.price}</Text></View>:undefined}</Marker>)}
 </MapView>;
}
