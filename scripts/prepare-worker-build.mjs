import {cp,mkdir,writeFile} from 'node:fs/promises';

await mkdir('dist/server',{recursive:true});
await cp('server/worker.mjs','dist/server/index.js');
await cp('server/transit.mjs','dist/server/transit.mjs');
await mkdir('dist/.openai',{recursive:true});
await writeFile('dist/.openai/hosting.json',JSON.stringify({project_id:'appgprj_6aa65f5cb12c819180c1350fffaed0a1'})+'\n');
