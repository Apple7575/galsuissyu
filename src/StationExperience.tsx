import {useEffect,useRef,useState} from 'react';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createStationWorld,stationPath,stationStops} from './station-world';
import {journeyAt,journeyDuration,journeyLengths} from './station-journey';
import {travelerModel} from './traveler-model';
import {disposeModel} from './pilot-models';
import './station-experience.css';
type Quality='auto'|'high'|'light';
export default function StationExperience({onBack}:{onBack:()=>void}){
 const host=useRef<HTMLDivElement>(null),api=useRef({reset(){},zoom(_f:number){},focus(_i:number){},seek(_t:number){}});
 const [ready,setReady]=useState(false),[error,setError]=useState(false),[attempt,setAttempt]=useState(0),[playing,setPlaying]=useState(false),[follow,setFollow]=useState(false),[wheelchair,setWheelchair]=useState(true),[speed,setSpeed]=useState(1),[quality,setQuality]=useState<Quality>('auto'),[time,setTime]=useState(0),[info,setInfo]=useState(false),[stats,setStats]=useState({fps:0,calls:0,triangles:0,light:false});
 const live=useRef({playing,follow,wheelchair,speed,quality});live.current={playing,follow,wheelchair,speed,quality};
 const point=journeyAt(time),stage=stationStops[point.stage];
 useEffect(()=>{
  const el=host.current!;let disposed=false,frame=0,elapsed=0,last=performance.now(),notify=0,count=0,sample=last,light=window.innerWidth<740,slowSamples=0;
  let renderer:T.WebGLRenderer;
  setReady(false);setError(false);
  try{renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});}catch{setError(true);return;}
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.NeutralToneMapping;renderer.toneMappingExposure=1;
  renderer.setClearColor('#dfece8');renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;el.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label','대전역 광장 3D 체험. 드래그로 회전하고 두 손가락으로 확대할 수 있어요.');
  const scene=new T.Scene();scene.background=new T.Color('#dfece8');
  const camera=new T.PerspectiveCamera(38,1,.1,900);camera.position.set(95,70,155);
  const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,2,7);controls.enableDamping=true;controls.dampingFactor=.08;controls.maxPolarAngle=Math.PI*.47;controls.minDistance=9;controls.maxDistance=310;
  controls.addEventListener('start',()=>setFollow(false));
  scene.add(new T.HemisphereLight('#e9f7ff','#b9c3b1',2));
  const sun=new T.DirectionalLight('#fff4df',3);sun.position.set(-65,110,60);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-105;sun.shadow.camera.right=105;sun.shadow.camera.top=105;sun.shadow.camera.bottom=-105;sun.shadow.camera.far=300;sun.shadow.normalBias=.12;sun.shadow.bias=-.0002;scene.add(sun);
  const fill=new T.DirectionalLight('#d7edff',.6);fill.position.set(60,35,-45);scene.add(fill);
  const world=createStationWorld();scene.add(world.root);
  const floor=new T.Mesh(new T.PlaneGeometry(180,170),new T.ShadowMaterial({opacity:.14}));floor.rotation.x=-Math.PI/2;floor.position.set(0,-1.01,3);floor.receiveShadow=true;scene.add(floor);
  const routeGeometry=new T.BufferGeometry().setFromPoints(stationPath.map(p=>new T.Vector3(p[0],.12,p[2])));
  const route=new T.Line(routeGeometry,new T.LineDashedMaterial({color:'#21876d',dashSize:.7,gapSize:.45}));route.computeLineDistances();scene.add(route);
  const loader=new GLTFLoader();let station:T.Group|undefined,stationLow:T.Group|undefined,avatar=travelerModel(true),avatarWheelchair=true;
  const person=new T.Group();person.add(avatar.root);person.rotation.x=-Math.PI/2;
  const traveler=new T.Group();traveler.add(person);traveler.scale.setScalar(3.2);scene.add(traveler);
  const walkers=[{avatar:travelerModel(false),group:new T.Group(),offset:0},{avatar:travelerModel(false),group:new T.Group(),offset:14}];
  walkers.forEach(w=>{w.avatar.root.rotation.x=-Math.PI/2;w.group.add(w.avatar.root);scene.add(w.group);});
  const abort=new AbortController();
  async function loadStation(low:boolean){
   const response=await fetch('/models/pilot/station'+(low?'-low':'')+'.glb?v=facade18',{signal:abort.signal});if(!response.ok)throw Error('station');
   const gltf=await loader.parseAsync(await response.arrayBuffer(),'');
   if(disposed){disposeModel(gltf.scene);return;}
   gltf.scene.scale.set(.85,.85,.55);gltf.scene.position.set(0,0,-34);
   gltf.scene.traverse(o=>{if((o as T.Mesh).isMesh){o.castShadow=true;o.receiveShadow=true;}});
   scene.add(gltf.scene);if(low)stationLow=gltf.scene;else station=gltf.scene;
  }
  loadStation(true).then(()=>{if(!disposed)setReady(true);return loadStation(false);}).catch(e=>{if(!disposed&&e.name!=='AbortError'&&!stationLow)setError(true);});
  // Text is a small canvas label, not a baked screenshot of the scene.
  const labelCanvas=document.createElement('canvas');labelCanvas.width=1024;labelCanvas.height=128;
  const ctx=labelCanvas.getContext('2d')!;ctx.fillStyle='#2a4a59';ctx.fillRect(0,0,1024,128);ctx.fillStyle='#fff';ctx.font='bold 66px sans-serif';ctx.textAlign='center';ctx.fillText('대전역  DAEJEON',512,87);
  const labelTexture=new T.CanvasTexture(labelCanvas);labelTexture.colorSpace=T.SRGBColorSpace;
  const sign=new T.Mesh(new T.PlaneGeometry(21,2.6),new T.MeshBasicMaterial({map:labelTexture}));sign.position.set(-18,9.6,-15.1);scene.add(sign);
  let previousQuality='',detailVisible=true,lastDraw=0;
  function resize(){const w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
  function qualitySettings(){
   const mode=live.current.quality,compact=mode==='light'||(mode==='auto'&&light),key=String(compact);
   if(key!==previousQuality){previousQuality=key;renderer.setPixelRatio(Math.min(devicePixelRatio,compact?1.15:1.8));sun.shadow.mapSize.set(compact?1024:2048,compact?1024:2048);sun.shadow.map?.dispose();sun.shadow.map=null;resize();}
   const distance=camera.position.distanceTo(controls.target);if(detailVisible&&distance>260)detailVisible=false;else if(!detailVisible&&distance<220)detailVisible=true;
   if(station)station.visible=detailVisible&&!compact;if(stationLow)stationLow.visible=!station||!detailVisible||compact;
   world.foliage.visible=detailVisible&&!compact;world.coarse.visible=!world.foliage.visible;
   return compact;
  }
  const observer=new ResizeObserver(resize);observer.observe(el);resize();
  api.current={reset(){setFollow(false);controls.target.set(0,2,7);camera.position.set(95,70,155);controls.update();},zoom(f){camera.position.sub(controls.target).multiplyScalar(1/f).add(controls.target);controls.update();},focus(i){setFollow(false);const p=stationStops[i].point;controls.target.set(p[0],p[1],p[2]);camera.position.copy(controls.target).add(new T.Vector3(24,23,31));controls.update();},seek(t){elapsed=Math.max(0,Math.min(journeyDuration,t));setTime(elapsed);}};
  function lost(e:Event){e.preventDefault();setError(true);setReady(false);setPlaying(false);}
  renderer.domElement.addEventListener('webglcontextlost',lost);
  function draw(now:number){
   if(disposed)return;frame=requestAnimationFrame(draw);const dt=Math.min(.05,(now-last)/1000);last=now;if(document.hidden)return;if(!live.current.playing&&!live.current.follow&&now-lastDraw<33)return;lastDraw=now;
   if(live.current.playing)elapsed=Math.min(journeyDuration,elapsed+dt*live.current.speed);
   const p=journeyAt(elapsed),moving=live.current.playing&&!p.waiting&&!p.finished;
   if(avatarWheelchair!==live.current.wheelchair){person.remove(avatar.root);avatar.dispose();avatar=travelerModel(live.current.wheelchair);avatarWheelchair=live.current.wheelchair;person.add(avatar.root);}
   traveler.position.set(p.x,.1,p.z);const angle=Math.PI+p.heading,delta=Math.atan2(Math.sin(angle-traveler.rotation.y),Math.cos(angle-traveler.rotation.y));traveler.rotation.y+=delta*(1-Math.exp(-dt*10));avatar.animate(p.distance/3.2,moving);
   const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
   const ambience=reduced?0:elapsed;
   walkers.forEach((w,i)=>{const d=(ambience*.75+w.offset)%48,reverse=d>24;w.group.position.set(-40+i*70,.05,reverse?28-(d-24):4+d);w.group.rotation.y=reverse?0:Math.PI;w.avatar.animate(ambience*.75,!reduced&&live.current.playing);});
   // Vehicles stop well before the crossing throughout the pedestrian crossing.
   const busX=-60+ambience*1.1;world.bus.position.x=p.distance>=journeyLengths[3]&&p.distance<=journeyLengths[4]?Math.min(5,busX):Math.min(60,busX);
   world.signals.forEach(o=>{const m=o.material as T.MeshStandardMaterial;const go=p.distance>=journeyLengths[3]&&!p.waiting;m.color.set(go?'#4bb08b':'#d9754f');m.emissive.copy(m.color).multiplyScalar(.35);});
   if(live.current.follow){const target=traveler.position.clone().add(new T.Vector3(0,1,0));controls.target.lerp(target,1-Math.exp(-dt*4));camera.position.lerp(target.clone().add(new T.Vector3(10,11,15)),1-Math.exp(-dt*3));}
   controls.update();const compact=qualitySettings();walkers.forEach(w=>w.group.visible=!compact);renderer.render(scene,camera);count++;
   if(now-sample>=1500){const fps=Math.round(count*1000/(now-sample));if(live.current.quality==='auto'&&live.current.playing&&fps<28){slowSamples++;if(slowSamples>=2)light=true;}else slowSamples=0;setStats({fps,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,light:compact});count=0;sample=now;}
   if(now-notify>120){setTime(elapsed);notify=now;if(p.finished)setPlaying(false);}
  }
  frame=requestAnimationFrame(draw);
  return()=>{disposed=true;abort.abort();cancelAnimationFrame(frame);observer.disconnect();controls.dispose();renderer.domElement.removeEventListener('webglcontextlost',lost);avatar.dispose();walkers.forEach(w=>w.avatar.dispose());disposeModel(world.root);if(station)disposeModel(station);if(stationLow)disposeModel(stationLow);routeGeometry.dispose();(route.material as T.Material).dispose();floor.geometry.dispose();(floor.material as T.Material).dispose();sign.geometry.dispose();(sign.material as T.Material).dispose();labelTexture.dispose();renderer.dispose();renderer.domElement.remove();};
 },[attempt]);
 return <div className="station-experience">
  <header className="station-header"><button onClick={onBack}>← 대전 지도</button><div><strong>대전역, 미리 걸어볼까유?</strong><span>입체 모형으로 살펴보는 광장</span></div><button aria-expanded={info} onClick={()=>setInfo(!info)}>안내</button></header>
  <main className="station-stage">
   <div ref={host} className="station-viewport"/>
   {!ready&&!error&&<div className="station-loading" role="status">대전역 모형을 준비하고 있어요…</div>}
   {error&&<div className="station-loading" role="alert">3D 화면을 열지 못했어요.<button onClick={()=>setAttempt(x=>x+1)}>다시 불러오기</button><button onClick={onBack}>지도로 돌아가기</button></div>}
   <div className="station-mode"><button aria-pressed={wheelchair} onClick={()=>setWheelchair(true)}>휠체어</button><button aria-pressed={!wheelchair} onClick={()=>setWheelchair(false)}>걸어서</button><label><span className="sr-only">화면 품질</span><select aria-label="화면 품질" value={quality} onChange={e=>setQuality(e.target.value as Quality)}><option value="auto">자동 품질</option><option value="high">세밀하게</option><option value="light">가볍게</option></select></label></div>
   <div className="station-view-tools"><button aria-label="확대" onClick={()=>api.current.zoom(1.25)}>＋</button><button aria-label="축소" onClick={()=>api.current.zoom(.8)}>−</button><button aria-label="전체 시점" onClick={()=>api.current.reset()}>⌖</button></div>
   <nav className="station-stops" aria-label="구간 살펴보기">{stationStops.map((s,i)=><button key={s.title} className={point.stage===i?'active':''} onClick={()=>{api.current.focus(i);}}><span>{i+1}</span>{s.title}</button>)}</nav>
   {info&&<aside className="station-info"><strong>현장 길 안내가 아닌 체험 장면이에요</strong><p>대전역은 공개 사진을 참고해 재구성했습니다. 광장의 횡단보도·정류장·보도 턱·동선은 연출용 배치이며 실제 위치와 접근성을 확인하지 않았습니다.</p><p>실제 이동은 지도에서 확인하고, 출입구와 승강기 운영 상태는 방문 전에 문의해 주세요.</p><a href="https://inmun360.culture.go.kr/content/657.do?cid=2370939&mode=view" target="_blank" rel="noreferrer">외관 참고 사진 · 2019년 ↗</a><p className="station-performance">{stats.fps} FPS · {stats.calls} draw calls · {stats.triangles.toLocaleString()} triangles · {stats.light?'경량':'상세'} 표시<br/>현재 브라우저 측정값이며 휴대폰 실측값은 아니에요.</p></aside>}
   <div className="station-disclaimer">재구성한 체험 구간 · 실제 길 안내 아님</div>
  </main>
  <footer className="station-player"><div className="station-status"><div><span>{point.waiting?'잠시 기다려요':point.finished?'도착했어요':'여행 미리보기'}</span><strong>{stage.title}</strong></div><p>{stage.note}</p></div>
   <input aria-label="체험 진행 위치" type="range" min="0" max={journeyDuration} step=".1" value={time} onChange={e=>{setPlaying(false);api.current.seek(+e.target.value);}}/>
   <div className="station-play-actions"><button aria-label="처음부터" onClick={()=>{setPlaying(false);api.current.seek(0);}}>↺</button><button className="station-play" disabled={!ready} onClick={()=>{if(point.finished)api.current.seek(0);if(!playing)setFollow(true);setPlaying(!playing);}}>{playing?'Ⅱ 멈추기':'▶ 출발하기'}</button><button aria-pressed={follow} onClick={()=>setFollow(!follow)}>여행자 따라가기</button><select aria-label="재생 속도" value={speed} onChange={e=>setSpeed(+e.target.value)}><option value="1">1×</option><option value="2">2×</option><option value="4">4×</option></select><span>{Math.round(time)} / {Math.round(journeyDuration)}초</span></div>
  </footer>
 </div>;
}
