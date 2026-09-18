import math
from mathutils import Vector
scene=bpy.context.scene
scene.unit_settings.system='METRIC'
def mat(name,color,metal=0,rough=.65):
 m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*color,1)
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
 return m
white=mat('Porcelain limestone',(.88,.89,.83));ivory=mat('Warm concrete',(.74,.77,.72));brick=mat('Terracotta brick',(.66,.32,.20));glass=mat('Blue architectural glazing',(.24,.48,.61),.25,.24);dark=mat('Graphite frames',(.10,.17,.20),.25,.4);teal=mat('Teal canvas',(.10,.43,.40));roof=mat('Roof deck',(.49,.56,.57));green=mat('Planting',(.43,.63,.20))
# Shared unit cube meshes by material, baked transforms kept editable.
meshes={}
for m in [white,ivory,brick,glass,dark,teal,roof,green]:
 bpy.ops.mesh.primitive_cube_add(size=1);o=bpy.context.object;o.data.materials.append(m);meshes[m.name]=o.data;bpy.data.objects.remove(o,do_unlink=True)
def box(name,loc,size,m):
 o=bpy.data.objects.new(name,meshes[m.name]);scene.collection.objects.link(o);o.location=loc;o.scale=size;return o
def build(prefix,x,w,d,h,floors,style):
 body=brick if style=='shop' else white
 box(prefix+'Mass',(x,0,h/2),(w,d,h),body)
 for k in range(floors):
  z=1.7+k*(h-1)/floors
  for front in [-1,1]:
   y=front*(d/2+.035)
   bays=4 if style=='shop' else 5
   for j in range(bays):
    px=x-w/2+(j+.5)*w/bays
    box(prefix+f'WindowFrame_{k}_{front}_{j}',(px,y,z),(w/bays*.76,.13,1.92),white if style=='shop' else dark)
    box(prefix+f'WindowGlass_{k}_{front}_{j}',(px,y+front*.075,z),(w/bays*.65,.055,1.7),glass)
   if style!='highrise':box(prefix+f'FloorBelt_{k}_{front}',(x,front*(d/2+.15),z+1.2),(w+.3,.3,.19),white)
  for side in [-1,1]:
   for j in range(3):
    py=-d/2+(j+.5)*d/3
    box(prefix+f'SideWindow_{k}_{side}_{j}',(x+side*(w/2+.07),py,z),(.12,d/3*.60,1.8),glass)
 # Roof edge and inset equipment, all inside the footprint.
 box(prefix+'RoofDeck',(x,0,h+.12),(w,d,.24),roof)
 for sign in [-1,1]:
  box(prefix+f'RoofParapetFront_{sign}',(x,sign*(d/2-.15),h+.46),(w,.3,.68),white)
  box(prefix+f'RoofParapetSide_{sign}',(x+sign*(w/2-.15),0,h+.46),(.3,d,.68),white)
 box(prefix+'RoofService',(x+w*.18,d*.18,h+.85),(w*.24,d*.3,1.2),ivory)
 for j in range(3):box(prefix+f'RoofVent_{j}',(x-w*.3+j*w*.14,d*.2,h+.4),(w*.10,d*.18,.55),dark)
 box(prefix+'Entrance',(x,-d/2-.16,1.4),(w*.17,.25,2.8),dark)
 box(prefix+'DoorGlass',(x,-d/2-.31,1.4),(w*.13,.07,2.55),glass)
 if style=='shop':
  for sign in [-1,1]:
   box(prefix+f'Shopfront_{sign}',(x+sign*w*.3,-d/2-.15,1.5),(w*.32,.18,2.6),glass)
   box(prefix+f'Awning_{sign}',(x+sign*w*.3,-d/2-.38,3.03),(w*.38,.75,.22),teal)
   box(prefix+f'SignPanel_{sign}',(x+sign*w*.3,-d/2-.12,3.65),(w*.32,.16,.7),white)
 if style=='midrise':
  for sign in [-1,1]:
   for j in range(6):box(prefix+f'FacadePier_{sign}_{j}',(x-w/2+j*w/5,sign*(d/2+.18),h/2),(.22,.3,h),white)
  box(prefix+'EntranceCanopy',(x,-d/2-.45,3.4),(w*.36,1,.24),dark)
 if style=='highrise':
  for sign in [-1,1]:
   for j in range(6):box(prefix+f'VerticalFin_{sign}_{j}',(x-w/2+j*w/5,sign*(d/2+.24),h/2),(.22,.45,h),white)
  box(prefix+'Crown',(x,0,h+1.6),(w*.62,d*.58,2.4),white)
  box(prefix+'CrownGlazing',(x,-d*.295,h+1.6),(w*.52,.1,1.7),glass)
build('ArchShop_',-32,14,10,10,3,'shop')
build('ArchMid_',-6,18,14,21,6,'midrise')
build('ArchHigh_',29,22,18,62,18,'highrise')
box('DisplayPlinth',(0,0,-.45),(104,34,.8),white)
camdata=bpy.data.cameras.new('ArchitectureCamera');cam=bpy.data.objects.new('ArchitectureCamera',camdata);scene.collection.objects.link(cam);scene.camera=cam;cam.location=(108,-140,105);cam.rotation_euler=(Vector((0,0,25))-cam.location).to_track_quat('-Z','Y').to_euler();camdata.type='ORTHO';camdata.ortho_scale=123
for name,loc,power,size in [('Key',(-50,-60,100),3,0),('Fill',(50,-20,70),1.2,0)]:
 data=bpy.data.lights.new(name,'SUN');data.energy=power;data.angle=.15;o=bpy.data.objects.new(name,data);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,0))-o.location).to_track_quat('-Z','Y').to_euler()
if scene.world is None:scene.world=bpy.data.worlds.new('Architecture daylight')
scene.world.color=(.65,.72,.8)
scene.render.engine='BLENDER_EEVEE';scene.render.resolution_x=1100;scene.render.resolution_y=800;scene.render.resolution_percentage=100
result={'assets':['ArchShop','ArchMid','ArchHigh'],'units':'metres','objects':len(bpy.data.objects),'appearance':'Generic architecture, not surveyed Daejeon facades'}
