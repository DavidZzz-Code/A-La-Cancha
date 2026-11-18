import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useAuth} from '../auth/AuthProvider';
const Context=createContext({ids:[] as string[],ready:false,error:'',toggle:(_id:string)=>{}});
export function CourtFavoritesProvider({children}:{children:ReactNode}){
 const {session}=useAuth();const actor=session?.user.id;const [state,setState]=useState<{actor?:string;ids:string[]}>({ids:[]});const [error,setError]=useState('');const queue=useRef(Promise.resolve());
 useEffect(()=>{let active=true;setError('');if(!actor){setState({ids:[]});return;}AsyncStorage.getItem('court-favorites:'+actor).then(value=>{const ids=JSON.parse(value||'[]');if(active)setState({actor,ids:Array.isArray(ids)?ids.filter(v=>typeof v==='string'):[]});}).catch(()=>{if(active)setError('No pudimos recuperar los favoritos de este dispositivo.');});return()=>{active=false;};},[actor]);
 const ready=!!actor&&state.actor===actor;
 function toggle(id:string){if(!ready)return;const ids=state.ids.includes(id)?state.ids.filter(v=>v!==id):[...state.ids,id];setState({actor,ids});queue.current=queue.current.then(()=>AsyncStorage.setItem('court-favorites:'+actor,JSON.stringify(ids))).catch(()=>setError('No pudimos guardar tus favoritos.'));}
 return <Context.Provider value={{ids:ready?state.ids:[],ready,error,toggle}}>{children}</Context.Provider>;
}
export const useCourtFavorites=()=>useContext(Context);
