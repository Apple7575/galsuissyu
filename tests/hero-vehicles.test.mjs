import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const compiled=await build({entryPoints:['src/hero-vehicles.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const {heroVehicle}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
for(const mode of ['bus','subway'])test(mode+' body and windows are renderable opaque meshes',()=>{
 const model=heroVehicle(mode);let shells=0,meshes=0;
 model.root.traverse(o=>{if(!o.isMesh)return;meshes++;if(o.name.startsWith('opaque'))shells++;
  const materials=Array.isArray(o.material)?o.material:[o.material];
  if(Array.isArray(o.material))assert.ok(o.geometry.groups.length>0,'material arrays require geometry groups');
  for(const material of materials){assert.equal(material.transparent,false);assert.equal(material.opacity,1);assert.equal(material.depthWrite,true);}
  for(const number of o.geometry.attributes.position.array)assert.ok(Number.isFinite(number));
 });
 assert.ok(shells>0);assert.ok(meshes>80);model.animate(12);
});
