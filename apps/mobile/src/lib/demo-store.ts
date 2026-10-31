import { available, interval, quote, validDate, type Reservation } from '@alacancha/domain';
import { courts, demoOccupancy } from './catalog';
export interface Snapshot { version:1; favorites:string[]; reservations:Reservation[] }
export const empty = (): Snapshot => ({ version:1, favorites:[], reservations:[] });
export function decode(raw: string | null): Snapshot {
  try { const value = JSON.parse(raw || 'null'); if (value?.version !== 1 || !Array.isArray(value.favorites) || !Array.isArray(value.reservations)) return empty();
    return { version:1, favorites:value.favorites.filter((id:unknown) => courts.some((c) => c.id === id)), reservations:value.reservations.filter((r:Reservation) => {
      try { const court = courts.find((c) => c.id === r?.courtId); if (!court || r.demo !== true || !['confirmed','cancelled'].includes(r.status) || typeof r.id !== 'string' || typeof r.team !== 'string' || !r.team.trim() || r.team.length > 40 || !Number.isInteger(r.players) || r.players < 1 || r.players > court.capacity || !validDate(r.date)) return false;
        const expected = interval(r.date,r.time,r.duration); const price = quote(court,r.date,r.time,r.duration); return r.start === expected.start && r.end === expected.end && Object.entries(price).every(([key,val]) => r.quote?.[key as keyof typeof price] === val);
      } catch { return false; }
    }) };
  } catch { return empty(); }
}
/** Exclusividad local de demostración. No sustituye una transacción del servidor. */
export class DemoStore {
  private value = empty(); private listeners = new Set<() => void>();
  getSnapshot = () => this.value;
  subscribe = (listener:() => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  restore(value:Snapshot) { this.value = value; this.listeners.forEach((fn) => fn()); }
  reset() { this.restore(empty()); }
  favorite(id:string) { if (courts.some((c) => c.id === id)) this.restore({ ...this.value, favorites:this.value.favorites.includes(id) ? this.value.favorites.filter((item) => item !== id) : [...this.value.favorites,id] }); }
  reserve(input:{ courtId:string; date:string; time:string; duration:number; team:string; players:number }, now = new Date()): Reservation {
    const court = courts.find((c) => c.id === input.courtId); if (!court) throw Error('No encontramos la cancha.');
    if (!Number.isInteger(input.players) || input.players < 1 || input.players > court.capacity || !input.team.trim() || input.team.trim().length > 40) throw Error('Revisa el nombre del equipo y sus jugadores.');
    if (!available(court,input.date,input.time,input.duration,[...demoOccupancy(input.date),...this.value.reservations],now)) throw Error('Ese turno ya no está disponible. Elige otro horario.');
    const reservation:Reservation = { ...input, team:input.team.trim(), ...interval(input.date,input.time,input.duration), id:`ALC-${now.getTime().toString(36).toUpperCase()}-${this.value.reservations.length + 1}`, status:'confirmed', quote:quote(court,input.date,input.time,input.duration), demo:true };
    this.restore({ ...this.value, reservations:[reservation,...this.value.reservations] }); return reservation;
  }
  cancel(id:string) { if (!this.value.reservations.some((r) => r.id === id && r.status === 'confirmed')) throw Error('La prueba ya no se puede cancelar.'); this.restore({ ...this.value, reservations:this.value.reservations.map((r) => r.id === id ? { ...r,status:'cancelled' } : r) }); }
}
