import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {build} from 'esbuild';
import {validateStyleMin} from '@maplibre/maplibre-gl-style-spec';
const out=new URL('./.travel-check/',import.meta.url);
try{
 await build({entryPoints:['src/travel-access.ts','src/bridge-style.ts'],outdir:out.pathname,bundle:true,platform:'node',format:'esm',outExtension:{'.js':'.mjs'}});
 const {facilityFacts,distanceToPath,routeFacilities}=await import(new URL('travel-access.mjs',out));
 const {bridgeLayers}=await import(new URL('bridge-style.mjs',out));
 const style=JSON.parse(await fs.readFile('public/data/map-style.json'));
 style.sources.bridges={type:'geojson',data:{type:'FeatureCollection',features:[]}};style.layers.push(...bridgeLayers);
 const errors=validateStyleMin(style);assert.deepEqual(errors.map(e=>e.message),[],'Base map and dynamically-added bridge layers must validate together');
 const p={id:'example',facilities:['toilet'],wheelchair:'yes',toiletWheelchair:'unknown',category:'toilet',lon:127.001,lat:36.0001};
 assert.equal(facilityFacts(p).find(f=>f.label==='출입구').status,'unknown','A general wheelchair tag is not verified entrance geometry');
 assert.equal(facilityFacts(p).find(f=>f.label==='휠체어 화장실').status,'unknown','General toilets must not become accessible toilets');
 assert.equal(facilityFacts({...p,toiletWheelchair:'no'}).find(f=>f.label==='휠체어 화장실').status,'limited');
 const path=[[127,36],[127.002,36]];
 assert(distanceToPath([p.lon,p.lat],path)<12,'A facility near the middle of a long segment must be found');
 assert.equal(routeFacilities([p,{...p,id:'far',lat:36.01}],path,false).length,1);
 assert.equal(routeFacilities([{...p,category:'park'}],path,false).length,0);
 assert.equal(routeFacilities([{...p,category:'park'}],path,true).length,1);
 console.log('Passed: accessibility evidence states, polyline proximity, rest preference, full map/bridge style validation.');
}finally{await fs.rm(out,{recursive:true,force:true});}
