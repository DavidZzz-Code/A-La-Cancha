import { interval, type Court, type Occupancy } from '@alacancha/domain';
/** Todos los escenarios son ficticios; las zonas no representan afiliaciones. */
export const courts: Court[] = [
  { id:'el-patio', name:'El Patio', zone:'Manga', sport:'football', format:'Fútbol 5', price:120000, capacity:10, covered:false, open:420, close:1380, palette:'forest', amenities:['Iluminación','Baños','Zona de descanso'], promotion:{ percent:20, days:[1,2,3,4,5], start:420, end:960 } },
  { id:'brisa-norte', name:'Brisa Norte', zone:'Crespo', sport:'football', format:'Fútbol 7', price:160000, capacity:14, covered:true, open:360, close:1380, palette:'ocean', amenities:['Cubierta','Parqueadero','Baños'] },
  { id:'la-esquina', name:'La Esquina', zone:'El Recreo', sport:'football', format:'Fútbol 5', price:90000, capacity:10, covered:false, open:480, close:1380, palette:'clay', amenities:['Iluminación','Baños','Bebidas'], promotion:{ percent:15, days:[0,1,2,3,4,5,6], start:720, end:1020 } },
  { id:'punto-y-partido', name:'Punto y Partido', zone:'Zona Norte', sport:'padel', format:'Pádel', price:140000, capacity:4, covered:false, open:360, close:1320, palette:'sand', amenities:['Iluminación','Parqueadero','Baños'] },
  { id:'club-del-sol', name:'Club del Sol', zone:'Los Alpes', sport:'basketball', format:'Baloncesto', price:80000, capacity:10, covered:true, open:420, close:1320, palette:'night', amenities:['Cubierta','Graderías','Baños'] },
];
export function demoOccupancy(date: string): Occupancy[] { return courts.flatMap((court,index) => [index % 2 ? '17:00' : '18:00','20:00'].map((time) => ({ courtId:court.id, ...interval(date,time,60), status:'blocked' as const }))); }
