import { supabase } from '../auth/client';
import { readReservation, type HoldIntent } from './contracts';
const columns = 'id,kind,actor_id,court_id,idempotency_key,status,starts_at,ends_at,expires_at,team,players,total,discount,deposit,balance';
async function client(actor: string) {
  if (!supabase) throw Error('Conexión pendiente.');
  const {data,error} = await supabase.auth.getSession();
  if (error || data.session?.user.id !== actor) throw {code:'42501'};
  return supabase;
}
export async function fetchReservations(actor: string, signal: AbortSignal) {
  const db = await client(actor);
  const {data,error} = await db.from('reservations').select(columns+',reschedule_requests(status)')
    .eq('actor_id',actor).neq('reschedule_requests.status','pending')
    .order('decided_at',{referencedTable:'reschedule_requests',ascending:false})
    .order('id',{referencedTable:'reschedule_requests',ascending:false})
    .limit(1,{referencedTable:'reschedule_requests'})
    .order('created_at',{ascending:false}).limit(50).abortSignal(signal);
  if (error) throw error;
  return (data ?? []).map(row=>readReservation(row,actor));
}
export async function createHold(intent: HoldIntent) {
  const db = await client(intent.actor);
  // Reconcile before retrying, including after reload or an interrupted response.
  const {data:existing,error:lookupError} = await db.from('reservations').select(columns).eq('actor_id',intent.actor).eq('idempotency_key',intent.key).maybeSingle();
  if (lookupError) throw lookupError;
  if (existing) return readReservation(existing,intent.actor);
  const {data,error} = await db.rpc('create_reservation',{
    p_court:intent.court,p_date:intent.date,p_time:intent.time,p_duration:intent.duration,
    p_players:intent.players,p_team:intent.team,p_key:intent.key,p_kind:'player',
  }).single();
  if (error) throw error;
  return readReservation(data,intent.actor);
}
export async function cancelHold(actor: string, id: string) {
  const db = await client(actor);
  // A cancellation retry first reads its result; no repeated transition is required.
  const {data:current,error:readError} = await db.from('reservations').select(columns).eq('actor_id',actor).eq('id',id).single();
  if (readError) throw readError;
  const row = readReservation(current,actor);
  if (row.status === 'cancelled' || row.status === 'expired') return row;
  if (row.status !== 'held') throw Error('Solo se cancelan bloqueos de prueba desde esta pantalla.');
  const {data,error} = await db.rpc('transition_reservation',{p_id:id,p_status:'cancelled',p_reason:'Cancelación de bloqueo de desarrollo por el jugador'}).single();
  if (error) throw error;
  return readReservation(data,actor);
}
