import { supabase } from '../auth/client';
import { readBusy, readCourts, readQuote } from './contracts';
function client() { if (!supabase) throw Error('La agenda conectada no está configurada.'); return supabase; }
export async function fetchCourts(signal: AbortSignal) {
  const {data,error}=await client().from('courts').select('id,name,capacity,open_minute,close_minute,venues!inner(name,city,published)').eq('published',true).eq('venues.published',true).order('name').limit(50).abortSignal(signal);
  if (error) throw Error('No pudimos cargar las canchas.'); return readCourts(data);
}
export async function fetchBusy(court: string,date: string,signal: AbortSignal) {
  const {data,error}=await client().rpc('occupied_slots',{p_court:court,p_date:date}).abortSignal(signal);
  if (error) throw Error('No pudimos consultar los horarios.'); return readBusy(data);
}
export async function fetchQuote(court: string,date: string,time: string,duration: number,signal: AbortSignal) {
  const {data,error}=await client().rpc('quote_slot',{p_court:court,p_date:date,p_time:time,p_duration:duration}).abortSignal(signal);
  if (error) throw Error('No pudimos consultar el precio. Actualiza los horarios.'); return readQuote(data);
}
