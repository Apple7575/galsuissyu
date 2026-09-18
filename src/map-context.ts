import type {FeatureCollection,Point,Polygon} from 'geojson';
export type MapContext=FeatureCollection<Point|Polygon,{kind:string;name?:string;source?:string}>;
let pending:Promise<MapContext>|undefined;
export function loadMapContext(){return pending??=fetch('/data/station-context.json').then(r=>{if(!r.ok)throw Error('Context '+r.status);return r.json() as Promise<MapContext>;}).catch(e=>{pending=undefined;throw e;});}
