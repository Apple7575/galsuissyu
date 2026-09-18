import fs from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
globalThis.FileReader=class {async readAsArrayBuffer(blob){this.result=await blob.arrayBuffer();this.onloadend?.();}};
const source=process.argv[2];if(!source)throw Error('Provide committed Higgsfield GLB');
const bytes=await fs.readFile(source),g=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const roots=[];g.scene.traverse(o=>{if(o.name.startsWith('landmark_'))roots.push(o);});if(roots.length!==50)throw Error('Expected all 50 landmarks, found '+roots.length);
await fs.mkdir('public/models/tourism',{recursive:true});const assets=[];
for(const sourceRoot of roots){
 const key=sourceRoot.name.slice(9),model=sourceRoot.clone(true);model.position.set(0,0,0);
 const labels=[];model.traverse(o=>{if(o.name.startsWith('Display_label'))labels.push(o);});labels.forEach(o=>o.removeFromParent());
 const scene=new THREE.Group();scene.add(model);scene.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(scene),c=b.getCenter(new THREE.Vector3());model.position.set(-c.x,-b.min.y,-c.z);scene.updateMatrixWorld(true);
 let triangles=0,meshes=0;scene.traverse(o=>{if(o.isMesh){meshes++;const positions=o.geometry.attributes.position; if(!positions.array.every(Number.isFinite))throw Error(key+' invalid position');triangles+=(o.geometry.index?.count??positions.count)/3;}});
 const out=await new GLTFExporter().parseAsync(scene,{binary:true});await fs.writeFile('public/models/tourism/'+key+'.glb',Buffer.from(out));
 assets.push({id:'tour-'+key,url:'/models/tourism/'+key+'.glb',bytes:out.byteLength,meshes,triangles,dimensions:b.getSize(new THREE.Vector3()).toArray(),placement:'gallery only; exact map footprint not verified'});
}
await fs.writeFile('public/models/tourism/manifest.json',JSON.stringify({projectId:'f7ed4222-b82c-45a8-9ded-b1a447051fc7',revision:Number(process.argv[3]),source:'Higgsfield 3D Jutsu / Blender',geometryStatus:'interpretive-miniatures',upAxis:'Y',origin:'ground-centre',assets},null,2)+'\n');
console.log(JSON.stringify({count:assets.length,totalBytes:assets.reduce((n,a)=>n+a.bytes,0),maxBytes:Math.max(...assets.map(a=>a.bytes)),assets:assets.map(a=>({id:a.id,triangles:a.triangles}))}));
