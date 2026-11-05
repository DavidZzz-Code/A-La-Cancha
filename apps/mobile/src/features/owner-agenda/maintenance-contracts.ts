import { interval, validDate } from '@alacancha/domain';
export type MaintenanceIntent = { actor: string; court: string; date: string; time: string; duration: number; reason: string; key: string };
export type MaintenanceBlock = { id: string; court_id: string; actor_id: string; idempotency_key: string; kind: 'block'; status: 'confirmed' | 'cancelled' | 'completed'; starts_at: string; ends_at: string; team: string; cancellation_reason: string | null };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function record(v: unknown): Record<string, unknown> { if (!v || typeof v !== 'object' || Array.isArray(v)) throw Error('Datos inválidos.'); return v as Record<string, unknown>; }
export function readMaintenanceIntent(value: unknown, actor: string): MaintenanceIntent {
  const r = record(value);
  if (r.actor !== actor || !uuid.test(actor) || typeof r.court !== 'string' || !uuid.test(r.court) || typeof r.key !== 'string' || !uuid.test(r.key)
    || typeof r.date !== 'string' || !validDate(r.date) || typeof r.time !== 'string' || !/^([01]\d|2[0-3]):(00|30)$/.test(r.time)
    || ![30,60,90,120].includes(Number(r.duration)) || typeof r.duration !== 'number' || typeof r.reason !== 'string' || !r.reason.trim() || r.reason.trim().length > 40) throw Error('Solicitud inválida.');
  interval(r.date,r.time,r.duration);
  return { actor, court:r.court, key:r.key, date:r.date, time:r.time, duration:r.duration, reason:r.reason.trim() };
}
export function readMaintenanceBlock(value: unknown, court: string): MaintenanceBlock {
  const r = record(value);
  for (const key of ['id','actor_id','court_id','idempotency_key']) if (typeof r[key] !== 'string' || !uuid.test(r[key] as string)) throw Error('Bloqueo inválido.');
  if (r.court_id !== court || r.kind !== 'block' || !['confirmed','cancelled','completed'].includes(String(r.status))
    || typeof r.team !== 'string' || !r.team.trim() || typeof r.starts_at !== 'string' || typeof r.ends_at !== 'string'
    || !/(Z|[+-]\d\d:\d\d)$/.test(r.starts_at) || !/(Z|[+-]\d\d:\d\d)$/.test(r.ends_at)
    || !Number.isFinite(Date.parse(r.starts_at)) || !Number.isFinite(Date.parse(r.ends_at)) || Date.parse(r.ends_at) <= Date.parse(r.starts_at)
    || ['total','deposit','balance','discount'].some(k => r[k] !== 0)
    || (r.cancellation_reason !== null && typeof r.cancellation_reason !== 'string')) throw Error('Bloqueo inválido.');
  return r as MaintenanceBlock;
}
export function matchMaintenance(value: unknown, intent: MaintenanceIntent): MaintenanceBlock {
  const row = readMaintenanceBlock(value,intent.court), span = interval(intent.date,intent.time,intent.duration);
  if (row.actor_id !== intent.actor || row.idempotency_key !== intent.key || row.team !== intent.reason
    || Date.parse(row.starts_at) !== Date.parse(span.start) || Date.parse(row.ends_at) !== Date.parse(span.end)) throw Error('La respuesta no corresponde a la solicitud.');
  return row;
}
export function maintenanceFailure(error: unknown) {
  const e = error as { code?: string; message?: string } | null;
  if (e?.code === '23P01') return { clear:true, message:'El horario ya está ocupado. Actualiza la agenda y elige otro.' };
  if (e?.code === '22023' && e.message !== 'idempotency_mismatch') return { clear:true, message:'El horario o el motivo no son válidos. Revisa los datos.' };
  return { clear:false, message:'No pudimos comprobar el resultado. Revisa tu conexión y permisos; conservamos la solicitud para reintentar sin duplicarla.' };
}
