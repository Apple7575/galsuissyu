import * as THREE from 'three';
/** Shared lightweight articulated miniature. Units are metres, Z is up. */
export function travelerModel(wheelchair=true){
 const root=new THREE.Group(),wheels:THREE.Object3D[]=[],arms:THREE.Group[]=[],legs:{upper:THREE.Mesh;lower:THREE.Mesh;shoe:THREE.Mesh;x:number}[]=[];
 const mat=(c:string,metal=0)=>new THREE.MeshStandardMaterial({color:c,roughness:metal?.32:.7,metalness:metal});
 const skin=mat('#f0c4a0'),hair=mat('#352a25'),blue=mat('#168ca6'),pants=mat('#304967'),rubber=mat('#303b44'),metal=mat('#becbd1',.65),white=mat('#faf9f2');
 function mesh(g:THREE.BufferGeometry,m:THREE.Material,x:number,y:number,z:number,parent:THREE.Object3D=root){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
 function ball(x:number,y:number,z:number,r:number,m:THREE.Material,parent:THREE.Object3D=root){return mesh(new THREE.SphereGeometry(r,20,14),m,x,y,z,parent);}
 function bar(a:number[],b:number[],r:number,m:THREE.Material,parent:THREE.Object3D=root){const v=new THREE.Vector3(...b as [number,number,number]).sub(new THREE.Vector3(...a as [number,number,number]));const o=mesh(new THREE.CylinderGeometry(r,r,v.length(),8),m,(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,parent);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return o;}
 const bodyZ=wheelchair?.91:1.16;
 const torso=mesh(new THREE.CapsuleGeometry(.19,.27,4,12),blue,0,0,bodyZ);torso.rotation.x=Math.PI/2;torso.scale.set(1,.9,.75);
 ball(0,.015,bodyZ+.42,.18,skin);const cap=ball(0,-.025,bodyZ+.49,.175,hair);cap.scale.z=.65;
 for(const x of [-.062,.062]){ball(x,.174,bodyZ+.435,.019,rubber);ball(x-.004,.190,bodyZ+.442,.005,white);bar([x-.023,.166,bodyZ+.478],[x+.020,.168,bodyZ+.475],.009,hair);}
 ball(0,.185,bodyZ+.39,.025,skin);
 for(const x of [-.17,.17])ball(x,0,bodyZ+.42,.035,skin);
 bar([-.035,.17,bodyZ+.345],[.035,.17,bodyZ+.345],.006,hair);
 mesh(new THREE.BoxGeometry(.24,.1,.3),mat('#cf9f64'),0,-.2,bodyZ);
 for(const x of [-.125,.125])bar([x,-.16,bodyZ+.21],[x,.14,bodyZ+.18],.018,white);
 mesh(new THREE.BoxGeometry(.15,.025,.115),blue,-.07,.176,bodyZ+.015);
 for(const z of [bodyZ-.08,bodyZ+.025,bodyZ+.13])ball(.025,.19,z,.012,metal);
 bar([0,.18,bodyZ-.13],[0,.18,bodyZ+.14],.009,white);
 if(wheelchair){
  mesh(new THREE.BoxGeometry(.43,.42,.07),rubber,0,-.04,.62);mesh(new THREE.BoxGeometry(.46,.06,.4),rubber,0,-.23,.86);
  for(const x of [-.32,.32]){
   const wheel=new THREE.Group();wheel.position.set(x,-.07,.34);root.add(wheel);wheels.push(wheel);
   const tire=mesh(new THREE.TorusGeometry(.3,.035,6,24),rubber,0,0,0,wheel);tire.rotation.y=Math.PI/2;
   const rim=mesh(new THREE.TorusGeometry(.257,.012,5,24),metal,0,0,0,wheel);rim.rotation.y=Math.PI/2;
   for(let i=0;i<10;i++){const a=i*Math.PI/5;bar([0,0,0],[0,Math.cos(a)*.26,Math.sin(a)*.26],.006,metal,wheel);}
   bar([x,-.2,.62],[x,.27,.18],.025,metal);bar([x,-.25,.63],[x,-.25,1.04],.018,metal);
   const front=mesh(new THREE.TorusGeometry(.07,.02,5,12),rubber,x,.34,.09);front.rotation.y=Math.PI/2;
   mesh(new THREE.BoxGeometry(.07,.32,.035),rubber,x,-.02,.88);
   bar([x*.65,0,bodyZ+.1],[x*.85,.18,.88],.062,blue);ball(x*.85,.2,.84,.055,skin);
   bar([x*.43,.05,.65],[x*.43,.32,.61],.075,pants);bar([x*.43,.32,.61],[x*.43,.34,.25],.065,pants);
   mesh(new THREE.BoxGeometry(.15,.24,.09),white,x*.43,.4,.21);
  }
  mesh(new THREE.BoxGeometry(.4,.2,.025),metal,0,.38,.14);
 }else{
  for(const x of [-.12,.12]){
   const upper=mesh(new THREE.CylinderGeometry(.075,.075,1,8),pants,x,0,.7),lower=mesh(new THREE.CylinderGeometry(.065,.065,1,8),pants,x,0,.3),shoe=mesh(new THREE.BoxGeometry(.17,.29,.12),white,x,.06,.06);legs.push({upper,lower,shoe,x});
   const arm=new THREE.Group();arm.position.set(x*1.8,0,1.32);root.add(arm);arms.push(arm);bar([0,0,0],[0,.015,-.3],.06,blue,arm);bar([0,.015,-.3],[0,.05,-.43],.04,skin,arm);ball(0,.05,-.43,.052,skin,arm);
  }
 }
 const ring=mesh(new THREE.TorusGeometry(.68,.04,6,48),mat('#16b898'),0,0,.045);ring.name='traveler-position-ring';
 const disk=mesh(new THREE.CircleGeometry(.66,40),new THREE.MeshBasicMaterial({color:'#167e75',transparent:true,opacity:.14,depthWrite:false}),0,0,.012);disk.name='traveler-ground-highlight';
 const arrow=new THREE.Shape();arrow.moveTo(0,1.03);arrow.lineTo(-.16,.78);arrow.lineTo(.16,.78);arrow.closePath();mesh(new THREE.ShapeGeometry(arrow),new THREE.MeshBasicMaterial({color:'#08796d',side:THREE.DoubleSide}),0,0,.045);
 function animate(metres:number,moving=true){
  wheels.forEach(w=>w.rotation.x=-metres/.3);const phase=metres/.88*Math.PI*2;
  arms.forEach((a,i)=>a.rotation.x=moving?Math.sin(phase+i*Math.PI)*.3:0);
  legs.forEach(({upper,lower,shoe,x},i)=>{const p=phase+i*Math.PI,y=moving?Math.cos(p)*.2:0,lift=moving?Math.max(0,Math.sin(p))*.09:0;
   const hip=new THREE.Vector3(x,0,.89),ankle=new THREE.Vector3(x,y,.12+lift),axis=ankle.clone().sub(hip),len=Math.min(.81,axis.length());
   const knee=hip.clone().add(ankle).multiplyScalar(.5).addScaledVector(new THREE.Vector3(0,-axis.z,axis.y).normalize(),Math.sqrt(Math.max(0,.41*.41-len*len/4)));
   for(const [o,a,b] of [[upper,hip,knee],[lower,knee,ankle]] as const){o.position.copy(a).add(b).multiplyScalar(.5);o.scale.y=a.distanceTo(b);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize());}shoe.position.set(x,y+.06,.06+lift);
  });
 }
 animate(0,false);
 return {root,animate,dispose:()=>{const gs=new Set<THREE.BufferGeometry>(),ms=new Set<THREE.Material>();root.traverse(o=>{if((o as THREE.Mesh).isMesh){const m=o as THREE.Mesh;gs.add(m.geometry);(Array.isArray(m.material)?m.material:[m.material]).forEach(a=>ms.add(a));}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());}};
}
