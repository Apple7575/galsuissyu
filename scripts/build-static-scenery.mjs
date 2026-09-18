import fs from 'node:fs';
// Decorative coordinates, generated once from the complete snapshot, never viewport tiles.
const read=n=>JSON.parse(fs.readFileSync(`research/city/${n}.geojson`));
const sx=89500,sy=111320;
const xy=c=>[(c[0]-127.4)*sx,(c[1]-36.35)*sy];
const ll=p=>[+(127.4+p[0]/sx).toFixed(7),+(36.35+p[1]/sy).toFixed(7)];
function inside(p,r){let b=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[i],c=r[j];if((a[1]>p[1])!==(c[1]>p[1])&&p[0]<(c[0]-a[0])*(p[1]-a[1])/(c[1]-a[1])+a[0])b=!b;}return b;}
const roads=read('road').features;
const cells=new Map();
function register(box,value){for(let x=Math.floor(box[0]/40);x<=Math.floor(box[2]/40);x++)for(let y=Math.floor(box[1]/40);y<=Math.floor(box[3]/40);y++){const k=x+','+y;if(!cells.has(k))cells.set(k,[]);cells.get(k).push(value);}}
for(const f of roads){const lines=f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.type==='MultiLineString'?f.geometry.coordinates:[];for(const l of lines)for(let i=1;i<l.length;i++){const a=xy(l[i-1]),b=xy(l[i]);register([Math.min(a[0],b[0])-9,Math.min(a[1],b[1])-9,Math.max(a[0],b[0])+9,Math.max(a[1],b[1])+9],{a,b});}}
for(const f of read('building').features){const polys=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;for(const poly of polys){const r=poly[0].map(xy),xs=r.map(p=>p[0]),ys=r.map(p=>p[1]);register([Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)],{r});}}
function occupied(p){return (cells.get(Math.floor(p[0]/40)+','+Math.floor(p[1]/40))||[]).some(v=>{if(v.r)return inside(p,v.r);const dx=v.b[0]-v.a[0],dy=v.b[1]-v.a[1],t=Math.max(0,Math.min(1,((p[0]-v.a[0])*dx+(p[1]-v.a[1])*dy)/(dx*dx+dy*dy||1)));return (p[0]-v.a[0]-t*dx)**2+(p[1]-v.a[1]-t*dy)**2<81;});}
const trees=new Map();
for(const f of read('park').features.filter(f=>['park','garden','recreation_ground'].includes(f.properties.kind))){const polys=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;for(const poly of polys){const rings=poly.map(r=>r.map(xy)),xs=rings[0].map(p=>p[0]),ys=rings[0].map(p=>p[1]);for(let x=Math.ceil(Math.min(...xs)/32)*32;x<Math.max(...xs);x+=32)for(let y=Math.ceil(Math.min(...ys)/32)*32;y<Math.max(...ys);y+=32){const p=[x,y];if(inside(p,rings[0])&&!rings.slice(1).some(r=>inside(p,r))&&!occupied(p))trees.set(x+','+y,ll(p));}}}
const pilotRoads=roads.filter(f=>{const c=f.geometry.type==='LineString'?f.geometry.coordinates:[];return c.some(p=>p[0]>127.421&&p[0]<127.44&&p[1]>36.323&&p[1]<36.337);}).sort((a,b)=>String(a.id).localeCompare(String(b.id)));
const props=[];let busRoute=[],busLength=0;
for(const f of pilotRoads){if(f.geometry.type!=='LineString'||Number(f.properties.tunnel)||Number(f.properties.bridge))continue;const kind=f.properties.kind;if(!['primary','secondary','tertiary'].includes(kind))continue;const width=kind==='tertiary'?9:12,points=f.geometry.coordinates.map(xy);let total=0;
 for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);total+=len;
  // Sample the entire mapped road continuously; short segments used to receive
  // no props at all. Both sides use fixed coordinates and footprint clearance.
  const before=total-len;
  for(let at=Math.ceil((before-14)/28)*28+14;at<total;at+=28){const d=at-before;if(d<0||len<.1)continue;
   for(const side of [-1,1]){const p=[a[0]+dx*d/len-dy/len*(width/2+6)*side,a[1]+dy*d/len+dx/len*(width/2+6)*side];const coordinate=ll(p);
    if(occupied(p)||[[2.5,0],[-2.5,0],[0,2.5],[0,-2.5]].some(([x,y])=>occupied([p[0]+x,p[1]+y]))||props.some(v=>{const q=xy(v.coordinate);return Math.hypot(q[0]-p[0],q[1]-p[1])<16;}))continue;
    props.push({id:`${f.id}-${Math.round(at)}-${side}`,kind:(Number(f.id)+Math.round(at)+side)%4===0?'lamp':'tree',coordinate});
   }
  }
 }
 if(total>busLength&&total<650&&f.geometry.coordinates.every(c=>c[0]>127.426&&c[0]<127.435&&c[1]>36.327&&c[1]<36.334)){busLength=total;busRoute=f.geometry.coordinates;}
}
fs.writeFileSync('public/data/static-scenery.json',JSON.stringify({note:'Decorative reconstruction; not surveyed tree or accessibility locations.',trees:[...trees.values()],roads:pilotRoads,props,busRoute}));
console.log(`Fixed scenery: ${trees.size} park trees, ${pilotRoads.length} pilot roads`);
