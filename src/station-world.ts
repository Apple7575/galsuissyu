import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export const stationPath=[[-20,0,-4],[-20,0,18],[18,0,18],[18,0,32],[18,0,51],[46,0,51]] as const;
export const stationStops=[
 {title:'대전역 앞',note:'유리 전면과 넓은 처마를 살펴보세요.',point:[-20,3,-14]},
 {title:'광장 보행 구간',note:'꽃시계와 보행 공간을 돌아 이동해요.',point:[0,1,18]},
 {title:'횡단 대기',note:'신호 대기를 표현한 시연이에요. 실시간 신호가 아니에요.',point:[18,1,32]},
 {title:'횡단 구간',note:'횡단보도와 낮아진 턱을 표현했어요. 실제 위치·치수는 미확인이에요.',point:[18,1,42]},
 {title:'정류장 도착',note:'승하차 공간과 쉼터를 살펴보세요. 실제 정류장 위치는 미확인이에요.',point:[46,2,51]},
];
/** Illustrative forecourt scene. Not navigation geometry or surveyed facilities. Y-up. */
export function createStationWorld(){
 const root=new T.Group(),detail=new T.Group(),coarse=new T.Group(),foliage=new T.Group();root.add(detail,coarse,foliage);
 const materials=new Map<string,T.MeshStandardMaterial>();
 const material=(color:string,metalness=0)=>{const key=color+metalness;if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({color,metalness,roughness:metalness?.32:.8}));return materials.get(key)!;};
 const stone=material('#edece5'),white=material('#fffdf7'),pave=material('#d8dfdc'),dark=material('#34454d'),wood=material('#ab7851'),green=material('#729751'),glass=material('#8ec4ce',.18),yellow=material('#ebc755');
 function mesh(g:T.BufferGeometry,m:T.Material,x:number,y:number,z:number,parent:T.Group=detail){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
 function box(x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material=stone,parent:T.Group=detail){return mesh(new T.BoxGeometry(w,h,d),m,x,y,z,parent);}
 function cylinder(x:number,y:number,z:number,r:number,h:number,m:T.Material,parent:T.Group=detail){return mesh(new T.CylinderGeometry(r,r,h,16),m,x,y,z,parent);}
 function line(a:T.Vector3,b:T.Vector3,r:number,m:T.Material,parent:T.Group=detail){const d=b.clone().sub(a),o=mesh(new T.CylinderGeometry(r,r,d.length(),8),m,0,0,0,parent);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());}
 function tree(x:number,z:number,h:number){
  cylinder(x,h*.32,z,.2,h*.64,wood);
  for(const [dx,dz,dy,r] of [[0,0,.72,.25],[-.18,.03,.62,.22],[.18,-.05,.6,.2],[.02,.16,.62,.2]]){
   const o=mesh(new T.IcosahedronGeometry(h*r,2),material(dx?'#80a854':'#9abd67'),x+dx*h,h*dy,z+dz*h,foliage);o.scale.y=1.15;
  }
  const o=mesh(new T.IcosahedronGeometry(h*.29,1),green,x,h*.66,z,coarse);o.scale.y=1.2;
 }
 // Ground and curb volumes. The crossing gap is intentionally step-free in this demo only.
 box(0,-.5,4,160,1,148,pave);box(0,-.035,42,160,.12,14,material('#798990'));
 for(const z of [34.4,49.6])for(const [x,w] of [[-32,92],[55,42]])box(x,.12,z,w,.24,.7,white);
 for(let x=-76;x<80;x+=8)box(x,.035,42,3,.03,.16,yellow);
 for(let z=36;z<49;z+=1.5)box(18,.05,z,6,.03,.7,white);
 for(const z of [32,51]){box(18,.025,z,6,.04,3,pave);box(18,.06,z,5,.025,.65,yellow);}
 // Paving joints remain fixed to the world.
 for(let x=-76;x<=76;x+=4)box(x,.015,10,.022,.018,47,material('#bcc8c3'));
 for(let z=-12;z<=32;z+=4)box(0,.018,z,154,.018,.022,material('#bcc8c3'));
 // Flower-clock mound, a visible characteristic of the west forecourt.
 // Twin railway-office towers visible behind the station in the 2019 reference.
 // Their dimensions and relative offsets are illustrative, not map placement.
 for(const [x,h] of [[-24,42],[17,38]]){
  box(x,h/2,-55,13,h,10,material('#7eabb9',.3));
  for(let y=2;y<h;y+=1.7)box(x,y,-49.94,13.2,.16,.16,white);
  for(let dx=-5.5;dx<=5.5;dx+=1.8)box(x+dx,h/2,-49.88,.11,h,.13,material('#b6ccd3',.3));
  box(x,h+.3,-55,13.6,.6,10.6,stone);cylinder(x-5,h+2,-55,.12,4,dark);
 }
 for(const [x,z] of [[-45,1],[36,1],[-58,25],[55,25]]){
  box(x,.3,z,10,.6,4,stone);box(x,.65,z,9.4,.3,3.4,green);
  for(let dx=-4;dx<=4;dx+=2)mesh(new T.IcosahedronGeometry(.8,1),material('#84a958'),x+dx,1.2,z);
 }
 cylinder(0,.38,5,8,.75,stone);cylinder(0,.8,5,7.6,.25,green);
 const dial=new T.Mesh(new T.TorusGeometry(5.9,.17,6,64),white);dial.rotation.x=-Math.PI/2;dial.position.set(0,1.01,5);detail.add(dial);
 for(let i=0;i<12;i++){const a=i*Math.PI/6;const m=box(Math.sin(a)*5.2,1.05,5+Math.cos(a)*5.2,.22,.1,.75,white);m.rotation.y=a;}
 line(new T.Vector3(0,1.1,5),new T.Vector3(3.3,1.1,2.8),.11,dark);line(new T.Vector3(0,1.13,5),new T.Vector3(-1.6,1.13,2.2),.16,dark);
 for(let i=0;i<72;i++){const a=i*Math.PI/36;mesh(new T.IcosahedronGeometry(.32,0),material(i%3?'#e3a765':'#efcfda'),Math.sin(a)*7,1,5+Math.cos(a)*7);}
 for(const [x,z,h] of [[-48,5,8],[-45,24,9],[43,5,8],[57,22,9],[-67,22,8],[-63,-6,10],[66,-4,9],[63,59,8],[-38,60,8],[-8,61,8]])tree(x,z,h);
 function bench(x:number,z:number){
  for(let i=0;i<5;i++)box(x,.75,z+(i-2)*.17,3,.13,.13,wood);
  for(const dx of [-1,1]){box(x+dx,.35,z,.12,.7,.6,dark);box(x+dx,1.1,z-.4,.1,.75,.1,dark);}
  for(const y of [1.05,1.3])box(x,y,z-.4,3,.15,.1,wood);
 }
 for(const [x,z] of [[-38,12],[34,12],[-7,27],[4,27]])bench(x,z);
 // Small furniture deliberately outside the demonstrated walking corridor.
 for(const [x,z] of [[-36,25],[42,25],[-58,1],[65,24],[-13,53]]){
  cylinder(x,3,z,.08,6,dark);line(new T.Vector3(x,6,z),new T.Vector3(x+1,6,z),.06,dark);box(x+1,5.94,z,.9,.12,.5,white);
 }
 for(const x of [-30,-24,-12,-6,0,6,30,36,42,54]){cylinder(x,.48,32,.1,.96,dark);cylinder(x,.76,32,.11,.08,yellow);}
 // Bus shelter shown as an illustrative arrival node, not a real facility record.
 for(const x of [41,51])box(x,1.7,57,.15,3.4,.15,dark);
 box(46,3.45,56,12,.25,4,white);box(46,1.6,57.1,10,.05+3.1,.08,glass);bench(46,56);
 box(38,1.5,53,.12,3,.12,dark);box(38,3,53,1.3,.9,.18,material('#317e69'));
 // Demonstration pedestrian signals; their state is controlled by the journey.
 const signals:T.Mesh[]=[];
 for(const [x,z] of [[23,32],[13,51]]){
  cylinder(x,1.6,z,.07,3.2,dark);box(x,3.2,z,.5,1,.35,dark);
  const lamp=mesh(new T.SphereGeometry(.16,10,8),new T.MeshStandardMaterial({color:'#d9754f',emissive:'#a84928',emissiveIntensity:.35}),x,3.34,z+.2);signals.push(lamp);
 }
 const bus=new T.Group();bus.position.set(-30,.1,44.8);
 box(0,1.45,0,9,2.7,2.4,material('#387ac2'),bus);box(0,2.85,0,8.6,.15,2.3,white,bus);
 for(let x=-3.6;x<=3.6;x+=1.5)for(const z of [-1.21,1.21])box(x,1.95,z,1.25,1.05,.03,glass,bus);
 box(4.52,1.95,0,.04,1.05,2,glass,bus);
 for(const x of [-2.8,2.8])for(const z of [-1.12,1.12]){const w=mesh(new T.CylinderGeometry(.47,.47,.2,16),dark,x,.5,z,bus);w.rotation.x=Math.PI/2;}
 root.add(bus);
 // Merge static surfaces by material: dozens of details, bounded rendering work.
 function compact(group:T.Group){
  group.updateMatrixWorld(true);const buckets=new Map<T.Material,T.BufferGeometry[]>();
  group.traverse(o=>{if((o as T.Mesh).isMesh){const m=o as T.Mesh,mat=m.material as T.Material;let g=m.geometry.clone().applyMatrix4(m.matrixWorld);if(g.index)g=g.toNonIndexed();if(!buckets.has(mat))buckets.set(mat,[]);buckets.get(mat)!.push(g);}});
  group.clear();for(const [mat,parts] of buckets){const m=new T.Mesh(mergeGeometries(parts),mat);m.castShadow=true;m.receiveShadow=true;group.add(m);parts.forEach(g=>g.dispose());}
 }
 // Signals remain separate for color changes. Bus remains separate for motion.
 signals.forEach(s=>root.attach(s));compact(detail);compact(coarse);compact(foliage);coarse.visible=false;
 return {root,detail,coarse,foliage,bus,signals};
}
