import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readIntent,readReservation,readSelection,holdError,reservationStatus} from './contracts.ts';
const actor='00000000-0000-0000-0000-000000000001';
const intent={actor,key:actor,court:actor,date:'2026-11-04',time:'08:00',duration:60,team:'Equipo',players:10};
const row={id:actor,actor_id:actor,court_id:actor,idempotency_key:actor,status:'held',starts_at:'2026-11-04T13:00:00Z',ends_at:'2026-11-04T14:00:00Z',expires_at:'2026-11-03T20:00:00Z',team:'Equipo',players:10,total:90000,discount:10000,deposit:27000,balance:63000};
test('valida selección y no restaura solicitudes de otra cuenta',()=>{
  assert.ok(readSelection(intent));assert.equal(readSelection({...intent,time:'25:00'}),null);
  assert.equal(readSelection({...intent,court:'invalid'}),null);
  assert.deepEqual(readIntent(intent,actor),intent);
  assert.throws(()=>readIntent(intent,'00000000-0000-0000-0000-000000000002'));
  assert.throws(()=>readIntent({...intent,players:0},actor));
});
test('rechaza respuestas de otro usuario, importes y vencimientos incoherentes',()=>{
  assert.deepEqual(readReservation(row,actor),row);
  assert.throws(()=>readReservation({...row,actor_id:'00000000-0000-0000-0000-000000000002'},actor));
  assert.throws(()=>readReservation({...row,total:1},actor));
  assert.throws(()=>readReservation({...row,expires_at:null},actor));
  assert.match(reservationStatus(row,Date.parse('2026-11-03T20:01:00Z')),/Plazo agotado/);
  assert.match(reservationStatus(row,0),/sin confirmar/);
});
test('conserva claves ante red, sesión o respuesta ambigua; distingue conflictos',()=>{
  for(const error of [new Error('network'),{code:'42501'},{code:'22023',message:'idempotency_mismatch'}]) assert.equal(holdError(error).definitive,false);
  assert.equal(holdError({code:'23P01'}).definitive,true);
  assert.equal(holdError({message:'hold_limit_reached'}).definitive,true);
});
