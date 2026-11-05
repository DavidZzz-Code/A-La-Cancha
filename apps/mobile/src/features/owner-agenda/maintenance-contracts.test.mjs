import test from 'node:test';
import assert from 'node:assert/strict';
import { readMaintenanceIntent, matchMaintenance, readMaintenanceBlock, maintenanceFailure } from './maintenance-contracts.ts';
const actor='00000000-0000-0000-0000-000000000003', court='20000000-0000-0000-0000-000000000001';
const intent={actor,court,key:'30000000-0000-0000-0000-000000000001',date:'2026-11-06',time:'08:00',duration:60,reason:'Luces'};
const block={id:'40000000-0000-0000-0000-000000000001',actor_id:actor,court_id:court,idempotency_key:intent.key,kind:'block',status:'confirmed',starts_at:'2026-11-06T13:00:00Z',ends_at:'2026-11-06T14:00:00Z',team:'Luces',total:0,deposit:0,balance:0,discount:0,cancellation_reason:null};
test('mantenimiento exige motivo, identidad, fecha y duración válidos',()=>{
  assert.deepEqual(readMaintenanceIntent(intent,actor),intent);
  for(const data of [{reason:' '},{actor:court},{key:'bad'},{date:'2026-02-30'},{duration:180},{time:'23:30',duration:60}]) assert.throws(()=>readMaintenanceIntent({...intent,...data},actor));
});
test('reintento solo acepta el mantenimiento original y nunca un cobro o reserva de jugador',()=>{
  assert.equal(matchMaintenance(block,intent).id,block.id);
  for(const data of [{kind:'player'},{court_id:actor},{total:100},{team:'Otro'},{actor_id:court},{idempotency_key:court},{ends_at:'2026-11-06T15:00:00Z'}]) assert.throws(()=>matchMaintenance({...block,...data},intent));
  assert.throws(()=>readMaintenanceBlock({...block,status:'held'},court));
  assert.equal(matchMaintenance({...block,status:'cancelled',cancellation_reason:'Fin'},intent).status,'cancelled');
});
test('red y permisos conservan referencia; conflicto y datos rechazados liberan el formulario',()=>{
  assert.equal(maintenanceFailure({code:'23P01'}).clear,true);
  assert.equal(maintenanceFailure({code:'22023',message:'invalid_slot'}).clear,true);
  for(const e of [Error('red'),{code:'42501'},{code:'22023',message:'idempotency_mismatch'}]) assert.equal(maintenanceFailure(e).clear,false);
});
