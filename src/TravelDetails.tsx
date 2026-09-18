import {useMemo,useState} from 'react';
import {categories,formatDistance,type CityPlace,type Coordinate} from './city-data';
import {facilityFacts,routeFacilities} from './travel-access';
import type {RouteResult} from './route-engine';
import {places as guides} from './places';
import './travel-details.css';
import {ElevationDetails} from './ElevationDetails';

export function TravelDestinations({places,onChoose}:{places:CityPlace[];onChoose:(p:CityPlace)=>void}){
 return <section className="travel-destinations" aria-label="시설 안내가 있는 여행지"><h2>시설 안내가 있는 여행지</h2><p>방문 전에 확인할 정보를 함께 살펴보세요.</p><div>{guides.map(g=>{const p=places.find(p=>p.id==='kto-'+g.id);return p&&<button key={p.id} onClick={()=>onChoose(p)}><img src={g.image} alt="" loading="lazy"/><span><strong>{g.short}</strong><small>예상 체류 {g.duration}분 · 개인차 있음</small><em>{g.id==='plaza'?'광장 내부 무단차 안내':'승강기·휠체어 화장실 안내'}</em></span></button>;})}</div></section>;
}
export function AccessDetails({place}:{place:CityPlace}){
 return <section className="travel-access" aria-label="접근성 항목별 정보"><h3>내가 이용할 시설은?</h3><div className="travel-fact-grid">{facilityFacts(place).map(f=><div key={f.label} className={'travel-fact '+f.status}><span>{f.label}</span><strong>{f.value}</strong><small>{f.detail}</small></div>)}</div><p className="travel-note">안내 자료와 지도 등록 정보예요. 오늘의 운영 상태는 장소에 문의해 주세요.</p></section>;
}
const riskLabels={steps:'계단',rough:'거친 노면',steep:'급경사',bridge:'다리'};
export function RouteDetails({route,places,rest,onChoose,onFocus}:{route:RouteResult;places:CityPlace[];rest:boolean;onChoose:(p:CityPlace)=>void;onFocus:(c:Coordinate[])=>void}){
 const nearby=useMemo(()=>routeFacilities(places,route.coordinates,rest),[places,route,rest]);
 const [checked,setChecked]=useState<string[]>([]);
 const checkpoints=['출발·도착 출입구의 턱과 진입 위치','이용할 승강기·화장실의 운영 시간','쉬어갈 곳과 돌아오는 이동 방법'];
 const risks=route.sections??[];
 return <div className="travel-route-details">
  <ElevationDetails route={route} onFocus={onFocus}/>
  <div className="travel-metrics"><span>출입구 연결 포함<strong>{formatDistance(route.distance+route.connectorDistance)}</strong></span><span>정보가 일부 없는 도로<strong>{route.distance?Math.min(100,Math.round(route.unknownDistance/route.distance*100)):0}%</strong></span></div>
  <details open={risks.length>0}><summary>동선에서 확인할 구간 <span>{risks.length}개</span></summary>{risks.length?<div className="travel-risk-list">{risks.map((s,i)=><button key={i} onClick={()=>onFocus(s.coordinates)}><b>{i+1}</b><span><strong>{s.kinds.map(k=>riskLabels[k]).join(' · ')}</strong><small>출발 후 약 {formatDistance(s.startDistance)} · 구간 {formatDistance(s.distance)}</small></span><span aria-hidden="true">↗</span></button>)}</div>:<p className="travel-note">기록된 계단·급경사·거친 노면·다리 구간이 없어요. 미확인 구간까지 평탄하다는 뜻은 아니에요.</p>}</details>
  <details><summary>동선 주변 화장실·승강기{rest?'·쉼터':''} <span>{nearby.length}곳</span></summary><p className="travel-note">동선에서 직선 250m 이내예요. 실제 진입 경로와 운영 상태는 별도 확인이 필요해요.</p>{nearby.length?nearby.map(({p,offset})=><button className="travel-nearby" key={p.id} onClick={()=>onChoose(p)}><span aria-hidden="true">{categories[p.category]?.icon}</span><span><strong>{p.name}</strong><small>동선에서 직선 약 {formatDistance(offset)} · 운영 미확인</small></span></button>):<p className="travel-note">이 범위에 등록된 시설을 찾지 못했어요. 목적지 시설 안내도 확인해 보세요.</p>}</details>
  <details><summary>출발 전 나의 확인 <span>{checked.length}/{checkpoints.length}</span></summary><p className="travel-note">이번 동선에서 직접 확인한 항목만 체크하세요. 앱의 통행 인증이 아니에요.</p>{checkpoints.map(label=><label className="travel-check" key={label}><input type="checkbox" checked={checked.includes(label)} onChange={e=>setChecked(v=>e.target.checked?[...v,label]:v.filter(x=>x!==label))}/><span>{label}</span></label>)}</details>
 </div>;
}
