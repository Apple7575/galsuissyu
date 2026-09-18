import {useEffect,useState} from 'react';

/** Completion is a preview milestone, never a claim about the user's GPS location. */
export function JourneyArrival({arrived,destination}:{arrived:boolean;destination:string}){
 const [dismissed,setDismissed]=useState(false);
 useEffect(()=>{if(!arrived)setDismissed(false);},[arrived]);
 if(!arrived||dismissed)return null;
 return <div className="journey-arrival" role="status" aria-live="polite">
  <span className="arrival-check" aria-hidden="true">✓</span>
  <div><strong>도착했어요!</strong><span>{destination||'목적지'} · 경로 미리보기 완료</span></div>
  <button onClick={()=>setDismissed(true)} aria-label="도착 알림 닫기">×</button>
 </div>;
}
