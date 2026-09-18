
import bpy, math, random
from mathutils import Vector
random.seed(812)
s=bpy.context.scene;s.frame_set(1)
# Preserve animated subjects and their editable hierarchy; replace blockout environment.
keep=set()
for o in list(bpy.data.objects):
 if o.name in ['WC01_main_traveler','HU01_walker','HU01_museum_visitor','BU01_blue_bus']:
  keep.add(o);keep.update(o.children_recursive)
for o in list(bpy.data.objects):
 if o not in keep and o.type not in ['CAMERA','LIGHT']:bpy.data.objects.remove(o,do_unlink=True)
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
# Urban ground continues beyond viewport, no toy display plinth.
box('GROUND_city',(0,3,-.5),(78,72,.8),'paving')
# Main road north-south, rear cross street, flank side street.
box('RD01_road',(0,0,-.25),(7,66,.20),'asphalt')
box('RD01_cross_street',(0,25,-.25),(76,7,.20),'asphalt')
box('RD01_east_street',(25,-7,-.25),(7,54,.2),'asphalt')
for y in range(-30,22,3):box('RD01_center_line',(0,y,-.137),(.09,1.3,.012),'yellow')
for x in range(-36,37,3):
 if abs(x)>5:box('RD01_center_line',(x,25,-.137),(1.3,.09,.012),'yellow')
for y in range(-30,20,3):box('RD01_center_line',(25,y,-.137),(.09,1.3,.012),'yellow')
for x in [-3.35,3.35]:
 for y in range(-32,21,10):box('RD01_edge_mark',(x,y,-.137),(.085,9.95,.012),'marking')
# Sidewalk paving: individual fine tiles rather than large flat slabs.
for side in [-1,1]:
 for y in range(-28,21):
  for col in range(3):
   x=side*(4+col)
   # Lowered curb opening. Remaining inner sidewalk remains flat.
   if -10.5<y<-7.5 and abs(x)<5:continue
   box('SW01_pavers',(x,y,-.075),(.985,.985,.15),random.choice(['paving','paving_light','paving_light']))
 for y in range(-28,21):
  if -11<y<-7:continue
  box('SW01_kerb',(side*3.52,y,-.09),(.20,.98,.18),'stone_white')
# Broad plaza and park path, grounded at same walking elevation.
for x in range(-23,-6):
 for y in range(-18,5):
  box('PLAZA_stone',(x+.5,y+.5,-.047),(.985,.985,.094),random.choice(['paving_light']*5+['paving','paving_warm']))
for x in [10,11,12]:
 for y in range(-19,21):box('PW01_path',(x,y,-.035),(.99,.99,.07),'paving_light')
for x in range(6,10):
 for y in [-10,-9,-8]:box('PW01_connection',(x,y,-.035),(.99,.99,.07),'paving_light')
# Three distinct planted beds with stone borders, shrubs and layered groundcover.
beds=[(8,5,2.6,28),(17,2,7,33),(-20,-15,6,4)]
for j,(x,y,w,d) in enumerate(beds):
 box('PARK_bed',(x,y,-.055),(w,d,.10),'grass')
 for dx in [-w/2,w/2]:box('PARK_border',(x+dx,y,.04),(.12,d,.15),'limestone')
 for dy in [-d/2,d/2]:box('PARK_border',(x,y+dy,.04),(w,.12,.15),'limestone')
# Crosswalk, real 3D curb transitions and tactile blister dots.
for x in [-2.9,-1.9,-.9,.1,1.1,2.1]:
 box('CR01_stripe',(x,-9,-.132),(.65,3,.018),'marking')
for side in [-1,1]:
 v,f=buf('CR01_ramp','paving_light');i=len(v)
 v.extend([(side*3.5,-10.5,-.145),(side*3.5,-7.5,-.145),(side*5,-7.5,.004),(side*5,-10.5,.004)]);f.append((i,i+1,i+2,i+3))
 box('CR01_tactile',(side*5.25,-9,.014),(.44,3,.028),'yellow')
 for y in [(-10.35+k*.17) for k in range(17)]:
  for x in [side*5.14,side*5.32]:ellipsoid('CR01_tactile_dots',(x,y,.038),(.025,.025,.012),'yellow',6,3)
# Crossings at top intersection visually ground city streets.
for y in [22.3,23.3,24.3,25.3,26.3,27.3]:
 for x in [-6,6]:box('CR01_north_crossing',(x,y,-.132),(3,.65,.018),'marking')
