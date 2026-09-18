// Loads the actual GLBs and exercises the map model controller without a browser.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const manifest=JSON.parse(await fs.readFile('public/models/pilot/manifest.json','utf8'));
const allBytes=new Map();let triangles=0;
allBytes.set('/data/landmark-footprints.json',await fs.readFile('public/data/landmark-footprints.json'));
for(const asset of manifest.assets){
 const bytes=await fs.readFile('public'+asset.url);allBytes.set(asset.url,bytes);
 assert.equal(bytes.length,asset.bytes,asset.id+' size');
 const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
 assert(!json.images?.length,'Asset must not require external images');
 assert(json.buffers.every(b=>!b.uri),'Asset must be self-contained');
 const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const box=new THREE.Box3().setFromObject(gltf.scene),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
 assert(Math.abs(box.min.y)<.001&&Math.abs(center.x)<.001&&Math.abs(center.z)<.001,asset.id+' ground-centred origin');
 size.toArray().forEach((n,i)=>assert(Math.abs(n-asset.dimensions[i])<.002,asset.id+' dimension '+i));
 let meshes=0,count=0;
 gltf.scene.traverse(o=>{if(!o.isMesh)return;meshes++;const p=o.geometry.attributes.position;assert(p.array.every(Number.isFinite),asset.id+' finite positions');const indices=o.geometry.index;if(indices){assert(indices.array.every(v=>v>=0&&v<p.count),asset.id+' index bounds');count+=indices.count/3;}else count+=p.count/3;});
 assert.equal(meshes,asset.meshes);assert.equal(count,asset.triangles);triangles+=count;
}
assert.equal(manifest.assets.length,19);
for(const id of ['station','bakery']){const bytes=await fs.readFile('public/models/pilot/'+id+'-low.glb');allBytes.set('/models/pilot/'+id+'-low.glb',bytes);assert(bytes.length<allBytes.get('/models/pilot/'+id+'.glb').length*.3,'LOD is materially smaller');}

const runtime=path.resolve('scripts/.pilot-test-runtime-'+process.pid+'.mjs');
const previousFetch=globalThis.fetch;
let controller;
try{
 await build({entryPoints:['src/pilot-models.ts'],outfile:runtime,bundle:true,platform:'node',format:'esm',packages:'external',logLevel:'silent'});
 const {createPilotModels}=await import(pathToFileURL(runtime).href);
 const requests=[];let zoom=11,pitch=52,west=false,origin=[127.43,36.33],state,selection='';
 const filters=[];const scene=new THREE.Scene();
 const map={getZoom:()=>zoom,getPitch:()=>pitch,getBounds:()=>({contains:c=>west?c[0]<127.43:c[0]>127.43}),getLayer:()=>true,setFilter:(_id,f)=>filters.push(f),triggerRepaint(){},getCanvas:()=>({clientWidth:800,clientHeight:600})};
 const local=c=>new THREE.Vector3((c[0]-origin[0])*90000,(c[1]-origin[1])*111000,0);
 globalThis.fetch=async url=>{requests.push(url);return new Response(allBytes.get(url),{status:200});};
 controller=createPilotModels({map,scene,local,selected:()=>selection,onState:s=>state=s,onChange(){}});
 async function settled(predicate){for(let i=0;i<100;i++){if(predicate())return;await new Promise(r=>setTimeout(r,10));}assert.fail('Model controller did not settle');}
 await settled(()=>requests.length===1);await new Promise(r=>setTimeout(r,20));controller.refresh();assert.equal(requests.length,1,'Overview loads only footprint metadata');
 zoom=14;controller.refresh();controller.refresh();await settled(()=>state.ready===1&&state.loading===0);
 assert.deepEqual(requests,['/data/landmark-footprints.json','/models/pilot/station-low.glb'],'District view requests only low-detail model');
 assert(scene.getObjectByName('pilot-map-station-low')?.visible);
 zoom=17;controller.refresh();assert(scene.getObjectByName('pilot-map-station-low')?.visible,'Keep low LOD while detail loads');await settled(()=>state.ready===2&&state.loading===0);
 assert(!scene.getObjectByName('pilot-map-station-low').visible);
 assert(controller.hasBuilding(254986473),'Loaded model hides its fallback building');
 const station=scene.getObjectByName('pilot-map-station');assert(station?.visible);
 const before=station.position.clone();origin=[127.431,36.331];controller.refresh();
 assert(Math.abs((before.x-station.position.x)-90)<.001&&Math.abs((before.y-station.position.y)-111)<.001,'Model follows geographic origin rebasing');
 scene.updateMatrixWorld(true);
 const target=new THREE.Box3().setFromObject(station).getCenter(new THREE.Vector3());
 const perspective=new THREE.PerspectiveCamera(50,800/600,.1,2000);perspective.up.set(0,0,1);perspective.position.copy(target).add(new THREE.Vector3(0,-140,160));perspective.lookAt(target);perspective.updateMatrixWorld(true);
 const customCamera=new THREE.Camera();customCamera.projectionMatrix.copy(perspective.projectionMatrix).multiply(perspective.matrixWorldInverse);
 assert.equal(controller.pick({x:400,y:300},customCamera),'node/355173691','3D geometry resolves to the actual station POI');
 selection='node/355173691';controller.updateSelection();assert.equal(station.userData.active,true);
 zoom=11;controller.refresh();assert(!station.visible);assert(!controller.hasBuilding(254986473),'Overview restores original footprint');
 zoom=17;pitch=0;controller.refresh();assert.equal(requests.length,3,'2D does not request extra models');
 pitch=52;west=true;controller.refresh();await settled(()=>state.ready===4&&state.loading===0);assert.equal(requests.length,5);
 west=false;controller.refresh();assert.equal(requests.length,5,'Returning to a loaded place reuses its geometry');
 controller.dispose();assert.equal(scene.children.length,0);
 // A failed optional asset must never remove the base map footprint.
 globalThis.fetch=async url=>url==='/data/landmark-footprints.json'?new Response(allBytes.get(url)):new Response('',{status:503});const failedScene=new THREE.Scene();
 controller=createPilotModels({map,scene:failedScene,local,selected:()=>'',onState:s=>state=s,onChange(){}});
 const warn=console.warn;console.warn=()=>{};
 try{controller.refresh();await settled(()=>state.failed>=1&&state.loading===0);}finally{console.warn=warn;}
 assert(!controller.hasBuilding(254986473));assert.equal(failedScene.children.length,0);
 console.log(JSON.stringify({assets:manifest.assets.length,triangles,geometry:'passed',groundOrigins:'passed',onDemandLoading:'passed',coordinateRebasing:'passed',modelPicking:'passed',cacheReuse:'passed',failureFallback:'passed'}));
}finally{controller?.dispose();globalThis.fetch=previousFetch;await fs.rm(runtime,{force:true});}
