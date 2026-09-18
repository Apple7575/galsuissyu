import fs from 'node:fs/promises';
import * as T from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
globalThis.FileReader=class {async readAsArrayBuffer(b){this.result=await b.arrayBuffer();this.onloadend?.();}};
// Architectural interpretation, not an as-built survey. Ground-centred Y-up.
const material=(color,metalness=0)=>new T.MeshStandardMaterial({color,roughness:metalness?.32:.7,metalness});
const stone=material('#edece6'),roof=material('#e3e9ed',.3),glass=material('#6d9eac',.25),frame=material('#f7f7ed',.35),dark=material('#34576c'),paving=material('#d5d9d7');
function build(low=false){
 const root=new T.Group();root.name='StationArchitecturalReconstruction';
 function box(name,x,y,z,w,h,d,mat){const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.name=name;m.position.set(x,y,z);root.add(m);return m;}
 box('StationFoundation',0,.25,0,114,.5,100,paving);
 box('StationMainHall',0,6,-2,70,12,70,stone);
 for(const x of [-45,45])box('StationWing',x,5,-9,20,10,68,stone);
 // West facade references show a broad, shallow silver roof and deep overhang.
 // Preserve the footprint fit; these proportions remain an interpretation.
 box('ConcourseRoof',0,12.5,-2,75,1,76,roof);
 box('FrontRoofOverhang',0,12.8,36,82,.65,12,roof);
 box('RoofShadowReveal',0,12.2,38,78,.18,8,dark);
 box('StationGlassFront',0,7.6,33.1,68,9,.3,glass);
 box('StationGlassRear',0,7.6,-37.1,68,9,.3,glass);
 box('StationEntranceRecess',0,2.8,33.5,25,5,.35,dark);
 box('StationCanopy',0,5.5,39,63,.4,12,roof);
 const orange=material('#cf573a',.2);
 box('WestFacadeOrangeBeam',13,8.8,34.8,69,.7,1,orange);
 box('WestFacadeOrangeReturn',47,5,34.8,1.1,8,1,orange);
 for(const x of [-29,-20,20,29])box('StationColumn',x,2.8,43,.55,5.6,.55,frame);
 for(const x of [-45,45]){box('StationWingRoof',x,10.3,-9,21,.5,69,roof);box('StationWingGlazing',x,6.7,25.1,18,4.3,.3,glass);}
 if(!low){
  for(let x=-33;x<=33;x+=3){box('StationMullionFront',x,7.7,33.36,.16,9.4,.16,frame);box('StationMullionRear',x,7.7,-37.36,.16,9.4,.16,frame);}
  for(const y of [4.5,7.4,10.3]){box('StationTransom',0,y,33.4,68,.14,.15,frame);box('StationTransom',0,y,-37.4,68,.14,.15,frame);}
  for(const z of [-30,-20,-10,0,10,20])for(const x of [-55.1,55.1]){box('StationSideWindow',x,6,z,.18,4,6,glass);box('StationSideWindowSill',x,3.95,z,.3,.16,6.2,frame);}
  for(let x=-9;x<=9;x+=3){box('StationEntryDoor',x,2.4,33.8,2.5,4.6,.1,glass);box('StationDoorFrame',x-1.25,2.4,33.9,.13,4.6,.1,frame);}
  for(let x=-34;x<=34;x+=2.8)box('StandingRoofSeam',x,13.06,-2,.05,.1,73,frame);
  for(const x of [-36,36])box('FacadeStonePier',x,6,33.5,1.4,12,1.2,stone);
  for(let x=-53;x<=53;x+=3.5)for(const y of [1.5,4.5,7.5,10.5]){
   if(Math.abs(x)>35&&y<10)box('WingCladdingJoint',x,y,25.3,.025,2.8,.03,dark);
  }
  for(const z of [-32,-16,0,16])for(const x of [-52,52])box('RoofVent',x,11,z,1.7,.8,3,dark);
  for(let x=-28;x<=28;x+=4)box('CanopySoffitFin',x,5.15,39,.12,.25,11,frame);
  for(const x of [-17,17]){
   box('RecessedEntryGlazing',x,2.5,34,8,5,.2,glass);
   for(const dx of [-3,-1,1,3])box('DoorHandle',x+dx,2.5,34.2,.06,1,.08,frame);
  }
  box('StationSignPanel',0,11,33.65,24,1.6,.3,dark);
  // Bevel only major stone masses; merge each material to bound draw calls.
  root.traverse(o=>{if(o.isMesh&&/MainHall|StationWing$|Foundation/.test(o.name)){
   const p=o.geometry.parameters;o.geometry.dispose();o.geometry=new RoundedBoxGeometry(p.width,p.height,p.depth,1,.12);
  }});
 }
 root.updateMatrixWorld(true);const grouped=new Map();
 root.traverse(o=>{if(o.isMesh){const g=o.geometry.clone().applyMatrix4(o.matrixWorld).toNonIndexed();const key=o.material.uuid;if(!grouped.has(key))grouped.set(key,{mat:o.material,parts:[]});grouped.get(key).parts.push(g);}});
 const compact=new T.Group();compact.name=root.name;
 for(const {mat,parts} of grouped.values()){const mesh=new T.Mesh(mergeGeometries(parts),mat);mesh.name='Station_'+mat.color.getHexString();compact.add(mesh);parts.forEach(g=>g.dispose());}
 return compact;
}
for(const low of [false,true]){const root=build(low);const output=await new GLTFExporter().parseAsync(root,{binary:true});const id=low?'station-low':'station';await fs.writeFile('public/models/pilot/'+id+'.glb',Buffer.from(output));console.log(id,output.byteLength);if(!low){const path='public/models/pilot/manifest.json',manifest=JSON.parse(await fs.readFile(path,'utf8')),asset=manifest.assets.find(a=>a.id==='station');let meshes=0,triangles=0;root.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}});Object.assign(asset,{bytes:output.byteLength,meshes,triangles,dimensions:new T.Box3().setFromObject(root).getSize(new T.Vector3()).toArray(),source:'Photo-informed procedural interpretation, 2026-09-18; facade reference: https://inmun360.culture.go.kr/content/657.do?cid=2370939&mode=view'});await fs.writeFile(path,JSON.stringify(manifest,null,2)+'\n');}}
