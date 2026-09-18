"""Repair source-backed map geometry; never invent missing buildings or bridges.
Usage: python scripts/repair-map-geometry.py country.osm.pbf
Run before build-city-tiles.mjs. Idempotent; leaves original route edges intact,
marking water crossings without bridge/tunnel evidence unavailable for routing.
"""
import json, math, sys, re
from pathlib import Path
import osmium
import numpy as np
from shapely.geometry import shape, mapping, LineString, Point, Polygon
from shapely.ops import transform, unary_union
from shapely.strtree import STRtree

raw=Path('research/city'); public=Path('public/data')
def read(p): return json.loads(p.read_text())
def save(p,d): p.write_text(json.dumps(d,ensure_ascii=False,separators=(',',':')))
city=shape(read(raw/'boundary-geocode.json')[0]['geojson'])
sx,sy=89500,111320
def metric(g): return transform(lambda x,y,z=None:((np.asarray(x)-127.4)*sx,(np.asarray(y)-36.3)*sy),g)
def geographic(g): return transform(lambda x,y,z=None:(np.asarray(x)/sx+127.4,np.asarray(y)/sy+36.3),g)
buildings=read(raw/'building.geojson'); roads=read(raw/'road.geojson')
road_by_id={f['id']:f for f in roads['features']}
factory=osmium.geom.GeoJSONFactory(); relations=[]
def height(t):
 try: return max(2,min(260,float(re.search(r'\d+(?:\.\d+)?',t['height']).group()))),1
 except Exception:
  try: return max(2,min(260,float(t['building:levels'])*3.2)),1
  except Exception: return 9,0
class Supplement(osmium.SimpleHandler):
 def way(self,w):
  f=road_by_id.get(w.id)
  if not f:return
  t=dict(w.tags); p=f['properties']
  p['bridge']=int(t.get('bridge','no') not in ('no','false','0',''))
  p['tunnel']=int(t.get('tunnel','no') not in ('no','false','0',''))
  p['ford']=int(t.get('ford','no') not in ('no','false','0',''))
  try:p['width']=float(t.get('width','').split()[0])
  except Exception:p['width']=0
  try:p['lanes']=float(t.get('lanes',0))
  except Exception:p['lanes']=0
 def area(self,a):
  if a.from_way() or not a.tags.get('building') or a.tags.get('building')=='no':return
  try:g=shape(json.loads(factory.create_multipolygon(a)))
  except Exception:return
  if not g.is_valid:g=g.buffer(0)
  if g.is_empty or not g.intersects(city):return
  t=dict(a.tags);h,known=height(t)
  relations.append({'type':'Feature','id':a.orig_id()+1000000000000,'geometry':mapping(g),'properties':{'name':t.get('name:ko') or t.get('name',''),'h':h,'known':known,'kind':t['building'],'source':'relation'}})
Supplement().apply_file(sys.argv[1],locations=True,idx='flex_mem')
print('OSM scan complete:',len(relations),'building relations',flush=True)
# Relation geometry retains courtyards. Drop matching outer-way duplicates only.
rel_shapes=[shape(f['geometry']) for f in relations]
rel_tree=STRtree(rel_shapes) if rel_shapes else None
kept=[];duplicates=0
for f in buildings['features']:
 if f['id']>=1000000000000:continue
 g=shape(f['geometry'])
 if rel_tree is not None and any(g.intersection(rel_shapes[i]).area/max(g.area,1e-15)>.98 for i in rel_tree.query(g)):
  duplicates+=1;continue
 kept.append(f)
buildings['features']=kept+relations;save(raw/'building.geojson',buildings);save(raw/'road.geojson',roads)

