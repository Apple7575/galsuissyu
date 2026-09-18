import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import * as THREE from 'three';
const temp=new URL('./.architecture-check.mjs',import.meta.url),original=globalThis.fetch;
let controller;
try{
 await build({entryPoints:['src/architecture-models.ts'],outfile:temp.pathname,platform:'node',format:'esm',bundle:true,packages:'external'});
 const {architectureModels}=await import(temp.href);let zoom=17,pitch=52;
 const requests=[];globalThis.fetch=async url=>{requests.push(url);return new Response(await fs.readFile('public'+url));};
 const map={getZoom:()=>zoom,getPitch:()=>pitch,getBounds:()=>({contains:()=>true})};
 const scene=new THREE.Scene();controller=architectureModels(map,scene,c=>new THREE.Vector3((c[0]-127.43)*89500,(c[1]-36.33)*111320,0),()=>controller.refresh());
 for(let i=0;i<100&&controller.excluded().length<17;i++)await new Promise(r=>setTimeout(r,10));
 assert.equal(controller.excluded().length,17,'Actual footprints covered after successful GLB loading');
 const parts=scene.children[0].children;assert(parts.every(p=>p.isInstancedMesh));assert(parts.length<20,'Batched materials keep draw calls bounded');
 const m=new THREE.Matrix4();for(const part of parts){part.getMatrixAt(0,m);assert(m.elements.every(Number.isFinite));}
 const ids=controller.excluded().slice();zoom=15;controller.refresh();assert.deepEqual(controller.excluded(),ids);
 pitch=0;controller.refresh();assert.equal(controller.excluded().length,0,'2D restores original buildings');
 pitch=52;zoom=12;controller.refresh();assert.equal(controller.excluded().length,0,'District overview restores base geometry');
 assert.equal(requests.length,3,'One placement file and two visible model types');
 controller.dispose();assert.equal(scene.children.length,0);
 console.log('Architecture: 17 placements, batching, cache, zoom fallback and cleanup passed.');
}finally{controller?.dispose();globalThis.fetch=original;await fs.rm(temp,{force:true});}
