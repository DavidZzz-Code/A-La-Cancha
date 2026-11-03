import { clock, interval, validDate } from '@alacancha/domain';
export type RemoteCourt = { id: string; name: string; venue: string; city: string; open: number; close: number; capacity: number };
export type BusySlot = { starts_at: string; ends_at: string };
export type ServerQuote = { base_price: number; discount: number; total: number; deposit: number; balance: number };
function record(value: unknown): Record<string, unknown> { if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Respuesta inválida.'); return value as Record<string, unknown>; }
function integer(value: unknown): number { if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw Error('Importe u horario inválido.'); return value; }
function text(value: unknown): string { if (typeof value !== 'string' || !value.trim()) throw Error('Dato incompleto.'); return value; }
export function readCourts(value: unknown): RemoteCourt[] {
  if (!Array.isArray(value)) throw Error('Catálogo inválido.');
  return value.map(item => { const row=record(item), venue=record(row.venues); const open=integer(row.open_minute), close=integer(row.close_minute), capacity=integer(row.capacity);
    if (open>=close || close>1440 || open%30 || close%30 || capacity<1 || capacity>30) throw Error('Horario inválido.');
    return { id:text(row.id), name:text(row.name), venue:text(venue.name), city:text(venue.city), open, close, capacity };
  });
}
export function readBusy(value: unknown): BusySlot[] {
  if (!Array.isArray(value)) throw Error('Agenda inválida.');
  return value.map(item => { const row=record(item), start=text(row.starts_at), end=text(row.ends_at);
    if (!Number.isFinite(Date.parse(start)) || !Number.isFinite(Date.parse(end)) || Date.parse(end)<=Date.parse(start)) throw Error('Intervalo inválido.');
    return { starts_at:start, ends_at:end };
  });
}
export function readQuote(value: unknown): ServerQuote {
  if (!Array.isArray(value) || value.length!==1) throw Error('Cotización inválida.');
  const r=record(value[0]); const q={base_price:integer(r.base_price),discount:integer(r.discount),total:integer(r.total),deposit:integer(r.deposit),balance:integer(r.balance)};
  if (q.discount>q.base_price || q.total!==q.base_price-q.discount || q.total!==q.deposit+q.balance) throw Error('Cotización inconsistente.');
  return q;
}
export function openSlots(court: RemoteCourt, date: string, duration: number, busy: BusySlot[], now: number): string[] {
  if (!validDate(date) || ![30,60,90,120].includes(duration)) throw Error('Turno inválido.');
  const result:string[]=[];
  for (let minute=court.open;minute+duration<=court.close;minute+=30) {
    const time=clock(minute), span=interval(date,time,duration), start=Date.parse(span.start), end=Date.parse(span.end);
    if (start>now && !busy.some(b=>start<Date.parse(b.ends_at) && Date.parse(b.starts_at)<end)) result.push(time);
  }
  return result;
}
