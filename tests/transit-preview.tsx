// Development-only fixture. Not part of the production entry or real routing data.
import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {DaejeonMap} from '../src/DaejeonMap';
import {TransitJourneyPlayer} from '../src/TransitJourneyPlayer';
import {JourneyArrival} from '../src/JourneyArrival';
import {transitSimulationGeoJSON} from '../src/transit-simulation';
import type {TransitSimulation} from '../src/transit-types';
import type {CityViewHandle} from '../src/CityFallback';
import '../src/city-explorer.css';
import '../src/mobile-map.css';
import '../src/experience.css';
const simulation:TransitSimulation={route:{id:'qa-only',minutes:20,walkDistance:200,fare:null,mapObj:null,legs:[]},totalMinutes:20,coordinates:[[127.383,36.3504],[127.391,36.3504]],segments:[
 {id:'walk1',mode:'walk',line:'',start:'시연 출발',end:'승차 지점',minutes:2,startProgress:0,endProgress:.1,coordinates:[[127.383,36.3504],[127.384,36.3504]]},
 {id:'bus',mode:'bus',line:'검증용 버스',start:'승차 지점',end:'환승 지점',minutes:7,startProgress:.1,endProgress:.45,coordinates:[[127.384,36.3504],[127.386,36.3504]]},
 {id:'transfer',mode:'walk',line:'',start:'버스 하차',end:'지하철 승차',minutes:2,startProgress:.45,endProgress:.55,coordinates:[[127.386,36.3504],[127.387,36.3504]]},
 {id:'subway',mode:'subway',line:'검증용 열차',start:'승차역',end:'하차역',minutes:7,startProgress:.55,endProgress:.9,coordinates:[[127.387,36.3504],[127.39,36.3504]]},
 {id:'walk2',mode:'walk',line:'',start:'하차역',end:'시연 목적지',minutes:2,startProgress:.9,endProgress:1,coordinates:[[127.39,36.3504],[127.391,36.3504]]}
]};
function Fixture(){const [progress,seek]=useState(.11),[playing,play]=useState(false),[speed,setSpeed]=useState(1),[follow,setFollow]=useState(true);const map=useRef<CityViewHandle>(null);
 useEffect(()=>{if(!playing)return;const id=setInterval(()=>seek(p=>Math.min(1,p+.001*speed)),50);return()=>clearInterval(id);},[playing,speed]);
 useEffect(()=>{if(progress>=1)play(false);},[progress]);
 return <div className="daejeon-app panel-collapsed"><div className="dj-map-stage" style={{position:'fixed',inset:0}}>
 <DaejeonMap ref={map} transitGeometry={transitSimulationGeoJSON(simulation)} transitSimulation={simulation} transitPlaying={playing} transitProgress={progress} focusedPins={false} terrainStrength={0} places={[]} selected="" from={null} to={null} route={null} preview={false} progress={0} follow={follow} wheelchair={true} onFollowChange={setFollow} onEndpoint={()=>{}} onPilotState={()=>{}} onPilotPick={()=>{}} onPick={()=>{}} onPoint={()=>{}} onDetail={()=>{}} onZoom={()=>{}} onCompatibility={()=>{}}/>
 <nav style={{position:'absolute',zIndex:10,top:10,left:10,display:'flex',gap:8,background:'white',padding:10}} aria-label="개발 검증 단계">
 {([['버스 승차',.11],['버스 이동',.27],['버스 하차',.438],['환승 보행',.5],['지하철 승차',.56],['지하철 이동',.72],['지하철 하차',.89],['도착',1],['처음',0]] as const).map(([label,value])=><button key={label} onClick={()=>{seek(value);play(false);}}>{label}</button>)}
 </nav><TransitJourneyPlayer simulation={simulation} playing={playing} progress={progress} speed={speed} follow={follow} onPlaying={play} onSeek={seek} onSpeed={setSpeed} onFollow={setFollow} onDetails={()=>{}}/><JourneyArrival arrived={progress>=1} destination="검증용 목적지"/>
 </div></div>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
