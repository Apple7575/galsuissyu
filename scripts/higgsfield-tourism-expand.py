import bpy, math
from mathutils import Vector

# Landmark miniatures: interpreted silhouettes, NOT surveyed geometry/accessibility.
# Each named root is independently exportable. Local XY ground plane, Z up.
M={}
for name,color in {'ivory':(0.91,.9,.84,1),'white':(.97,.97,.93,1),'glass':(.35,.64,.73,1),'navy':(.13,.23,.3,1),'roof':(.24,.29,.33,1),'wood':(.42,.24,.13,1),'green':(.39,.61,.28,1),'lightgreen':(.62,.76,.38,1),'water':(.35,.72,.78,1),'red':(.83,.23,.18,1),'blue':(.16,.44,.75,1),'gold':(.88,.63,.23,1),'pink':(.9,.52,.58,1),'stone':(.65,.68,.65,1),'path':(.83,.81,.72,1)}.items():
 m=bpy.data.materials.get(name) or bpy.data.materials.new(name);m.diffuse_color=color;m.use_nodes=True
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

# Expansion from 20 to 50. Reuse shared material/mesh roles; each site remains isolated.
def fence(points,z=1.3):
 line('Handrail',[(x,y,z) for x,y in points],.065,'wood')
 for x,y in points:cyl('Rail_post',x,y,z/2,.07,z,'wood')
def forest():
 for x,y,h in [(-11,6,10),(-6,9,12),(0,10,13),(6,9,11),(11,7,10),(-12,-4,9),(12,-5,9)]:tree(x,y,h)
def deck(points,z=.5,width=2,material='wood'):
 line('Walkway',[(x,y,z) for x,y in points],width/2,material)
def portal(x,y,w=8):
 for xx in [x-w/2,x+w/2]:cyl('Gate_post',xx,y,2.5,.25,5,'red')
 box('Gate_crossbeam',x,y,4.6,w+1,.5,.4,'red')
 for xx in range(-3,4):box('Gate_vertical',x+xx,y,5.1,.12,.25,1,'red')
def courtyard(layout):
 box('Courtyard',0,0,.05,26,23,.1,'stone')
 for x,y,w,d in layout:hanok(x,y,w,d)
 for x in [-14,14]:box('Boundary_wall',x,2,1,1,24,2,'ivory');box('Wall_cap',x,2,2.1,1.3,24,.25,'roof')
def seats(cx,cy,rx,ry,start,end):
 for k in range(4):
  pts=[(cx+(rx+k*.75)*math.cos(a),cy+(ry+k*.75)*math.sin(a),.8+k*.7) for a in [start+(end-start)*i/48 for i in range(49)]]
  line('Seating_tier',pts,.4,'blue' if k%2 else 'ivory')
