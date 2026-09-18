import type {Coordinate} from './city-data';
import {journeyLengths,journeyPoint} from './journey';
import type {RouteResult} from './route-engine';
export type ElevationGrid={zoom:number;x0:number;y0:number;step:number;offset:number;width:number;height:number;values:number[];excludedWays?:number[];resolution:string;source:string;sourceUrl:string};
export type ElevationSample={distance:number;height:number|null};
export type SlopeSegment={start:number;end:number;grade:number|null;kind:'up'|'down'|'level'|'unknown';coordinates:Coordinate[]};
export type ElevationProfile={samples:ElevationSample[];segments:SlopeSegment[];ascent:number;descent:number;unknownDistance:number;source:string;sourceUrl:string;resolution:string};
export function elevationAt(grid:ElevationGrid,[lon,lat]:Coordinate){
 const n=2**grid.zoom,x=(((lon+180)/360*n-grid.x0)*256-grid.offset)/grid.step,y=(((1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*n-grid.y0)*256-grid.offset)/grid.step;
 if(!Number.isFinite(x+y)||x<0||y<0||x>=grid.width-1||y>=grid.height-1)return null;
 const a=Math.floor(x),b=Math.floor(y),u=x-a,v=y-b;
 const h=[grid.values[b*grid.width+a],grid.values[b*grid.width+a+1],grid.values[(b+1)*grid.width+a],grid.values[(b+1)*grid.width+a+1]];
 if(h.some(h=>!Number.isFinite(h)||h< -100||h>3000))return null;
 return h[0]*(1-u)*(1-v)+h[1]*u*(1-v)+h[2]*(1-u)*v+h[3]*u*v;
}
export function routeElevation(route:RouteResult,grid:ElevationGrid):ElevationProfile{
 const lengths=journeyLengths(route.coordinates),total=lengths.at(-1)??0,steps=Math.min(250,Math.max(1,Math.floor(total/120)));
 const points=Array.from({length:steps+1},(_,i)=>journeyPoint(route.coordinates,lengths,i/steps));
 const blocked=route.elevationExcludedRanges??[];
 const heights=points.map(p=>blocked.some(r=>p.traveled>=r.start&&p.traveled<=r.end)?null:elevationAt(grid,p.coordinate));
 const samples=points.map((p,i)=>({distance:p.traveled,height:heights[i]}));
 let ascent=0,descent=0,unknownDistance=0;
 const segments: SlopeSegment[]=points.slice(1).map((p,i)=>{
  const a=points[i],d=p.traveled-a.traveled,h0=heights[i],h1=heights[i+1];
  const unknown=d<90||h0===null||h1===null||blocked.some(r=>r.start<p.traveled&&r.end>a.traveled);
  const delta=unknown?0:h1!-h0!,grade=unknown?null:delta/d*100;
  if(unknown){unknownDistance+=d;}else{ascent+=Math.max(0,delta);descent+=Math.max(0,-delta);}
  return {start:a.traveled,end:p.traveled,grade,kind:grade===null?'unknown':grade>=1.5?'up':grade<=-1.5?'down':'level',coordinates:[a.coordinate,...route.coordinates.slice(a.index,p.index),p.coordinate]};
 });
 samples.forEach((s,i)=>{if(segments[i-1]?.grade==null&&segments[i]?.grade==null)s.height=null;});
 return {samples,segments,ascent,descent,unknownDistance,source:grid.source,sourceUrl:grid.sourceUrl,resolution:grid.resolution};
}
