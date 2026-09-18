import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {build} from 'esbuild';
const file=new URL('./.facade-check.mjs',import.meta.url);
try{
 await build({entryPoints:['src/facade-layout.ts'],outfile:file.pathname,bundle:true,platform:'node',format:'esm'});
 const {facadeLayout}=await import(file.href);
 for(const height of [9,24,55,100,180,250])for(const length of [8,30,80,150]){
  const {heights,bays}=facadeLayout(height,length,100);
  assert(heights.length*bays<=100);
  assert(heights.every(z=>z>0&&z+.8<height));
  assert(heights.at(-1)>height*.7,`Upper windows at ${height}m`);
  assert(heights[0]<4,'Windows start on the first floor');
 }
 console.log('Facade regression: 24 height/width combinations cover upper and lower stories within budget.');
}finally{await fs.rm(file,{force:true});}
