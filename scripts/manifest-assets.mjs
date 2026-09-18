// Build-time inventory of exact public assets, not user/private files.
import {readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,relative} from 'node:path';
const root=resolve(import.meta.dirname,'..'),files=[];
async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const path=resolve(dir,entry.name);if(entry.isDirectory())await walk(path);else if(entry.isFile()){const data=await readFile(path);files.push({path:relative(root,path).replaceAll('\\','/'),size:data.length,sha256:createHash('sha256').update(data).digest('hex')});}}}
await walk(resolve(root,'public'));files.sort((a,b)=>a.path.localeCompare(b.path));
await writeFile(resolve(root,'asset-manifest.json'),JSON.stringify({baseUrl:'https://galsuissyu-map.superstarrypassion.chatgpt.site/',files},null,2)+'\n');
console.log('Inventoried '+files.length+' public assets');
