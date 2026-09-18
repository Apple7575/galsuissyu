import fs from 'node:fs/promises';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
// Export geometry already approved in the detailed assets; no new imagery.
globalThis.FileReader=class {async readAsArrayBuffer(blob){this.result=await blob.arrayBuffer();this.onloadend?.();}};
for(const id of ['station','bakery']){
 const bytes=await fs.readFile('public/models/pilot/'+id+'.glb');
 const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const keep=id==='station'?/^(StationMass|StationGlass|StationRoof|StationCanopy|StationColumn|StationSign)/:/^(BakeryMain|BakeryStone|BakeryParapet|BakeryWindow|BakeryAwning|BakerySign)/;
 const remove=[];gltf.scene.traverse(o=>{if(o.isMesh&&!keep.test(o.name))remove.push(o);});remove.forEach(o=>o.removeFromParent());
 const output=await new GLTFExporter().parseAsync(gltf.scene,{binary:true});
 await fs.writeFile('public/models/pilot/'+id+'-low.glb',Buffer.from(output));
 console.log(id,bytes.length,'→',output.byteLength);
}
