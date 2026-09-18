import {createServer} from 'node:http';import {handleTransit} from './transit.mjs';import {loadEnv} from 'vite';
const env={...loadEnv('development',process.cwd(),''),...process.env};
const server=createServer(async(req,res)=>{
 if(!req.url?.startsWith('/api/transit/')){res.writeHead(404);res.end();return;}
 let bytes=0,chunks=[];for await(const chunk of req){bytes+=chunk.length;if(bytes>4096){res.writeHead(413);res.end();return;}chunks.push(chunk);}
 const body=Buffer.concat(chunks).toString();const response=await handleTransit(new Request('http://localhost'+req.url,{method:req.method,headers:req.headers,...(req.method==='POST'?{body}: {})}),env);
 res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());
});server.listen(8787,'127.0.0.1',()=>console.log('Transit API listening on 127.0.0.1:8787; configured:',!!env.ODSAY_API_KEY));
