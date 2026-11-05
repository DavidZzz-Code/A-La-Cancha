import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { localDate } from '@alacancha/domain';
import { Button, Chip, DateStrip, Empty, Heading, Label, Page } from '../../components/ui';
import { useAuth } from '../auth/AuthProvider';
import { supabase } from '../auth/client';
import { fetchManagedCourts, fetchOwnerDay } from './api';
import { CancelExternalBooking } from './CancelExternalBooking';
import { ExternalBooking } from './ExternalBooking';
import { colombiaTime, dailySlots, kindLabels, statusLabels, type AgendaEntry, type ManagedCourt } from './contracts';

export default function OwnerAgendaScreen() {
  const { session, loading } = useAuth(); const router = useRouter();
  return <Page back><Heading title="Agenda del establecimiento" subtitle="Disponibilidad y reservas por cancha. Entorno de desarrollo."/>
    {!supabase ? <Empty title="Conexión pendiente" message="La agenda del establecimiento necesita conexión al servidor."/> : loading ? <Label>Cargando sesión.</Label> : !session ? <View style={{ gap: 12 }}><Label>Inicia sesión con una cuenta autorizada por el establecimiento.</Label><Button onPress={() => router.push('/profile')}>Ir a mi cuenta</Button></View> : <OwnerPanel key={session.user.id} actor={session.user.id}/>}
  </Page>;
}
function OwnerPanel({ actor }: { actor: string }) {
  const router = useRouter();
  const [refresh, setRefresh] = useState(0), [courtId, setCourtId] = useState(''), [date, setDate] = useState(localDate);
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
    <Button secondary onPress={() => setRefresh(v => v + 1)}>Actualizar agenda del establecimiento</Button>
    {catalog.revision !== refresh ? <Label>Cargando establecimientos.</Label> : catalog.error ? <Label accessibilityRole="alert">{catalog.error}</Label> : !catalog.courts.length ? <Empty title="Sin canchas asignadas" message="Esta cuenta no tiene canchas para administrar. El responsable debe asignar el acceso al establecimiento."/> : <>
      <View style={{ gap: 10 }}>{catalog.courts.map(c => <Chip key={c.id} active={courtId === c.id} onPress={() => setCourtId(c.id)}>{`${c.venue} · ${c.name}`}</Chip>)}</View>
      <DateStrip value={date} onChange={setDate}/>
      {court && <>
        <Button secondary onPress={() => router.push({pathname:'/owner-maintenance',params:{court:court.id,date}})}>Gestionar mantenimientos</Button>
        <Heading title={court.name} subtitle={`${date} · Hora de Colombia · ${court.published ? 'Publicada' : 'No publicada para jugadores'}`}/>
        {agenda.key !== key ? <Label>Consultando agenda del día.</Label> : agenda.error ? <Label accessibilityRole="alert">{agenda.error}</Label> : <>
          <Label>Última consulta: {colombiaTime(new Date(agenda.at).toISOString())}. Actualiza antes de coordinar un turno. Esta vista no confirma ni cobra reservas.</Label>
          <Label accessibilityRole="header">Disponibilidad por intervalos de 30 minutos</Label>
          <ExternalBooking key={key} actor={actor} court={court} date={date} rows={agenda.rows} checkedAt={agenda.at} onSaved={() => setRefresh(v => v + 1)}/>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{dailySlots(court, date, agenda.rows, agenda.at).map(slot => <View key={slot.time} style={{ padding: 12, borderRadius: 12, backgroundColor: slot.label === 'Ocupado' ? '#F3E6D5' : '#EAF1E6' }}><Label>{slot.time} · {slot.label}</Label></View>)}</View>
          <Label accessibilityRole="header">Reservas y movimientos del día ({agenda.rows.length})</Label>
          {!agenda.rows.length && <Label>No hay reservas registradas para esta cancha y fecha.</Label>}
          {agenda.rows.map(row => <View key={row.id} style={{ gap: 7, padding: 18, borderWidth: 1, borderColor: '#D9DFD5', borderRadius: 16 }}>
            <Label style={{ fontWeight: 'bold' }}>{colombiaTime(row.starts_at)}–{colombiaTime(row.ends_at)} · {row.team}</Label>
            <Label>{kindLabels[row.kind]} · {statusLabels[row.status]}</Label>
            {row.kind !== 'block' && <Label>{row.players} jugadores</Label>}
            <CancelExternalBooking actor={actor} row={row} checkedAt={agenda.at} onSaved={() => setRefresh(v => v + 1)}/>
            {row.status === 'held' && <Label>{Date.parse(row.expires_at!) <= agenda.at ? 'Plazo agotado; pendiente de actualización del servidor. El intervalo sigue marcado como ocupado.' : `Vence a las ${colombiaTime(row.expires_at!)}. Todavía no es una reserva confirmada.`}</Label>}
          </View>)}
        </>}
      </>}
    </>}
  </View>;
}