# Layered modern civic museum. Real recesses, pilasters, fenestration, stone joints.
x=-14;y=11;w=14;d=13;h=6.2
box('BL01_museum_core',(x,y,h/2),(w,d,h),'limestone')
box('BL01_west_wing',(-23,11,2.4),(4,10,4.8),'limestone')
# horizontal stone courses on side and front; reveal lines are recessed shadow seams
for z in [.8,1.6,2.4,3.2,4,4.8,5.6]:
 box('BL01_front_joint',(x,y-d/2-.006,z),(w,.016,.023),'joint')
 box('BL01_east_joint',(x+w/2+.006,y,z),(.016,d,.023),'joint')
for xx in [-20,-18,-16,-14,-12,-10,-8]:
 box('BL01_stone_seam',(xx,y-d/2-.012,3.4),(.025,.018,5.4),'joint')
# upper clerestory and deep front display windows
for xx in [-19.3,-17.2,-15.1,-13,-10.9,-8.8]:
 box('BL01_window_reveal',(xx,4.43,2.8),(1.86,.25,3.45),'navy')
 box('BL01_window_glass',(xx,4.28,2.8),(1.68,.055,3.26),'glass')
 for dx in [-.9,.9]:box('BL01_window_frame',(xx+dx,4.17,2.8),(.065,.10,3.5),'white_metal')
 for zz in [1.1,2.8,4.5]:box('BL01_window_frame',(xx,4.17,zz),(1.85,.1,.065),'white_metal')
 box('BL01_window_mullion',(xx,4.15,2.8),(.055,.10,3.5),'white_metal')
# window bands on side elevation
for yy in [7,10,13,16]:
 box('BL01_side_glass',(-6.94,yy,3),(.07,2.3,3.4),'glass_dark')
 for z in [1.3,3,4.7]:box('BL01_side_frame',(-6.87,yy,z),(.08,2.4,.08),'stone_white')
# roof cap and parapet, green rooftop courtyard, glass roof lanterns.
box('BL01_roof_cornice',(-14,11,6.18),(14.4,13.4,.26),'stone_white')
for xx in [-21,-7]:box('BL01_parapet',(xx,11,6.52),(.15,13,.6),'limestone')
for yy in [4.5,17.5]:box('BL01_parapet',(-14,yy,6.52),(14,.15,.6),'limestone')
box('BL01_roof_inner',(-14,11,6.34),(13.5,12.5,.07),'paving')
for xx in [-17,-11]:
 box('BL01_skylight_frame',(xx,11,6.59),(3.25,5.2,.38),'white_metal')
 box('BL01_skylight_glass',(xx,11,6.80),(3,5,.06),'glass')
 for yy in [9,10,11,12,13]:box('BL01_skylight_rib',(xx,yy,6.85),(3.15,.05,.07),'steel')
# Accessible central entrance at zero ground with sliding door, overhang and metal trims.
box('BL01_entry_surround',(-10,4.01,1.5),(2.5,.22,3),'navy')
for xx in [-10.55,-9.45]:
 box('BL01_entry_door',(xx,3.85,1.45),(1.05,.06,2.8),'glass_dark')
 rod('BL01_door_handle',(xx+.2,3.78,1.10),(xx+.2,3.78,1.75),.018,'steel')
box('BL01_portico',(-10,2.6,3.3),(5.4,3.7,.20),'stone_white')
box('BL01_portico_trim',(-10,.75,3.3),(5.4,.055,.11),'steel')
for xx in [-12.3,-7.7]:rod('BL01_portico_post',(xx,1.3,0),(xx,1.3,3.23),.065,'steel')
txt('BL01_museum_sign','DAEJEON  /  ART',(-15,4.09,5.15),.44,'navy')
# Peripheral urban blocks with genuine multi-story facade depth and rooftop detail.
def office(group,x,y,w,d,floors,style):
 h=floors*2.5
 box(group+'_mass',(x,y,h/2),(w,d,h),'limestone' if style%2 else 'stone_white')
 box(group+'_roof',(x,y,h+.08),(w+.2,d+.2,.16),'white_metal')
 for f in range(floors):
  z=f*2.5+1.35
  for j in range(max(2,int(w/1.5))):
   xx=x-w/2+.8+j*(w-1.6)/max(1,int(w/1.5)-1)
   box(group+'_glass',(xx,y-d/2-.025,z),(1.10,.06,1.82),'glass_dark' if (j+f)%3 else 'glass')
   for dx in [-.58,.58]:box(group+'_frame',(xx+dx,y-d/2-.07,z),(.055,.1,1.95),'white_metal')
   box(group+'_sill',(xx,y-d/2-.13,z-.96),(1.3,.28,.09),'limestone')
  for j in range(max(2,int(d/1.6))):
   yy=y-d/2+.9+j*(d-1.8)/max(1,int(d/1.6)-1)
   box(group+'_sideglass',(x+w/2+.03,yy,z),(.05,1.1,1.82),'glass')
  box(group+'_floor_band',(x,y-d/2-.07,f*2.5+.2),(w,.12,.16),'limestone')
 for xx in [x-w/2,x+w/2]:box(group+'_parapet',(xx,y,h+.35),(.12,d,.65),'limestone')
 for yy in [y-d/2,y+d/2]:box(group+'_parapet',(x,yy,h+.35),(w,.12,.65),'limestone')
 for j in range(2):
  xx=x+(j-.5)*2.1;box(group+'_roof_plant',(xx,y,h+.48),(1.5,1.6,.85),'white_metal')
  for k in range(5):box(group+'_vent',(xx,y-.83,h+.2+k*.12),(1.3,.035,.04),'navy')
 txt(group+'_shop','CAFE' if style%2 else 'GALLERY',(x,y-d/2-.12,.5),.3,'navy')
