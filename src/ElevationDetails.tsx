import type {RouteResult} from './route-engine';
import type {Coordinate} from './city-data';
import {formatDistance} from './city-data';
import './elevation.css';
import {slopeSummary} from './slope-summary';
export function ElevationDetails({route,onFocus}:{route:RouteResult;onFocus:(c:Coordinate[])=>void}){
 const p=route.elevation;if(!p)return <p className="travel-note">이 경로의 고도 정보를 불러오지 못했어요. 경사 정보는 미확인이에요.</p>;
 const heights=p.samples.flatMap(s=>s.height===null?[]:[s.height]),low=heights.length?Math.min(...heights):0,high=heights.length?Math.max(...heights):0,range=Math.max(20,high-low),base=(high+low-range)/2,total=p.samples.at(-1)?.distance||1;
 const y=(h:number)=>100-(h-base)/range*76;
 const runs=slopeSummary(route),visible=runs.filter(s=>s.kind==='up'||s.kind==='down'),up=runs.filter(s=>s.kind==='up'),upDistance=up.reduce((n,s)=>n+s.length,0),upMinutes=up.reduce((n,s)=>n+s.minutes,0);
 return <details className="elevation-details" open><summary><span>오르막·내리막 <small>지형 추정</small></span><b>{heights.length?`↑ ${Math.round(p.ascent)}m  ↓ ${Math.round(p.descent)}m`:'고도 미확인'}</b></summary><div className="elevation-body">
  <p><strong>확인된 오르막 {formatDistance(upDistance)} · 약 {Math.max(upDistance?1:0,Math.ceil(upMinutes))}분</strong><br/>누적 상승 {Math.round(p.ascent)}m · 누적 하강 {Math.round(p.descent)}m</p><div className="slope-legend"><span className="up">↗ 오르막</span><span className="down">↘ 내리막</span><span className="level">— 변화 적음</span><span className="unknown">⋯ 미확인</span></div>
  {heights.length>1?<svg viewBox="0 0 360 136" role="img" aria-label={`경로 지형 고도 추정. 최저 약 ${Math.round(low)}미터, 최고 약 ${Math.round(high)}미터. 높이 차이를 보기 위해 세로축은 확대되어 있습니다.`}>
   {[base,base+range/2,base+range].map(h=><g key={h}><line x1="34" y1={y(h)} x2="352" y2={y(h)} stroke="#e2e9e5"/><text x="30" y={y(h)+4} textAnchor="end">{Math.round(h)}m</text></g>)}
   {p.segments.map((s,i)=>{const a=p.samples[i],b=p.samples[i+1];return s.grade===null||a.height===null||b.height===null?null:<line key={i} x1={36+a.distance/total*312} y1={y(a.height)} x2={36+b.distance/total*312} y2={y(b.height)} stroke={s.kind==='up'?'#b08a59':s.kind==='down'?'#8587af':'#61988d'} strokeWidth="3" strokeLinecap="round"/>;})}
   <text x="36" y="125">출발</text><text x="350" y="125" textAnchor="end">도착 · {formatDistance(total)}</text>
  </svg>:<p>짧은 경로이거나 다리·터널 구간이라 지형만으로 경사를 판단하기 어려워요.</p>}
  {visible.length>0&&<div className="slope-segments">{visible.map(s=><button key={s.start} onClick={()=>onFocus(s.coordinates)}><span>{s.kind==='up'?'↗ 오르막':'↘ 내리막'} 약 {Math.abs(s.grade!).toFixed(1)}%</span><small>출발 후 {formatDistance(s.start)}부터 · {formatDistance(s.length)} 이어짐</small><small>높이 약 {Math.round(Math.abs(s.rise??0))}m {s.kind==='up'?'상승':'하강'} · 약 {Math.max(1,Math.ceil(s.minutes))}분 · 지도에서 보기 ↗</small></button>)}</div>}
  <p>시간은 경로의 설정 속도를 적용한 예상이며 경사로 인한 감속·휴식은 포함하지 않아요. 약 90m 격자의 지형으로 계산한 추정치예요. 보도의 짧은 경사·턱은 알 수 없고, 다리·터널은 계산에서 제외해요. 내리막도 제동 부담이 있어요.</p>
  <p>그래프 세로축은 높이 차이를 보기 위해 확대했어요.{p.unknownDistance>0?` 미확인 구간 약 ${formatDistance(p.unknownDistance)}.`:''} 이 정보로 통행 가능 여부를 보장하지 않아요.</p>
  <a href="https://registry.opendata.aws/terrain-tiles/" target="_blank" rel="noreferrer">고도 출처: Mapzen Terrain Tiles ↗</a>
 </div></details>;
}
