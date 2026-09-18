import type {CityPlace} from './city-data';
type Options={selected:string;from:CityPlace|null;to:CityPlace|null;focused:boolean;route:boolean;zoom:number;width:number;height:number;project:(p:CityPlace)=>{x:number;y:number};contains:(p:CityPlace)=>boolean};
// Screen-space spacing remains consistent at every zoom. Selected places win.
export function chooseMapPins(places:CityPlace[],o:Options){
 const occupied:{x:number;y:number}[]=[];
 for(const p of [o.from,o.to])if(p)occupied.push(o.project(p));
 const limit=o.focused?(o.width<740?8:12):(o.zoom<14?3:o.width<740?5:8);
 const chosen:CityPlace[]=[];
 const candidates=[...places].sort((a,b)=>Number(b.id===o.selected)-Number(a.id===o.selected));
 for(const p of candidates){
  if(p.id===o.from?.id||p.id===o.to?.id||!o.contains(p))continue;
  const active=p.id===o.selected;
  if(!active&&!o.focused&&(o.route||!['attraction','culture','park'].includes(p.category)))continue;
  const pt=o.project(p);
  if(pt.x<20||pt.x>o.width-20||pt.y<35||pt.y>o.height-20)continue;
  if(!active&&occupied.some(q=>Math.abs(pt.x-q.x)<100&&Math.abs(pt.y-q.y)<75))continue;
  chosen.push(p);occupied.push(pt);if(chosen.length>=limit)break;
 }
 return chosen;
}
