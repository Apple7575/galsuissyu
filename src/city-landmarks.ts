import * as THREE from 'three';

export const hanbitLocation:[number,number]=[127.3880552684057,36.37663863047867];
/** OSM footprint centroid; official overall height 93m. All component dimensions
 * and façade details below are a stylized reconstruction, not a surveyed model.
 * https://www.djto.kr/kor/page.do?menuIdx=652 */
export function hanbitTower(){
 const group=new THREE.Group();group.name='한빛탑 · 형태 재구성';
 const stone=new THREE.MeshStandardMaterial({color:'#eee9dd',roughness:.68});
 const metal=new THREE.MeshStandardMaterial({color:'#dddcd3',roughness:.32,metalness:.35});
 const glass=new THREE.MeshStandardMaterial({color:'#5b98aa',roughness:.2,metalness:.28});
 const joint=new THREE.MeshStandardMaterial({color:'#bcb6a9',roughness:.8});
 const red=new THREE.MeshStandardMaterial({color:'#a34c43',roughness:.55});
 const add=(geometry:THREE.BufferGeometry,material:THREE.Material,z:number)=>{const m=new THREE.Mesh(geometry,material);m.position.z=z;group.add(m);return m;};
 const column=(top:number,bottom:number,h:number,z:number,mat:THREE.Material)=>{const m=add(new THREE.CylinderGeometry(top,bottom,h,64),mat,z);m.rotation.x=Math.PI/2;return m;};
 column(6.1,9.6,58,29,stone);
 // Thin masonry courses give the tower the same architectural scale as the city.
 for(let z=1.5;z<57;z+=1.5){const radius=9.6-(9.6-6.1)*z/58;add(new THREE.TorusGeometry(radius+.02,.055,4,64),joint,z);}
 for(let z=1;z<57;z+=1.5){const radius=9.6-(9.6-6.1)*z/58;const shaft=add(new THREE.BoxGeometry(1.25,.22,1.46),red,z);shaft.position.y=-radius;}
 column(13.8,7.2,4,59,metal);column(13.8,13.8,1.2,61.6,metal);
 add(new THREE.TorusGeometry(10.7,3.7,12,64),glass,65);
 for(let i=0;i<48;i++){const a=i/48*Math.PI*2,rib=add(new THREE.TorusGeometry(3.78,.10,4,20),metal,65);rib.position.x=10.7*Math.cos(a);rib.position.y=10.7*Math.sin(a);rib.rotation.set(Math.PI/2,0,a,'ZXY');}
 column(4.2,4.2,7,67.5,stone);column(0.12,3.9,22,82,metal);
 for(let i=0;i<8;i++){const a=i/8*Math.PI*2,fin=add(new THREE.BoxGeometry(.22,3.5,12),stone,76);fin.position.x=2.1*Math.cos(a);fin.position.y=2.1*Math.sin(a);fin.rotation.z=a;}
 return group;
}

export function disposeLandmark(group:THREE.Group){
 const materials=new Set<THREE.Material>();group.traverse(o=>{const m=o as THREE.Mesh;if(m.isMesh){m.geometry.dispose();(Array.isArray(m.material)?m.material:[m.material]).forEach(t=>materials.add(t));}});materials.forEach(m=>m.dispose());
}
