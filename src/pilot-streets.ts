import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import type {Map as CityMap} from 'maplibre-gl';
import {type Coordinate} from './city-data';
import {disposeModel} from './pilot-models';
import {loadScenery} from './static-scenery';
import {horizontalDistance} from './terrain-placement';

// Roads follow the current OSM geometry. Width, planting and vehicles are visual
// reconstruction only: no invented facility/crossing/accessibility records.
export function pilotStreets(map:CityMap,scene:THREE.Scene,local:(c:Coordinate)=>THREE.Vector3,onChange:()=>void){
 const root=new THREE.Group();root.name='pilot-street-reconstruction';scene.add(root);
 const templates=new Map<string,THREE.Group>();let disposed=false,started=false;
 let scenery:Awaited<ReturnType<typeof loadScenery>>|undefined;
 const abort=new AbortController();let bus:THREE.Object3D|undefined,line:THREE.Vector3[]=[],lengths:number[]=[],elapsed=0,last=0;
 const ground=new THREE.MeshStandardMaterial({color:'#a5b1b9',roughness:.95});
 const curb=new THREE.MeshStandardMaterial({color:'#fffdf4',roughness:.9});
 const cube=new THREE.BoxGeometry(1,1,1);
 const active=()=>{const c=map.getCenter();return map.getZoom()>=16&&map.getPitch()>10&&c.lng>127.424&&c.lng<127.436&&c.lat>36.325&&c.lat<36.335;};
 async function load(){if(started)return;started=true;
  loadScenery().then(d=>{if(!disposed){scenery=d;onChange();}}).catch(e=>console.warn('[street-scenery]',e));
  await Promise.all(['tree','lamp','bus'].map(async id=>{try{
   const r=await fetch('/models/pilot/'+id+'.glb'+(id==='tree'?'?v=foliage4':''),{signal:abort.signal});if(!r.ok)throw Error(String(r.status));
   const g=await new GLTFLoader().parseAsync(await r.arrayBuffer(),'');if(disposed){disposeModel(g.scene);return;}
   if(id==='bus')g.scene.traverse(o=>{if(/ramp/i.test(o.name))o.visible=false;});
   const box=new THREE.Box3().setFromObject(g.scene),center=box.getCenter(new THREE.Vector3());
   const offset=new THREE.Group();offset.position.set(-center.x,-box.min.y,-center.z);offset.add(g.scene);
   const upright=new THREE.Group();upright.rotation.x=Math.PI/2;upright.add(offset);
   const model=new THREE.Group();model.add(upright);model.traverse(o=>{if((o as THREE.Mesh).isMesh)o.frustumCulled=false;});templates.set(id,model);onChange();
  }catch(e){if(!disposed)console.warn('[pilot-streets]',id,e);}}));
 }
 function refresh(){
  root.visible=active();root.clear();bus=undefined;line=[];lengths=[];if(!root.visible)return;void load();
  if(!map.getLayer('city-roads'))return;
  // MapLibre roads already drape over terrain; avoid flat duplicate road slabs.
  const features=map.getTerrain()?[]:(scenery?.roads??[]);
  const seen=new Set();let segments=0;
  function strip(a:THREE.Vector3,b:THREE.Vector3,width:number,material:THREE.Material,z:number){
   const len=a.distanceTo(b);const m=new THREE.Mesh(cube,material);m.position.copy(a).add(b).multiplyScalar(.5);m.position.z=z;m.rotation.z=Math.atan2(b.y-a.y,b.x-a.x);m.scale.set(len,width,.12);m.frustumCulled=false;root.add(m);
  }
  for(const f of features){
   if(seen.has(f.id)||Number(f.properties.tunnel)||Number(f.properties.bridge))continue;seen.add(f.id);
   const kind=String(f.properties.kind);if(!['primary','secondary','tertiary','residential','living_street','pedestrian','footway'].includes(kind))continue;
   const paths=f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.type==='MultiLineString'?f.geometry.coordinates:[];
   const width=['primary','secondary'].includes(kind)?12:kind==='tertiary'?9:['footway','pedestrian'].includes(kind)?3:5;
   for(const coords of paths){const points=coords.map(c=>local(c as Coordinate));let dist=0;
    for(let i=1;i<points.length&&segments<160;i++){
     const a=points[i-1],b=points[i],len=a.distanceTo(b);if(horizontalDistance(a)>280||horizontalDistance(b)>280||len<2)continue;segments++;dist+=len;
     strip(a,b,width+1.2,curb,.08);strip(a,b,width,ground,.17);
    }

   }
  }
  for(const item of scenery?.props??[]){const p=local(item.coordinate);if(horizontalDistance(p)>280)continue;const template=templates.get(item.kind);if(template){const o=template.clone(true);o.name=item.id;o.position.copy(p);o.position.z+=.2;root.add(o);}}
  line=(scenery?.busRoute??[]).map(local);
  const template=templates.get('bus');if(template&&line.length>1){bus=template.clone(true);root.add(bus);lengths=[0];for(let i=1;i<line.length;i++)lengths.push(lengths[i-1]+line[i].distanceTo(line[i-1]));}
  map.triggerRepaint();
 }
 function animate(){const now=performance.now();const dt=Math.min(.1,(now-last)/1000);last=now;
  if(!root.visible||!bus||!lengths.length)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!reduced&&!document.hidden)elapsed+=dt;
  const total=lengths.at(-1)!;const t=(elapsed*5)%(total*2),reverse=t>total,d=reverse?2*total-t:t;
  let i=1;while(i<lengths.length-1&&lengths[i]<d)i++;
  const a=line[i-1],b=line[i],f=(d-lengths[i-1])/(lengths[i]-lengths[i-1]||1);bus.position.copy(a).lerp(b,f);const route=scenery?.busRoute;if(route&&route[i]){const u=route[i-1],v=route[i];bus.position.z=local([u[0]+(v[0]-u[0])*f,u[1]+(v[1]-u[1])*f]).z;}bus.position.z+=.3;
  bus.rotation.z=Math.atan2(b.y-a.y,b.x-a.x)+(reverse?Math.PI:0);
  if(!reduced&&!document.hidden)map.triggerRepaint();
 }
 return {refresh,animate,dispose(){disposed=true;abort.abort();root.clear();scene.remove(root);templates.forEach(disposeModel);cube.dispose();ground.dispose();curb.dispose();}};
}
