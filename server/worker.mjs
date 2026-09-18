import {handleTransit} from './transit.mjs';
export default {async fetch(request,env){
 const url=new URL(request.url);
 if(url.pathname.startsWith('/api/transit/'))return handleTransit(request,env);
 if(!env.ASSETS)return new Response('Site assets unavailable',{status:503});
 const asset=await env.ASSETS.fetch(request);
 if(asset.status!==404||request.method!=='GET'||!request.headers.get('accept')?.includes('text/html'))return asset;
 const fallback=new URL('/index.html',url);return env.ASSETS.fetch(new Request(fallback,request));
}};
