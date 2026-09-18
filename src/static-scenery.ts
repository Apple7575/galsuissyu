import type {Feature,LineString,MultiLineString} from 'geojson';
type Scenery={trees:number[][];roads:Feature<LineString|MultiLineString,{kind:string;tunnel?:number;bridge?:number}>[];props:{id:string;kind:string;coordinate:[number,number]}[];busRoute:[number,number][]};
let pending:Promise<Scenery>|undefined;
export function loadScenery():Promise<Scenery>{return pending??=fetch('/data/static-scenery.json').then(r=>{if(!r.ok)throw Error('Scenery '+r.status);return r.json();}).catch(e=>{pending=undefined;throw e;});}
