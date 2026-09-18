import type {RouteResult} from './route-engine';
import type {SlopeSegment} from './elevation';
/** Display duration uses the same average speed as the route, no invented fatigue model. */
export function slopeSummary(route:RouteResult){
 const runs:SlopeSegment[]=[];
 for(const s of route.elevation?.segments??[]){const last=runs.at(-1);if(last&&last.kind===s.kind&&Math.abs(last.end-s.start)<.01){const length=last.end-last.start,next=s.end-s.start;last.grade=last.grade===null||s.grade===null?null:(last.grade*length+s.grade*next)/(length+next);last.end=s.end;last.coordinates.push(...s.coordinates.slice(1));}else runs.push({...s,coordinates:[...s.coordinates]});}
 return runs.map(s=>({...s,length:s.end-s.start,rise:s.grade===null?null:(s.end-s.start)*s.grade/100,minutes:(s.end-s.start)/Math.max(1,route.distance+route.connectorDistance)*route.minutes}));
}
