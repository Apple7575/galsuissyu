import {distance,type Coordinate,type Mobility} from './city-data';
import {crossesWater,type WaterBarriers} from './water-barriers';
export type Edge=[number,number,number,number,Coordinate[],number];
export type WalkNetwork={snapshot:string;nodes:Coordinate[];edges:Edge[];waterBarriers?:WaterBarriers;terrainExcludedWays?:number[]};
export type RouteSection={kinds:('steps'|'rough'|'steep'|'bridge')[];coordinates:Coordinate[];startDistance:number;distance:number};
export type RouteResult={coordinates:Coordinate[];connectors:Coordinate[][];distance:number;connectorDistance:number;unknownDistance:number;roughDistance:number;stepsDistance:number;steepDistance:number;minutes:number;ways:number[];snapshot:string;sections?:RouteSection[];elevation?:import('./elevation').ElevationProfile;elevationExcludedRanges?:{start:number;end:number}[]};
class Heap{q:[number,number][]=[];push(v:[number,number]){let i=this.q.length;this.q.push(v);while(i){const p=(i-1)>>1;if(this.q[p][0]<=v[0])break;this.q[i]=this.q[p];i=p;}this.q[i]=v;}pop(){if(!this.q.length)return null;const first=this.q[0],last=this.q.pop()!;if(this.q.length){let i=0;while(i*2+1<this.q.length){let c=i*2+1;if(c+1<this.q.length&&this.q[c+1][0]<this.q[c][0])c++;if(this.q[c][0]>=last[0])break;this.q[i]=this.q[c];i=c;}this.q[i]=last;}return first;}}
export function solveRoute(graph:WalkNetwork,from:Coordinate,to:Coordinate,prefs:Mobility):RouteResult{
 const allowed=(f:number)=>!(f&256)&&!(prefs.steps&&(f&1))&&!(prefs.wheelchair&&(f&2))&&!(prefs.rough&&(f&4))&&!(prefs.steep&&(f&8));
 const adj:Array<Array<[number,number]>>=Array.from({length:graph.nodes.length},()=>[]);
 graph.edges.forEach((e,i)=>{if(allowed(e[3])){adj[e[0]].push([e[1],i]);adj[e[1]].push([e[0],i]);}});
 function snap(p:Coordinate){let best=-1,m=Infinity;graph.nodes.forEach((n,i)=>{const d=distance(n,p);if(d<m){best=i;m=d;}});if(best<0||m>180)throw Error('가까운 보행 연결 지점을 찾지 못했어요. 지도에서 출입구 가까이 출발·도착 위치를 다시 선택해 주세요.');if(!adj[best].length)throw Error('선택 위치 주변의 기록된 길이 이동 조건에 맞지 않아요. 확인 가능한 다른 출입구를 선택해 주세요.');return {id:best,m};}
 const start=snap(from),end=snap(to);
 const connectorWet=(p:Coordinate,s:{id:number;m:number})=>!(s.m<1&&adj[s.id].some(([,i])=>graph.edges[i][3]&128))&&crossesWater(p,graph.nodes[s.id],graph.waterBarriers);
 if(connectorWet(from,start)||connectorWet(to,end))throw Error('선택한 위치와 보행로 사이에 물길이 있어요. 다리의 진입로나 같은 강변의 출입구를 선택해 주세요.');
 if(start.id===end.id)throw Error('두 지점이 같은 보행 연결 지점으로 잡혔어요. 출입구 위치를 조금 더 정확하게 선택해 주세요.');
 const scores=new Float64Array(graph.nodes.length).fill(Infinity),prev=new Int32Array(graph.nodes.length).fill(-1),prevEdge=new Int32Array(graph.nodes.length).fill(-1),closed=new Uint8Array(graph.nodes.length);const heap=new Heap();scores[start.id]=0;heap.push([distance(graph.nodes[start.id],graph.nodes[end.id]),start.id]);
 while(heap.q.length){const [,v]=heap.pop()!;if(closed[v])continue;closed[v]=1;if(v===end.id)break;for(const [n,edgeId] of adj[v]){const e=graph.edges[edgeId];const penalty=(e[3]&16?1.08:1)+(e[3]&4?.3:0);const next=scores[v]+e[2]*penalty;if(next<scores[n]){scores[n]=next;prev[n]=v;prevEdge[n]=edgeId;heap.push([next+distance(graph.nodes[n],graph.nodes[end.id]),n]);}}}
 if(!Number.isFinite(scores[end.id]))throw Error('선택한 조건으로 연결된 경로를 찾지 못했어요. 지도 데이터가 끊겼거나 피해야 하는 구간이 있을 수 있어요.');
 const chain:{id:number;forward:boolean}[]=[];for(let n=end.id;n!==start.id;){const i=prevEdge[n];if(i<0)throw Error('경로를 복원하지 못했어요.');const e=graph.edges[i];chain.push({id:i,forward:e[1]===n});n=prev[n];}chain.reverse();
 const result:RouteResult={coordinates:[],connectors:[[from,graph.nodes[start.id]],[graph.nodes[end.id],to]],distance:0,connectorDistance:start.m+end.m,unknownDistance:0,roughDistance:0,stepsDistance:0,steepDistance:0,minutes:0,ways:[],snapshot:graph.snapshot,sections:[]};
 let offset=0,last:RouteSection|undefined;const excluded=new Set(graph.terrainExcludedWays??[]);result.elevationExcludedRanges=[];
 for(const c of chain){const e=graph.edges[c.id],coordinates=c.forward?e[4]:[...e[4]].reverse();const kinds:RouteSection['kinds']=[];
  if(e[3]&1)kinds.push('steps');if(e[3]&4)kinds.push('rough');if(e[3]&8)kinds.push('steep');if(e[3]&128)kinds.push('bridge');
  if((e[3]&128)||excluded.has(e[5]))result.elevationExcludedRanges.push({start:offset,end:offset+e[2]});
  if(kinds.length){if(last&&last.kinds.join()===kinds.join()){last.distance+=e[2];last.coordinates.push(...coordinates.slice(1));}else{last={kinds,coordinates:[...coordinates],distance:e[2],startDistance:offset};result.sections!.push(last);}}else last=undefined;
  offset+=e[2];
 }
 for(const c of chain){const e=graph.edges[c.id];const points=c.forward?e[4]:[...e[4]].reverse();result.coordinates.push(...(result.coordinates.length?points.slice(1):points));result.distance+=e[2];if(e[3]&112)result.unknownDistance+=e[2];if(e[3]&4)result.roughDistance+=e[2];if(e[3]&1)result.stepsDistance+=e[2];if(e[3]&8)result.steepDistance+=e[2];result.ways.push(e[5]);}
 result.minutes=Math.ceil((result.distance+result.connectorDistance)/(prefs.wheelchair?.8:1.1)/60);return result;
}
