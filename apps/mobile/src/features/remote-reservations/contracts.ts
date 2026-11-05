import { validDate } from '@alacancha/domain';
export type Selection = { court: string; date: string; time: string; duration: number };
export type HoldIntent = Selection & { key: string; actor: string; team: string; players: number };
export const decisionLabels = {approved:'Cambio aprobado',rejected:'Cambio rechazado',unavailable:'Cambio de horario no disponible'};
export type RemoteReservation = {
  reschedule_requests?: {status:keyof typeof decisionLabels}[];
  kind?: 'player'|'external'|'block'; id: string; actor_id: string; court_id: string; idempotency_key: string;
  status: 'held' | 'confirmed' | 'completed' | 'cancelled' | 'expired';
  starts_at: string; ends_at: string; expires_at: string | null;
  team: string; players: number; total: number; discount: number; deposit: number; balance: number;
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function readSelection(value: Record<string, unknown>): Selection | null {
  const { court, date, time } = value; const duration = Number(value.duration);
  if (typeof court !== 'string' || !uuid.test(court) || typeof date !== 'string' || !validDate(date)
    || typeof time !== 'string' || !/^([01]\d|2[0-3]):(00|30)$/.test(time) || ![30,60,90,120].includes(duration)) return null;
  return {court,date,time,duration};
}
export function readIntent(value: unknown, actor: string): HoldIntent {
  if (!value || typeof value !== 'object') throw Error('Solicitud guardada inválida.');
  const r = value as Record<string, unknown>; const selection = readSelection(r);
  if (!selection || r.actor !== actor || typeof r.key !== 'string' || !uuid.test(r.key)
    || typeof r.team !== 'string' || !r.team.trim() || r.team.length > 40
    || !Number.isInteger(r.players) || Number(r.players) < 1 || Number(r.players) > 30) throw Error('Solicitud guardada inválida.');
  return {...selection, actor, key:r.key, team:r.team, players:Number(r.players)};
}
export function readReservation(value: unknown, actor: string): RemoteReservation {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Reserva inválida.');
  const r = value as Record<string, unknown>;
  for (const key of ['id','actor_id','court_id','idempotency_key']) if (typeof r[key] !== 'string' || !uuid.test(r[key] as string)) throw Error('Reserva inválida.');
  if (r.actor_id !== actor || !['held','confirmed','completed','cancelled','expired'].includes(String(r.status))) throw Error('Reserva inválida.');
  for (const key of ['starts_at','ends_at']) if (typeof r[key] !== 'string' || !Number.isFinite(Date.parse(r[key] as string))) throw Error('Fecha inválida.');
  if (Date.parse(String(r.ends_at)) <= Date.parse(String(r.starts_at))) throw Error('Intervalo inválido.');
  if (r.expires_at !== null && (typeof r.expires_at !== 'string' || !Number.isFinite(Date.parse(r.expires_at)))) throw Error('Vencimiento inválido.');
  if (r.status === 'held' && !r.expires_at) throw Error('Vencimiento ausente.');
  for (const key of ['total','discount','deposit','balance','players']) if (!Number.isSafeInteger(r[key]) || Number(r[key]) < 0) throw Error('Importe inválido.');
  if (Number(r.total) !== Number(r.deposit) + Number(r.balance) || Number(r.players)<1 || Number(r.players)>30 || typeof r.team !== 'string') throw Error('Reserva inconsistente.');
  if (r.reschedule_requests !== undefined && (!Array.isArray(r.reschedule_requests) || r.reschedule_requests.length>1 ||
    r.reschedule_requests.some(item=>!item || !Object.hasOwn(decisionLabels,item.status)))) throw Error('Decisión de cambio inválida.');
  return r as RemoteReservation;
}
export function reservationStatus(row: RemoteReservation, now: number): string {
  if (row.status === 'held' && Date.parse(row.expires_at!) <= now) return 'Plazo agotado · actualiza el estado del servidor';
  return {held:'Bloqueo temporal · sin confirmar',confirmed:'Confirmada',completed:'Completada',cancelled:'Cancelada',expired:'Vencida'}[row.status];
}
export function holdError(error: unknown): { message: string; definitive: boolean } {
  const e = error as { code?: string; message?: string } | null;
  if (e?.code === '23P01') return {message:'Otro jugador ocupó este horario. Vuelve a la agenda y elige otro turno.',definitive:true};
  if (e?.message === 'hold_limit_reached') return {message:'Ya tienes tres bloqueos activos. Cancela uno o espera su vencimiento.',definitive:true};
  if (e?.code === '22023' && e.message !== 'idempotency_mismatch') return {message:'El turno o los datos ya no son válidos. Actualiza la agenda.',definitive:true};
  if (e?.code === '42501' || e?.code === 'PGRST301' || e?.code === 'PGRST303') return {message:'Revisa tu sesión y tus permisos. Conservamos la solicitud para comprobar su resultado.',definitive:false};
  return {message:'No pudimos comprobar el resultado. Reintenta esta misma solicitud; no crearemos un segundo bloqueo.',definitive:false};
}
