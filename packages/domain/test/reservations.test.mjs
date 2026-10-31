import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localDate, addDays, validDate, interval, quote, available, slots, search, perPlayer } from '../src/index.ts';

const court = { id:'a',name:'Prueba',zone:'Manga',sport:'football',format:'5',price:100001,capacity:10,covered:false,open:420,close:1380,palette:'forest',amenities:[],promotion:{percent:20,days:[1,2,3,4,5],start:420,end:960} };
const now = new Date('2026-11-02T15:00:00Z');
const date = '2026-11-03';
test('la fecha colombiana se conserva cuando UTC ya cambió de día', () => {
  assert.equal(localDate(new Date('2026-11-04T00:30:00Z')),date);
  assert.deepEqual(interval(date,'22:00',60),{start:'2026-11-04T03:00:00.000Z',end:'2026-11-04T04:00:00.000Z'});
});
test('fechas reales y cambio de mes/año', () => { assert.equal(validDate('2026-02-30'),false); assert.equal(validDate('no'),false); assert.equal(addDays('2026-12-31',1),'2027-01-01'); });
test('rechaza horas y duraciones inválidas', () => { for (const [time,duration] of [['24:00',60],['18:15',60],['18:00',45],['23:30',60]]) assert.throws(() => interval(date,time,duration)); });
test('un turno ocupado rechaza un segundo intento y admite adyacentes', () => {
  const occupied = [{courtId:'a',...interval(date,'19:00',60),status:'confirmed'}];
  assert.equal(available(court,date,'19:00',60,occupied,now),false);
  assert.equal(available(court,date,'18:30',60,occupied,now),false);
  assert.equal(available(court,date,'20:00',60,occupied,now),true);
  assert.equal(available({...court,id:'b'},date,'19:00',60,occupied,now),true);
});
test('cancelar libera el intervalo; un hold vencido deja de ocupar', () => {
  const occupied = {courtId:'a',...interval(date,'19:00',60),status:'cancelled'};
  assert.equal(available(court,date,'19:00',60,[occupied],now),true);
  assert.equal(available(court,date,'19:00',60,[{...occupied,status:'held',expiresAt:now.toISOString()}],now),true);
  assert.equal(available(court,date,'19:00',60,[{...occupied,status:'held',expiresAt:'2026-11-02T15:05:00Z'}],now),false);
});
test('rechaza pasado, fuera de horario y más de treinta días', () => {
  assert.equal(available(court,'2026-11-02','09:00',60,[],now),false);
  assert.equal(available(court,date,'22:30',60,[],now),false);
  assert.equal(available(court,'2026-12-04','19:00',60,[],now),false);
  assert.equal(available(court,date,'22:00',60,[],now),true);
});
test('precios enteros, descuento por turno completo y suma exacta del anticipo', () => {
  const result = quote(court,date,'15:00',60);
  assert.deepEqual(result,{base:100001,discount:20000,total:80001,deposit:24000,balance:56001});
  assert.equal(quote(court,date,'15:30',60).discount,0);
  assert.equal(quote(court,'2026-11-07','12:00',60).discount,0);
  const half = quote(court,date,'19:00',90); assert.equal(half.total,150002); assert.equal(half.deposit+half.balance,half.total);
});
test('búsqueda usa la cotización de la duración elegida', () => {
  const filters = {date,time:'19:00',duration:90,sport:'all',zone:'',maxPrice:120000,covered:false};
  assert.equal(search([court],filters,[],now).length,0);
  assert.equal(search([court],{...filters,duration:60},[],now).length,1);
  assert.equal(search([court],{...filters,duration:60,time:'12:00',maxPrice:85000},[],now).length,1);
  assert.equal(search([court],{...filters,duration:60,covered:true},[],now).length,0);
});
test('lista de turnos omite ocupados y termina antes del cierre', () => { const result = slots(court,date,60,[{courtId:'a',...interval(date,'19:00',60),status:'blocked'}],now); assert.ok(!result.includes('19:00')); assert.ok(!result.includes('18:30')); assert.equal(result.at(-1),'22:00'); });
test('reparto es orientativo y valida sus entradas', () => { assert.equal(perPlayer(100001,10),10001); assert.throws(() => perPlayer(100,0)); assert.throws(() => perPlayer(-1,10)); });
