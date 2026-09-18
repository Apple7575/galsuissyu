import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

/** Readable simulation models. +Y is forward, +Z is up; never swap a single
 * material for an array on geometry without groups (that makes it disappear). */
export function heroVehicle(mode:'bus'|'subway'){
 const root=new THREE.Group(),wheels:THREE.Group[]=[];
 const make=(color:string,metalness=0,roughness=.4)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
 const paint=make(mode==='bus'?'#247cbd':'#edf3f5',.25),navy=make('#172d3e',.2),glass=make('#244e65',.48,.18),trim=make('#bfced6',.75,.24),rubber=make('#1e2730'),white=make('#f4f8fa',.15),green=make('#159777',.2);
 const lamp=new THREE.MeshStandardMaterial({color:'#fff8d7',emissive:'#ffe9a9',emissiveIntensity:.6,roughness:.25});
 const red=new THREE.MeshStandardMaterial({color:'#e75846',emissive:'#d93624',emissiveIntensity:.4});
 const amber=make('#f2b657');
 const geometryCache=new Map<string,THREE.BufferGeometry>();
 function box(name:string,size:[number,number,number],position:[number,number,number],material:THREE.Material,parent:THREE.Object3D=root,radius=.04){
  const key=[...size,radius].join(',');let geometry=geometryCache.get(key);
  if(!geometry){geometry=radius?new RoundedBoxGeometry(...size,2,Math.min(radius,...size.map(x=>x/3))):new THREE.BoxGeometry(...size);geometryCache.set(key,geometry);}
  const mesh=new THREE.Mesh(geometry,material);mesh.name=name;mesh.position.set(...position);mesh.frustumCulled=false;parent.add(mesh);return mesh;
 }
 function wheel(x:number,y:number,z:number,r:number){
  const pivot=new THREE.Group();pivot.position.set(x,y,z);root.add(pivot);wheels.push(pivot);
  const tire=new THREE.Mesh(new THREE.CylinderGeometry(r,r,.24,24),rubber);tire.rotation.z=Math.PI/2;pivot.add(tire);
  const hub=new THREE.Mesh(new THREE.CylinderGeometry(r*.56,r*.56,.26,20),trim);hub.rotation.z=Math.PI/2;pivot.add(hub);
  for(let i=0;i<6;i++){const a=i*Math.PI/3;box('wheel bolt',[.28,.035,.035],[0,Math.cos(a)*r*.34,Math.sin(a)*r*.34],navy,pivot,.008);}
 }
 if(mode==='bus'){
  root.name='simulation-bus';
  box('opaque bus body',[2.65,11.6,2.75],[0,0,1.95],paint,root,.16);
  box('chassis',[2.42,11.2,.35],[0,0,.64],navy);
  box('white roof',[2.64,11.5,.18],[0,0,3.39],white,root,.07);
  box('roof air conditioning',[1.65,2.9,.30],[0,-1.1,3.58],trim,root,.09);
  for(let i=0;i<8;i++)box('roof vent',[1.35,.06,.025],[0,-2.15+i*.28,3.74],navy);
  box('front windshield',[2.3,.08,1.24],[0,5.82,2.41],glass,root,.09);
  box('rear window',[2.22,.08,1.02],[0,-5.82,2.52],glass,root,.08);
  box('front destination display',[1.98,.10,.29],[0,5.85,3.18],navy);
  for(let i=0;i<9;i++)box('display pixels',[.09,.035,.07],[-.68+i*.17,5.915,3.18],amber,root,.005);
  box('bumper',[2.59,.19,.27],[0,5.82,.76],navy);
  box('rear bumper',[2.59,.16,.27],[0,-5.82,.76],navy);
  box('front grille',[1.24,.06,.28],[0,5.835,1.24],navy);
  for(let i=0;i<5;i++)box('grille trim',[1.12,.03,.015],[0,5.88,1.13+i*.055],trim,root,.004);
  for(const side of [-1,1]){
   box('side white belt',[.045,11.35,.14],[side*1.338,0,1.57],white);
   for(const y of [-4.45,-2.82,-1.18,.46,2.1,3.74]){
    box('window surround',[.065,1.5,1.15],[side*1.34,y,2.50],navy);
    box('opaque reflective window',[.025,1.36,1.01],[side*1.38,y,2.51],glass);
    box('window reflection',[.015,.88,.045],[side*1.395,y,2.85],trim);
   }
   wheel(side*1.32,3.5,.56,.54);wheel(side*1.32,-3.55,.56,.54);
   box('headlight',[.56,.11,.19],[side*.87,5.87,1.18],lamp);
   box('rear brake light',[.2,.09,.62],[side*1.07,-5.87,1.33],red);
   box('mirror arm',[.41,.075,.075],[side*1.45,4.97,2.87],navy);
   box('mirror housing',[.19,.36,.54],[side*1.69,4.97,2.66],navy,root,.07);
   box('mirror glass',[.025,.27,.40],[side*1.795,4.97,2.66],trim);
   for(const y of [-4.9,0,4.8])box('side indicator',[.04,.19,.09],[side*1.355,y,1.1],amber);
  }
  for(const y of [4.48,.05]){
   box('passenger door frame',[.085,1.3,2.35],[1.39,y,1.91],navy);
   for(const d of [-.32,.32]){box('door panel',[.035,.60,2.18],[1.445,y+d,1.91],glass);box('door handle',[.05,.045,.28],[1.48,y+d*.25,1.77],trim);}
   box('entry threshold',[.14,1.32,.07],[1.42,y,.72],amber);
  }
 }else{
  root.name='simulation-metro';
  // Two connected cars with opaque shells and individual doors/windows.
  for(const center of [-5.8,5.8]){
   box('opaque train carriage',[2.95,11.2,3.10],[0,center,2.10],paint,root,.19);
   box('carriage roof',[2.90,11.1,.22],[0,center,3.72],trim,root,.09);
   box('underframe',[2.60,10.5,.40],[0,center,.49],navy);
   for(const y of [-3.7,3.7]){box('bogie',[2.4,1.8,.43],[0,center+y,.49],navy);for(const dx of [-.53,.53])for(const side of [-1,1])wheel(side*1.39,center+y+dx,.39,.34);}
   for(const side of [-1,1]){
    box('line identity stripe',[.04,11.1,.28],[side*1.487,center,1.35],green);
    for(const y of [-4.25,-1.45,1.45,4.25]){box('window gasket',[.065,1.92,1.20],[side*1.49,center+y,2.61],navy);box('carriage window',[.025,1.77,1.04],[side*1.53,center+y,2.62],glass);}
    for(const y of [-2.82,0,2.82]){
     box('door surround',[.07,1.05,2.43],[side*1.50,center+y,2.02],trim);
     for(const delta of [-.255,.255]){box('sliding door',[.035,.485,2.3],[side*1.55,center+y+delta,2.02],white);box('door window',[.026,.365,.85],[side*1.58,center+y+delta,2.57],glass);}
    }
   }
   for(const y of [-2.4,2.4])box('roof equipment',[1.9,2.1,.28],[0,center+y,3.96],trim,root,.07);
  }
  box('flexible gangway',[2.25,.44,2.8],[0,0,2.0],navy);
  for(const end of [-1,1]){
   box('cab windshield',[2.51,.07,1.16],[0,end*11.43,2.69],glass,root,.10);
   box('cab line band',[2.62,.055,.27],[0,end*11.435,1.67],green);
   for(const x of [-.94,.94])box('cab lights',[.42,.10,.18],[x,end*11.48,1.15],end===1?lamp:red);
   box('coupler',[.42,.40,.19],[0,end*11.62,.59],navy);
  }
 }
 root.traverse(o=>{if((o as THREE.Mesh).isMesh)o.frustumCulled=false;});
 return {root,length:mode==='bus'?11.6:23.6,animate:(metres:number)=>wheels.forEach(w=>w.rotation.x=-metres/(mode==='bus'?.54:.34))};
}
