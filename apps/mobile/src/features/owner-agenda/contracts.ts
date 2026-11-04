import { addDays, clock, interval, validDate } from '@alacancha/domain';

export type ManagedCourt = { id: string; venue_id: string; name: string; venue: string; open: number; close: number; published: boolean };
export type AgendaEntry = { id: string; court_id: string; kind: 'player' | 'external' | 'block'; status: 'held' | 'confirmed' | 'completed' | 'cancelled' | 'expired'; starts_at: string; ends_at: string; expires_at: string | null; team: string; players: number };
export const statusLabels = { held: 'Bloqueo temporal · sin confirmar', confirmed: 'Confirmada', completed: 'Completada', cancelled: 'Cancelada', expired: 'Vencida' };
export const kindLabels = { player: 'Reserva de la app', external: 'Registro manual', block: 'Bloqueo del establecimiento' };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function record(v: unknown): Record<string, unknown> { if (!v || typeof v !== 'object' || Array.isArray(v)) throw Error('Respuesta inválida.'); return v as Record<string, unknown>; }
function id(v: unknown): string { if (typeof v !== 'string' || !uuid.test(v)) throw Error('Identificador inválido.'); return v; }
function text(v: unknown): string { if (typeof v !== 'string' || !v.trim()) throw Error('Dato incompleto.'); return v; }
function instant(v: unknown): string { const s = text(v); if (!/(Z|[+-]\d\d:\d\d)$/.test(s) || !Number.isFinite(Date.parse(s))) throw Error('Fecha inválida.'); return s; }
export function completeRows(value: unknown, count: number | null, limit: number): unknown[] {
  if (!Array.isArray(value) || count === null || count !== value.length || count > limit) throw Error('La consulta está incompleta.');
  return value;
}
export function readMemberships(value: unknown[], actor: string): string[] {
  return value.map(v => { const r = record(v); if (r.user_id !== actor) throw Error('Membresía inválida.'); return id(r.venue_id); });
}
export function readManagedCourts(value: unknown[], venues: string[]): ManagedCourt[] {
  return value.map(v => {
    const r = record(v), venue = record(r.venues);
    if (!venues.includes(id(r.venue_id)) || !Number.isInteger(r.open_minute) || !Number.isInteger(r.close_minute)
      || Number(r.open_minute) < 0 || Number(r.open_minute) >= Number(r.close_minute) || Number(r.close_minute) > 1440
      || Number(r.open_minute) % 30 || Number(r.close_minute) % 30 || typeof r.published !== 'boolean' || typeof venue.published !== 'boolean') throw Error('Cancha inválida.');
    return { id: id(r.id), venue_id: id(r.venue_id), name: text(r.name), venue: text(venue.name), open: Number(r.open_minute), close: Number(r.close_minute), published: r.published && venue.published };
  });
}
export function dayBounds(date: string) {
  if (!validDate(date)) throw Error('Fecha inválida.');
  return { start: new Date(`${date}T00:00:00-05:00`).toISOString(), end: new Date(`${addDays(date, 1)}T00:00:00-05:00`).toISOString() };
}
export function readEntries(value: unknown[], court: string, date: string): AgendaEntry[] {
  const bounds = dayBounds(date);
  return value.map(v => {
    const r = record(v), start = instant(r.starts_at), end = instant(r.ends_at);
    if (id(r.court_id) !== court || !Object.hasOwn(statusLabels, String(r.status)) || !Object.hasOwn(kindLabels, String(r.kind))
      || Date.parse(start) >= Date.parse(end) || Date.parse(start) >= Date.parse(bounds.end) || Date.parse(end) <= Date.parse(bounds.start)
      || !Number.isInteger(r.players) || Number(r.players) < 1 || Number(r.players) > 30) throw Error('Reserva inválida.');
    const expiry = r.expires_at === null ? null : instant(r.expires_at);
    if (r.status === 'held' && !expiry) throw Error('Falta el vencimiento.');
    return { id: id(r.id), court_id: court, kind: r.kind as AgendaEntry['kind'], status: r.status as AgendaEntry['status'], starts_at: start, ends_at: end, expires_at: expiry, team: text(r.team), players: Number(r.players) };
  });
}
export function dailySlots(court: ManagedCourt, date: string, entries: AgendaEntry[], now: number) {
  return Array.from({ length: (court.close - court.open) / 30 }, (_, i) => {
    const time = clock(court.open + i * 30), span = interval(date, time, 30);
    // Never release a held interval using the device clock. Refresh its server state.
    const occupied = entries.some(r => ['held', 'confirmed', 'completed'].includes(r.status) && Date.parse(r.starts_at) < Date.parse(span.end) && Date.parse(r.ends_at) > Date.parse(span.start));
    return { time, label: occupied ? 'Ocupado' : Date.parse(span.start) <= now ? 'Pasado' : 'Libre al consultar' };
  });
}
export function colombiaTime(value: string): string {
  return new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(value));
}
