import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const bundled=await build({entryPoints:['src/transit-simulation.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const {transitPoint,transitStatus}=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const bus={id:'b',mode:'bus',line:'101',start:'A',end:'B',minutes:10,coordinates:[[127.38,36.35],[127.39,36.35]],startProgress:0,endProgress:.5};
const train={...bus,id:'t',mode:'subway',line:'1호선',startProgress:.5,endProgress:1,coordinates:[[127.39,36.35],[127.4,36.35]]};
const simulation={segments:[bus,train]};
test('boarding and alighting keep the vehicle stationary',()=>{
 assert.deepEqual(transitPoint(simulation,.02).coordinate,bus.coordinates[0]);
 assert.equal(transitPoint(simulation,.02).phase,'boarding');
 assert.deepEqual(transitPoint(simulation,.48).coordinate,bus.coordinates[1]);
 assert.equal(transitPoint(simulation,.48).phase,'alighting');
 assert.equal(transitPoint(simulation,.25).phase,'riding');
});
test('exact segment boundaries select the next vehicle, including after seeking',()=>{
 assert.equal(transitPoint(simulation,.5).segment.mode,'subway');
 assert.equal(transitPoint(simulation,.5).phase,'boarding');
 assert.equal(transitPoint(simulation,.25).segment.mode,'bus');
});
test('arrival clamps progress and restarting clears completion',()=>{
 assert.equal(transitPoint(simulation,1).phase,'arrived');
 assert.deepEqual(transitPoint(simulation,2).coordinate,train.coordinates[1]);
 assert.equal(transitPoint(simulation,0).phase,'boarding');
 assert.match(transitStatus(transitPoint(simulation,1)),/미리보기 완료/);
});
