import fs from 'node:fs';
import geojsonvt from 'geojson-vt';
import vtpbf from 'vt-pbf';
const data=JSON.parse(fs.readFileSync('research/city/terrain-contours.geojson'));
const index=new geojsonvt(data,{maxZoom:14,indexMaxZoom:11,tolerance:3,buffer:32});
function tile(lon,lat,z){const n=2**z;return [Math.floor((lon+180)/360*n),Math.floor((1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*n)];}
let bytes=0,count=0;
for(let z=11;z<=14;z++){
 const [x0,y1]=tile(127.21,36.15,z),[x1,y0]=tile(127.58,36.54,z);
 for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){
  const t=index.getTile(z,x,y);const pbf=vtpbf.fromGeojsonVt(t?{contours:t}:{});const dir=`public/data/contour-tiles/${z}/${x}`;fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(`${dir}/${y}.pbf`,pbf);bytes+=pbf.length;count++;
 }
}
const path='public/data/map-style.json',s=JSON.parse(fs.readFileSync(path));for(const l of s.layers)if(l.source==='terrain-contours')l['source-layer']='contours';fs.writeFileSync(path,JSON.stringify(s));
console.log(JSON.stringify({tiles:count,bytes}));
