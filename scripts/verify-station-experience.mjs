import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
globalThis.FileReader=class {async readAsArrayBuffer(b){this.result=await b.arrayBuffer();this.onloadend?.();}};
const bundle=await build({stdin:{contents:"export * from './src/station-world'; export * from './src/station-journey'; export * from './src/traveler-model';",resolveDir:process.cwd()},bundle:true,format:'esm',platform:'node',external:['three','three/*'],write:false});
const temp=new URL('../node_modules/.station-check.mjs',import.meta.url);
await fs.writeFile(temp,bundle.outputFiles[0].contents);
try{
 const {createStationWorld,stationPath,journeyAt,journeyDuration,journeyLengths,waitStart,waitSeconds,travelerModel}=await import(temp.href+'?v='+Date.now());
 assert.equal(journeyAt(-1).distance,0);assert.equal(journeyAt(journeyDuration+1).finished,true);
 const stopped=journeyAt(waitStart+waitSeconds/2);assert.equal(stopped.waiting,true);assert.ok(Math.abs(stopped.distance-journeyLengths[3])<1e-9);
 assert.equal(journeyAt(waitStart+waitSeconds+.01).waiting,false);
 let previous=0;
 for(let t=0;t<=journeyDuration;t+=.1){const p=journeyAt(t);assert.ok(p.distance>=previous-1e-9);assert.ok([p.x,p.z,p.heading].every(Number.isFinite));previous=p.distance;}
 for(const wheelchair of [false,true]){
  const person=travelerModel(wheelchair);
  for(const d of [0,.11,.22,.44,.66,.88,5,30]){person.animate(d);person.root.updateMatrixWorld(true);const box=new T.Box3().setFromObject(person.root,true);assert.ok(box.min.z>=-.001,'Foot/tire below ground: '+JSON.stringify({wheelchair,d,z:box.min.z}));person.root.traverse(o=>assert.ok(o.matrixWorld.elements.every(Number.isFinite)));}
  person.dispose();
 }
 const world=createStationWorld();world.root.name='StationForecourt_InterpretiveDemo';world.root.userData.note='Illustrative layout; not a surveyed accessible route';
 const bytes=await fs.readFile('public/models/pilot/station.glb');const g=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');g.scene.scale.set(.85,.85,.55);g.scene.position.set(0,0,-34);world.root.add(g.scene);
 const person=travelerModel(true);person.root.rotation.x=-Math.PI/2;person.root.position.set(-20,.1,-4);world.root.add(person.root);
 let meshes=0,triangles=0;world.root.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;assert.ok(o.geometry.attributes.position.array.every(Number.isFinite));}});
 const output=await new GLTFExporter().parseAsync(world.root,{binary:true,onlyVisible:true});if(process.argv[2])await fs.writeFile(process.argv[2],Buffer.from(output));
 console.log(JSON.stringify({journeyChecks:'passed: boundaries, waiting, monotonicity, contacts',meshes,triangles,reviewBytes:output.byteLength,duration:journeyDuration}));
}finally{await fs.unlink(temp);}
