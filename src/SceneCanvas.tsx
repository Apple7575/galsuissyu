import {forwardRef,useEffect,useImperativeHandle,useRef,useState} from 'react';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {assetForObject} from './scene-assets';

export type SceneHandle={reset:()=>void;zoom:(factor:number)=>void;focus:(id:string)=>void;seek:(seconds:number)=>void};
type Props={url:string;isolated:boolean;playing:boolean;routeVisible:boolean;onPick:(id:string)=>void;onTime:(time:number,duration:number)=>void;onReady:(ready:boolean)=>void};
export const SceneCanvas=forwardRef<SceneHandle,Props>(function SceneCanvas(props,ref){
 const host=useRef<HTMLDivElement>(null);const latest=useRef(props);latest.current=props;
 const api=useRef<SceneHandle>({reset(){},zoom(){},focus(){},seek(){}});
 const [status,setStatus]=useState('loading');const [percent,setPercent]=useState(0);const [attempt,setAttempt]=useState(0);
 useImperativeHandle(ref,()=>({reset:()=>api.current.reset(),zoom:f=>api.current.zoom(f),focus:id=>api.current.focus(id),seek:t=>api.current.seek(t)}),[]);
 useEffect(()=>{
  const el=host.current!;let stopped=false,renderer:THREE.WebGLRenderer;
  setStatus('loading');setPercent(0);latest.current.onReady(false);
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});}catch{setStatus('error');return;}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.6));renderer.setClearColor(0xf0f2eb);
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NeutralToneMapping;renderer.toneMappingExposure=1;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  el.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-label','회전과 확대가 가능한 3D 장면');
  const scene=new THREE.Scene();const camera=new THREE.OrthographicCamera(-30,30,25,-25,.05,500);
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.09;controls.maxPolarAngle=Math.PI*.49;controls.minZoom=.4;controls.maxZoom=12;controls.enablePan=true;
  scene.add(new THREE.HemisphereLight(0xf4faff,0xc6cbb5,1.65));
  const sun=new THREE.DirectionalLight(0xfff7e9,2.7);sun.position.set(-30,55,35);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-42;sun.shadow.camera.right=42;sun.shadow.camera.top=42;sun.shadow.camera.bottom=-42;sun.shadow.camera.far=150;sun.shadow.bias=-.00035;sun.shadow.normalBias=.025;scene.add(sun);
  const fill=new THREE.DirectionalLight(0xe4efff,.6);fill.position.set(30,20,-15);scene.add(fill);
  let model:THREE.Group|undefined,mixer:THREE.AnimationMixer|undefined,duration=0,time=0,raf=0,last=performance.now(),lastNotify=0;
  const wholeBox=new THREE.Box3(),center=new THREE.Vector3();let fitHeight=48;
  const meshes:THREE.Mesh[]=[];const routeMeshes:THREE.Object3D[]=[];const actions:THREE.AnimationAction[]=[];
  function applyTime(t:number){actions.forEach(a=>{a.paused=false;a.enabled=true;});mixer?.setTime(t);}
  function resize(){const w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;renderer.setSize(w,h);const ar=w/h;camera.left=-fitHeight*ar/2;camera.right=fitHeight*ar/2;camera.top=fitHeight/2;camera.bottom=-fitHeight/2;camera.updateProjectionMatrix();}
  function frameBox(box:THREE.Box3){if(box.isEmpty())return;const size=box.getSize(new THREE.Vector3());box.getCenter(center);const ar=Math.max(.3,el.clientWidth/Math.max(1,el.clientHeight));fitHeight=Math.max(size.y,size.z,size.x/Math.min(ar,1.5),1)*1.6;camera.zoom=1;camera.position.copy(center).add(new THREE.Vector3(1,1.05,1.3).normalize().multiplyScalar(Math.max(size.length()*1.8,10)));controls.target.copy(center);camera.lookAt(center);resize();controls.update();}
  function districtView(){if(props.isolated){frameBox(wholeBox);return;}const ar=el.clientWidth/Math.max(1,el.clientHeight);fitHeight=ar<.75?67:53;center.set(-3,1,-3);camera.zoom=1;camera.position.set(38,44,50);controls.target.copy(center);camera.lookAt(center);resize();controls.update();}
  api.current={reset:districtView,zoom:f=>{camera.zoom=THREE.MathUtils.clamp(camera.zoom*f,.4,12);camera.updateProjectionMatrix();},focus:id=>{if(!model)return;const box=new THREE.Box3();model.updateMatrixWorld(true);meshes.forEach(m=>{let o:THREE.Object3D|null=m;while(o){if(assetForObject(o.name)===id){if(id==='TR01'&&!m.name.startsWith('TR01_tree00'))break;box.expandByObject(m);break;}o=o.parent;}});frameBox(box);},seek:t=>{time=THREE.MathUtils.clamp(t,0,duration);applyTime(time);latest.current.onTime(time,duration);}};
  const loader=new GLTFLoader();loader.load(props.url,gltf=>{
   if(stopped){dispose(gltf.scene);return;}model=gltf.scene;
   model.traverse(o=>{if((o as THREE.Light).isLight||(o as THREE.Camera).isCamera)o.visible=false;if((o as THREE.Mesh).isMesh){const m=o as THREE.Mesh;const n=o.name.replaceAll(' ','_');m.castShadow=!/^(GROUND|RD01|SW01|PW01|PLAZA|CR01|Suggested_route|PARK_bed)/.test(n);m.receiveShadow=!n.startsWith('Suggested_route');meshes.push(m);}if(o.name.replaceAll(' ','_').startsWith('Suggested_route'))routeMeshes.push(o);});
   scene.add(model);wholeBox.setFromObject(model);districtView();
   if(gltf.animations.length&&!props.isolated){mixer=new THREE.AnimationMixer(model);for(const clip of gltf.animations){duration=Math.max(duration,clip.duration);const a=mixer.clipAction(clip);a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;a.play();actions.push(a);}mixer.setTime(0);}
   setStatus('ready');latest.current.onReady(true);latest.current.onTime(0,duration);
  },e=>{if(!stopped&&e.total)setPercent(Math.round(e.loaded/e.total*100));},()=>{if(!stopped)setStatus('error');});
  const pointer=new THREE.Vector2(),ray=new THREE.Raycaster();let down={x:0,y:0};
  function pointerDown(e:PointerEvent){down={x:e.clientX,y:e.clientY};}
  function pointerUp(e:PointerEvent){if(!model||props.isolated||Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)return;const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);for(const hit of ray.intersectObjects(meshes,false)){let o:THREE.Object3D|null=hit.object;while(o){const id=assetForObject(o.name);if(id){latest.current.onPick(id);return;}o=o.parent;}if(hit.object.name.includes('foundation'))break;}}
  renderer.domElement.addEventListener('pointerdown',pointerDown);renderer.domElement.addEventListener('pointerup',pointerUp);
  function contextLost(e:Event){e.preventDefault();setStatus('error');latest.current.onReady(false);}
  renderer.domElement.addEventListener('webglcontextlost',contextLost);
  const observer=new ResizeObserver(resize);observer.observe(el);resize();
  function draw(now:number){if(stopped)return;const dt=Math.min((now-last)/1000,.08);last=now;if(latest.current.playing&&duration>0&&time<duration&&!document.hidden){time=Math.min(duration,time+dt);applyTime(time);}routeMeshes.forEach(o=>o.visible=latest.current.routeVisible);controls.update();renderer.render(scene,camera);if(now-lastNotify>120){latest.current.onTime(time,duration);lastNotify=now;}raf=requestAnimationFrame(draw);}
  raf=requestAnimationFrame(draw);
  return()=>{stopped=true;cancelAnimationFrame(raf);observer.disconnect();controls.dispose();mixer?.stopAllAction();if(model){mixer?.uncacheRoot(model);dispose(model);}renderer.domElement.removeEventListener('pointerdown',pointerDown);renderer.domElement.removeEventListener('pointerup',pointerUp);renderer.domElement.removeEventListener('webglcontextlost',contextLost);renderer.dispose();renderer.domElement.remove();api.current={reset(){},zoom(){},focus(){},seek(){}};};
 },[props.url,props.isolated,attempt]);
 return <div className="scene-canvas" ref={host}>{status==='loading'&&<div className="scene-loading" role="status"><span className="scene-spinner"/><strong>작은 도시를 불러오는 중이에요</strong><span>{percent?percent+'%':'잠시만 기다려 주세요.'}</span></div>}{status==='error'&&<div className="scene-error" role="alert"><img src="/models/poster.png" alt="3D 장면의 정지 미리보기"/><strong>3D 장면을 불러오지 못했어요.</strong><p>브라우저의 그래픽 가속과 인터넷 연결을 확인해 주세요.</p><button onClick={()=>setAttempt(v=>v+1)}>다시 불러오기</button></div>}</div>;
});
function dispose(root:THREE.Object3D){const geo=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();root.traverse(o=>{const m=o as THREE.Mesh;if(m.isMesh){geo.add(m.geometry);(Array.isArray(m.material)?m.material:[m.material]).forEach(x=>materials.add(x));}});geo.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}