for args in [('CITY_W1',-31,12,9,12,5,0),('CITY_W2',-31,-6,9,10,4,1),('CITY_W3',-18,-25,12,8,3,1),('CITY_W4',-31,-23,8,8,5,0),('CITY_E1',33,9,9,13,5,1),('CITY_E2',33,-10,9,12,4,0),('CITY_N1',-19,34,15,9,5,0),('CITY_N2',0,34,10,9,4,1),('CITY_N3',16,34,10,9,5,0)]:
 office(*args)
# Curved avenue trees: branching trunks plus many small irregular leaf clusters.
def tree(group,x,y,height=4.5,radius=1.3):
 rod(group+'_trunk',(x,y,0),(x+.08,y,height*.72),.13,'bark')
 for j in range(5):
  a=j*math.tau/5+.3
  rod(group+'_branch',(x,y,height*.45),(x+math.cos(a)*radius*.55,y+math.sin(a)*radius*.55,height*.82),.055,'bark')
 # Dense irregular foliage, variable hue and size, no three-ball tree silhouette.
 for j in range(65):
  a=random.random()*math.tau;z=random.uniform(-.75,.95);r=math.sqrt(max(0,1-z*z))*radius*random.uniform(.38,1)
  px=x+math.cos(a)*r;py=y+math.sin(a)*r;pz=height*.77+z*radius*1.05
  rr=random.uniform(.23,.42)
  ellipsoid(group+'_leaves',(px,py,pz),(rr*1.05,rr,rr*1.25),random.choice(['leaf1','leaf2','leaf3','leaf4']),8,5)
 for j in range(14):
  a=random.random()*math.tau;r=random.random()*.6
  ellipsoid(group+'_groundcover',(x+math.cos(a)*r,y+math.sin(a)*r,.20),(.22,.2,.25),'leaf2',8,4)
positions=[(17,y) for y in [-15,-8,-1,6,13,19]]+[(8,y) for y in [-3,4,11,18]]+[(-21,y) for y in [-14,-6,1]]+[(-25,y) for y in [-25,-18,-11,-4,3,10,18]]+[(29,y) for y in [-25,-18,-11,-4,3,10,18]]+[(-14,-18),(-8,-18)]+[(x,29.5) for x in [-32,-25,-17,-9,6,14,22,31]]
for i,(x,y) in enumerate(positions):tree('TR01_tree%02d'%i,x,y,random.uniform(3.8,5.1),random.uniform(1.0,1.4))
# Low shrubs, white flowers and planting edges provide medium-scale detail.
for x,y,w,d in beds:
 for j in range(int(d*2)):
  py=y-d/2+.5+j*.5;px=x+random.uniform(-w*.35,w*.35)
  if abs(px-11)<1.7:continue
  ellipsoid('PARK_shrub',(px,py,.28),(.36,.3,.34),random.choice(['leaf1','leaf2']),8,4)
  if j%3==0:ellipsoid('PARK_flower',(px+.15,py,.56),(.06,.06,.075),'flower',6,3)
# Benches: narrow timber slats, curved-style steel arms with connected tubes.
for x,y in [(14,-5),(14,6),(-17,-5),(-8,-3),(-15,-14)]:
 for yy in [-.24,-.12,0,.12,.24]:box('BN01_seat',(x,y+yy,.47),(1.8,.09,.065),'wood')
 for z in [.75,.9,1.05]:box('BN01_back',(x,y+.34,z),(1.8,.065,.105),'wood')
 for dx in [-.65,.65]:
  rod('BN01_leg',(x+dx,y-.2,.02),(x+dx,y-.2,.46),.035,'navy')
  rod('BN01_back_post',(x+dx,y+.3,.02),(x+dx,y+.3,1.1),.03,'navy')
  rod('BN01_arm',(x+dx,y-.25,.7),(x+dx,y+.32,.7),.032,'navy')
