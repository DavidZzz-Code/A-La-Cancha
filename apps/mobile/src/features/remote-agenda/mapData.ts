import type { RemoteCourt } from './contracts';
export type MapProps={
  courts:RemoteCourt[];
  height?:number;
  onNearby:(courts:RemoteCourt[])=>void;
  onSelect:(id:string)=>void;
};
export function distance(lat:number,lon:number,c:RemoteCourt){
  if(c.latitude===null || c.longitude===null)return Infinity;
  const radians=Math.PI/180;
  const a=Math.sin((c.latitude-lat)*radians/2)**2+Math.cos(lat*radians)*Math.cos(c.latitude*radians)*Math.sin((c.longitude-lon)*radians/2)**2;
  return 12742*Math.asin(Math.sqrt(Math.min(1,a)));
}
