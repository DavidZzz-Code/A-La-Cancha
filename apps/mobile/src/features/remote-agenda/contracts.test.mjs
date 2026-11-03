import test from 'node:test';
import assert from 'node:assert/strict';
import { readCourts, readBusy, readQuote, openSlots } from './contracts.ts';
const court={id:'court',name:'Test',venue:'Demo',city:'Cartagena',open:420,close:600,capacity:10};
test('excluye ocupación con intervalos semiabiertos y respeta el cierre',()=>{
  const busy=readBusy([{starts_at:'2030-01-01T07:00:00-05:00',ends_at:'2030-01-01T08:00:00-05:00'}]);
  assert.deepEqual(openSlots(court,'2030-01-01',60,busy,Date.parse('2029-12-31T00:00:00Z')),['08:00','08:30','09:00']);
  assert.deepEqual(openSlots(court,'2030-01-01',60,[],Date.parse('2030-01-01T09:00:00-05:00')),[]);
});
test('rechaza agenda corrupta en vez de asumir que está vacía',()=>{
  assert.throws(()=>readBusy(null));assert.throws(()=>readBusy([{starts_at:'invalid',ends_at:'invalid'}]));
  assert.throws(()=>readCourts([{id:'x',name:'Court',capacity:10,open_minute:600,close_minute:420,venues:{name:'Venue',city:'Cartagena'}}]));
  assert.deepEqual(readCourts([]),[]);
});
test('muestra cotización del servidor y rechaza desglose inconsistente',()=>{
  const q={base_price:100000,discount:10000,total:90000,deposit:27000,balance:63000};
  assert.deepEqual(readQuote([q]),q);
  assert.throws(()=>readQuote([{...q,total:1}]));assert.throws(()=>readQuote([{...q,deposit:-1}]));assert.throws(()=>readQuote([]));
});
