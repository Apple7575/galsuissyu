"""Extract real mapped forecourt surfaces and trees; no invented footprints."""
import json, sys, osmium
from pathlib import Path

features=[]
def nearby(x,y): return 127.423<x<127.442 and 36.325<y<36.34
class Context(osmium.SimpleHandler):
 def node(self,n):
  if n.location.valid() and nearby(n.location.lon,n.location.lat) and n.tags.get('natural')=='tree':
   features.append(dict(type='Feature',id=n.id,properties=dict(kind='tree'),geometry=dict(type='Point',coordinates=[n.location.lon,n.location.lat])))
 def way(self,w):
  t=dict(w.tags)
  kind=''
  if t.get('area')=='yes' and t.get('highway') in ['pedestrian','footway']: kind='plaza'
  elif t.get('amenity')=='parking': kind='parking'
  elif t.get('landuse') in ['grass','flowerbed'] or t.get('leisure')=='garden': kind='garden'
  if not kind or len(w.nodes)<4 or w.nodes[0].ref!=w.nodes[-1].ref:return
  try:c=[[n.lon,n.lat] for n in w.nodes]
  except osmium.InvalidLocationError:return
  if not any(nearby(*p) for p in c):return
  features.append(dict(type='Feature',id=w.id,properties=dict(kind=kind,name=t.get('name',''),source='https://www.openstreetmap.org/way/'+str(w.id)),geometry=dict(type='Polygon',coordinates=[c])))
complete=True
try:Context().apply_file(sys.argv[1],locations=True,idx='flex_mem')
except RuntimeError as error:
 if 'unexpected EOF' not in str(error):raise
 complete=False
 print('Source snapshot is truncated; retaining only fully decoded OSM objects, not claiming complete coverage.')
if not features:raise RuntimeError('No mapped context available')
Path('public/data/station-context.json').write_text(json.dumps(dict(type='FeatureCollection',features=features,coverageComplete=complete,source='Geofabrik Korea OSM snapshot; only fully decoded objects retained')))
print('Mapped context:',len(features), 'features')
