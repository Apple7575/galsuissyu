import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import type {Map as CityMap} from 'maplibre-gl';
import {pilotMapModels} from './pilot-data';
import type {Coordinate} from './city-data';

export type PilotLoadState={ready:number;loading:number;failed:number;visible?:number};
type Options={map:CityMap;scene:THREE.Scene;local:(c:Coordinate)=>THREE.Vector3;selected:()=>string;
 onState:(state:PilotLoadState)=>void;onChange:()=>void;extraExcluded?:()=>number[]};

/** Low-detail landmarks load at district scale; detail replaces them only when ready. */
export function createPilotModels({map,scene,local,selected,onState,onChange,extraExcluded}:Options){
 const loaded=new Map<string,THREE.Group>(),pending=new Set<string>(),failed=new Set<string>();
 let footprints:Map<string,{coordinate:Coordinate;dimensions:[number,number,number];angle:number}>|null=null;
 const controllers=new Set<AbortController>();let disposed=false,lastState='',lastExcluded='';
 const footprintAbort=new AbortController();controllers.add(footprintAbort);
 fetch('/data/landmark-footprints.json',{signal:footprintAbort.signal}).then(r=>{if(!r.ok)throw Error(String(r.status));return r.json();}).then(rows=>{if(!disposed){footprints=new Map(rows.map(p=>[p.asset,p]));refresh();onChange();}}).catch(e=>{if(!disposed)console.warn('[landmark-footprints]',e);});
 function emit(){const s={ready:loaded.size,loading:pending.size,failed:failed.size,visible:[...loaded.values()].filter(o=>o.visible).length},key=JSON.stringify(s);if(key!==lastState){lastState=key;onState(s);}}
 function filterBuildings(){
  if(!map.getLayer('city-buildings'))return;
  const excluded=[469022520,...(extraExcluded?.()??[]),...pilotMapModels.filter(m=>isVisible(m.asset)).map(m=>m.buildingId)];
  const key=excluded.join(',');if(key===lastExcluded)return;lastExcluded=key;
  map.setFilter('city-buildings',['all',...excluded.map(id=>['!=',['id'],id])] as never);
 }
 function isVisible(id:string){return !!(loaded.get(id)?.visible||loaded.get(id+'-low')?.visible);}
 async function load(spec:typeof pilotMapModels[number],low=false){
  const key=spec.asset+(low?'-low':'');
  pending.add(key);emit();const controller=new AbortController();controllers.add(controller);
  try{
   const response=await fetch('/models/pilot/'+key+'.glb',{signal:controller.signal});if(!response.ok)throw Error('HTTP '+response.status);
   const bytes=await response.arrayBuffer();if(disposed)return;
   const gltf=await new GLTFLoader().parseAsync(bytes,'');
   if(disposed){disposeModel(gltf.scene);return;}
   const object=new THREE.Group(),upright=new THREE.Group();object.name='pilot-map-'+key;object.userData.poiId=spec.poiId;
   gltf.scene.updateMatrixWorld(true);
   const bounds=new THREE.Box3().setFromObject(gltf.scene),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
   const footprint=footprints!.get(spec.asset)!;
   const offset=new THREE.Group();offset.position.set(-center.x,-bounds.min.y,-center.z);offset.add(gltf.scene);
   const fit=new THREE.Group();fit.scale.set(footprint.dimensions[0]/size.x,footprint.dimensions[1]/size.y,footprint.dimensions[2]/size.z);fit.add(offset);
   upright.rotation.x=Math.PI/2;upright.add(fit);object.add(upright);object.rotation.z=footprint.angle;
   gltf.scene.traverse(o=>{if((o as THREE.Mesh).isMesh){const m=o as THREE.Mesh;m.frustumCulled=false;const mats=Array.isArray(m.material)?m.material:[m.material];for(const mat of mats){mat.userData.baseEmissive=(mat as THREE.MeshStandardMaterial).emissive?.clone();}}});
   object.visible=false;loaded.set(key,object);scene.add(object);refresh();onChange();
  }catch(e){if(!disposed&&!(e instanceof DOMException&&e.name==='AbortError')){failed.add(key);console.warn('[pilot-model]',spec.asset,e);}}
  finally{pending.delete(key);controllers.delete(controller);if(!disposed)emit();}
 }
 function updateSelection(){for(const [key,root] of loaded){const spec=pilotMapModels.find(s=>key===s.asset||key===s.asset+'-low')!;if(!root)continue;const active=selected()===spec.poiId;if(root.userData.active===active)continue;root.userData.active=active;root.traverse(o=>{const m=o as THREE.Mesh;if(!m.isMesh)return;for(const mat of Array.isArray(m.material)?m.material:[m.material]){const p=mat as THREE.MeshStandardMaterial;if(p.emissive){p.emissive.copy(active?new THREE.Color('#286c53'):p.userData.baseEmissive??new THREE.Color(0));p.emissiveIntensity=active?.18:1;}}});}}
 function refresh(){
  if(disposed||!footprints)return;const close=map.getZoom()>=12.5&&map.getPitch()>=10,bounds=map.getBounds();
  let visibilityChanged=false;
  for(const spec of pilotMapModels){const footprint=footprints.get(spec.asset);if(!footprint)continue;const visible=close&&bounds.contains(footprint.coordinate),lowKey=spec.asset+'-low';
   const detail=loaded.get(spec.asset),simple=loaded.get(lowKey),wantDetail=map.getZoom()>=16.4;
   if(visible&&!simple&&!pending.has(lowKey)&&!failed.has(lowKey))void load(spec,true);
   if(visible&&wantDetail&&!detail&&!pending.has(spec.asset)&&!failed.has(spec.asset))void load(spec);
   const active=visible?((wantDetail?detail:simple)||simple||detail):undefined;
   for(const root of [simple,detail])if(root){const show=root===active;if(root.visible!==show)visibilityChanged=true;root.visible=show;root.position.copy(local(footprint.coordinate));root.position.z+=.25;}
  }
  // Also restore the fallback footprint when zooming out or entering 2D.
  filterBuildings();updateSelection();emit();map.triggerRepaint();
 }
 function pick(point:{x:number;y:number},camera:THREE.Camera):string|undefined{
  const x=point.x/map.getCanvas().clientWidth*2-1,y=1-point.y/map.getCanvas().clientHeight*2;
  const inverse=camera.projectionMatrix.clone().invert();
  const near=new THREE.Vector3(x,y,-1).applyMatrix4(inverse),far=new THREE.Vector3(x,y,1).applyMatrix4(inverse);
  const ray=new THREE.Raycaster(near,far.sub(near).normalize());
  for(const hit of ray.intersectObjects([...loaded.values()].filter(o=>o.visible),true)){
   let o:THREE.Object3D|null=hit.object;while(o){if(o.userData.poiId)return o.userData.poiId;o=o.parent;}
  }
 }
 return {refresh,updateSelection,pick,hasBuilding:(id:unknown)=>pilotMapModels.some(s=>s.buildingId===id&&isVisible(s.asset)),
  dispose(){disposed=true;controllers.forEach(c=>c.abort());loaded.forEach(g=>{scene.remove(g);disposeModel(g);});loaded.clear();}};
}
export function disposeModel(root:THREE.Object3D){const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();root.traverse(o=>{const m=o as THREE.Mesh;if(m.isMesh){geometries.add(m.geometry);(Array.isArray(m.material)?m.material:[m.material]).forEach(t=>materials.add(t));}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}
