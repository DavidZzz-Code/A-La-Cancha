import { useEffect, useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { interval } from '@alacancha/domain';
import { Button, Chip, Label } from '../../components/ui';
import { sessionStorage } from '../auth/storage';
import { supabase } from '../auth/client';
import { readIntent, readReservation, type HoldIntent } from '../remote-reservations/contracts';
import { dailySlots, type ManagedCourt, type AgendaEntry } from './contracts';

type Props = {
  actor: string; court: ManagedCourt; date: string; rows: AgendaEntry[];
  checkedAt: number; onSaved: () => void;
};

async function registerBooking(intent: HoldIntent) {
  if (!supabase) throw Error('Conexión pendiente.');
  const current = await supabase.auth.getSession();
  if (current.error || current.data.session?.user.id !== intent.actor) throw Error('Revisa tu sesión.');
  const { data, error } = await supabase.rpc('create_reservation', {
    p_court: intent.court, p_date: intent.date, p_time: intent.time, p_duration: intent.duration,
    p_team: intent.team, p_players: intent.players, p_key: intent.key, p_kind: 'external',
  }).single();
  if (error) throw error;
  const row = readReservation(data, intent.actor);
  const span = interval(intent.date, intent.time, intent.duration);
  if ((data as { kind?: string }).kind !== 'external' || row.status !== 'confirmed' ||
    row.court_id !== intent.court || row.idempotency_key !== intent.key || row.team !== intent.team ||
    row.players !== intent.players || Date.parse(row.starts_at) !== Date.parse(span.start) ||
    Date.parse(row.ends_at) !== Date.parse(span.end)) throw Error('Respuesta inesperada.');
}

export function ExternalBooking({ actor, court, date, rows, checkedAt, onSaved }: Props) {
  const storageKey = ['alacancha.presencial', actor, court.id, date].join('.');
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [intent, setIntent] = useState<HoldIntent | null>(null);
  const [team, setTeam] = useState('');
  const [players, setPlayers] = useState('');
  const [duration, setDuration] = useState(60);
  const [time, setTime] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const mounted = useRef(false);
  const sending = useRef(false);
  useEffect(() => {
    mounted.current = true;
    let active = true;
    async function restore() {
      const raw = await sessionStorage.getItem(storageKey);
      if (!active) return;
      if (raw) {
        const saved = readIntent(JSON.parse(raw), actor);
        if (saved.court !== court.id || saved.date !== date) throw Error('Referencia incorrecta.');
        setIntent(saved);
        setOpen(true);
      }
      setReady(true);
    }
    restore().catch(() => { if (active) { setOpen(true); setMessage('No pudimos leer la solicitud guardada en el dispositivo.'); } });
    return () => { active = false; mounted.current = false; };
  }, [actor, court.id, date, storageKey]);

  const slots = dailySlots(court, date, rows, checkedAt);
  const parts = duration / 30;
  const available = slots.filter((_, index) => index + parts <= slots.length &&
    slots.slice(index, index + parts).every(slot => slot.label === 'Libre al consultar'));
  const valid = available.some(slot => slot.time === time) && team.trim() && /^\d+$/.test(players) &&
    Number(players) >= 1 && Number(players) <= 30;

  async function submit() {
    if (sending.current || !ready || (!intent && !valid)) return;
    sending.current = true;
    setBusy(true);
    setMessage('');
    try {
      const request = intent ?? readIntent({ actor, court: court.id, date, time, duration,
        team: team.trim(), players: Number(players), key: randomUUID() }, actor);
      if (!intent) {
        try { await sessionStorage.setItem(storageKey, JSON.stringify(request)); }
        catch { if (mounted.current) setMessage('No pudimos guardar la referencia. Revisa el almacenamiento.'); return; }
        if (!mounted.current) return;
        setIntent(request);
      }
      await registerBooking(request);
      await sessionStorage.removeItem(storageKey);
      if (mounted.current) onSaved();
    } catch (error) {
      if (!mounted.current) return;
      const failure = error as { code?: string; message?: string };
      if (failure.code === '23P01' || (failure.code === '22023' && failure.message !== 'idempotency_mismatch')) {
        try { await sessionStorage.removeItem(storageKey); }
        catch { setMessage('Reintenta para comprobar la solicitud guardada.'); return; }
        if (!mounted.current) return;
        setIntent(null);
        setTime('');
        setMessage(failure.code === '23P01' ? 'El turno ya está ocupado. Actualiza la agenda y elige otro horario.' :
          'Revisa el horario y la cantidad de jugadores permitida para esta cancha.');
      } else {
        setMessage('Resultado pendiente. Comprueba la misma solicitud para recuperar el registro.');
      }
    } finally {
      sending.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  if (!open) return <Button secondary onPress={() => setOpen(true)}>Registrar turno presencial</Button>;
  return <View style={{ gap: 12, padding: 16, borderRadius: 16, backgroundColor: '#EAF1E6' }}>
    <Label accessibilityRole="header">Turno presencial · {court.name} · {date}</Label>
    {intent ? <Label>{intent.team} · {intent.time} · {intent.duration} min · {intent.players} jugadores</Label> : <>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {[30,60,90,120].map(n => <Chip key={n} active={duration === n} onPress={() => { setDuration(n); setTime(''); }}>{n+' min'}</Chip>)}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {available.map(slot => <Chip key={slot.time} active={time === slot.time} onPress={() => setTime(slot.time)}>{slot.time}</Chip>)}
      </View>
      {!available.length && <Label>No hay horarios disponibles para esta duración.</Label>}
      <TextInput accessibilityLabel="Equipo del turno presencial" placeholder="Nombre del equipo" maxLength={40} value={team} onChangeText={setTeam} editable={!busy}/>
      <TextInput accessibilityLabel="Jugadores del turno presencial" placeholder="Cantidad de jugadores" maxLength={2} keyboardType="number-pad" value={players} onChangeText={setPlayers} editable={!busy}/>
      <Label>Al registrarlo, el horario queda ocupado en la agenda de jugadores.</Label>
    </>}
    {!!message && <Label accessibilityRole="alert">{message}</Label>}
    <Button disabled={busy || !ready || (!intent && !valid)} onPress={() => void submit()}>
      {busy ? 'Comprobando registro…' : intent ? 'Comprobar turno presencial' : 'Guardar turno presencial'}
    </Button>
    {!intent && <Button secondary disabled={busy} onPress={() => setOpen(false)}>Cerrar formulario</Button>}
  </View>;
}
