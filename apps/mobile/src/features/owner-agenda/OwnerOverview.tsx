import {useCallback,useState,type ReactNode} from 'react';
import {Pressable,ScrollView,View} from 'react-native';
import {useFocusEffect,useRouter} from 'expo-router';
import {addDays,localDate,money} from '@alacancha/domain';
import {Page,Button,Chip,Label,Heading} from '../../components/ui';
import {useTheme} from '../../lib/theme';
import {useAuth} from '../auth/AuthProvider';
import {supabase} from '../auth/client';
import {fetchManagedCourts} from './api';
import {colombiaTime,dayBounds,type ManagedCourt} from './contracts';

type Entry={id:string;court_id:string;team:string;balance:number;deposit:number;starts_at:string;ends_at:string;kind:string;status:string;total:number;pilot_deposit_approved_at:string|null;reservation_receipts:{part:string;amount:number}[]};
type Snapshot={courts:ManagedCourt[];rows:Entry[];days:string[]};
async function load(actor:string,count:number,forward:boolean,all:boolean,signal:AbortSignal):Promise<Snapshot>{
 const courts=await fetchManagedCourts(actor,signal);
 const today=localDate();
 const days=Array.from({length:count},(_,i)=>addDays(today,forward?i:i-count+1));
 const rows:Entry[]=[];
 if(courts.length){
  for(let offset=0;!signal.aborted;offset+=200){
   let query=supabase!.from('reservations').select('id,court_id,starts_at,ends_at,team,deposit,balance,kind,status,total,pilot_deposit_approved_at,reservation_receipts(part,amount)')
   .in('court_id',courts.map(c=>c.id)).in('status',['confirmed','completed'])
   ;
   if(!all)query=query.gt('ends_at',dayBounds(days[0]).start).lt('starts_at',dayBounds(days[days.length-1]).end);
   const page=await query
   .order('starts_at').order('id').range(offset,offset+199).abortSignal(signal);
   if(page.error)throw page.error;
   rows.push(...page.data);if(page.data.length<200)break;
  }
 }
 return {courts,rows,days};
}
function usage(courts:ManagedCourt[],rows:Entry[],days:string[]){
 let booked=0,offered=0;
 for(const court of courts)for(const date of days){
  const midnight=Date.parse(dayBounds(date).start),start=midnight+court.open*60000,end=midnight+court.close*60000;
  let used=0,blocked=0;
  for(const row of rows){
   if(row.court_id!==court.id)continue;
   const duration=Math.max(0,Math.min(end,Date.parse(row.ends_at))-Math.max(start,Date.parse(row.starts_at)))/3600000;
   if(row.kind==='block')blocked+=duration;else used+=duration;
  }
  booked+=used;offered+=Math.max(used,(court.close-court.open)/60-blocked);
 }
 return {booked,offered,percent:offered?Math.round(100*booked/offered):0};
}
function Card({title,children}:{title:string;children:ReactNode}){
 const {colors:c}=useTheme();
 return <View style={{gap:12,padding:18,borderRadius:20,backgroundColor:c.paper,borderColor:c.border,borderWidth:1}}><Label style={{color:c.muted,fontWeight:'700'}}>{title}</Label>{children}</View>;
}
function DemandGrid({matches}:{matches:Entry[]}){
 const {colors:c}=useTheme();
 const counts=Array.from({length:12},()=>Array<number>(7).fill(0));
 for(const row of matches){
  const start=new Date(Date.parse(row.starts_at)-5*3600000);
  counts[Math.floor(start.getUTCHours()/2)][(start.getUTCDay()+6)%7]++;
 }
 const peak=Math.max(1,...counts.flat());
 const columns=['L','M','X','J','V','S','D'];
 return <View style={{gap:4}}><View style={{flexDirection:'row',gap:3,paddingLeft:54}}>{columns.map(day=><Label key={day} style={{flex:1,textAlign:'center'}}>{day}</Label>)}</View>
 {counts.map((hours,i)=>(i>=4&&i<=10||hours.some(Boolean))&&<View key={i} style={{flexDirection:'row',gap:3,alignItems:'center'}}>
 <Label style={{width:51,fontSize:12}}>{(i*2%12||12)+(i<6?' AM':' PM')}</Label>
 {hours.map((n,j)=><View key={j} accessibilityLabel={columns[j]+', '+i*2+' horas, '+n+' reservas'} style={{flex:1,borderRadius:4,backgroundColor:n?c.forest:c.soft,opacity:n?.5+.5*n/peak:1,height:22}}/>)}</View>)}</View>;
}
export function OwnerOverview({metrics}:{metrics:boolean}){
 const {session}=useAuth(),{colors:c}=useTheme(),router=useRouter();
 const [period,setPeriod]=useState(7),[selected,select]=useState(''),[revision,refresh]=useState(0);
 const [data,setData]=useState<Snapshot|null>(null),[error,setError]=useState(false);
 const [forward,setForward]=useState(true),[expanded,setExpanded]=useState('');
 const count=metrics?period:1, actor=session?.user.id;
 useFocusEffect(useCallback(()=>{
  setData(null);setError(false);if(!actor)return;
  const controller=new AbortController();
  const update=()=>load(actor,count,forward,!metrics,controller.signal).then(result=>{if(!controller.signal.aborted){setData(result);setError(false); }})
   .catch(()=>{if(!controller.signal.aborted)setError(true);});
  void update();const timer=setInterval(update,60000);
  return()=>{clearInterval(timer);controller.abort();};
 },[actor,count,revision,forward,metrics]));
 const courts=(data?.courts??[]).filter(v=>!selected||v.id===selected);
 const rows=(data?.rows??[]).filter(r=>!selected||r.court_id===selected);
 const matches=rows.filter(r=>r.kind!=='block');
 const days=data?.days??[];
 const stats=usage(courts,rows,days);
 const next=matches.find(r=>Date.parse(r.starts_at)>=Date.now());
 const paid=(r:Entry)=>r.reservation_receipts.reduce((v,x)=>v+x.amount,0);
 const outstanding=(r:Entry)=>r.kind==='player'&&!r.reservation_receipts.some(v=>v.part==='balance')?r.balance:0;
 const upcoming=matches.filter(r=>r.status==='confirmed'&&Date.parse(r.ends_at)>Date.now());
 const unpaid=matches.filter(r=>outstanding(r)>0);
 const pending=unpaid.reduce((v,r)=>v+outstanding(r),0);
 const dateTime=(r:Entry)=>new Date(r.starts_at).toLocaleString('es-CO',{timeZone:'America/Bogota',weekday:'short',day:'numeric',month:'short',hour:'numeric',minute:'2-digit',hour12:true});
 const openMatch=(r:Entry)=>router.push({pathname:'/owner-agenda',params:{court:r.court_id,date:localDate(new Date(r.starts_at))}});
 const heading={fontSize:27,fontWeight:'700' as const};
 const periodLabel=(date:string)=>new Date(dayBounds(date).start).toLocaleDateString('es-CO',{timeZone:'America/Bogota',weekday:'short'});
 const peaks=new Map<string,number>();
 for(const r of matches){const key=periodLabel(localDate(new Date(r.starts_at)))+' · '+colombiaTime(r.starts_at);peaks.set(key,(peaks.get(key)??0)+1);}
 return <Page><Heading title={metrics?'Métricas':'Mis canchas'}/><View style={{gap:14}}>
 {metrics&&<View style={{flexDirection:'row',gap:8}}><Chip active={forward} onPress={()=>setForward(true)}>Proyección</Chip><Chip active={!forward} onPress={()=>setForward(false)}>Histórico</Chip></View>}
 {metrics&&<View style={{flexDirection:'row',gap:8}}>{[7,30].map(n=><Chip key={n} active={period===n} onPress={()=>setPeriod(n)}>{n+' días'}</Chip>)}</View>}
 {error?<Button onPress={()=>refresh(v=>v+1)}>Reintentar consulta</Button>:!data?<Label>Cargando…</Label>:<>
 <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8}}><Chip active={!selected} onPress={()=>select('')}>Todas mis canchas</Chip>{data.courts.map(v=><Chip key={v.id} active={v.id===selected} onPress={()=>select(v.id)}>{v.name}</Chip>)}</ScrollView>
 {metrics?<><Card title="Ocupación"><Label style={heading}>{stats.percent}%</Label><Label>{stats.booked} h reservadas de {stats.offered} h ofertadas</Label>
 <View style={{flexDirection:'row',height:65,gap:2,alignItems:'flex-end'}}>{days.map(date=>{const day=usage(courts,rows,[date]);return <View accessible accessibilityLabel={date+' · '+day.percent+'%'} key={date} style={{flex:1,height:Math.max(2,day.percent*.6),backgroundColor:c.forest,borderRadius:3}}/>;})}</View><Label>{days[0]} — {days[days.length-1]}</Label></Card>
 <Card title="Por cancha">{courts.map(v=><Label key={v.id}>{v.name} · {usage([v],rows,days).percent}%</Label>)}</Card>
 <Card title="Horarios más reservados"><DemandGrid matches={matches}/>{peaks.size?[...peaks].sort((a,b)=>b[1]-a[1]).slice(0,4).map(([key,n])=><Label key={key}>{key} · {n} {n===1?'reserva':'reservas'}</Label>):<Label>Aún no hay reservas en este período.</Label>}</Card>
 <Card title="Partidos del período"><Label>Valor reservado   {money(matches.reduce((v,r)=>v+r.total,0))}</Label><Label>Cobros registrados   {money(matches.reduce((v,r)=>v+paid(r),0))}</Label></Card></>:<>
 <Pressable accessibilityRole="button" onPress={()=>setExpanded(expanded==='matches'?'':'matches')}><Card title="Reservas próximas ›"><Label style={heading}>{upcoming.length}</Label>{next&&<Label>{dateTime(next)} · {courts.find(v=>v.id===next.court_id)?.name}</Label>}</Card></Pressable>
 <Pressable accessibilityRole="button" onPress={()=>setExpanded(expanded==='cash'?'':'cash')}><Card title="Restante por recibir ›"><Label style={heading}>{money(pending)}</Label></Card></Pressable>
 {expanded!==''&&<Card title={expanded==='cash'?'Saldos por reserva':'Próximos partidos'}>{(expanded==='cash'?unpaid:upcoming).length===0&&<Label>Sin reservas pendientes</Label>}{(expanded==='cash'?unpaid:upcoming).map(r=><Pressable accessibilityRole="button" key={r.id} style={{paddingVertical:10,gap:4,borderBottomWidth:1,borderColor:c.border}} onPress={()=>openMatch(r)}><Label style={{fontWeight:'700'}}>{courts.find(v=>v.id===r.court_id)?.name}</Label><Label>{dateTime(r)} · {r.team}</Label><Label>{money(r.total)} total · {money(outstanding(r))} restante ›</Label></Pressable>)}</Card>}
 <Card title="Ingresos de las reservas"><Label>Valor reservado   {money(matches.reduce((v,r)=>v+r.total,0))}</Label><Label>Recibido   {money(matches.reduce((v,r)=>v+paid(r),0))}</Label><Label>Anticipos de prueba   {money(matches.reduce((v,r)=>v+(r.pilot_deposit_approved_at?r.deposit:0),0))}</Label></Card>
 <Button onPress={()=>router.push('/owner-courts')}>Administrar mis canchas</Button><Button secondary onPress={()=>router.push({pathname:'/owner-agenda',params:{court:selected}})}>Abrir agenda</Button></>}
 </>}</View></Page>;
}
