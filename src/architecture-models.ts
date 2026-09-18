import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {Map as CityMap} from 'maplibre-gl';
import type {Coordinate} from './city-data';
import {disposeModel} from './pilot-models';
type Placement={buildingId:number;asset:string;coordinate:Coordinate;dimensions:[number,number,number];angle:number};
/** Decorative architecture follows fixed snapshot footprints; never accessibility evidence. */
export function architectureModels(map:CityMap,scene:THREE.Scene,local:(c:number[])=>THREE.Vector3,onChange:()=>void){
 let placements:Placement[]=[],disposed=false;
 const root=new THREE.Group();root.name='architecture-modules';scene.add(root);
 const templates=new Map<string,{geometry:THREE.BufferGeometry;material:THREE.Material}[]>(),pending=new Set<string>(),failed=new Set<string>();
 const abort=new AbortController();let ids:number[]=[];
 fetch('/data/architecture-placements.json',{signal:abort.signal}).then(r=>{if(!r.ok)throw Error(String(r.status));return r.json();}).then(d=>{if(!disposed){placements=d.placements;onChange();}}).catch(e=>{if(!disposed)console.warn('[architecture-placements]',e);});
 async function load(id:string){pending.add(id);try{
  const r=await fetch('/models/pilot/'+id+'.glb',{signal:abort.signal});if(!r.ok)throw Error(String(r.status));
  const gltf=await new GLTFLoader().parseAsync(await r.arrayBuffer(),'');if(disposed){disposeModel(gltf.scene);return;}
  gltf.scene.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(gltf.scene),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
  // Unit footprint with Z-up: geometry reused in GPU instances rather than hundreds of nodes per building.
  const normalize=new THREE.Matrix4().makeRotationX(Math.PI/2).multiply(new THREE.Matrix4().makeScale(1/size.x,1/size.y,1/size.z)).multiply(new THREE.Matrix4().makeTranslation(-center.x,-bounds.min.y,-center.z));
  const buckets=new Map<THREE.Material,THREE.BufferGeometry[]>();
  gltf.scene.traverse(o=>{const m=o as THREE.Mesh;if(!m.isMesh)return;const material=Array.isArray(m.material)?m.material[0]:m.material;const g=m.geometry.clone().applyMatrix4(m.matrixWorld).applyMatrix4(normalize);const list=buckets.get(material)||[];list.push(g);buckets.set(material,list);});
  const parts=[...buckets].map(([material,list])=>{const geometry=mergeGeometries(list,false)!;list.forEach(g=>g.dispose());return {geometry,material:material.clone()};});
  disposeModel(gltf.scene);templates.set(id,parts);onChange();
 }catch(e){if(!disposed){failed.add(id);console.warn('[architecture-model]',id,e);}}finally{pending.delete(id);}}
 function refresh(){root.children.forEach(o=>{if((o as THREE.InstancedMesh).isInstancedMesh)(o as THREE.InstancedMesh).dispose();});root.clear();ids=[];
  if(disposed||map.getZoom()<14.8||map.getPitch()<10)return;
  const bounds=map.getBounds(),visible=placements.filter(p=>bounds.contains(p.coordinate));
  for(const id of new Set(visible.map(p=>p.asset))){const parts=templates.get(id);if(!parts){if(!pending.has(id)&&!failed.has(id))void load(id);continue;}
   const group=visible.filter(p=>p.asset===id);ids.push(...group.map(p=>p.buildingId));
   for(const part of parts){const mesh=new THREE.InstancedMesh(part.geometry,part.material,group.length);mesh.frustumCulled=false;mesh.name=id;
    group.forEach((p,i)=>{const pos=local(p.coordinate);pos.z+=.02;const matrix=new THREE.Matrix4().compose(pos,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),p.angle),new THREE.Vector3(p.dimensions[0],p.dimensions[2],p.dimensions[1]));mesh.setMatrixAt(i,matrix);});mesh.instanceMatrix.needsUpdate=true;root.add(mesh);
   }
  }
 }
 return {refresh,excluded:()=>ids,hasBuilding:(id:unknown)=>ids.includes(Number(id)),dispose(){disposed=true;abort.abort();root.children.forEach(o=>{if((o as THREE.InstancedMesh).isInstancedMesh)(o as THREE.InstancedMesh).dispose();});scene.remove(root);templates.forEach(parts=>parts.forEach(p=>{p.geometry.dispose();p.material.dispose();}));}};
}
