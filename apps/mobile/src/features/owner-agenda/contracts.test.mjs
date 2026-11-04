import test from 'node:test';
import assert from 'node:assert/strict';
import { completeRows, dayBounds, readEntries, dailySlots, readMemberships, readManagedCourts } from './contracts.ts';
const actor='00000000-0000-0000-0000-000000000001', venue='10000000-0000-0000-0000-000000000001', court='20000000-0000-0000-0000-000000000001';
const managed={id:court,venue_id:venue,name:'Cancha',venue:'Sede',open:420,close:540,published:true};
const row={id:'30000000-0000-0000-0000-000000000001',court_id:court,kind:'player',status:'held',starts_at:'2026-11-05T07:00:00-05:00',ends_at:'2026-11-05T08:00:00-05:00',expires_at:'2026-11-04T10:00:00Z',team:'Equipo',players:10};
test('día colombiano usa límites UTC y descarta respuestas fuera de cancha/fecha',()=>{
  assert.deepEqual(dayBounds('2026-11-05'),{start:'2026-11-05T05:00:00.000Z',end:'2026-11-06T05:00:00.000Z'});
  assert.throws(()=>dayBounds('2026-02-30'));
  assert.throws(()=>readEntries([{...row,court_id:venue}],court,'2026-11-05'));
  assert.throws(()=>readEntries([row],court,'2026-11-06'));
  assert.throws(()=>readEntries([{...row,status:'pending'}],court,'2026-11-05'));
  assert.throws(()=>readEntries([{...row,starts_at:'2026-11-05T07:00:00'}],court,'2026-11-05'));
});
test('ocupación usa estados del servidor, intervalos contiguos y liberación explícita',()=>{
  const now=Date.parse('2026-11-04T12:00:00Z');
  const held=readEntries([row],court,'2026-11-05');
  assert.deepEqual(dailySlots(managed,'2026-11-05',held,now).map(s=>s.label),['Ocupado','Ocupado','Libre al consultar','Libre al consultar']);
  for(const status of ['cancelled','expired']) assert.equal(dailySlots(managed,'2026-11-05',readEntries([{...row,status}],court,'2026-11-05'),now)[0].label,'Libre al consultar');
  assert.equal(dailySlots(managed,'2026-11-05',[],Date.parse('2026-11-05T12:15:00Z'))[0].label,'Pasado');
});
test('consultas truncadas o sin conteo nunca producen una agenda libre',()=>{
  assert.throws(()=>completeRows([row],2,200));
  assert.throws(()=>completeRows([],null,200));
  assert.throws(()=>completeRows([row],1,0));
  assert.deepEqual(completeRows([],0,200),[]);
});
test('membresías y canchas tienen que pertenecer al ámbito solicitado',()=>{
  assert.deepEqual(readMemberships([{venue_id:venue,user_id:actor}],actor),[venue]);
  assert.throws(()=>readMemberships([{venue_id:venue,user_id:venue}],actor));
  const data={id:court,venue_id:venue,name:'Cancha',open_minute:420,close_minute:540,published:true,venues:{name:'Sede',published:false}};
  assert.equal(readManagedCourts([data],[venue])[0].published,false);
  assert.throws(()=>readManagedCourts([data],[]));
  assert.throws(()=>readManagedCourts([{...data,close_minute:421}],[venue]));
});
