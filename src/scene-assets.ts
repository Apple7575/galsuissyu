export const sceneAssets = [
 {id:'WC01',file:'WC01_traveler',name:'휠체어 여행자',icon:'♿',group:'여행자',description:'광장에서 횡단보도를 건너 공원 길로 이동해요.',note:'이동 경로와 바퀴 움직임을 확인할 수 있어요.'},
 {id:'HU01',file:'HU01_person',name:'보행자',icon:'人',group:'여행자',description:'공원 길을 따라 걸어가는 여행자예요.',note:'보행 동작과 길 위의 위치를 확인해 보세요.'},
 {id:'BL01',file:'BL01_museum',name:'미술관 모형',icon:'▥',group:'장소',description:'석재 이음새, 깊이 있는 창틀과 유리 천창을 갖춘 건물이에요.',note:'대전시립미술관을 정확히 재현한 외관은 아니에요.'},
 {id:'CR01',file:'CR01_crossing',name:'횡단보도·낮춤 구간',icon:'▤',group:'이동 시설',description:'차도와 인도 사이의 높이 차이를 연결하는 구간이에요.',note:'제작용 경사예요. 실제 현장의 통행 가능 여부를 뜻하지 않아요.'},
 {id:'BS01',file:'BS01_shelter',name:'버스 정류장',icon:'▱',group:'이동 시설',description:'유리 프레임, 시간표와 나무 좌석을 갖춘 정류장이에요.',note:'장면 속 버스는 정류장 앞으로 와서 멈춰요.'},
 {id:'BU01',file:'BU01_bus',name:'저상버스 모형',icon:'▣',group:'교통',description:'차체와 창문, 바퀴가 분리된 버스예요.',note:'실시간 버스 도착 정보와 연결되어 있지 않아요.'},
 {id:'SG01',file:'SG01_wc_sign',name:'화장실 안내 표지',icon:'WC',group:'이동 시설',description:'여행 중 필요한 편의시설을 알려주는 표지예요.',note:'모형의 배치 위치에 실제 화장실이 있다는 뜻은 아니에요.'},
 {id:'BN01',file:'BN01_bench',name:'휴식 벤치',icon:'▰',group:'쉼터',description:'보행 공간 옆에서 잠깐 쉬어갈 수 있는 벤치예요.',note:'실제 쉼터 위치는 장소 안내에서 별도로 확인해야 해요.'},
 {id:'TR01',file:'TR01_tree',name:'공원 나무',icon:'♧',group:'풍경',description:'작은 잎과 가지가 여러 겹 겹치는 가로수예요.',note:'회전하면 모든 방향에서 입체 형태를 볼 수 있어요.'},
 {id:'RD01',file:'RD01_road',name:'도로',icon:'═',group:'길',description:'10m 길이의 도로 부품을 이어 붙인 차도예요.',note:'부품 보기에서는 차선 표시를 제외한 기본 도로를 보여줘요.'},
 {id:'SW01',file:'SW01_sidewalk',name:'인도',icon:'▦',group:'길',description:'사람이 이동하는 3m 폭의 시험용 인도예요.',note:'치수는 제작 규격이며 실제 인도 폭은 아니에요.'},
 {id:'PW01',file:'PW01_path',name:'공원 길',icon:'⌁',group:'길',description:'공원과 횡단 구간을 연결하는 보행 공간이에요.',note:'타일을 이어 구성한 길이에요. 부품 보기에서 포장을 살펴보세요.'},
];
export function assetForObject(name:string):string|null {
 const n=name.replaceAll(' ','_');
 const direct=sceneAssets.find(a=>n.startsWith(a.id));if(direct)return direct.id;
 if(/^(Museum|Window_transom|Entrance_canopy|Canopy_column)/.test(n))return 'BL01';
 if(/^Bus_/.test(n))return 'BU01';
 if(/^(RP01|Tactile)/.test(n))return 'CR01';
 return null;
}
