import * as THREE from 'three';
import type {Map as CityMap} from 'maplibre-gl';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {disposeModel} from './pilot-models';
type Bridge={id:number;geometry:{coordinates:number[][]};properties:{width:number;name:string}};
/** Source-backed alignment; deck elevation interpolates terrain at the two banks.
 * This is display geometry, never surveyed bridge clearance or accessible slope. */
export function bridgeModels(map:CityMap,scene:THREE.Scene,local:(c:number[])=>THREE.Vector3,onChange:()=>void){
 const root=new THREE.Group();root.name='mapped-bridges';scene.add(root);
 const deck=new THREE.MeshStandardMaterial({color:'#b9c3c7',roughness:.8}),rail=new THREE.MeshStandardMaterial({color:'#eef2f2',roughness:.45});
 const unit=new THREE.BoxGeometry(1,1,1);let bridges:Bridge[]=[],disposed=false;
 const abort=new AbortController();
 const expoRoot=new THREE.Group();scene.add(expoRoot);let expo:THREE.Group|undefined,expoLoading=false;
 async function loadExpo(){if(expoLoading||expo||disposed)return;expoLoading=true;try{const r=await fetch('/models/tourism/expo-bridge.glb',{signal:abort.signal});if(!r.ok)throw Error(String(r.status));const g=await new GLTFLoader().parseAsync(await r.arrayBuffer(),'');if(disposed){disposeModel(g.scene);return;}g.scene.traverse(o=>{if((o as THREE.Mesh).isMesh){o.visible=/^(Bridge_deck|Deck_rail|Suspension_cable|Twin_arch)/.test(o.name);o.frustumCulled=false;}});expo=g.scene;onChange();}catch(e){if(!disposed)console.warn('[expo-bridge]',e);}}
 let spans:{id:number;a:THREE.Vector3;b:THREE.Vector3;width:number}[]=[];
 function heightAt(p:THREE.Vector3,ways:number[]){let best=Infinity,height:number|undefined;for(const s of spans){if(!ways.includes(s.id))continue;const dx=s.b.x-s.a.x,dy=s.b.y-s.a.y,d2=dx*dx+dy*dy;if(!d2)continue;const t=Math.max(0,Math.min(1,((p.x-s.a.x)*dx+(p.y-s.a.y)*dy)/d2));const d=Math.hypot(p.x-s.a.x-dx*t,p.y-s.a.y-dy*t);if(d<=s.width/2+3&&d<best){best=d;height=s.a.z+(s.b.z-s.a.z)*t;}}return height;}
 fetch('/data/bridges.json',{signal:abort.signal}).then(r=>{if(!r.ok)throw Error(String(r.status));return r.json();}).then(d=>{if(!disposed){bridges=d.features;onChange();}}).catch(e=>{if(!disposed)console.warn('[bridges]',e);});
 function clear(){root.children.forEach(o=>(o as THREE.InstancedMesh).dispose());root.clear();}
 function refresh(){clear();expoRoot.clear();spans=[];if(disposed||map.getPitch()<10||map.getZoom()<13)return;
  const decks:THREE.Matrix4[]=[],rails:THREE.Matrix4[]=[],posts:THREE.Matrix4[]=[],bounds=map.getBounds();
  const matrix=(x:number,y:number,z:number,w:number,d:number,h:number,a:number)=>new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),a),new THREE.Vector3(w,d,h));
  for(const bridge of bridges){const coords=bridge.geometry.coordinates;const xs=coords.map(c=>c[0]),ys=coords.map(c=>c[1]);if(Math.max(...xs)<bounds.getWest()||Math.min(...xs)>bounds.getEast()||Math.max(...ys)<bounds.getSouth()||Math.min(...ys)>bounds.getNorth())continue;
   const points=coords.map(local),distances=[0];for(let i=1;i<points.length;i++)distances.push(distances[i-1]+Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y));const total=distances.at(-1)||1,z0=points[0].z,z1=points.at(-1)!.z;
   points.forEach((p,i)=>p.z=z0+(z1-z0)*distances[i]/total+.2);
   const isExpo=bridge.id===28889891;if(isExpo){void loadExpo();if(expo){const a=points[0],b=points.at(-1)!,offset=new THREE.Group(),upright=new THREE.Group(),fit=new THREE.Group();offset.position.y=-2.8;offset.add(expo);fit.scale.set(a.distanceTo(b)/32,2,12/7);fit.add(offset);upright.rotation.x=Math.PI/2;upright.add(fit);const placed=new THREE.Group();placed.position.copy(a).add(b).multiplyScalar(.5);placed.quaternion.setFromUnitVectors(new THREE.Vector3(1,0,0),b.clone().sub(a).normalize());placed.add(upright);expoRoot.add(placed);}}
   for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],len=a.distanceTo(b);if(len<.1)continue;const angle=Math.atan2(b.y-a.y,b.x-a.x),x=(a.x+b.x)/2,y=(a.y+b.y)/2,w=bridge.properties.width,z=(a.z+b.z)/2;
    spans.push({id:bridge.id,a,b,width:w});
    if(isExpo&&expo)continue;
    const slope=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1,0,0),b.clone().sub(a).normalize());
    decks.push(new THREE.Matrix4().compose(new THREE.Vector3(x,y,z-.5),slope,new THREE.Vector3(len+.08,w,1)));
    if(map.getZoom()<15)continue;
    for(const side of [-1,1]){const nx=-Math.sin(angle)*side*(w/2-.14),ny=Math.cos(angle)*side*(w/2-.14);rails.push(new THREE.Matrix4().compose(new THREE.Vector3(x+nx,y+ny,z+.95),slope,new THREE.Vector3(len,.12,.18)));
     const n=Math.ceil(len/5);for(let j=0;j<=n;j++){const t=j/n;posts.push(matrix(a.x+(b.x-a.x)*t+nx,a.y+(b.y-a.y)*t+ny,a.z+(b.z-a.z)*t+.45,.14,.14,.95,angle));}
    }
   }
  }
  for(const [matrices,material] of [[decks,deck],[rails,rail],[posts,rail]] as const){if(!matrices.length)continue;const mesh=new THREE.InstancedMesh(unit,material,matrices.length);matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.instanceMatrix.needsUpdate=true;mesh.frustumCulled=false;root.add(mesh);}
 }
 return {refresh,heightAt,dispose(){disposed=true;abort.abort();clear();scene.remove(root,expoRoot);if(expo)disposeModel(expo);unit.dispose();deck.dispose();rail.dispose();}};
}
