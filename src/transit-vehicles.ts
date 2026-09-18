import * as THREE from 'three';
import {MercatorCoordinate,type CustomLayerInterface,type Map as CityMap} from 'maplibre-gl';
import type {TransitSimulation} from './transit-types';
import {transitPoint} from './transit-simulation';
import {travelerModel} from './traveler-model';
import {heroVehicle} from './hero-vehicles';
import {disposeModel} from './pilot-models';
import {groundHeight} from './terrain-placement';

type Motion=()=>{simulation:TransitSimulation|null;playing:boolean;progress:number;wheelchair:boolean};
export type TransitVehicleLayer=CustomLayerInterface;

export function transitVehicleLayer(motion:Motion,onError:(cause:unknown)=>void):TransitVehicleLayer{
 let map:CityMap,renderer:THREE.WebGLRenderer,scene:THREE.Scene,camera:THREE.Camera,origin:MercatorCoordinate,last=0;
 const root=new THREE.Group(),busModel=heroVehicle('bus'),trainModel=heroVehicle('subway'),walker=new THREE.Group();
 const bus=busModel.root,train=trainModel.root;
 let avatar=travelerModel(false),avatarWheelchair=false,lastSegment='',metres=0;
 walker.add(avatar.root);root.add(bus,train,walker);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 function local(c:number[]){const m=MercatorCoordinate.fromLngLat([c[0],c[1]]),s=origin.meterInMercatorCoordinateUnits();return new THREE.Vector3((m.x-origin.x)/s,-(m.y-origin.y)/s,groundHeight(map,c)*m.meterInMercatorCoordinateUnits()/s);}
 function animate(){
  const state=motion(),now=performance.now(),dt=Math.max(0,Math.min(.05,(now-last)/1000||1/60));last=now;
  root.visible=!!state.simulation;if(!state.simulation)return;
  const point=transitPoint(state.simulation,state.progress),position=local(point.coordinate);
  const mpp=40075016.686*Math.cos(map.getCenter().lat*Math.PI/180)/(512*2**map.getZoom());
  // One actor at the exact route position. No resizing, approach offsets, or reverse snap at transfers.
  const ride=point.segment.mode!=='walk'&&point.phase!=='arrived';
  bus.visible=ride&&point.segment.mode==='bus';train.visible=ride&&point.segment.mode==='subway';walker.visible=!ride;
  const active=bus.visible?bus:train.visible?train:walker;
  const scale=active===walker?Math.min(90,Math.max(5,mpp*76/1.7)):Math.min(24,Math.max(1.5,mpp*(train.visible?155:118)/(train.visible?trainModel.length:busModel.length)));
  position.z+=.4;
  const changed=lastSegment!==point.segment.id;
  if(state.playing&&!changed&&!reduced)active.position.lerp(position,1-Math.exp(-dt*14));else active.position.copy(position);
  const angle=point.heading-Math.PI/2,delta=Math.atan2(Math.sin(angle-active.rotation.z),Math.cos(angle-active.rotation.z));
  active.rotation.z=changed||reduced?angle:active.rotation.z+delta*(1-Math.exp(-dt*10));
  active.scale.setScalar(scale);lastSegment=point.segment.id;
  if(avatarWheelchair!==state.wheelchair){walker.remove(avatar.root);avatar.dispose();avatar=travelerModel(state.wheelchair);avatarWheelchair=state.wheelchair;walker.add(avatar.root);}
  if(state.playing&&!reduced)metres+=dt*(ride?8:1.4);
  avatar.animate(metres,state.playing&&walker.visible&&state.progress<1&&!reduced);
  if(state.playing&&point.phase==='riding'&&!reduced){busModel.animate(metres);trainModel.animate(metres);}
  if(state.playing||Math.abs(delta)>.005)map.triggerRepaint();
 }
 return {id:'transit-vehicles',type:'custom',renderingMode:'3d',
  onAdd(m,gl){map=m;scene=new THREE.Scene();camera=new THREE.Camera();origin=MercatorCoordinate.fromLngLat([127.3849,36.3504]);scene.add(root,new THREE.HemisphereLight(0xffffff,0x6b7c86,2));const sun=new THREE.DirectionalLight(0xfff1d8,2.5);sun.position.set(-100,-80,180);scene.add(sun);renderer=new THREE.WebGLRenderer({canvas:m.getCanvas(),context:gl,antialias:true});renderer.autoClear=false;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NeutralToneMapping;},
  render(gl,args){if(!renderer)return;try{animate();const s=origin.meterInMercatorCoordinateUnits();camera.projectionMatrix.fromArray(args.defaultProjectionData.mainMatrix).multiply(new THREE.Matrix4().makeTranslation(origin.x,origin.y,origin.z).scale(new THREE.Vector3(s,-s,s)));renderer.resetState();renderer.render(scene,camera);}catch(cause){onError(cause);}},
  onRemove(){avatar.dispose();disposeModel(bus);disposeModel(train);renderer?.dispose();root.clear();}
 };
}
