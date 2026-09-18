import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {build} from 'esbuild';
const file=new URL('../node_modules/.elevation-check.mjs',import.meta.url);
try{
 const bundle=await build({entryPoints:['src/elevation.ts'],bundle:true,platform:'node',format:'esm',write:false});await fs.writeFile(file,bundle.outputFiles[0].contents);
 const {elevationAt,routeElevation}=await import(file.href);
 const grid=JSON.parse(await fs.readFile('public/data/elevation-grid.json'));
 assert.equal(grid.values.length,grid.width*grid.height);assert(grid.values.every(Number.isFinite));
 assert.equal(elevationAt(grid,[0,0]),null);
 const level={...grid,values:grid.values.map(()=>60)};
 const route={coordinates:[[127.43,36.33],[127.44,36.33]],elevationExcludedRanges:[]};
 const flat=routeElevation(route,level);assert.equal(flat.ascent,0);assert.equal(flat.descent,0);assert(flat.segments.every(s=>s.grade===0));
 const incline={...grid,values:grid.values.map((_,i)=>i%grid.width)};
 const up=routeElevation(route,incline),down=routeElevation({...route,coordinates:[...route.coordinates].reverse()},incline);
 assert(up.ascent>0&&up.descent===0);assert(Math.abs(up.ascent-down.descent)<.00001);assert.equal(down.ascent,0);
 const bridge=routeElevation({...route,elevationExcludedRanges:[{start:250,end:400}]},incline);
 assert(bridge.segments.some(s=>s.grade===null));assert(bridge.segments.at(-1).grade>0,'Exclusion does not poison subsequent terrain samples');
 const short=routeElevation({coordinates:[[127.43,36.33],[127.4301,36.33]]},incline);assert(short.segments.every(s=>s.grade===null),'No invented precision on short routes');
 assert(grid.excludedWays.length>0,'Known bridges/tunnels excluded');
 console.log(JSON.stringify({stationElevation:Math.round(elevationAt(grid,[127.4346,36.3322])),checks:'flat, reverse direction, exclusion recovery, short routes, out-of-bounds: passed'}));
}finally{await fs.unlink(file).catch(()=>{});}
