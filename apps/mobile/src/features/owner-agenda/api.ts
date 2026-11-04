import { supabase } from '../auth/client';
import { completeRows, dayBounds, readEntries, readManagedCourts, readMemberships, type ManagedCourt } from './contracts';

async function client(actor: string) {
  if (!supabase) throw Error('Conexión pendiente.');
  const { data, error } = await supabase.auth.getSession();
  if (error || data.session?.user.id !== actor) throw Error('Revisa tu sesión.');
  return supabase;
}
export async function fetchManagedCourts(actor: string, signal: AbortSignal) {
  const db = await client(actor);
  const memberships = await db.from('venue_members').select('venue_id,user_id', { count: 'exact' }).eq('user_id', actor).limit(100).abortSignal(signal);
  if (memberships.error) throw memberships.error;
  const venues = readMemberships(completeRows(memberships.data, memberships.count, 100), actor);
  if (!venues.length) return [];
  const courts = await db.from('courts').select('id,venue_id,name,open_minute,close_minute,published,venues!inner(name,published)', { count: 'exact' }).in('venue_id', venues).order('name').order('id').limit(200).abortSignal(signal);
  if (courts.error) throw courts.error;
  return readManagedCourts(completeRows(courts.data, courts.count, 200), venues);
}
export async function fetchOwnerDay(actor: string, court: ManagedCourt, date: string, signal: AbortSignal) {
  const db = await client(actor);
  // RLS is the authority. Re-check membership on every day/refresh, including revocation.
  const membership = await db.from('venue_members').select('venue_id,user_id').eq('user_id', actor).eq('venue_id', court.venue_id).abortSignal(signal).maybeSingle();
  if (membership.error || !membership.data) throw Error('No tienes acceso a esta agenda.');
  readMemberships([membership.data], actor);
  const bounds = dayBounds(date);
  const rows = await db.from('reservations').select('id,court_id,kind,status,starts_at,ends_at,expires_at,team,players', { count: 'exact' })
    .eq('court_id', court.id).lt('starts_at', bounds.end).gt('ends_at', bounds.start).order('starts_at').order('id').limit(200).abortSignal(signal);
  if (rows.error) throw rows.error;
  return readEntries(completeRows(rows.data, rows.count, 200), court.id, date);
}
