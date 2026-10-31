import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DemoStore,decode } from './demo-store.ts';
const now = new Date('2026-11-04T00:30:00Z');
const input = {courtId:'el-patio',date:'2026-11-03',time:'22:00',duration:60,team:'Los del viernes',players:10};
test('reserva, rechaza segundo intento, cancela y permite reservar otra vez', () => {
  const store = new DemoStore(); const first = store.reserve(input,now);
  assert.throws(() => store.reserve(input,now),/no está disponible/);
  assert.equal(store.getSnapshot().reservations.length,1);
  store.cancel(first.id); const second = store.reserve(input,now);
  assert.notEqual(first.id,second.id); assert.equal(second.status,'confirmed');
  assert.throws(() => store.cancel(first.id));
});
test('persiste el precio y la hora local exactos de la reserva', () => {
  const store = new DemoStore(); const r = store.reserve(input,now); store.favorite('el-patio');
  const restored = decode(JSON.stringify(store.getSnapshot()));
  assert.equal(restored.reservations[0].time,'22:00'); assert.equal(restored.reservations[0].date,'2026-11-03');
  assert.deepEqual(restored.reservations[0].quote,r.quote); assert.deepEqual(restored.favorites,['el-patio']);
});
test('datos corruptos o importes manipulados no se restauran', () => {
  assert.equal(decode('{').reservations.length,0);
  const store = new DemoStore(); store.reserve(input,now); const raw = JSON.parse(JSON.stringify(store.getSnapshot()));
  raw.reservations[0].quote.total = 1; assert.equal(decode(JSON.stringify(raw)).reservations.length,0);
});
test('valida equipo, jugadores y cancha; restablecer elimina la demo', () => {
  const store = new DemoStore();
  for (const patch of [{team:''},{players:0},{players:11},{courtId:'missing'}]) assert.throws(() => store.reserve({...input,...patch},now));
  store.reserve(input,now); store.reset(); assert.equal(store.getSnapshot().reservations.length,0);
});
