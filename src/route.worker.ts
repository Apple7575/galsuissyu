import {solveRoute,type WalkNetwork} from './route-engine';
import {routeElevation,type ElevationGrid} from './elevation';
let network:Promise<WalkNetwork>|null=null;
let elevation:Promise<ElevationGrid|null>|undefined;
self.onmessage=async e=>{const {id,from,to,prefs}=e.data;try{network??=fetch('/data/walk-network.json').then(r=>{if(!r.ok)throw Error('경로 데이터를 불러오지 못했어요.');return r.json();}).catch(err=>{network=null;throw err;});elevation??=fetch('/data/elevation-grid.json').then(r=>{if(!r.ok)throw Error();return r.json();}).catch(()=>{elevation=undefined;return null;});const [graph,grid]=await Promise.all([network,elevation]);graph.terrainExcludedWays=grid?.excludedWays;const result=solveRoute(graph,from,to,prefs);if(grid)result.elevation=routeElevation(result,grid);self.postMessage({id,result});}catch(error){self.postMessage({id,error:error instanceof Error?error.message:'경로를 계산하지 못했어요.'});}};
