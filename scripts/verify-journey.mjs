import assert from 'node:assert/strict';
import {build} from 'esbuild';
import fs from 'node:fs/promises';
const path='scripts/.journey-runtime.mjs';
try{await build({entryPoints:['src/journey.ts'],outfile:path,bundle:true,platform:'node',format:'esm'});const {journeyPoint,journeyLengths}=await import('../'+path);const coords=[[127.43,36.33],[127.431,36.33],[127.431,36.331]],lengths=journeyLengths(coords);assert.deepEqual(journeyPoint(coords,lengths,0).coordinate,coords[0]);assert.deepEqual(journeyPoint(coords,lengths,1).coordinate,coords[2]);assert.deepEqual(journeyPoint(coords,lengths,10).coordinate,coords[2]);const mid=journeyPoint(coords,lengths,.5);assert(mid.traveled>0&&mid.traveled<lengths.at(-1));assert(Number.isFinite(journeyPoint([coords[0],coords[0]],[0,0],.5).coordinate[0]));console.log('Journey start, arrival, scrubbing, repeated nodes: passed');}finally{await fs.rm(path,{force:true});}
