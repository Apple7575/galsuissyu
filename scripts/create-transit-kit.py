import bpy, math
from mathutils import Vector
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
mats={}
for name,c in {'ivory':(.91,.94,.93,1),'silver':(.68,.75,.77,1),'navy':(.075,.15,.21,1),'glass':(.15,.37,.46,1),'green':(.1,.58,.36,1),'yellow':(1,.72,.16,1),'white':(.98,.99,1,1),'rubber':(.08,.1,.12,1),'paving':(.77,.82,.81,1)}.items():
 m=bpy.data.materials.new(name);m.diffuse_color=c;m.use_nodes=True;bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=c;bs.inputs['Roughness'].default_value=.32 if name in ['silver','glass'] else .65;mats[name]=m
root=None
def box(name,loc,size,mat,bevel=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=(0,0,0));o=bpy.context.object;o.name=name;o.parent=root;o.location=loc;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mats[mat]);
 if bevel:
  mod=o.modifiers.new('Small manufactured edge','BEVEL');mod.width=bevel;mod.segments=2;o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
 return o
def begin(name,loc):
 global root
 root=bpy.data.objects.new('transit_'+name,None);bpy.context.collection.objects.link(root);root.location=loc;root['status']='Interpretive transport module, not a surveyed entrance';return root
def text(body,loc,size=.3):
 c=bpy.data.curves.new('Sign','FONT');c.body=body;c.size=size;c.align_x='CENTER';c.extrude=.001;c.materials.append(mats['white']);o=bpy.data.objects.new('Sign_'+body,c);bpy.context.collection.objects.link(o);o.parent=root;o.location=loc;o.rotation_euler=(math.pi/2,0,0)
begin('metro-train',(0,-5,0))
box('Chassis',(0,0,.55),(18,2.7,.45),'navy',.1)
box('Carriage body',(0,0,2.1),(18,2.8,2.8),'ivory',.18)
box('Roof',(0,0,3.57),(17.7,2.7,.22),'silver',.09)
for x in [-4,4]:box('Roof air conditioner',(x,0,3.85),(2.8,1.7,.35),'silver',.08)
for y in [-1.415,1.415]:
 box('Green line identity',(0,y,1.32),(17.7,.035,.3),'green')
 for x in [-6.4,-2.2,2.2,6.4]:
  box('Passenger window',(x,y,2.45),(2.1,.05,1.05),'glass',.06)
 for x in [-4.25,0,4.25]:
  box('Door surround',(x,y,2.04),(1.6,.07,2.3),'silver',.04)
  for dx in [-.4,.4]:
   box('Sliding door',(x+dx,y*1.005,2.04),(.76,.08,2.22),'ivory',.02)
   box('Door glass',(x+dx,y*1.012,2.52),(.57,.045,.83),'glass',.025)
  box('Door threshold',(x,y, .86),(1.6,.17,.07),'yellow')
for x in [-9.02,9.02]:
 box('Cab windshield',(x,0,2.55),(.055,2.28,1.06),'glass',.04)
 box('Cab green band',(x,0,1.63),(.055,2.65,.23),'green')
 for y in [-.9,.9]:box('Headlight',(x,y,1.2),(.07,.38,.2),'white',.04)
for x in [-6,6]:
 box('Bogie',(x,0,.42),(2.7,2.1,.45),'rubber')
 for dx in [-.8,.8]:
  for y in [-1.2,1.2]:
   bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=.34,depth=.18);o=bpy.context.object;o.name='Wheel';o.parent=root;o.location=(x+dx,y,.36);o.rotation_euler=(math.pi/2,0,0);o.data.materials.append(mats['rubber'])
begin('metro-entrance',(-6,4,0))
box('Pavement module',(0,0,.1),(6.5,5.5,.2),'paving',.03)
# Open entrance, individual descending steps, slim glass canopy.
for y in [-1.3,1.3]:
 box('Entrance side wall',(0,y,.55),(4.8,.2,1.1),'ivory',.03)
 for x in [-2,0,2]:box('Canopy post',(x,y,1.85),(.12,.12,3.5),'silver')
 box('Canopy side glass',(0,y,2.3),(4.9,.055,1.6),'glass')
 box('Hand rail',(0,y*.84,1.1),(4.8,.06,.06),'silver',.02)
for i in range(9):box('Descending stair '+str(i),(-2+i*.48,0,.5-i*.045),(.48,2.35,.15),'silver')
box('Canopy roof',(0,0,3.65),(5.2,3,.14),'glass',.035)
box('Station sign',(-2.4,0,3.15),(.15,2.85,.65),'green')
box('Line marker',(1.9,-2,1.45),(.65,.18,2.7),'green',.04);text('M',(1.9,-2.105,2.28),.5);text('1',(1.9,-2.105,1.65),.4)
box('Tactile approach',(-2.9,0,.225),(.45,2.8,.035),'yellow')
begin('metro-lift',(3,4,0))
box('Lift pavement',(0,0,.1),(4.7,4.5,.2),'paving',.04)
box('Lift cabin',(0,.3,1.75),(2.6,2.6,3.2),'glass',.025)
for x in [-1.35,1.35]:
 for y in [-1,1.65]:box('Lift corner frame',(x,y,1.75),(.15,.15,3.4),'silver')
box('Lift roof',(0,.3,3.55),(2.95,2.95,.25),'ivory',.04)
box('Lift header',(0,-1.08,2.98),(2.65,.18,.65),'green');text('M  1',(0,-1.185,2.84),.32)
for x in [-.52,.52]:box('Lift sliding door',(x,-1.08,1.5),(1,.08,2.3),'silver',.025);box('Lift door glass',(x,-1.13,1.63),(.8,.03,1.68),'glass')
box('Lift threshold',(0,-1.23,.23),(2.2,.36,.06),'silver')
box('Tactile entrance',(0,-1.8,.22),(.55,1.05,.04),'yellow')
box('Call button',(1.22,-1.2,1.1),(.13,.08,.2),'navy')
# Shared presentation only; assets export separately from their named roots.
root=None
bpy.ops.object.camera_add(location=(27,-32,27));cam=bpy.context.object;cam.name='Delivery_camera';cam.rotation_euler=(Vector((0,0,1.4))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=29;bpy.context.scene.camera=cam
for name,loc,energy in [('Key',(0,-10,22),3),('Fill',(-12,4,14),1.2)]:
 bpy.ops.object.light_add(type='SUN',location=loc);o=bpy.context.object;o.name=name;o.data.energy=energy;o.rotation_euler=(Vector((0,0,0))-o.location).to_track_quat('-Z','Y').to_euler();o.data.angle=.2
s=bpy.context.scene;s.world=bpy.data.worlds.new('Bright ambient');s.world.color=(.65,.72,.78);s.render.engine='BLENDER_EEVEE';s.render.resolution_x=1000;s.render.resolution_y=750;s.render.resolution_percentage=100;s.render.image_settings.media_type='IMAGE';s.render.image_settings.file_format='PNG'
target=artifacts.file(name='transit-kit-preview.png',media_type='image/png');s.render.filepath=target.path;bpy.ops.render.render(write_still=True);target.publish()
result={'roots':['metro-train','metro-entrance','metro-lift'],'meshCount':sum(o.type=='MESH' for o in bpy.data.objects),'status':'concept modules, not surveyed station geometry'}
