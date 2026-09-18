import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const temp=new URL('./.geometry-runtime.mjs',import.meta.url);
try{
 await build({entryPoints:['src/route-engine.ts'],outfile:temp.pathname,bundle:true,platform:'node',format:'esm'});
 const {solveRoute}=await import(temp.href);
 const prefs={wheelchair:true,steps:true,rough:false,steep:true,rest:false};
 const nodes=[[127,36],[127.001,36],[127,36.001],[127.001,36.001]];
 const edge=(a,b,flags,length)=>[a,b,length,flags,[nodes[a],nodes[b]],a*10+b];
 const waterBarriers={type:'Polygon',coordinates:[[[127.0004,35.999],[127.0006,35.999],[127.0006,36.002],[127.0004,36.002],[127.0004,35.999]]]};
 const graph={snapshot:'fixture',nodes,edges:[edge(0,1,256,90),edge(0,2,0,110),edge(2,3,128,90),edge(3,1,0,110)],waterBarriers};
 const r=solveRoute(graph,nodes[0],nodes[1],prefs);
 assert.deepEqual(r.ways,[2,23,31],'A short unverified water crossing must detour through the mapped bridge');
 assert.deepEqual(r.sections.map(s=>({kinds:s.kinds,start:s.startDistance,distance:s.distance})),[{kinds:['bridge'],start:110,distance:90}],'Bridge checkpoint must match route order and distance');
 const reverse=solveRoute(graph,nodes[1],nodes[0],prefs);assert.deepEqual(reverse.sections[0].coordinates,[nodes[3],nodes[2]],'Reverse route checkpoint geometry follows travel direction');
 assert.throws(()=>solveRoute({...graph,edges:graph.edges.filter(e=>!(e[3]&128))},nodes[0],nodes[1],prefs),/経路|경로/,'Never fall back to a straight line across water');
 assert.throws(()=>solveRoute(graph,[127.0005,36],nodes[1],prefs),/물길/,'Endpoint in water cannot connect to a bank');
 const g={snapshot:'bridge endpoint',nodes:[[127.0005,36],[127.001,36]],edges:[[0,1,50,128,[[127.0005,36],[127.001,36]],44]],waterBarriers};
 assert.equal(solveRoute(g,g.nodes[0],g.nodes[1],prefs).distance,50,'An exact mapped bridge node remains routable');
 const live=JSON.parse(await fs.readFile('public/data/walk-network.json'));
 const bridges=JSON.parse(await fs.readFile('public/data/bridges.json')).features;
 const bridgeIds=new Set(bridges.map(b=>b.id));
 assert(bridges.length>0&&live.waterBarriers);
 for(const e of live.edges){if(e[3]&128)assert(bridgeIds.has(e[5]),'Every bridge route edge has map geometry');assert(!((e[3]&128)&&(e[3]&256)));}
 const style=JSON.parse(await fs.readFile('public/data/map-style.json'));
 assert(!style.sources.bridges&&!style.layers.some(l=>l.id.startsWith('bridge-')),'Optional bridge data cannot block initial map style');
 console.log(JSON.stringify({bridges:bridges.length,waterEdgesBlocked:live.edges.filter(e=>e[3]&256).length,routeDetour:'passed',unsafeConnector:'blocked',bridgeEndpoint:'passed'}));
}finally{await fs.rm(temp,{force:true});}
