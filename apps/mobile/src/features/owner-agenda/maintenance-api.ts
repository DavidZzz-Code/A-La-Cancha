import { supabase } from '../auth/client';
import { completeRows, dayBounds } from './contracts';
import { matchMaintenance, readMaintenanceBlock, type MaintenanceIntent } from './maintenance-contracts';
const columns = 'id,court_id,actor_id,idempotency_key,kind,status,starts_at,ends_at,team,cancellation_reason,total,discount,deposit,balance';
async function authorized(actor: string, court: string) {
  if (!supabase) throw Error('Conexión pendiente.');
  const { data, error } = await supabase.auth.getSession();
  if (error || data.session?.user.id !== actor) throw Error('Revisa tu sesión.');
  const selected = await supabase.from('courts').select('venue_id').eq('id',court).single();
  if (selected.error) throw selected.error;
  const membership = await supabase.from('venue_members').select('venue_id').eq('user_id',actor).eq('venue_id',selected.data.venue_id).single();
  if (membership.error) throw membership.error;
  return supabase;
}
export async function createMaintenance(intent: MaintenanceIntent) {
  const db = await authorized(intent.actor,intent.court);
  const found = await db.from('reservations').select(columns).eq('actor_id',intent.actor).eq('idempotency_key',intent.key).maybeSingle();
  if (found.error) throw found.error;
  if (found.data) return matchMaintenance(found.data,intent);
  const result = await db.rpc('create_reservation',{p_court:intent.court,p_date:intent.date,p_time:intent.time,p_duration:intent.duration,p_players:1,p_team:intent.reason,p_key:intent.key,p_kind:'block'}).single();
  if (result.error) throw result.error;
  return matchMaintenance(result.data,intent);
}
export async function fetchMaintenance(actor: string, court: string, date: string, signal: AbortSignal) {
  const db = await authorized(actor,court), bounds = dayBounds(date);
  const result = await db.from('reservations').select(columns,{count:'exact'}).eq('court_id',court).eq('kind','block')
    .lt('starts_at',bounds.end).gt('ends_at',bounds.start).order('starts_at').order('id').limit(200).abortSignal(signal);
  if (result.error) throw result.error;
  return completeRows(result.data,result.count,200).map(r => readMaintenanceBlock(r,court));
}
export async function cancelMaintenance(actor: string, court: string, id: string, reason: string) {
  if (!reason.trim() || reason.trim().length > 200) throw Error('Indica un motivo de cancelación.');
  const db = await authorized(actor,court);
  const found = await db.from('reservations').select(columns).eq('court_id',court).eq('id',id).single();
  if (found.error) throw found.error;
  const current = readMaintenanceBlock(found.data,court);
  if (current.status === 'cancelled') return current;
  if (current.status !== 'confirmed') throw Error('Este mantenimiento ya no puede cancelarse.');
  const result = await db.rpc('transition_reservation',{p_id:id,p_status:'cancelled',p_reason:reason.trim()}).single();
  if (result.error) throw result.error;
  const row = readMaintenanceBlock(result.data,court);
  if (row.id !== id || row.status !== 'cancelled') throw Error('Resultado inesperado.');
  return row;
}
