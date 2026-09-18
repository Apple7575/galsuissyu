import type {CityData, CityPlace, Coordinate} from './city-data';

import {tourismAssets} from './tourism-assets';
export const pilotAssets = [
 ...tourismAssets.map(a=>({id:a.id,name:a.name,group:'관광지' as const,icon:'◇'})),
 {id:'shop',name:'저층 상가',group:'건축 모듈',icon:'▤'},
 {id:'midrise',name:'중층 건물',group:'건축 모듈',icon:'▥'},
 {id:'highrise',name:'고층 빌딩',group:'건축 모듈',icon:'▦'},
 {id:'station',name:'대전역',group:'장소',icon:'▣'},
 {id:'bakery',name:'성심당 본점',group:'장소',icon:'▥'},
 {id:'metro-train',name:'지하철 열차',group:'사람·교통',icon:'▣'},
 {id:'metro-entrance',name:'지하철역 출입구 모듈',group:'장소',icon:'M'},
 {id:'metro-lift',name:'지하철역 승강기 모듈',group:'시설',icon:'↕'},
 {id:'metro',name:'지하철 출입구',group:'장소',icon:'M'},
 {id:'elevator',name:'엘리베이터',group:'시설',icon:'↕'},
 {id:'toilet',name:'화장실',group:'시설',icon:'WC'},
 {id:'bus',name:'저상버스·경사판',group:'사람·교통',icon:'▣'},
 {id:'stop',name:'버스 정류장',group:'시설',icon:'▱'},
 {id:'wheelchair',name:'휠체어 여행자',group:'사람·교통',icon:'♿'},
 {id:'senior',name:'지팡이 이용자',group:'사람·교통',icon:'人'},
 {id:'stroller',name:'유아차와 보호자',group:'사람·교통',icon:'人'},
 {id:'tree',name:'가로수',group:'길·풍경',icon:'♧'},
 {id:'bench',name:'휴식 벤치',group:'시설',icon:'▰'},
 {id:'lamp',name:'가로등',group:'길·풍경',icon:'☀'},
 {id:'road',name:'도로·횡단보도·점자블록',group:'길·풍경',icon:'▤'},
 {id:'pins',name:'장소 번호 핀',group:'시설',icon:'⌖'},
 {id:'risk',name:'공사 위험 표지',group:'시설',icon:'△'},
] as const;
export type PilotAssetId=typeof pilotAssets[number]['id'];
export const pilotStops = [
 {id:'node/355173691',name:'대전역',asset:'station',coordinate:[127.434648,36.332246]},
 {id:'node/6443238585',name:'성심당 본점',asset:'bakery',coordinate:[127.427286,36.32773]},
 {id:'node/9271807350',name:'중앙로역',asset:'metro',coordinate:[127.425918,36.328589]},
 {id:'way/28889891',name:'엑스포다리',asset:'tour-expo-bridge',coordinate:[127.3880435,36.3726126]},
] as const;

// Coordinates and footprint IDs from the existing OSM snapshot, not the asset board.
// External dimensions, heights and headings below are stylized model placement values.
export const pilotMapModels = [
 {asset:'station',poiId:'node/355173691',coordinate:[127.4346489288,36.3321739694] as Coordinate,buildingId:254986473,dimensions:[170,18,92] as const,angle:21.31},
 {asset:'bakery',poiId:'node/6443238585',coordinate:[127.42733095,36.32773315] as Coordinate,buildingId:818788759,dimensions:[24.68,11.2,17.30] as const,angle:24.32},
] as const;
export function pilotAssetForPlace(id:string){return pilotStops.find(p=>p.id===id)?.asset;}
export function enrichPilotPlaces(data:CityData):CityData {
 return {...data,places:data.places.map(p=>{
  const stop=pilotStops.find(s=>s.id===p.id);if(!stop)return p;
  const notes=p.accessNotes??[];
  return {...p,name:stop.name,accessNotes:[...notes,
   stop.asset==='metro'?'표시는 역 중심 위치예요. 제작된 출입구 모형은 실제 9번 출구 위치에 배치하지 않았어요.':'3D 외관과 높이는 재구성한 모형이며 측량 자료가 아니에요.',
   '시설의 운영 상태와 출입구 접근성은 방문 전에 확인해 주세요.']};
 })};
}
export function getPilotPlace(data:CityData|null,id:string):CityPlace|undefined{return data?.places.find(p=>p.id===id);}
