import bpy, math
from mathutils import Vector

# Landmark miniatures: interpreted silhouettes, NOT surveyed geometry/accessibility.
# Each named root is independently exportable. Local XY ground plane, Z up.
M={}
for name,color in {'ivory':(0.91,.9,.84,1),'white':(.97,.97,.93,1),'glass':(.35,.64,.73,1),'navy':(.13,.23,.3,1),'roof':(.24,.29,.33,1),'wood':(.42,.24,.13,1),'green':(.39,.61,.28,1),'lightgreen':(.62,.76,.38,1),'water':(.35,.72,.78,1),'red':(.83,.23,.18,1),'blue':(.16,.44,.75,1),'gold':(.88,.63,.23,1),'pink':(.9,.52,.58,1),'stone':(.65,.68,.65,1),'path':(.83,.81,.72,1)}.items():
 m=bpy.data.materials.new(name);m.diffuse_color=color;m.use_nodes=True
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=color;bs.inputs['Roughness'].default_value=.35 if name in ['glass','water'] else .7
 M[name]=m
cache={};root=None
def primitive(kind):
 if kind not in cache:
  if kind=='box':bpy.ops.mesh.primitive_cube_add(size=1)
  elif kind=='sphere':bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,radius=1)
  elif kind=='cone':bpy.ops.mesh.primitive_cone_add(vertices=16,radius1=1,radius2=0,depth=1)
  else:bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=1,depth=1)
  o=bpy.context.object;cache[kind]=o.data;bpy.data.objects.remove(o,do_unlink=True)
 return cache[kind]
def obj(name,kind,loc,scale,mat):
 mesh=primitive(kind);key=(kind,mat)
 if key not in cache:cache[key]=mesh.copy();cache[key].materials.append(M[mat])
 o=bpy.data.objects.new(name,cache[key]);bpy.context.collection.objects.link(o);o.parent=root;o.location=loc;o.scale=scale;return o
def box(name,x,y,z,w,d,h,mat='ivory'):return obj(name,'box',(x,y,z),(w,d,h),mat)
def cyl(name,x,y,z,r,h,mat='white'):return obj(name,'cylinder',(x,y,z),(r,r,h),mat)
def ball(name,x,y,z,r,mat='green'):return obj(name,'sphere',(x,y,z),(r,r,r),mat)
def line(name,pts,width,mat):
 curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.resolution_u=1;curve.bevel_depth=width;curve.bevel_resolution=1
 sp=curve.splines.new('POLY');sp.points.add(len(pts)-1)
 for p,co in zip(sp.points,pts):p.co=(*co,1)
 curve.materials.append(M[mat]);o=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(o);o.parent=root;return o
def tree(x,y,h=5):
 cyl('Tree_trunk',x,y,h*.3,.18,h*.6,'wood')
 for dx,dy,dz,r in [(0,0,.7,.29),(-.18,0,.62,.22),(.18,.05,.63,.23),(0,-.15,.58,.21)]:ball('Tree_canopy',x+dx*h,y+dy*h,h*dz,r*h,'green' if dx else 'lightgreen')
def landscaping():
 box('Interpretive_ground',0,0,-.2,36,30,.4,'path')
 for x,y in [(-15,-11),(15,-11),(-15,10),(15,10)]:tree(x,y)
def hall(x,y,w,d,h,mat='ivory'):
 box('Building_mass',x,y,h/2,w,d,h,mat);box('Roof_edge',x,y,h+.12,w+.5,d+.5,.25,'white')
 for j in range(max(1,int(h/3))):
  for i in range(max(2,int(w/3))):
   xx=x-w/2+1.5+i*3
   if xx<x+w/2-1:box('Window',xx,y-d/2-.04,1.8+j*3,1.6,.14,1.8,'glass')
def roof(x,y,z,w,d):
 verts=[(x-w/2,y-d/2,z),(x+w/2,y-d/2,z),(x+w/2,y+d/2,z),(x-w/2,y+d/2,z),(x-w*.38,y,z+2.7),(x+w*.38,y,z+2.7)]
 mesh=bpy.data.meshes.new('Tiled_hip_roof');mesh.from_pydata(verts,[],[(0,1,5,4),(1,2,5),(2,3,4,5),(3,0,4),(3,2,1,0)]);mesh.materials.append(M['roof']);o=bpy.data.objects.new('Tiled_hip_roof',mesh);bpy.context.collection.objects.link(o);o.parent=root
 for k in range(int(w)):
  xx=x-w/2+k+.5;line('Tile_ridge',[(xx,y-d/2,z+.06),(max(x-w*.38,min(x+w*.38,xx)),y,z+2.75),(xx,y+d/2,z+.06)],.055,'stone')
