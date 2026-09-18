import bpy
s=bpy.context.scene
moved=[]
for o in s.objects:
 if o.name.startswith('TR01_tree41_'):
  o.location.x-=8
  moved.append(o.name)
 if o.type=='MESH' and (o.name.startswith('STREET_signal_') or o.name.startswith('STREET_bollard')):
  for v in o.data.vertices:
   if abs(v.co.x)<3.6:v.co.x+=.8 if v.co.x>0 else -.8
result={'entry_tree_moved':len(moved),'street_furniture':'relocated from road edge to sidewalk'}