specs=[["jangtae","jangtae"],["gyejok-trail","gyejok-trail"],["gyejok-fort","gyejok-fort"],["daecheong","daecheong"],["meditation","meditation"],["manin","manin"],["sangso","sangso"],["gapcheon","gapcheon"],["heredium","heredium"],["city-history","city-history"],["currency","currency"],["education","education"],["prehistory","prehistory"],["dunsan","dunsan"],["cemetery","cemetery"],["big-tree","big-tree"],["worldcup","worldcup"],["ballpark","ballpark"],["jokbo","jokbo"],["hyo","hyo"],["hoedeok","hoedeok"],["jinjam","jinjam"],["sunghyeon","sunghyeon"],["hoyeon","hoyeon"],["literature","literature"],["temi-literature","temi-literature"],["woodcraft","woodcraft"],["march38","march38"],["narae","narae"],["yeonjeong","yeonjeong"]]
for key,title in specs:
 assert bpy.data.objects.get('landmark_'+key) is None, key
 root=bpy.data.objects.new('landmark_'+key,None);bpy.context.collection.objects.link(root)
 root['asset_id']=key;root['geometry_status']='interpretive miniature; not surveyed; visitor accessibility unverified'
 landscaping()
 if key=='jangtae':
  forest()
  pts=[(7*math.cos(i*math.tau/40),2+7*math.sin(i*math.tau/40),5) for i in range(41)]
  line('Skywalk_ring',pts,.8,'wood')
  for i in range(12):
   a=i*math.tau/12;x=7*math.cos(a);y=2+7*math.sin(a);cyl('Skywalk_support',x,y,2.5,.12,5,'navy')
  line('Skywalk_guard',[(x,y,z+1) for x,y,z in pts],.08,'navy');deck([(-12,-10),(-7,-6),(0,-5)],.5)
 elif key=='gyejok-trail':
  forest();deck([(-15,-10),(-7,-6),(4,-6),(10,0),(6,5)],.12,3,'red')
  for x in [-8,4]:box('Trail_bench',x,-9,.8,3,.6,.3,'wood')
 elif key=='gyejok-fort':
  for i in range(7):
   x=-12+i*4;z=1+2*math.sin(i*math.pi/6);box('Terraced_hill',x,2,z/2,4.2,15,z,'green')
   for row in range(4):
    for col in range(3):box('Stone_wall_block',x-1.3+col*1.3,0,z+row*.65,1.23,1.4,.6,'stone')
   box('Parapet',x,0,z+2.7,2.5,1.6,.8,'stone')
  deck([(-13,-10),(-6,-7),(0,-5),(8,-3)],.2,2,'path')
 elif key in ['daecheong','meditation','gapcheon']:
  pond(-1,0,29,21)
  if key=='daecheong':
   hanok(10,7,7,5);deck([(-15,-11),(-4,-11),(8,-8),(10,3)],.6);tree(-11,9,7)
  elif key=='meditation':
   box('Lakeside_deck',4,-7,.65,15,5,.8,'wood');fence([(-3,-4),(1,-4),(5,-4),(9,-4),(11,-4)],1.8)
   for x in [-1,6]:box('Garden_bench',x,-7,1.3,3,.6,.3,'wood')
   tree(-11,6,7);tree(-7,9,8)
  else:
   for xx in range(-12,13,3):box('Boardwalk_plank',xx,-10,.6,2.9,2,.2,'wood')
   box('Lawn_island',4,2,.45,8,9,.35,'lightgreen');tree(4,2,5);deck([(-14,0),(-4,0),(0,2)],.7)
 elif key=='manin':
  forest()
  for x in [-11,11]:
   for y in [-2,2]:cyl('Bridge_tower',x,y,4,.2,8,'wood')
  for y in [-1.6,1.6]:
   line('Suspension_cable',[(x,y,3.2+4*(x/11)**2) for x in range(-11,12)],.08,'navy')
   for x in range(-10,11,2):line('Vertical_hanger',[(x,y,3),(x,y,3.2+4*(x/11)**2)],.04,'navy')
  box('Suspension_deck',0,0,2.9,24,3,.25,'wood')
 elif key=='sangso':
  forest();deck([(-14,-8),(0,-5),(12,-7)],.12,2,'path')
  for x,y,h in [(-8,1,5),(0,3,7),(8,1,4),(-4,-8,3),(8,-8,3)]:
   for k in range(h):cyl('Stone_pagoda_course',x,y,.35+k*.65,max(.35,(h-k)*.28),.6,'stone')
 elif key=='heredium':
  hall(0,2,23,13,10,'stone');box('Cornice',0,2,10.7,24,14,.65,'white')
  for x in [-9,-6,-3,3,6,9]:box('Tall_pilaster',x,-4.8,5,.45,.4,9,'ivory')
  box('Entry_portal',0,-5.4,3,4,1,6,'ivory');box('Entry_glazing',0,-6,2.6,2.8,.1,4.8,'navy')
 elif key=='city-history':
  hall(-7,3,13,17,10);hall(8,5,13,13,7,'stone');box('Atrium_glass',0,-3,4,5,.3,7,'glass')
  box('Courtyard_paving',0,-9,.12,25,7,.24,'white');cyl('Courtyard_sculpture',7,-8,1.6,1,3,'gold')
 elif key=='currency':
  hall(0,4,25,13,7);box('Deep_portico',0,-4,7.3,27,5,.6,'ivory')
  for x in [-10,-5,0,5,10]:cyl('Portico_column',x,-5,3.5,.2,7)
  coin=cyl('Symbolic_coin',9,-9,2.6,2.3,.35,'gold');coin.rotation_euler.x=math.pi/2
 elif key=='education':
  hall(0,3,28,11,7,'red');box('Central_entry',0,-4,3.5,6,3,7,'ivory');roof(0,3,7.4,29,12)
  for x in [-10,-5,5,10]:box('Window_lintel',x,-2.7,5.3,2.2,.3,.3,'white')
 elif key=='prehistory':
  hall(-6,4,18,14,6,'stone');box('Glazed_wing',9,3,3,10,12,6,'glass');roof(-6,4,6.2,19,15)
  for x,y in [(7,-7),(11,-6)]:obj('Pit_house_roof','cone',(x,y,1.8),(2.7,2.7,3.6),'wood')
 elif key=='dunsan':
  for x,y,r in [(-7,4,4),(6,4,3.6),(0,-6,3)]:
   cyl('Excavation_ring',x,y,.16,r+.8,.3,'stone');obj('Pit_house_roof','cone',(x,y,2.2),(r,r,4.4),'wood');box('House_entry',x,y-r+.1,1,1.3,.2,2,'navy')
  deck([(-14,-11),(-11,-4),(-1,0),(12,-2)],.15,1.7,'path')
 elif key=='cemetery':
  hanok(0,6,20,8);box('Memorial_approach',0,-5,.1,10,15,.2,'stone')
  for x in [-10,10]:
   for y in [-9,-5,-1]:box('Memorial_stone',x,y,.7,.8,.4,1.4,'white')
  portal(0,-11,8)
 elif key=='big-tree':
  cyl('Central_tower',0,2,7,1.6,14,'wood')
  for a in [i*math.tau/6 for i in range(6)]:
   x=6*math.cos(a);y=2+6*math.sin(a);line('Branch_structure',[(0,2,5),(x*.6,2+(y-2)*.6,10),(x,y,15)],.35,'wood')
  cyl('Viewing_platform',0,2,15,7,.5,'wood')
  line('Viewing_guard',[(7*math.cos(i*math.tau/32),2+7*math.sin(i*math.tau/32),16) for i in range(33)],.12,'navy')
  for i in range(16):
   a=i*math.tau/16;cyl('Guard_post',7*math.cos(a),2+7*math.sin(a),15.5,.07,1,'navy')
 elif key=='worldcup':
  box('Football_pitch',0,0,.15,19,11,.2,'green');seats(0,0,11,7,0,math.tau)
  for x in [-9,9]:line('Goal_frame',[(x,-1.5,.3),(x,-1.5,2),(x,1.5,2),(x,1.5,.3)],.08,'white')
  line('Pitch_boundary',[(-9,-5,.3),(9,-5,.3),(9,5,.3),(-9,5,.3),(-9,-5,.3)],.05,'white')
  for y in [-10,10]:box('Grandstand_roof',0,y,5,29,3,.4,'white')
 elif key=='ballpark':
  cyl('Outfield',0,0,.2,11,.3,'green');diamond=box('Infield',0,-3,.42,7,7,.12,'path');diamond.rotation_euler.z=math.pi/4
  seats(0,0,11,9,math.pi,math.tau)
  box('Scoreboard',0,10,4,9,.5,5,'navy')
  for x in [-13,13]:
   cyl('Floodlight_mast',x,7,5,.15,10,'stone');box('Floodlight_array',x,7,10,3,.5,1,'white')
 elif key=='jokbo':
  hall(0,3,23,14,7,'stone');box('Glass_entrance',0,-4.2,3,9,.2,5,'glass');box('Floating_roof',0,2,7.5,26,17,.4,'white')
  for x in [-10,10]:box('Entry_wall',x,-7,1.3,3,3,2.6,'ivory')
 elif key=='hyo':
  hall(-5,3,21,15,12);hall(10,4,8,13,8);box('Foyer_glass',-4,-4.7,5,15,.2,9,'glass')
  for x in [-12,-8,-4,0,4]:box('Front_fin',x,-5.1,6,.25,.7,12,'white')
 elif key=='hoedeok':courtyard([(-7,-1,9,5),(7,-1,9,5),(0,8,14,6)]);hanok(0,-10,6,4)
 elif key=='jinjam':courtyard([(0,8,17,7),(-9,0,6,7)]);portal(0,-10,9)
 elif key=='sunghyeon':courtyard([(0,8,17,7),(-9,-1,5,8),(9,-1,5,8)]);hanok(0,-10,7,4)
 elif key=='hoyeon':courtyard([(-5,6,17,7),(8,-1,6,11)]);box('Timber_veranda',-5,1,.7,17,3,.4,'wood')
 elif key=='literature':
  hall(-6,2,17,15,9,'stone');hall(8,4,10,11,6);box('Glass_stair',1,-3,4.5,4,1,9,'glass')
  for x,rot in [(-1,-.22),(1,.22)]:
   book=box('Open_book_symbol',x,-9,1.3,2.5,2,.3,'white');book.rotation_euler.y=rot
 elif key=='temi-literature':
  hall(0,4,18,10,5);roof(0,4,5.2,19,11);box('Garden_path',0,-5,.1,3,9,.2,'stone')
  for x in [-7,7]:box('Reading_bench',x,-6,.8,4,.7,.3,'wood')
 elif key=='woodcraft':
  hall(-6,3,17,13,8,'wood');hall(9,4,10,11,5,'wood')
  for x in range(-14,3,2):box('Timber_facade_slat',x,-3.7,4,.16,.2,8,'gold')
  box('Workshop_glazing',9,-1.6,2.5,8,.2,4,'glass');box('Timber_deck',0,-7,.4,26,5,.8,'wood')
 elif key=='march38':
  hall(0,3,18,15,15,'stone');box('Vertical_glazed_cut',-2,-4.7,7.5,3,.2,14,'glass')
  for z in [4,8,12]:box('Horizontal_belt',0,3,z,18.5,15.5,.25,'white')
  box('Memorial_wall',10,-8,2.5,6,.6,5,'navy')
 elif key=='narae':
  hall(0,3,24,14,14);box('Foyer_glass',0,-4.2,6,20,.2,10,'glass')
  for x in range(-10,11,2):box('Lattice_vertical',x,-4.5,7,.14,.25,13,'wood')
  for z in range(1,14,2):box('Lattice_horizontal',0,-4.5,z,22,.25,.14,'wood')
 elif key=='yeonjeong':
  hall(-6,3,20,16,10,'stone');hall(10,4,10,14,7);roof(-4,3,10.4,29,18);box('Entry_glass',-4,-5.2,4.5,21,.2,8,'glass')
  for x in range(-13,8,4):cyl('Entry_column',x,-6,4.5,.18,9,'white')
 label(title)
roots=sorted([o for o in bpy.data.objects if o.name.startswith('landmark_')],key=lambda o:o.name)
assert len(roots)==50,len(roots)
for i,o in enumerate(roots):o.location=((i%10-4.5)*43,(2-i//10)*43,0)
scene=bpy.context.scene;cam=scene.camera
cam.location=(160,-380,480);cam.rotation_euler=(Vector((0,0,0))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=560
scene.render.engine='BLENDER_EEVEE';scene.render.resolution_x=1600;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
result={'landmarks':len(roots),'added':len(specs),'names':[o.name for o in roots],'status':'interpretive gallery models; not map placement'}
