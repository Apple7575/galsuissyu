import {distance,placeCoordinate,type CityPlace,type Coordinate} from './city-data';
export type FacilityFact={label:string;status:'guide'|'limited'|'unknown';value:string;detail:string};
/** Facility guide evidence is distinct from live availability and entrance geometry. */
export function facilityFacts(p:CityPlace):FacilityFact[]{
 const guide=p.id==='kto-museum'||p.id==='kto-arboretum',plaza=p.id==='kto-plaza';
 return [
  {label:'출입구',status:guide?'guide':'unknown',value:p.id==='kto-museum'?'경사로·자동문 안내':p.id==='kto-arboretum'?'턱 없는 주출입구 안내':'출입구 확인 필요',detail:guide?'정확한 진입 위치와 당일 통행 확인':plaza?'광장 내부와 진입부의 턱은 별도 확인':'건물 중심 위치가 실제 출입구는 아니에요'},
  {label:'승강기',status:guide||p.category==='elevator'?'guide':'unknown',value:guide?'시설 안내 있음':p.category==='elevator'?'지도 등록 위치':'시설 정보 미확인',detail:p.id==='kto-arboretum'?'연구관리동 · 당일 운영 확인':'연결 층·출입 가능 시간·운행 상태 확인'},
  {label:'휠체어 화장실',status:guide||p.toiletWheelchair==='yes'?'guide':p.toiletWheelchair==='no'?'limited':'unknown',value:guide?'시설 안내 있음':p.toiletWheelchair==='yes'?'가능으로 등록':p.toiletWheelchair==='no'?'불가로 등록':'휠체어 이용 미확인',detail:'일반 화장실 표시만으로 휠체어 이용 가능 여부를 알 수 없어요'},
  {label:'휴식',status:p.facilities.includes('rest')?'guide':'unknown',value:p.facilities.includes('rest')?'휴식 장소 안내':'쉴 곳 확인 필요',detail:'벤치 위치·그늘·동행자 대기 공간 확인'},
 ];
}
/** Short local projection gives distance to actual polyline segments, not sparse vertices. */
export function distanceToPath(point:Coordinate,path:Coordinate[]){
 if(path.length===0)return Infinity;if(path.length===1)return distance(point,path[0]);
 const sx=111320*Math.cos(point[1]*Math.PI/180),sy=111320;
 let best=Infinity;
 for(let i=1;i<path.length;i++){
  const ax=(path[i-1][0]-point[0])*sx,ay=(path[i-1][1]-point[1])*sy,bx=(path[i][0]-point[0])*sx,by=(path[i][1]-point[1])*sy;
  const dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,-(ax*dx+ay*dy)/(dx*dx+dy*dy||1)));
  best=Math.min(best,Math.hypot(ax+t*dx,ay+t*dy));
 }
 return best;
}
export function routeFacilities(places:CityPlace[],path:Coordinate[],rest:boolean){
 if(!path.length)return [];
 const xs=path.map(c=>c[0]),ys=path.map(c=>c[1]),w=Math.min(...xs)-.004,e=Math.max(...xs)+.004,s=Math.min(...ys)-.003,n=Math.max(...ys)+.003;
 return places.filter(p=>p.lon>=w&&p.lon<=e&&p.lat>=s&&p.lat<=n&&(['toilet','elevator'].includes(p.category)||(rest&&p.category==='park')))
  .map(p=>({p,offset:distanceToPath(placeCoordinate(p),path)})).filter(x=>x.offset<=250).sort((a,b)=>a.offset-b.offset).slice(0,8);
}
