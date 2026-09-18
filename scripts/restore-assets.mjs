import {readFile,writeFile,mkdir,rename,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname,sep} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const manifest=JSON.parse(await readFile(resolve(root,'asset-manifest.json'),'utf8'));
let index=0,done=0;const failures=[];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
async function worker(){while(index<manifest.files.length){const entry=manifest.files[index++];try{
 const path=resolve(root,entry.path);if(!path.startsWith(resolve(root,'public')+sep))throw Error('Invalid asset path');
 try{await stat(path);if(hash(await readFile(path))===entry.sha256){done++;continue;}throw Error('Existing file differs; move your edited file aside before restoring');}catch(e){if(e.code!=='ENOENT')throw e;}
 const response=await fetch(new URL(entry.path.slice(7),manifest.baseUrl),{signal:AbortSignal.timeout(60000)});
 if(!response.ok)throw Error('HTTP '+response.status);
 const bytes=Buffer.from(await response.arrayBuffer());if(hash(bytes)!==entry.sha256)throw Error('Asset revision mismatch');
 await mkdir(dirname(path),{recursive:true});await writeFile(path+'.download',bytes);await rename(path+'.download',path);done++;
 if(done%100===0)console.log(done+'/'+manifest.files.length);
 }catch(e){failures.push(entry.path+': '+e.message);}}}
await Promise.all(Array.from({length:6},worker));
console.log('Assets verified: '+done+'/'+manifest.files.length);
if(failures.length){console.error(failures.slice(0,15).join('\n'));process.exitCode=1;}
