export type Sport = 'football' | 'padel' | 'basketball';
export interface Court { id: string; name: string; zone: string; sport: Sport; format: string; price: number; capacity: number; covered: boolean; open: number; close: number; palette: string; amenities: readonly string[]; promotion?: { percent: number; days: readonly number[]; start: number; end: number } }
export interface Occupancy { courtId: string; start: string; end: string; status: 'held' | 'confirmed' | 'cancelled' | 'expired' | 'completed' | 'blocked'; expiresAt?: string }
export interface Quote { base: number; discount: number; total: number; deposit: number; balance: number }
export interface Reservation extends Occupancy { id: string; date: string; time: string; duration: number; team: string; players: number; quote: Quote; demo: true }
export interface Filters { date: string; time: string; duration: number; sport: Sport | 'all'; zone: string; maxPrice: number | null; covered: boolean }
export const TIME_ZONE = 'America/Bogota';
export const money = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
export function localDate(now = new Date()): string { const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now); return ['year','month','day'].map((key) => parts.find((part) => part.type === key)!.value).join('-'); }
export function validDate(date: string): boolean { return /^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(Date.parse(date)) && new Date(`${date}T12:00:00Z`).toISOString().slice(0,10) === date; }
export function addDays(date: string, days: number): string { if (!validDate(date) || !Number.isInteger(days)) throw Error('Fecha inválida.'); const value = new Date(`${date}T12:00:00Z`); value.setUTCDate(value.getUTCDate() + days); return value.toISOString().slice(0,10); }
export function dateLabel(date: string): string { return new Intl.DateTimeFormat('es-CO', { timeZone: TIME_ZONE, weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${date}T12:00:00Z`)); }
export function minutes(time: string): number { if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw Error('Hora inválida.'); const [h,m] = time.split(':').map(Number); return h * 60 + m; }
export const clock = (value: number) => `${Math.floor(value / 60).toString().padStart(2,'0')}:${(value % 60).toString().padStart(2,'0')}`;
export function interval(date: string, time: string, duration: number) { const startMinute = minutes(time); if (!validDate(date) || startMinute % 30 || ![30,60,90,120].includes(duration) || startMinute + duration > 1440) throw Error('Turno inválido.'); const start = new Date(`${date}T${time}:00-05:00`); return { start: start.toISOString(), end: new Date(+start + duration * 60000).toISOString() }; }
export function quote(court: Court, date: string, time: string, duration: number): Quote {
  interval(date,time,duration); const start = minutes(time);
  if (start < court.open || start + duration > court.close || !Number.isSafeInteger(court.price) || court.price < 0) throw Error('Turno fuera del horario.');
  const base = Math.round(court.price * duration / 60); const promo = court.promotion;
  const eligible = promo && Number.isInteger(promo.percent) && promo.percent > 0 && promo.percent < 100 && promo.days.includes(new Date(`${date}T12:00:00Z`).getUTCDay()) && start >= promo.start && start + duration <= promo.end;
  const discount = eligible ? Math.round(base * promo.percent / 100) : 0; const total = base - discount; const deposit = Math.round(total * .3);
  return { base, discount, total, deposit, balance: total - deposit };
}
export function available(court: Court, date: string, time: string, duration: number, occupied: readonly Occupancy[], now = new Date()): boolean {
  try { quote(court,date,time,duration); const slot = interval(date,time,duration);
    if (Date.parse(slot.start) <= +now || date > addDays(localDate(now),30)) return false;
    return !occupied.some((item) => item.courtId === court.id && ['held','confirmed','blocked','completed'].includes(item.status) && !(item.status === 'held' && item.expiresAt && Date.parse(item.expiresAt) <= +now) && Date.parse(slot.start) < Date.parse(item.end) && Date.parse(item.start) < Date.parse(slot.end));
  } catch { return false; }
}
export function slots(court: Court, date: string, duration: number, occupied: readonly Occupancy[], now = new Date()): string[] { const result: string[] = []; for (let m = court.open; m + duration <= court.close; m += 30) if (available(court,date,clock(m),duration,occupied,now)) result.push(clock(m)); return result; }
export function search(courts: readonly Court[], filters: Filters, occupied: readonly Occupancy[], now = new Date()): Court[] { return courts.filter((court) => (filters.sport === 'all' || court.sport === filters.sport) && (!filters.zone || court.zone === filters.zone) && (!filters.covered || court.covered) && (filters.time ? [filters.time] : slots(court,filters.date,filters.duration,occupied,now)).some((time) => available(court,filters.date,time,filters.duration,occupied,now) && (filters.maxPrice === null || quote(court,filters.date,time,filters.duration).total <= filters.maxPrice))); }
export function perPlayer(total: number, players: number): number { if (!Number.isSafeInteger(total) || total < 0 || !Number.isInteger(players) || players < 1 || players > 30) throw Error('Revisa los jugadores.'); return Math.ceil(total / players); }
