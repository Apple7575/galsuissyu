import fs from 'node:fs';
const source=JSON.parse(fs.readFileSync('research/city/building.geojson'));
const sx=89500,sy=111320,origin=[127.4305,36.3305];
const counts={shop:0,midrise:0,highrise:0};
const candidates=[];
for(const f of source.features){
 if(f.geometry.type!=='Polygon'||f.geometry.coordinates.length!==1||f.properties.name||[254986473,818788759,469022520].includes(f.id))continue;
 const ring=f.geometry.coordinates[0].slice(0,-1),p=ring.map(c=>[(c[0]-origin[0])*sx,(c[1]-origin[1])*sy]);
 if(p.length<4||p.some(v=>Math.hypot(...v)>(Number(f.properties.h)>=40?2200:700)))continue;
 let best;
 for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],angle=Math.atan2(b[1]-a[1],b[0]-a[0]),co=Math.cos(angle),si=Math.sin(angle),q=p.map(v=>[v[0]*co+v[1]*si,-v[0]*si+v[1]*co]);const lo=[Math.min(...q.map(v=>v[0])),Math.min(...q.map(v=>v[1]))],hi=[Math.max(...q.map(v=>v[0])),Math.max(...q.map(v=>v[1]))],area=(hi[0]-lo[0])*(hi[1]-lo[1]);if(!best||area<best.area)best={angle,lo,hi,area};}
 const area=Math.abs(p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-b[0]*a[1];},0))/2;
 if(area/best.area<.92)continue;
 const width=best.hi[0]-best.lo[0],depth=best.hi[1]-best.lo[1];if(Math.min(width,depth)<7||Math.max(width,depth)>58||Math.max(width/depth,depth/width)>2.6)continue;
 const x=(best.lo[0]+best.hi[0])/2,y=(best.lo[1]+best.hi[1])/2,co=Math.cos(best.angle),si=Math.sin(best.angle),east=x*co-y*si,north=x*si+y*co;
 const h=Number(f.properties.h)||9;if(h<7)continue;const asset=h>=40?'highrise':area>=350?'midrise':'shop';
 candidates.push({buildingId:f.id,asset,coordinate:[origin[0]+east/sx,origin[1]+north/sy],dimensions:[width*.98,h,depth*.98],angle:best.angle,distance:Math.hypot(east,north),heightKnown:!!f.properties.known});
}
candidates.sort((a,b)=>a.distance-b.distance);
const placements=candidates.filter(p=>{const max=p.asset==='highrise'?4:10;if(counts[p.asset]>=max)return false;counts[p.asset]++;return true;});
fs.writeFileSync('public/data/architecture-placements.json',JSON.stringify({note:'Generic reconstructed facades on OSM footprints; height retained from snapshot, including its estimates. Not access evidence.',placements}));
console.log(JSON.stringify({counts,placements:placements.map(p=>({id:p.buildingId,type:p.asset,size:p.dimensions}))}));
