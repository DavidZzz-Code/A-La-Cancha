import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import {useColorScheme} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {StatusBar} from 'expo-status-bar';
export const lightColors={background:'#F7F9FC',paper:'#FFFFFF',ink:'#102033',muted:'#53667D',forest:'#087D16',deep:'#061727',lime:'#B4FF19',soft:'#DEFFD5',border:'#D8E2EF',danger:'#AF302F',clay:'#FFF0E5'};
const darkColors={background:'#060D16',paper:'#101D2C',ink:'#F3F7FA',muted:'#A7B8CC',forest:'#B4FF19',deep:'#061727',lime:'#102033',soft:'#213C35',border:'#344B61',danger:'#FF9D98',clay:'#382B25'};
type Mode='light'|'dark'|'system';
const Context=createContext({colors:lightColors,mode:'system' as Mode,dark:false,setMode:(_mode:Mode)=>{},error:''});
export function ThemeProvider({children}:{children:ReactNode}){
 const system=useColorScheme();const [mode,setValue]=useState<Mode>('system');const [ready,setReady]=useState(false);const [error,setError]=useState('');
 useEffect(()=>{AsyncStorage.getItem('appearance').then(v=>{if(v==='light'||v==='dark'||v==='system')setValue(v);}).catch(()=>setError('No pudimos recuperar tu tema.')).finally(()=>setReady(true));},[]);
 const dark=mode==='dark'||(mode==='system'&&system==='dark');
 function setMode(value:Mode){setValue(value);setError('');void AsyncStorage.setItem('appearance',value).catch(()=>setError('El tema cambió, pero no pudimos guardarlo para la próxima apertura.'));}
 if(!ready)return null;
 return <Context.Provider value={{colors:dark?darkColors:lightColors,mode,dark,setMode,error}}><StatusBar style={dark?'light':'dark'}/>{children}</Context.Provider>;
}
export const useTheme=()=>useContext(Context);
