import fs from 'node:fs';
import path from 'node:path';
import geojsonvt from 'geojson-vt';
import vtpbf from 'vt-pbf';
const root='research/city',dest='public/data/tiles';
const indexes={};
for(const name of ['water','park','waterway','road','rail','building','boundary']){
 const geo=JSON.parse(fs.readFileSync(`${root}/${name}.geojson`,'utf8'));
 // Width/access audit fields live in bridges/network; do not repeat them in every tile.
 if(name==='road')for(const f of geo.features){const {name,kind,bridge,tunnel}=f.properties;f.properties={name,kind,bridge,tunnel};}
 indexes[name]=new geojsonvt(geo,{maxZoom:15,indexMaxZoom:10,indexMaxPoints:30000,tolerance:2,buffer:48,extent:4096});
 console.log(name,geo.features.length);
}
function tile(lon,lat,z){const n=2**z;return [Math.floor((lon+180)/360*n),Math.floor((1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*n)];}
let count=0,bytes=0;
for(let z=10;z<=15;z++){
 const [x0,y1]=tile(127.235,36.175,z),[x1,y0]=tile(127.55,36.515,z);
 for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){
  const layers={};
  for(const [name,index] of Object.entries(indexes)){
   if(name==='building'&&z<12)continue;
   const t=index.getTile(z,x,y);if(t?.features.length)layers[name]=t;
  }
  const buffer=vtpbf.fromGeojsonVt(layers);const folder=`${dest}/${z}/${x}`;fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(`${folder}/${y}.pbf`,buffer);count++;bytes+=buffer.length;
 }
 console.log('zoom',z,'tiles so far',count);
}
fs.writeFileSync('research/city/tiles-manifest.json',JSON.stringify({tiles:count,bytes,minzoom:10,maxzoom:15,bounds:[127.235,36.175,127.55,36.515]}));
console.log('Tile build complete',count,(bytes/1e6).toFixed(1)+'MB');
