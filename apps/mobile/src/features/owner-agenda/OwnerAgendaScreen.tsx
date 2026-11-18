import {useTheme} from '../../lib/theme';
import { PendingChanges } from './PendingChanges';
import { Reschedule } from '../reschedule/Reschedule';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useRouter,useLocalSearchParams } from 'expo-router';
import {hourLabel} from '../remote-agenda/hour';
import { localDate,money } from '@alacancha/domain';
import { Button, Chip, DateStrip, Empty, Heading, Label, Page } from '../../components/ui';
import { useAuth } from '../auth/AuthProvider';
import { supabase } from '../auth/client';
import { fetchManagedCourts, fetchOwnerDay } from './api';
import { CancelExternalBooking } from './CancelExternalBooking';
import { ReceiptAction } from './ReceiptAction';
import { ExternalBooking } from './ExternalBooking';
import { colombiaTime, dailySlots, kindLabels, statusLabels, type AgendaEntry, type ManagedCourt } from './contracts';

export default function OwnerAgendaScreen() {
  const { session, loading } = useAuth(); const router = useRouter();
  return <Page back><Heading title="Agenda"/>
    {!supabase ? <Empty title="Conexión pendiente" message="La agenda del establecimiento necesita conexión al servidor."/> : loading ? <Label>Cargando sesión.</Label> : !session ? <View style={{ gap: 12 }}><Label>Inicia sesión con una cuenta autorizada por el establecimiento.</Label><Button onPress={() => router.push('/profile')}>Ir a mi cuenta</Button></View> : <OwnerPanel key={session.user.id} actor={session.user.id}/>}
  </Page>;
}
function OwnerPanel({ actor }: { actor: string }) { const {colors:themeColors}=useTheme();
  const router = useRouter();
  const params=useLocalSearchParams<{court?:string;date?:string}>();
  const [decision,setDecision]=useState('');
  const [refresh, setRefresh] = useState(0), [courtId, setCourtId] = useState(params.court||''), [date, setDate] = useState(()=>params.date||localDate());
  useEffect(()=>{if(params.court)setCourtId(params.court);if(params.date)setDate(params.date);},[params.court,params.date]);
  const [catalog, setCatalog] = useState<{ revision: number; courts: ManagedCourt[]; error: string }>({ revision: -1, courts: [], error: '' });
  const [agenda, setAgenda] = useState<{ key: string; rows: AgendaEntry[]; error: string; at: number }>({ key: '', rows: [], error: '', at: 0 });
  const court = catalog.revision === refresh ? catalog.courts.find(c => c.id === courtId) : undefined;
  const key = JSON.stringify([actor, courtId, date, refresh]);
  useEffect(() => {
    const controller = new AbortController();
    fetchManagedCourts(actor, controller.signal).then(courts => {
      if (controller.signal.aborted) return;
      setCatalog({ revision: refresh, courts, error: '' });
      setCourtId(previous => courts.some(c => c.id === previous) ? previous : courts[0]?.id ?? '');
    }).catch(() => { if (!controller.signal.aborted) setCatalog({ revision: refresh, courts: [], error: 'No pudimos cargar tus establecimientos. Revisa tu sesión y vuelve a actualizar.' }); });
    return () => controller.abort();
  }, [actor, refresh]);
  useEffect(() => {
    if (!court) return;
    const controller = new AbortController();
    fetchOwnerDay(actor, court, date, controller.signal).then(rows => {
      if (!controller.signal.aborted) setAgenda({ key, rows, error: '', at: Date.now() });
    }).catch(() => { if (!controller.signal.aborted) setAgenda({ key, rows: [], at: 0, error: 'No pudimos consultar la agenda completa. Revisa tu conexión y tus permisos. No mostramos horarios como libres.' }); });
    return () => controller.abort();
  }, [actor, court, date, key]);
  return <View style={{ gap: 18, maxWidth: 900 }}>
    <Button secondary onPress={() => setRefresh(v => v + 1)}>Actualizar agenda</Button>
    {catalog.revision !== refresh ? <Label>Cargando establecimientos.</Label> : catalog.error ? <Label accessibilityRole="alert">{catalog.error}</Label> : !catalog.courts.length ? <Empty title="Sin canchas asignadas" message="Esta cuenta no tiene canchas para administrar. El responsable debe asignar el acceso al establecimiento."/> : <>
      {!!decision && <Label accessibilityLiveRegion="polite">{decision}</Label>}
      <PendingChanges actor={actor} courts={catalog.courts} onDecision={message=>{setDecision(message);setRefresh(v=>v+1);}}/>
      <View style={{ gap: 10 }}>{catalog.courts.map(c => <Chip key={c.id} active={courtId === c.id} onPress={() => setCourtId(c.id)}>{c.name}</Chip>)}</View>
      <DateStrip value={date} onChange={setDate}/>
      {court && <>
        <Button secondary onPress={() => router.push({pathname:'/owner-maintenance',params:{court:court.id,date}})}>Gestionar mantenimientos</Button>
        <Heading title={court.name} subtitle={`${date} · Hora de Colombia · ${court.published ? 'Publicada' : 'No publicada para jugadores'}`}/>
        {agenda.key !== key ? <Label>Consultando agenda del día.</Label> : agenda.error ? <Label accessibilityRole="alert">{agenda.error}</Label> : <>
          <Label accessibilityRole="header">Resumen de la cancha</Label>
          <Label>Horas reservadas: {agenda.rows.filter(r=>r.kind!=='block'&&['confirmed','completed'].includes(r.status)).reduce((sum,r)=>sum+(Date.parse(r.ends_at)-Date.parse(r.starts_at))/3600000,0)} · Horas de apertura: {(court.close-court.open)/60}</Label>
          <Label>Pagos registrados de estos partidos: {money(agenda.rows.reduce((sum,r)=>sum+(r.receipts??[]).reduce((a,v)=>a+v.amount,0),0))}</Label>
          <Label>Restante por recibir: {money(agenda.rows.filter(r=>r.kind==='player'&&['confirmed','completed'].includes(r.status)&&!r.receipts?.some(v=>v.part==='balance')).reduce((sum,r)=>sum+(r.balance??0),0))}</Label>
          <Label accessibilityRole="header">Turnos del día</Label>
          <View style={{gap:6}}>{dailySlots(court,date,agenda.rows,agenda.at).map(slot=>{
            const instant=Date.parse(date+'T'+slot.time+':00-05:00');
            const entry=agenda.rows.find(row=>['confirmed','held','completed'].includes(row.status)&&Date.parse(row.starts_at)<=instant&&instant<Date.parse(row.ends_at));
            const status=entry?.kind==='block'?'Mantenimiento':entry?.status==='held'?'Apartado':entry?'Reservada':slot.label==='Libre al consultar'?'Disponible':slot.label;
            return <View key={slot.time} style={{flexDirection:'row',gap:12,padding:10,borderRadius:12,backgroundColor:themeColors.paper,borderLeftWidth:4,borderLeftColor:entry?.kind==='block'?'#eb9e34':entry?'#359bd2':themeColors.forest}}>
             <Label style={{width:90}}>{hourLabel(slot.time)}</Label><Label>{status}</Label></View>;
          })}</View>
          <ExternalBooking key={key} actor={actor} court={court} date={date} rows={agenda.rows} checkedAt={agenda.at} onSaved={() => setRefresh(v => v + 1)}/>
          <Label accessibilityRole="header">Reservas y movimientos del día ({agenda.rows.length})</Label>
          {!agenda.rows.length && <Label>No hay reservas registradas para esta cancha y fecha.</Label>}
          {agenda.rows.map(row => <View key={row.id} style={{ gap: 7, padding: 18, borderWidth: 1, borderColor:themeColors.border, borderRadius: 16 }}>
            <Label style={{ fontWeight: 'bold' }}>{colombiaTime(row.starts_at)}–{colombiaTime(row.ends_at)} · {row.team}</Label>
            <Label>{kindLabels[row.kind]} · {statusLabels[row.status]}</Label>
            {row.kind !== 'block' && <Label>{row.players} jugadores</Label>}
            {row.kind==='player' && row.status==='confirmed' && <Reschedule row={row} owner onMoved={()=>setRefresh(n=>n+1)}/>}
            <ReceiptAction row={row} onSaved={() => setRefresh(v => v + 1)}/>
            <CancelExternalBooking actor={actor} row={row} checkedAt={agenda.at} onSaved={() => setRefresh(v => v + 1)}/>
            {row.status === 'held' && <Label>{Date.parse(row.expires_at!) <= agenda.at ? 'Plazo agotado; pendiente de actualización del servidor. El intervalo sigue marcado como ocupado.' : `Vence a las ${colombiaTime(row.expires_at!)}. Todavía no es una reserva confirmada.`}</Label>}
          </View>)}
        </>}
      </>}
    </>}
  </View>;
}