# Detailed bus shelter: metal frames, glass with visibility bands, sign, timber seat.
for yy in [4,6,8]:rod('BS01_posts',(6.15,yy,0),(6.15,yy,2.7),.045,'steel')
box('BS01_roof',(5.4,6,2.82),(2.3,4.6,.14),'navy')
box('BS01_roof_edge',(4.25,6,2.79),(.04,4.6,.13),'white_metal')
for yy in [5,7]:
 box('BS01_glass',(6.2,yy,1.45),(.035,1.92,2.45),'glass')
 box('BS01_safety_band',(6.17,yy,1.2),(.018,1.92,.08),'white_metal')
for yy in [5,5.5,6,6.5,7]:box('BS01_seat',(5.83,yy,.5),(.5,.44,.065),'wood')
box('BS01_timetable',(6.10,4.1,1.6),(.07,.6,.9),'navy')
for z in [1.3,1.45,1.6,1.75]:box('BS01_timetable_lines',(6.04,4.1,z),(.025,.45,.025),'white_metal')
rod('BS01_stop_pole',(4.5,8.7,0),(4.5,8.7,3),.045,'steel')
box('BS01_stop_sign',(4.5,8.7,2.7),(.65,.12,.9),'blue')
txt('BS01_stop_text','BUS',(4.5,8.62,2.6),.19,'marking')
# Tactile guidance along shelter, broken at crossing.
for y in range(-5,10):box('SW01_tactile_line',(5.1,y,.017),(.22,.97,.024),'yellow')
# Street lamps, signals, textured drain covers.
for x,y in [(-6,-15),(6,15),(-6,17),(22,-16),(22,13)]:
 rod('STREET_lamp',(x,y,0),(x,y,5),.05,'steel');rod('STREET_lamp_arm',(x,y,4.9),(x+.7,y,4.9),.04,'steel')
 box('STREET_lamp_head',(x+.7,y,4.9),(.75,.32,.12),'navy');box('STREET_lamp_diffuser',(x+.7,y,4.83),(.65,.26,.025),'marking')
for x,y in [(-3.1,-12),(3.1,-6)]:
 rod('STREET_signal_pole',(x,y,0),(x,y,2.6),.045,'steel');box('STREET_signal_box',(x,y,2.35),(.22,.2,.56),'navy')
 ellipsoid('STREET_signal_light',(x,y-.11,2.18),(.064,.025,.064),'leaf2',10,5)
for x in [-3.2,3.2]:
 for y in [-18,-3,15]:
  rod('STREET_bollard',(x,y,0),(x,y,.72),.08,'navy')
  rod('STREET_bollard_band',(x,y,.55),(x,y,.62),.085,'yellow')
 for y in [-16,0,14]:
  box('STREET_drain',(x,y,-.127),(.45,.7,.025),'steel')
  for j in range(6):box('STREET_drain_slot',(x-.18+j*.07,y,-.11),(.03,.59,.012),'navy')
rod('SG01_signpost',(13,0,0),(13,0,2.3),.035,'steel')
box('SG01_sign',(13,0,2.05),(1.3,.1,.62),'navy');txt('SG01_text','WC  >',(13,-.06,1.94),.27,'marking')
# Fine route dots follow exact demo route and do not replace physical street surfaces.
for xx in [(-10+i*.8) for i in range(27)]:
 z=.025 if abs(xx)>5 else (-.12 if abs(xx)<3.5 else -.12+(abs(xx)-3.5)/1.5*.145)
 rod('Suggested route crossing',(xx,-9,z),(xx+.34,-9,z),.047,'route')
for yy in [(-9+i*.8) for i in range(13)]:rod('Suggested route park',(11,yy,.03),(11,yy+.34,.03),.047,'route')
# Create semantic meshes from buffers; smoothing for foliage only.
created=[]
for (group,matname,smooth),(verts,faces) in buckets.items():
 me=bpy.data.meshes.new(group+'_'+matname);me.from_pydata(verts,[],faces);me.update()
 ob=bpy.data.objects.new(group+'_'+matname,me);s.collection.objects.link(ob);ob.data.materials.append(mats[matname]);ob['design_revision']='architectural_03'
 if smooth:
  for p in me.polygons:p.use_smooth=True
 created.append(ob)