# Place modules strictly inside their source footprint, including all roof overhangs.
by_id={f['id']:f for f in buildings['features']};fit_reports=[]
def fit(spec):
 g=metric(shape(by_id[spec['buildingId']]['geometry']));r=g.minimum_rotated_rectangle
 pts=list(r.exterior.coords);a,b=pts[0],pts[1];angle=math.atan2(b[1]-a[1],b[0]-a[0]);w=math.dist(a,b);d=math.dist(pts[1],pts[2]);center=r.centroid
 # Station's long frontage stays along the long footprint axis.
 if w<d:w,d=d,w;angle+=math.pi/2
 co,si=math.cos(angle),math.sin(angle)
 scale=.98
 while scale>.05:
  corners=[(center.x+x*co-y*si,center.y+x*si+y*co) for x,y in [(-w*scale/2,-d*scale/2),(w*scale/2,-d*scale/2),(w*scale/2,d*scale/2),(-w*scale/2,d*scale/2)]]
  if g.buffer(-.15).covers(Polygon(corners)):break
  scale-=.02
 if scale<=.05:return None
 result={**spec,'coordinate':[center.x/sx+127.4,center.y/sy+36.3],'dimensions':[w*scale,spec['dimensions'][1],d*scale],'angle':angle,'footprint':mapping(geographic(g))}
 fit_reports.append({'id':spec['buildingId'],'footprintScale':round(scale,2)})
 return result
placements=read(public/'architecture-placements.json')
placements['placements']=[v for p in placements['placements'] if (v:=fit(p))]
save(public/'architecture-placements.json',placements)
landmarks=[]
for ident,asset,h in [(254986473,'station',18),(818788759,'bakery',11.2)]:
 p=fit({'buildingId':ident,'asset':asset,'dimensions':[1,h,1]})
 if p:landmarks.append(p)
save(public/'landmark-footprints.json',landmarks)

bridges=[]
for f in roads['features']:
 p=f['properties']
 if not p['bridge']:continue
 pedestrian=p['kind'] in ['footway','path','steps','cycleway','pedestrian']
 width=p['width'] or (max(1,p['lanes'])*3.2+1.6 if p['lanes'] else 3 if pedestrian else 10)
 width=max(1.5,min(45,width))
 bridges.append({**f,'properties':{**p,'width':width,'widthEstimated':not bool(p['width']),'source':f"https://www.openstreetmap.org/way/{f['id']}"}})
save(public/'bridges.json',{'type':'FeatureCollection','features':bridges})

waters=[metric(shape(f['geometry'])) for f in read(raw/'water.geojson')['features']]
waters=[g.buffer(0) for g in waters if not g.is_empty];water=unary_union(waters)
# The same precise water geometry prevents straight endpoint connectors across water.
water_geo=mapping(geographic(water.simplify(.3,preserve_topology=True)))
network=read(public/'walk-network.json');blocked=[];bridge_edges=0
for e in network['edges']:
 p=road_by_id.get(e[5],{}).get('properties',{});e[3]&=127
 if p.get('bridge'):e[3]|=128;bridge_edges+=1
 elif not p.get('tunnel'):
  line=metric(LineString(e[4]));wet=line.intersection(water)
  if wet.length>2 or p.get('ford'):e[3]|=256;blocked.append(e[5])
network['waterBarriers']=water_geo
save(public/'walk-network.json',network)
report={'buildingRelationsAdded':len(relations),'duplicateOuterWaysRemoved':duplicates,'buildings':len(buildings['features']),'bridges':len(bridges),'bridgeEdges':bridge_edges,'unverifiedWaterCrossingWays':sorted(set(blocked)),'footprintFits':fit_reports,'note':'OSM coverage remains incomplete. Bridge widths without tags and landmark details are schematic, not surveyed accessibility evidence.'}
save(raw/'geometry-repair-report.json',report)
for p in [raw/'manifest.json',public/'manifest.json']:
 m=read(p);m['counts']['building']=len(buildings['features']);m['counts']['bridge']=len(bridges);save(p,m)
print(json.dumps({k:v for k,v in report.items() if k not in ['footprintFits','unverifiedWaterCrossingWays']},ensure_ascii=False),flush=True)
print('Unverified water-crossing ways excluded:',len(set(blocked)),flush=True)
