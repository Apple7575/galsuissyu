import bpy, math, random
from mathutils import Vector
random.seed(927)
s=bpy.context.scene
def srgb(v):return v/12.92 if v<.04045 else ((v+.055)/1.055)**2.4
def material(n,h,rough=.65,metal=0):
 m=bpy.data.materials.get(n) or bpy.data.materials.new(n);m.use_nodes=True
 c=tuple(srgb(int(h[i:i+2],16)/255) for i in (0,2,4))
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
 m.diffuse_color=(*c,1);return m
mats={}
for n,h in [('limestone','E8E2D5'),('stone_white','F7F5EF'),('joint','B9B8B0'),('paving','D9D9CE'),('paving_light','EAE8DE'),('paving_warm','D4CEC0'),('asphalt','69747D'),('marking','FFFEF2'),('yellow','F2CE4E'),('grass','91AD65'),('soil','827259'),('bark','897559'),('navy','263A51'),('white_metal','DFE4DF'),('leaf1','A8BE77'),('leaf2','8AA664'),('leaf3','B8C98B'),('leaf4','6C9155'),('wood','B4946C'),('flower','EEE4D4'),('route','F2704F'),('blue','347BBD')]:mats[n]=material('ARCH_'+n,h)
mats['glass']=material('ARCH_glass','849FA5',.22,.2);mats['glass_dark']=material('ARCH_glass_dark','4B6D79',.2,.18);mats['steel']=material('ARCH_steel','A9B0AE',.34,.55)
# Geometry batching preserves semantic parts without thousands of draw calls.
buckets={}
def buf(group,mat,smooth=False):
 k=(group,mat,smooth)
 if k not in buckets:buckets[k]=[[],[]]
 return buckets[k]
def box(group,loc,size,mat):
 v,f=buf(group,mat);i=len(v);x,y,z=loc;w,d,h=[a/2 for a in size]
 v.extend([(x+a*w,y+b*d,z+c*h) for a,b,c in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]])
 f.extend([tuple(i+j for j in face) for face in [(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]])
def ellipsoid(group,loc,scale,mat,seg=8,rings=5):
 v,f=buf(group,mat,True);start=len(v)
 for j in range(rings+1):
  a=math.pi*j/rings
  for i in range(seg):
   b=math.tau*i/seg
   v.append((loc[0]+scale[0]*math.sin(a)*math.cos(b),loc[1]+scale[1]*math.sin(a)*math.sin(b),loc[2]+scale[2]*math.cos(a)))
 for j in range(rings):
  for i in range(seg):
   a=start+j*seg+i;b=start+j*seg+(i+1)%seg;f.append((a,b,b+seg,a+seg))
def rod(group,a,b,r,mat,sides=8):
 v,f=buf(group,mat,True);i=len(v);a=Vector(a);b=Vector(b);axis=(b-a).normalized();u=axis.cross(Vector((0,0,1)))
 if u.length<.01:u=axis.cross(Vector((0,1,0)))
 u.normalize();w=axis.cross(u)
 for p in [a,b]:
  for j in range(sides):v.append(tuple(p+r*(math.cos(j*math.tau/sides)*u+math.sin(j*math.tau/sides)*w)))
 for j in range(sides):f.append((i+j,i+(j+1)%sides,i+(j+1)%sides+sides,i+j+sides))
 f.extend([tuple(i+j for j in reversed(range(sides))),tuple(i+j+sides for j in range(sides))])
def txt(name,body,loc,size,mat,rot=(math.pi/2,0,0)):
 c=bpy.data.curves.new(name,'FONT');c.body=body;c.size=size;c.align_x='CENTER';c.extrude=.002;c.bevel_depth=.001
 o=bpy.data.objects.new(name,c);s.collection.objects.link(o);o.location=loc;o.rotation_euler=rot;o.data.materials.append(mats[mat]);return o

for o in list(bpy.data.objects):
 if o.name.startswith('TR01_'):bpy.data.objects.remove(o,do_unlink=True)
bpy.data.objects['GROUND_city_paving'].location.z-=.12
def tree(group,x,y,height=4.5,radius=1.3):
 rod(group+'_trunk',(x,y,0),(x+.08,y,height*.72),.13,'bark')
 for j in range(5):
  a=j*math.tau/5+.3
  rod(group+'_branch',(x,y,height*.45),(x+math.cos(a)*radius*.55,y+math.sin(a)*radius*.55,height*.82),.055,'bark')
 # Dense irregular foliage, variable hue and size, no three-ball tree silhouette.
 for j in range(175):
  a=random.random()*math.tau;z=random.uniform(-.75,.95);r=math.sqrt(max(0,1-z*z))*radius*random.uniform(.38,1)
  px=x+math.cos(a)*r;py=y+math.sin(a)*r;pz=height*.77+z*radius*1.05
  rr=random.uniform(.17,.29)
  ellipsoid(group+'_leaves',(px,py,pz),(rr*1.05,rr,rr*1.25),random.choice(['leaf1','leaf2','leaf3','leaf4']),6,4)
 for j in range(14):
  a=random.random()*math.tau;r=random.random()*.6
  ellipsoid(group+'_groundcover',(x+math.cos(a)*r,y+math.sin(a)*r,.20),(.22,.2,.25),'leaf2',8,4)
positions=[(17,y) for y in [-15,-8,-1,6,13,19]]+[(8,y) for y in [-3,4,11,18]]+[(-21,y) for y in [-14,-6,1]]+[(-25,y) for y in [-25,-18,-11,-4,3,10,18]]+[(29,y) for y in [-25,-18,-11,-4,3,10,18]]+[(-14,-18),(-8,-18)]+[(x,29.5) for x in [-32,-25,-17,-9,6,14,22,31]]
positions += [(-9,y) for y in [-22,-16,-10,-4,1]] + [(20,y) for y in [-24,-17,-10,-3,4,11,18]] + [(x,20) for x in [-33,-28,-23,-18,-13,-8]]
for i,(x,y) in enumerate(positions):tree('TR01_tree%02d'%i,x,y,random.uniform(3.8,5.1),random.uniform(1.0,1.4))

for i,(x,y,w,d) in enumerate([(-31,12,9,12),(-31,-6,9,10),(-18,-25,12,8),(-31,-23,8,8),(33,9,9,13),(33,-10,9,12),(-19,34,15,9),(0,34,10,9),(16,34,10,9)]):
 box('CITY_foundation'+str(i),(x,y,-.10),(w+.6,d+.6,.2),'paving')
for (group,mat,smooth),(verts,faces) in buckets.items():
 mesh=bpy.data.meshes.new(group+'_'+mat);mesh.from_pydata(verts,[],faces);mesh.update()
 obj=bpy.data.objects.new(group+'_'+mat,mesh);s.collection.objects.link(obj);mesh.materials.append(mats[mat])
 for poly in mesh.polygons:poly.use_smooth=smooth
 obj['design_revision']='architectural_04'
s.camera.data.ortho_scale=54
s.camera.location=(38,-50,44)
s.camera.rotation_euler=(Vector((-3,3,1))-s.camera.location).to_track_quat('-Z','Y').to_euler()
s.frame_set(190)
result={'trees':len(positions),'ground_top':-.22,'road_top':-.15,'view':'closer urban context'}
