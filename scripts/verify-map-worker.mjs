// Regression check for the production worker that was missing from v4.
// Runs the actual bundled worker in a Node thread with a minimal worker-scope
// adapter. This checks packaging and message handling, not browser/WebGL output.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {Worker} from 'node:worker_threads';
import {pathToFileURL} from 'node:url';

const files=fs.readdirSync('dist/assets');
const workerName=files.find(f=>/^maplibre-gl-worker-[\w-]+\.js$/.test(f));
assert(workerName,'Production MapLibre worker is missing');
const mainScript=fs.readFileSync('dist/index.html','utf8').match(/src="([^\"]+\.js)"/)[1];
assert(fs.readFileSync(path.join('dist',mainScript),'utf8').includes(workerName),'Main bundle does not reference the emitted worker');
const bootstrap=`
 const {parentPort,workerData,MessageChannel}=require('node:worker_threads');
 globalThis.WorkerGlobalScope=class WorkerGlobalScope{};
 globalThis.self=new WorkerGlobalScope();
 globalThis.location=new URL('https://map-worker-check.example/');
 globalThis.MessageChannel=MessageChannel;
 globalThis.ImageData=class ImageData{};
 self.location=location;
 const listeners=new Map();
 self.addEventListener=(type,callback)=>{if(type==='message'){const wrapped=data=>callback({data});listeners.set(callback,wrapped);parentPort.on('message',wrapped);}};
 self.removeEventListener=(type,callback)=>{const wrapped=listeners.get(callback);if(wrapped)parentPort.off('message',wrapped);};
 self.postMessage=(message,options)=>parentPort.postMessage(message,options?.transfer);
 import(workerData).then(()=>parentPort.postMessage({type:'booted',handlers:Object.keys(self.worker?.actor.messageHandlers||{}),listeners:listeners.size})).catch(error=>{throw error;});
`;
const thread=new Worker(bootstrap,{eval:true,workerData:pathToFileURL(path.resolve('dist/assets',workerName)).href});
const replies=new Map();let booted;
const started=new Promise((resolve,reject)=>{booted=resolve;thread.on('error',reject);});
thread.on('message',message=>{if(message.type==='booted')booted();else if(message.type==='<response>'){const callback=replies.get(message.id);if(callback){replies.delete(message.id);message.error?callback.reject(new Error(JSON.stringify(message.error))):callback.resolve(message.data);}}});
function request(id,type,data){return new Promise((resolve,reject)=>{replies.set(id,{resolve,reject});thread.postMessage({id,type,data,origin:'https://map-worker-check.example',sourceMapId:'verify-map'});});}
const deadline=setTimeout(()=>{console.error('Worker did not respond within 8 seconds');thread.terminate();process.exitCode=1;},8000);
try{
 await started;
 await request('referrer','SR','https://map-worker-check.example/');
 const style=JSON.parse(fs.readFileSync('public/data/map-style.json','utf8'));
 await request('layers','SL',style.layers);
 await request('images','SI',[]);
 console.log(JSON.stringify({worker:workerName,bytes:fs.statSync(path.resolve('dist/assets',workerName)).size,boot:'passed',referrer:'passed',actualCityStyle:'passed',imageRegistry:'passed'}));
}finally{clearTimeout(deadline);await thread.terminate();}