def hanok(x,y,w=13,d=8):
 box('Stone_plinth',x,y,.4,w+1,d+1,.8,'stone');box('Timber_floor',x,y,.95,w,d,.3,'wood');box('Plaster_wall',x,y+1,2.5,w-.8,d-2,3,'white')
 for xx in [-w/2+.5,0,w/2-.5]:
  for yy in [-d/2+.5,d/2-.5]:cyl('Timber_column',x+xx,y+yy,2.6,.18,3.2,'wood')
 for xx in [-w/4,0,w/4]:box('Lattice_door',x+xx,y-d/2+.7,2.5,1.9,.15,2.5,'wood')
 roof(x,y,4.3,w+2,d+2)
def pond(x=0,y=0,w=16,d=8):box('Pond_border',x,y,.15,w+1,d+1,.3,'stone');box('Water_surface',x,y,.32,w,d,.08,'water')
def label(text):
 c=bpy.data.curves.new('Label','FONT');c.body=text;c.align_x='CENTER';c.size=1.15;c.extrude=.008;c.materials.append(M['navy']);o=bpy.data.objects.new('Display_label',c);bpy.context.collection.objects.link(o);o.parent=root;o.location=(0,-17,.04)

specs=[('hanbit','Hanbit Tower'),('expo-bridge','Expo Bridge'),('arboretum','Hanbat Arboretum'),('art-museum','Daejeon Museum of Art'),('arts-center','Arts Center'),('science','National Science Museum'),('hot-spring','Yuseong Foot Spa'),('yurim','Yurim Park'),('observatory','Citizen Observatory'),('geology','Geological Museum'),('skyroad','Euneungjeongi Skyroad'),('sungsimdang','Sungsimdang'),('heritage','Modern History Museum'),('temiorae','Temiorae'),('oworld','O-World'),('ppuri','Ppuri Park'),('uam','Uam Historical Park'),('dongchundang','Dongchundang'),('daedong','Daedong Sky Park'),('lee-ungno','Lee Ungno Museum')]
for idx,(key,title) in enumerate(specs):
 root=bpy.data.objects.new('landmark_'+key,None);bpy.context.collection.objects.link(root);root.location=((idx%5-2)*47,(1.5-idx//5)*47,0);root['asset_id']=key;root['geometry_status']='interpretive miniature; dimensions and entrance accessibility unverified';landscaping()
 if key=='hanbit':
  cyl('Granite_base',0,0,2.4,4,4.8,'ivory');obj('Tapered_tower','cone',(0,0,13),(3.6,3.6,22),'ivory');cyl('Observation_disc',0,0,24,6.5,2.1,'white');cyl('Observation_windows',0,0,24,6.58,1.1,'glass');obj('Upper_spire','cone',(0,0,29),(3.2,3.2,9),'white');cyl('Antenna',0,0,35,.12,5,'gold')
  for i in range(24):
   a=i*math.tau/24;box('Viewing_mullion',math.cos(a)*6.6,math.sin(a)*6.6,24,.14,.14,1.3,'white')
 elif key=='expo-bridge':
  pond(0,0,34,25);box('Bridge_deck',0,0,2,32,7,.8,'white')
  for yy,col in [(-3,'red'),(3,'blue')]:
   pts=[(-15+30*i/30,yy,2+10*math.sin(math.pi*i/30)) for i in range(31)];line('Twin_arch_'+col,pts,.35,col)
   for i in range(1,15):x=-15+2*i;line('Suspension_cable',[(x,yy,2.4),(x,yy,2+10*math.sin(math.pi*i/15))],.055,'white')
   line('Deck_rail',[(-16,yy,3),(16,yy,3)],.09,'navy')
 elif key=='arboretum':
  pond(-5,-1,10,7)
  for x,y in [(-9,7),(1,8),(8,-5),(11,6),(-8,-7)]:tree(x,y,6)
  box('Greenhouse_plinth',5,5,.4,12,8,.8,'ivory');dome=ball('Glasshouse',5,5,2,4,'glass');dome.scale=(6,4,3)
  for i in range(7):line('Glasshouse_rib',[(i*1.6,5-4*math.cos(a),2+3*math.sin(a)) for a in [j*math.pi/12 for j in range(13)]],.08,'white')
 elif key=='art-museum':
  hall(-7,3,13,13,6);hall(7,3,13,13,6);box('Glass_entry',0,-4,3,6,.3,5,'glass');box('Projecting_roof',0,-3,6.4,31,8,.5,'white');pond(0,-10,18,3)
  for x in [-12,-6,6,12]:cyl('Portico_column',x,-6,3,.22,6)
 elif key=='arts-center':
  hall(-5,4,23,16,11);hall(11,5,8,14,7);box('Entrance_glass',-5,-4.2,4.5,20,.2,7,'glass')
  for x in range(-15,7,3):cyl('Foyer_pillar',x,-6,5,.22,10)
  box('Cantilevered_roof',-4,-4,11.4,29,8,.45,'white')
 elif key=='science':
  hall(-6,3,19,15,7);cyl('Planetarium_base',10,3,2.5,5,5,'ivory');d=ball('Planetarium_dome',10,3,5,5,'white');d.scale.z=3
  cyl('Rocket_body',9,-7,5,.65,10);obj('Rocket_nose','cone',(9,-7,10.8),(.65,.65,1.6),'red')
  for x in [-1,1]:box('Rocket_fin',9+x,-7,1.2,.15,1.8,2,'navy')
 elif key=='hot-spring':
  for y in [-5,3]:pond(0,y,24,3);box('Footbath_seat',0,y-2,.65,26,.7,.5,'wood');box('Footbath_seat',0,y+2,.65,26,.7,.5,'wood')
  for x in [-11,0,11]:cyl('Pergola_post',x,8,2,.15,4,'wood')
  for x in range(-12,13,2):box('Pergola_slat',x,8,4.1,.18,5,.2,'wood')
 elif key=='yurim':
  pond(-3,0,20,14);hanok(8,6,7,6)
  for x,y in [(-10,8),(-9,-8),(9,-7),(0,10)]:tree(x,y,5)
  line('Pond_boardwalk',[(-14,-5,1),(-8,-8,1),(4,-8,1),(9,-3,1)],.55,'wood')
 elif key=='observatory':
  hall(0,2,23,15,5);cyl('Main_dome_drum',6,2,6,4,3);d=ball('Main_observation_dome',6,2,7,4,'white');d.scale.z=2.5
  cyl('Secondary_drum',-7,2,5.7,2.6,2);d=ball('Secondary_dome',-7,2,6.8,2.6,'white');d.scale.z=1.8
  line('Dome_slit',[(6,-2,7),(6,-1,9),(6,2,9.55),(6,5,9),(6,6,7)],.19,'navy')
 elif key=='geology':
  hall(0,3,28,15,7);box('Stone_portal',0,-5,4,8,2,8,'stone');box('Recessed_door',0,-6.05,2.6,4,.15,5,'glass')
  for i in range(5):o=ball('Rock_exhibit',-10+i*5,-10,1.1,.9,'stone');o.scale=(1,.7,1+i*.2)
 elif key=='skyroad':
  for x in [-12,12]:
   for y in [-8,0,8]:hall(x,y,7,7,8+(y==0)*3)
  box('Media_canopy',0,0,10,14,28,.4,'navy')
  for x in [-5,-2,1,4]:
   for y in range(-12,13,4):box('Media_color_panel',x,y,10.25,2.8,3.8,.1,['blue','pink','glass','gold'][(y//4+int(x))%4])
  for y in [-11,0,11]:
   for x in [-7,7]:cyl('Canopy_column',x,y,5,.2,10)
 elif key=='sungsimdang':
  hall(0,1,19,14,11,'ivory');box('Shop_glazing',0,-6.1,2,16,.2,3,'glass');box('Bakery_signboard',0,-6.35,4.5,17,.3,1.6,'wood')
  for x in range(-8,9,2):o=box('Striped_awning',x,-7,3.5,1.95,2,.16,'green' if x%4==0 else 'white');o.rotation_euler.x=.15
  for x in [-6,-2,2,6]:box('Upper_window_frame',x,-6.15,8,2.7,.18,3,'white');box('Upper_window',x,-6.26,8,2.3,.12,2.6,'glass')
 elif key=='heritage':
  hall(0,2,30,13,8,'ivory');hall(0,0,7,17,10,'ivory')
  for x in [-12,-8,-4,4,8,12]:box('Vertical_pilaster',x,-4.6,4,.45,.4,8,'white')
  box('Central_portal',0,-8.7,2,3,.2,4,'navy');box('Cornice',0,2,8.3,31,14,.4,'white')
 elif key=='temiorae':
  hall(-5,1,16,11,4,'white');roof(-5,1,4.1,18,13);hall(8,5,10,7,3.5,'ivory');roof(8,5,3.6,12,9)
  box('Garden_wall',0,-10,.9,29,.5,1.8,'stone');box('Gate_gap_marker',0,-10,1,3,.6,2,'wood')
 elif key=='oworld':
  for x in [-11,11]:cyl('Entrance_turret',x,1,4,3,8,'ivory');obj('Turret_roof','cone',(x,1,9),(3.6,3.6,3),'blue')
  box('Entry_arch_beam',0,1,6,23,3,2,'pink');box('Ticket_pavilion',-10,-5,1.8,6,5,3.6,'white')
  line('Decorative_wheel',[(7+5*math.cos(a),7,8+5*math.sin(a)) for a in [i*math.tau/32 for i in range(33)]],.15,'gold')
  for i in range(8):a=i*math.tau/8;line('Wheel_spoke',[(7,7,8),(7+5*math.cos(a),7,8+5*math.sin(a))],.07,'white');ball('Wheel_cabin',7+5*math.cos(a),7,8+5*math.sin(a),.6,'pink')
 elif key=='ppuri':
  box('Lawn',0,1,.08,29,23,.15,'lightgreen');box('Park_path',0,0,.2,4,25,.12,'path')
  for x in [-10,-6,6,10]:
   for y in [-7,0,7]:box('Surname_monument_base',x,y,.4,2.4,1.8,.8,'stone');o=box('Surname_monument',x,y,1.5,1.2,.65,1.8,'ivory');o.rotation_euler.z=x*.03
  hanok(0,9,7,5)
 elif key=='uam':
  pond(-6,-3,14,10);hanok(-5,3,12,7);hanok(9,6,10,8)
  box('Courtyard_wall',12,-5,1,1,12,2,'ivory');roof(12,-5,2,2,13)
 elif key=='dongchundang':
  hanok(0,0,13,9);box('Enclosure_wall',0,9,1,28,.7,2,'ivory');roof(0,9,2,29,2)
  for x in [-11,11]:tree(x,3,7)
 elif key=='daedong':
  for i in range(3):box('Hill_terrace',0,2,i*.7,27-i*5,23-i*4,.7,'green')
  cyl('Windmill_tower',0,3,4,2,7,'ivory');obj('Windmill_roof','cone',(0,3,8),(2.6,2.6,2),'red')
  for angle in [0,math.pi/2]:o=box('Windmill_sail',0,.8,6,.45,.2,8,'white');o.rotation_euler.y=angle+.35
  for x in [-8,8]:box('View_bench',x,-5,1,4,1,.3,'wood')
 elif key=='lee-ungno':
  hall(-9,3,10,14,5,'ivory');hall(3,5,12,10,6,'ivory');hall(11,-2,6,18,4,'stone');box('Link_glazing',-2,-1,2.2,5,.2,4,'glass');box('Courtyard',2,-5,.15,12,9,.3,'path')
  for x in [-11,-8,-5]:box('Vertical_light_slot',x,-4.1,2.5,.35,.12,4,'glass')
 label('%02d  %s'%(idx+1,title))

root=None
scene=bpy.context.scene;scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1
if scene.world is None:scene.world=bpy.data.worlds.new('Daylight')
scene.world.color=(.8,.8,.8);scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.82,.88,.96,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.65
for name,typ,loc,power in [('Key','SUN',(-90,-120,200),2.2),('Fill','SUN',(120,60,150),.7)]:
 data=bpy.data.lights.new(name,typ);data.energy=power;data.angle=.18;o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,0))-o.location).to_track_quat('-Z','Y').to_euler()
data=bpy.data.cameras.new('Collection_camera');cam=bpy.data.objects.new('Collection_camera',data);bpy.context.collection.objects.link(cam);cam.location=(120,-235,285);cam.rotation_euler=(Vector((0,0,0))-cam.location).to_track_quat('-Z','Y').to_euler();data.type='ORTHO';data.ortho_scale=305;scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.samples=12;scene.render.resolution_x=1600;scene.render.resolution_y=1200;scene.render.resolution_percentage=100
result={'landmarkCount':len(specs),'assets':[k for k,_ in specs],'objects':len(bpy.data.objects),'note':'Interpretive miniatures; not measured replicas; no accessibility claim; local roots for independent export.'}
