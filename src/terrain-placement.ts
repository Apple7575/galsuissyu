import type {Map as CityMap} from 'maplibre-gl';

/** MapLibre returns display elevation, already multiplied by exaggeration. */
export function groundHeight(map:CityMap,c:number[]):number {
 if(!map.getTerrain())return 0;
 const height=map.queryTerrainElevation([c[0],c[1]]);
 return height!==null&&Number.isFinite(height)?height:0;
}

/** Horizontal distances must not include altitude above sea level. */
export const horizontalDistance=(p:{x:number;y:number})=>Math.hypot(p.x,p.y);
