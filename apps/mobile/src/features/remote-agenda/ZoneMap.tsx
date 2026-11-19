import {useEffect,useRef,useState} from 'react';
import {Image,Linking,PanResponder,Pressable,Text,View} from 'react-native';
import {Chip} from '../../components/ui';

export type Point={latitude:number;longitude:number};
type Pin=Point & {id:string;name:string;selected?:boolean;player?:boolean};
const tileSize=256;
function pixel(point:Point,scale:number){
  const lat=Math.min(85.0511,Math.max(-85.0511,point.latitude))*Math.PI/180;
  return {x:(point.longitude+180)/360*scale,y:(1-Math.asinh(Math.tan(lat))/Math.PI)/2*scale};
}
function point(x:number,y:number,scale:number):Point{
  return {longitude:((x/scale*360)%360+360)%360-180,latitude:Math.atan(Math.sinh(Math.PI*(1-2*Math.min(1,Math.max(0,y/scale)))))*180/Math.PI};
}
export function ZoneMap({center,onCenter,pins,onPick,height=280}:{center:Point;onCenter:(p:Point)=>void;pins:Pin[];onPick:(id:string)=>void;onPlace?:(p:Point)=>void;height?:number}){
  const [zoom,setZoom]=useState(14);
  const [width,setWidth]=useState(0);
  const count=2**zoom, scale=tileSize*count;
  const middle=pixel(center,scale), left=middle.x-width/2, top=middle.y-height/2;
  const start=useRef(middle);
  const current=useRef({middle,scale,onCenter});
  useEffect(()=>{current.current={middle,scale,onCenter};},[middle,scale,onCenter]);
  const [gesture,setGesture]=useState<ReturnType<typeof PanResponder.create>>();
  useEffect(()=>{
   const responder=PanResponder.create({
    onMoveShouldSetPanResponderCapture:(_,g)=>Math.abs(g.dx)+Math.abs(g.dy)>8,
    onPanResponderGrant:()=>{start.current=current.current.middle;},
    onPanResponderMove:(_,g)=>current.current.onCenter(point(start.current.x-g.dx,start.current.y-g.dy,current.current.scale)),
   });
   const timer=setTimeout(()=>setGesture(responder),0);
   return()=>clearTimeout(timer);
  },[]);
  const tiles=[];
  for(let y=Math.max(0,Math.floor(top/tileSize));y<=Math.min(count-1,Math.floor((top+height)/tileSize));y++){
    for(let x=Math.floor(left/tileSize);x<=Math.floor((left+width)/tileSize);x++){
      const col=((x%count)+count)%count;
      tiles.push(<Image key={zoom+'/'+x+'/'+y} accessibilityIgnoresInvertColors source={{uri:'https://tile.openstreetmap.org/'+zoom+'/'+col+'/'+y+'.png',headers:{'User-Agent':'ALaCancha/0.1.4 (com.alacancha.app)'}}} style={{position:'absolute',width:256,height:256,left:x*256-left,top:y*256-top}}/>);
    }
  }
  return <View style={{gap:6}}>
    <View {...gesture?.panHandlers} onLayout={e=>setWidth(e.nativeEvent.layout.width)} style={{height,overflow:'hidden',borderRadius:16,backgroundColor:'#dde8df'}}>
      {width>0 && tiles}
      {pins.map(pin=>{const pos=pixel(pin,scale);return <Pressable accessibilityRole="button" accessibilityLabel={pin.name} onPress={()=>onPick(pin.id)} key={pin.id} style={{position:'absolute',left:pos.x-left-15,top:pos.y-top-15,borderRadius:16,width:30,height:30,alignItems:'center',justifyContent:'center',backgroundColor:pin.selected||pin.player?'#1858C8':'#104331',borderColor:'white',borderWidth:2}}><Text style={{color:'white',fontWeight:'bold'}}>{pin.player?'●':'A'}</Text></Pressable>;})}
    </View>
    <View style={{flexDirection:'row',gap:6,alignItems:'center',flexWrap:'wrap'}}><Chip onPress={()=>setZoom(z=>Math.min(19,z+1))}>Acercar</Chip><Chip onPress={()=>setZoom(z=>Math.max(3,z-1))}>Alejar</Chip><Text accessibilityRole="link" onPress={()=>void Linking.openURL('https://www.openstreetmap.org/copyright')}>© OpenStreetMap</Text></View>
  </View>;
}
