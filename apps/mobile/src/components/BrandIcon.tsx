import Svg,{Rect,Path,Circle} from 'react-native-svg';
export function BrandIcon({kind='pitch',color='#102033',size=26}:{kind?:string;color?:string;size?:number}){
 return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">{kind==='person'?<><Circle cx="12" cy="7" r="4"/><Path d="M3 22c0-10 18-10 18 0Z"/></>:kind==='heart'?<Path d="M12 21 3 12C-3 4 7-1 12 6c5-7 15-2 9 6Z"/>:kind==='search'?<><Circle cx="10" cy="10" r="7"/><Path d="m15 15 7 7"/></>:<>{kind==='calendar'&&<Path d="M6 1v4M18 1v4"/>}<Rect x="2" y={kind==='calendar'?4:5} width="20" height="16" rx="3"/><Path d="M12 5v16M2 9h4v8H2m20-8h-4v8h4"/><Circle cx="12" cy="13" r="3"/></>}</Svg>;
}
