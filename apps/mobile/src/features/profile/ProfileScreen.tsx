import {useState,useEffect,type ReactNode} from 'react';
import {View,TextInput,Pressable} from 'react-native';
import {useRouter} from 'expo-router';
import {fonts} from '@alacancha/design-tokens';
import {Page,Label,Button,Sheet} from '../../components/ui';
import {PitchArt} from '../../components/PitchArt';
import {BrandIcon} from '../../components/BrandIcon';
import {useTheme} from '../../lib/theme';
import {useAuth} from '../auth/AuthProvider';
import {supabase} from '../auth/client';
import {AccountPanel} from '../auth/AccountPanel';
import {VenueAccess} from './VenueAccess';
import {useCourtFavorites} from './CourtFavorites';
import {fetchCourts} from '../remote-agenda/api';
import type {RemoteCourt} from '../remote-agenda/contracts';
function Card({title,children}:{title:string;children:ReactNode}){const {colors:c}=useTheme();return <View style={{backgroundColor:c.paper,borderWidth:1,borderColor:c.border,borderRadius:24,padding:20,gap:14}}><Label accessibilityRole="header" style={{fontFamily:fonts.display,fontSize:22}}>{title}</Label>{children}</View>;}
function Row({title,onPress,kind='calendar'}:{title:string;onPress:()=>void;kind?:string}){const {colors:c}=useTheme();return <Pressable accessibilityRole="button" onPress={onPress} style={{flexDirection:'row',alignItems:'center',gap:14,minHeight:48}}><BrandIcon kind={kind} color={c.ink}/><Label style={{flex:1,fontSize:16}}>{title}</Label><Label style={{fontSize:24,color:c.muted}}>›</Label></Pressable>;}
export default function ProfileScreen(){
 const {session}=useAuth();return <Page>{session?<MemberProfile key={session.user.id}/>:<AccountPanel/>}</Page>;
}
function MemberProfile(){
 const {session,role}=useAuth();const owner=role==='owner';const {colors:c,mode,setMode,error:themeError}=useTheme();const router=useRouter();const favorites=useCourtFavorites();
 const metadata=session?.user.user_metadata||{};
 const [name,setName]=useState(String(metadata.display_name||'')),[city,setCity]=useState(String(metadata.city||'')),[bio,setBio]=useState(String(metadata.bio||''));
 const [panel,setPanel]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [courts,setCourts]=useState<RemoteCourt[]>([]),[catalogError,setCatalogError]=useState(false);
 useEffect(()=>{if(panel!=='favorites')return;const controller=new AbortController();fetchCourts(controller.signal).then(v=>{if(!controller.signal.aborted){setCatalogError(false);setCourts(v);}}).catch(()=>{if(!controller.signal.aborted)setCatalogError(true);});return()=>controller.abort();},[panel]);
 function open(value:string){setMessage('');setPassword('');setConfirm('');if(value==='edit'){setName(String(metadata.display_name||''));setCity(String(metadata.city||''));setBio(String(metadata.bio||''));}setPanel(value);}
 async function perform(action:()=>PromiseLike<{error:unknown}>,success:string){if(busy)return;setBusy(true);setMessage('');try{const result=await action();if(result.error)throw result.error;setPassword('');setConfirm('');setMessage(success);}catch{setMessage('No pudimos completar el cambio. Revisa tu conexión y vuelve a intentarlo.');}finally{setBusy(false);}}
 const displayName=String(metadata.display_name||'Tu perfil');const initials=metadata.display_name?displayName.trim().split(/\s+/).slice(0,2).map(v=>v[0]).join('').toUpperCase():'AC';
 const field={borderWidth:1,borderColor:c.border,backgroundColor:c.background,color:c.ink,borderRadius:14,padding:14,fontSize:16};
 return <View style={{gap:18,maxWidth:720,width:'100%',alignSelf:'center'}}>
 <View style={{borderRadius:26,overflow:'hidden',backgroundColor:c.paper,borderWidth:1,borderColor:c.border}}><View style={{height:140}}><PitchArt palette="ocean"/></View><View style={{padding:20,paddingTop:42,gap:6}}><View style={{position:'absolute',top:-46,left:20,width:86,height:86,borderRadius:43,backgroundColor:'#DCEAFF',borderWidth:4,borderColor:c.paper,justifyContent:'center',alignItems:'center'}}><Label style={{color:'#082447',fontFamily:fonts.display,fontSize:30}}>{initials}</Label></View><Label style={{fontFamily:fonts.display,fontSize:28}}>{displayName}</Label><Label style={{color:c.muted}}>{owner?'Propietario':'Jugador'}{metadata.city?' · '+metadata.city:''}</Label><View style={{alignSelf:'flex-start',marginTop:10}}><Button secondary onPress={()=>open('edit')}>Editar perfil</Button></View></View></View>
 <Card title="Acerca de mí"><Label style={{lineHeight:23,color:c.muted}}>{String(metadata.bio||(owner?'Completa tu perfil.':'Cuéntanos qué te gusta jugar.'))}</Label></Card>
 {owner?<Card title="Mi establecimiento"><Row title="Administrar mis canchas" onPress={()=>router.push('/owner-courts')}/><Row title="Métricas" onPress={()=>router.push('/owner-metrics')}/></Card>:<Card title="Mi actividad"><Row title="Mis reservas" onPress={()=>router.push('/remote-reservations')}/><Row title="Canchas favoritas" kind="heart" onPress={()=>open('favorites')}/></Card>}
 <Card title="Apariencia"><View accessibilityRole="radiogroup" style={{flexDirection:'row',padding:4,borderWidth:1,borderColor:c.border,borderRadius:25}}>{([['light','Claro'],['dark','Oscuro'],['system','Sistema']] as const).map(([value,label])=><Pressable key={value} accessibilityRole="radio" accessibilityState={{checked:mode===value}} onPress={()=>setMode(value)} style={{flex:1,minHeight:44,borderRadius:22,backgroundColor:mode===value?c.soft:'transparent',alignItems:'center',justifyContent:'center'}}><Label style={{fontFamily:mode===value?fonts.bold:fonts.body,color:mode===value?c.forest:c.ink}}>{label}</Label></Pressable>)}</View>{!!themeError&&<Label accessibilityRole="alert">{themeError}</Label>}</Card>
 <Card title="Seguridad"><Row title="Cambiar contraseña" kind="person" onPress={()=>open('password')}/><View style={{height:1,backgroundColor:c.border}}/><Row title="Sesiones activas" kind="person" onPress={()=>open('sessions')}/></Card>
 {!owner&&<Button secondary onPress={()=>open('venues')}>Soy propietario de una cancha</Button>}
 {session?.user.email&&<Label>Sesión iniciada: {session.user.email}</Label>}
 <Button secondary onPress={()=>open('logout')}>Cerrar sesión</Button>
 <Sheet visible={!!panel} title={{edit:'Editar perfil',favorites:'Canchas favoritas',password:'Cambiar contraseña',sessions:'Sesiones activas',logout:'Cerrar sesión',venues:'Mis establecimientos'}[panel]||'Mi cuenta'} onClose={()=>{if(!busy)setPanel('');}}>
 {panel==='edit'&&<><Label>Nombre</Label><TextInput accessibilityLabel="Nombre" value={name} onChangeText={setName} maxLength={60} style={field}/><Label>Ciudad</Label><TextInput accessibilityLabel="Ciudad" value={city} onChangeText={setCity} maxLength={80} style={field}/><Label>Acerca de mí</Label><TextInput accessibilityLabel="Acerca de mí" value={bio} onChangeText={setBio} multiline maxLength={240} style={field}/><Button disabled={busy||!name.trim()} onPress={()=>void perform(()=>supabase!.auth.updateUser({data:{display_name:name.trim(),city:city.trim(),bio:bio.trim()}}),'Perfil guardado.')}>Guardar perfil</Button></>}
 {panel==='password'&&<><Label>Nueva contraseña (mínimo 8 caracteres)</Label><TextInput accessibilityLabel="Nueva contraseña" secureTextEntry autoCapitalize="none" value={password} onChangeText={setPassword} style={field}/><Label>Repetir contraseña</Label><TextInput accessibilityLabel="Repetir contraseña" secureTextEntry autoCapitalize="none" value={confirm} onChangeText={setConfirm} style={field}/><Button disabled={busy||password.length<8||password!==confirm} onPress={()=>void perform(()=>supabase!.auth.updateUser({password}),'Contraseña actualizada.')}>Guardar contraseña</Button></>}
 {panel==='sessions'&&<><Label>Sesión actual: {session?.user.email}</Label><Label style={{color:c.muted}}>Puedes cerrar las demás sesiones de tu cuenta. No disponemos de un listado de dispositivos conectados.</Label><Button disabled={busy} onPress={()=>void perform(()=>supabase!.auth.signOut({scope:'others'}),'Se cerraron las demás sesiones. Los accesos ya emitidos pueden tardar en vencer.')}>Cerrar las demás sesiones</Button></>}
 {panel==='logout'&&<><Label>¿Quieres salir de tu cuenta en este dispositivo?</Label><Button disabled={busy} onPress={()=>void perform(()=>supabase!.auth.signOut({scope:'local'}),'Sesión cerrada.')}>Confirmar cierre de sesión</Button></>}
 {panel==='favorites'&&<><Label style={{color:c.muted}}>Guardadas en este dispositivo para tu cuenta.</Label>{!!favorites.error&&<Label accessibilityRole="alert">{favorites.error}</Label>}{catalogError?<Label>No pudimos cargar las canchas. Cierra y vuelve a abrir para reintentar.</Label>:!favorites.ids.length?<Label>Guarda una cancha con el corazón desde el inicio.</Label>:courts.filter(v=>favorites.ids.includes(v.id)).map(v=><View key={v.id} style={{gap:8}}><Row title={v.venue+' · '+v.name} onPress={()=>{setPanel('');router.push({pathname:'/remote-agenda',params:{court:v.id}});}}/><Button secondary onPress={()=>favorites.toggle(v.id)}>Quitar de favoritos</Button></View>)}</>}
 {panel==='venues'&&session&&<VenueAccess actor={session.user.id} initialOpen/>}
 {!!message&&<Label accessibilityRole="alert">{message}</Label>}
 </Sheet></View>;
}