# Improve existing vehicle's flat surfaces with frame details, door seams, mirrors.
bus=bpy.data.objects['BU01_blue_bus']
def smallbox(name,loc,size,material,parent,bevel=.015):
 bpy.ops.mesh.primitive_cube_add(size=1);o=bpy.context.object;o.name=name;o.parent=parent;o.location=loc;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(material)
 if bevel:
  m=o.modifiers.new('Fine edge bevel','BEVEL');m.width=bevel;m.segments=2
 return o
for side in [-1,1]:
 for yy in [-4.5,-2.6,-.7,1.2,3.1,4.7]:
  smallbox('BU01_window_pillar',(side*1.28,yy,2.1),(.05,.045,1.18),mats['white_metal'],bus)
 smallbox('BU01_lower_trim',(side*1.27,0,1.3),(.035,10.7,.06),mats['white_metal'],bus)
 smallbox('BU01_mirror_arm',(side*1.46,-4.95,2.3),(.42,.035,.035),mats['navy'],bus)
 smallbox('BU01_mirror',(side*1.65,-4.95,2.17),(.09,.18,.32),mats['navy'],bus)
for yy in [-3.8,-2.7]:
 smallbox('BU01_entry_glass',(1.29,yy,1.53),(.035,1,2.25),mats['glass_dark'],bus)
 smallbox('BU01_door_seam',(1.32,yy,1.53),(.03,.035,2.27),mats['white_metal'],bus)
smallbox('BU01_destination_panel',(0,-5.54,2.72),(1.72,.04,.24),mats['navy'],bus)
smallbox('BU01_registration',(0,-5.55,.66),(.42,.035,.15),mats['yellow'],bus)
for yy in [-3.5,3.5]:
 for side in [-1,1]:
  for j in range(8):
   a=j*math.tau/8
   smallbox('BU01_wheel_bolt',(side*1.345,yy+math.cos(a)*.17,.55+math.sin(a)*.17),(.025,.035,.035),mats['navy'],bus,.008)
# subtle face/neck and clothing detail on the animated people.
for name in ['WC01_main_traveler','HU01_walker','HU01_museum_visitor']:
 p=bpy.data.objects[name];seated=name.startswith('WC01');z=1.31 if seated else 1.52
 bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=6);o=bpy.context.object;o.name=name+'_nose';o.parent=p;o.location=(0,-.185,z);o.scale=(.035,.04,.044);o.data.materials.append(bpy.data.materials['Skin'])
 for side in [-1,1]:
  bpy.ops.mesh.primitive_uv_sphere_add(segments=10,ring_count=6);o=bpy.context.object;o.name=name+'_ear';o.parent=p;o.location=(side*.175,0,z);o.scale=(.042,.035,.065);o.data.materials.append(bpy.data.materials['Skin'])
 smallbox(name+'_collar',(0,-.15,1.12 if seated else 1.32),(.13,.04,.07),mats['stone_white'],p)
# Unified bright daylight. No flat overexposure, soft contact shadows.
for o in list(bpy.data.objects):
 if o.type=='LIGHT':bpy.data.objects.remove(o,do_unlink=True)
def sun(n,energy,rotation,col):
 d=bpy.data.lights.new(n,'SUN');d.energy=energy;d.angle=.12;d.color=col;o=bpy.data.objects.new(n,d);s.collection.objects.link(o);o.rotation_euler=rotation
sun('Architecture key',3.0,(.45,-.65,-.55),(1,.96,.87));sun('Architecture fill',.8,(.6,.45,2.2),(.85,.93,1))
s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs[0].default_value=(.80,.88,1,1);s.world.node_tree.nodes['Background'].inputs[1].default_value=.7
s.render.engine='BLENDER_EEVEE';s.view_settings.view_transform='Khronos PBR Neutral';s.view_settings.exposure=.2
cam=s.camera;cam.location=(44,-58,50);cam.rotation_euler=(Vector((-3,4,1))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=61
s.frame_set(190);s.render.resolution_x=1200;s.render.resolution_y=1000;s.render.resolution_percentage=100
s['geography_status']='Daejeon-inspired design visualization; not surveyed geography'
s['architecture_revision']=3
doc=bpy.data.texts.get('README_GALSUISSYU');doc.write('\nArchitecture revision3: detailed facades, streets, foliage, urban context. Retains animation. Not geographic reconstruction.')
result={'static_meshes':len(created),'objects':len(bpy.data.objects),'triangles_approx':sum(len(p.vertices)-2 for o in created for p in o.data.polygons),'design':'Architectural miniature, detailed facade and leafy streets'}

