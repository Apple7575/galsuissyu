import type {Coordinate} from './city-data';
type Polygon=Coordinate[][];
export type WaterBarriers={type:'Polygon';coordinates:Polygon}|{type:'MultiPolygon';coordinates:Polygon[]};
function inside(p:Coordinate,ring:Coordinate[]){let yes=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
function cross(a:Coordinate,b:Coordinate,c:Coordinate){return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);}
function intersects(a:Coordinate,b:Coordinate,c:Coordinate,d:Coordinate){return cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0;}
/** Unverified endpoint connectors may never cut across a mapped water polygon. */
export function crossesWater(a:Coordinate,b:Coordinate,water?:WaterBarriers){
 if(!water)return false;
 const polys=water.type==='Polygon'?[water.coordinates]:water.coordinates;
 for(const rings of polys){
  const wet=(p:Coordinate)=>inside(p,rings[0])&&!rings.slice(1).some(r=>inside(p,r));
  if(wet(a)||wet(b)||wet([(a[0]+b[0])/2,(a[1]+b[1])/2]))return true;
  for(const ring of rings)for(let i=1;i<ring.length;i++)if(intersects(a,b,ring[i-1],ring[i]))return true;
 }
 return false;
}
