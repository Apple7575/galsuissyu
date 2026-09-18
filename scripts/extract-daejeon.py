"""Extract a reproducible Daejeon subset from the Geofabrik Korea OSM snapshot.
Usage: python scripts/extract-daejeon.py country.osm.pbf city-nominatim.json
Install osmium and shapely for this offline build step. No extraction runs in the app.
"""
import osmium, json, sys, gzip, math, csv, re
from pathlib import Path
from collections import Counter
from shapely.geometry import shape, Point, LineString, Polygon, mapping
from shapely.ops import polygonize, unary_union
from shapely.prepared import prep

OUT=Path('public/data');RAW=Path('research/city');OUT.mkdir(exist_ok=True);RAW.mkdir(exist_ok=True)
boundary_record=json.load(open(sys.argv[2]))[0]
city=shape(boundary_record['geojson']); expanded=city.buffer(.003); prepared=prep(expanded)
bbox=(127.235,36.175,127.55,36.515)
district_ids={3890427,3890428,3889016,3889109,3888601}
layers={k:[] for k in ['building','road','park','water','waterway','rail','boundary']}
pois=[]; rawrows=[]; paths=[]; boundary_ways={}; relations=[]
date='2026-09-16';source='https://download.geofabrik.de/asia/south-korea.html'
def in_box(lon,lat):return bbox[0]<=lon<=bbox[2] and bbox[1]<=lat<=bbox[3]
def feature(oid,geom,props):return {'type':'Feature','id':oid,'geometry':mapping(geom),'properties':props}
def roundcoords(coords):return [[round(x,6),round(y,6)] for x,y in coords]
def category(t):
 if t.get('highway')=='elevator':return 'elevator'
 if t.get('amenity')=='toilets':return 'toilet'
 if t.get('railway') in ['station','halt'] and t.get('name'):return 'station'
 if t.get('tourism') in ['museum','gallery']:return 'culture'
 if t.get('tourism') in ['attraction','zoo','theme_park','viewpoint'] and t.get('name'):return 'attraction'
 if t.get('leisure') in ['park','garden'] and t.get('name'):return 'park'
 if t.get('amenity') in ['cafe','restaurant','fast_food','food_court'] and t.get('name'):return 'food'
 if t.get('amenity') in ['hospital','pharmacy','library','community_centre','townhall'] and t.get('name'):return 'public'
 if t.get('shop') in ['bakery','mall','department_store'] and t.get('name'):return 'shopping'
 return None
def add_poi(kind,oid,t,lon,lat):
 cat=category(t)
 if not cat or not city.covers(Point(lon,lat)):return
 ident=f'{kind}/{oid}'
 p={'id':ident,'name':t.get('name:ko') or t.get('name') or {'elevator':'엘리베이터','toilet':'화장실'}.get(cat,'장소'),
    'category':cat,'lon':round(lon,6),'lat':round(lat,6),'wheelchair':t.get('wheelchair','unknown'),
    'toiletWheelchair':t.get('toilets:wheelchair','unknown'),'access':t.get('access','unknown'),
    'hours':t.get('opening_hours',''),'phone':t.get('phone') or t.get('contact:phone',''),
    'website':t.get('website') or t.get('contact:website',''),'source':'https://www.openstreetmap.org/'+ident,
    'address':' '.join(t.get(x,'') for x in ['addr:city','addr:street','addr:housenumber']).strip(),
    'checkedAt':date,'facilities':[],'verified':False}
 if cat=='elevator':p['facilities'].append('elevator')
 if cat=='toilet' or t.get('toilets')=='yes':p['facilities'].append('toilet')
 if cat=='park':p['facilities'].append('park')
 pois.append(p);rawrows.append({'type':kind,'id':oid,'lat':lat,'lon':lon,'tags':t})
def meters(a,b):
 r=math.pi/180;dy=(b[1]-a[1])*r;dx=(b[0]-a[0])*r
 h=math.sin(dy/2)**2+math.cos(a[1]*r)*math.cos(b[1]*r)*math.sin(dx/2)**2
 return 12742000*math.atan2(math.sqrt(h),math.sqrt(max(0,1-h)))
def flags(t):
 f=0
 if t.get('highway')=='steps':f|=1
 if t.get('wheelchair')=='no':f|=2
 if t.get('surface') in ['gravel','fine_gravel','sand','dirt','earth','mud','grass','ground','cobblestone','sett','unpaved']:f|=4
 incline=t.get('incline','');m=re.fullmatch(r'\s*([-+]?\d+(?:\.\d+)?)\s*(%|°|deg)?\s*',incline)
 slope=None
 if m:
  value=abs(float(m.group(1)))
  slope=math.tan(math.radians(value))*100 if m.group(2) in ['°','deg'] and value<90 else value
 if slope is not None and slope>5:f|=8
 if t.get('wheelchair') not in ['yes','designated']:f|=16
 if not t.get('surface'):f|=32
 if slope is None:f|=64
 return f

class Extract(osmium.SimpleHandler):
 def node(self,n):
  if not n.location.valid() or not in_box(n.location.lon,n.location.lat) or not n.tags:return
  t=dict(n.tags)
  if category(t):add_poi('node',n.id,t,n.location.lon,n.location.lat)
 def way(self,w):
  if len(w.nodes)<2:return
  try:coords=[(n.lon,n.lat) for n in w.nodes]
  except osmium.InvalidLocationError:return
  if not any(in_box(x,y) for x,y in coords):return
  t=dict(w.tags);line=LineString(coords)
  if not prepared.intersects(line):return
  if t.get('boundary') or not t:boundary_ways[w.id]=coords
  closed=w.nodes[0].ref==w.nodes[-1].ref and len(coords)>=4
  geom=Polygon(coords) if closed else line
  if closed and not geom.is_valid:geom=geom.buffer(0)
  if geom.is_empty:return
  if category(t):
   p=geom.representative_point();add_poi('way',w.id,t,p.x,p.y)
  name=t.get('name:ko') or t.get('name','')
  if t.get('building') and t['building']!='no' and closed:
   raw=t.get('height','');levels=t.get('building:levels','');known=False
   try:h=float(re.search(r'\d+(?:\.\d+)?',raw).group());known=True
   except Exception:
    try:h=float(levels)*3.2;known=True
    except Exception:h=9 if t['building'] not in ['garage','garages','shed','roof'] else 3
   h=min(260,max(2,h));layers['building'].append(feature(w.id,geom,{'name':name,'h':round(h,1),'known':int(known),'kind':t['building']}))
  if t.get('highway'):
   highway=t['highway']
   layers['road'].append(feature(w.id,line,{'name':name,'kind':highway,'bridge':int(t.get('bridge')=='yes'),'tunnel':int(t.get('tunnel')=='yes')}))
   walk=highway in ['footway','path','pedestrian','living_street','residential','service','unclassified','tertiary','secondary','primary','steps','track','cycleway']
   if walk and t.get('foot') not in ['no','private'] and (t.get('access') not in ['no','private'] or t.get('foot') in ['yes','designated','permissive']):
    paths.append({'id':w.id,'nodes':[n.ref for n in w.nodes],'coords':roundcoords(coords),'flags':flags(t)})
  if t.get('railway') in ['rail','subway','light_rail','tram']:layers['rail'].append(feature(w.id,line,{'name':name,'kind':t['railway']}))
  if t.get('waterway') in ['river','stream','canal']:layers['waterway'].append(feature(w.id,line,{'name':name,'kind':t['waterway']}))
  if closed and (t.get('natural')=='water' or t.get('water') or t.get('landuse') in ['reservoir','basin']):layers['water'].append(feature(w.id,geom,{'name':name}))
  if closed and (t.get('leisure') in ['park','garden','nature_reserve'] or t.get('landuse') in ['forest','grass','meadow','recreation_ground'] or t.get('natural') in ['wood','grassland']):layers['park'].append(feature(w.id,geom,{'name':name,'kind':t.get('leisure') or t.get('landuse') or t.get('natural')}))
 def relation(self,r):
  if r.id in district_ids:
   relations.append({'id':r.id,'tags':dict(r.tags),'members':[m.ref for m in r.members if m.type=='w' and m.role=='outer']})

print('Extracting OSM geometry and tags…',flush=True)
reader=osmium.io.Reader(sys.argv[1]);header=reader.header();snapshot=header.get('osmosis_replication_timestamp');reader.close()
Extract().apply_file(sys.argv[1],locations=True,idx='flex_mem')
districts=[]
for r in relations:
 parts=[LineString(boundary_ways[i]) for i in r['members'] if i in boundary_ways]
 if not parts:continue
 polys=list(polygonize(unary_union(parts)))
 if not polys:continue
 poly=unary_union(polys);name=r['tags'].get('name:ko') or r['tags']['name'];c=poly.representative_point()
 districts.append({'name':name,'id':str(r['id']),'center':[round(c.x,6),round(c.y,6)],'bounds':list(poly.bounds),'geometry':mapping(poly)})
 layers['boundary'].append(feature(r['id'],poly,{'name':name}))
 for p in pois:
  if poly.covers(Point(p['lon'],p['lat'])):p['district']=name
layers['boundary'].append(feature(2349984,city,{'name':'대전광역시','city':1}))
for name,features in layers.items():
 (RAW/f'{name}.geojson').write_text(json.dumps({'type':'FeatureCollection','features':features},ensure_ascii=False,separators=(',',':')))
 print(name,len(features),flush=True)
unique={}
for p in pois:
 # Preserve separately mapped entrances/toilets; de-duplicate identical named venue centroids.
 k=(p['name'],p['category'],round(p['lon'],4),round(p['lat'],4))
 if k not in unique or p['wheelchair']!='unknown':unique[k]=p
pois=list(unique.values())
(OUT/'places.json').write_text(json.dumps({'snapshot':snapshot,'collectedAt':date,'source':source,'places':pois,'districts':districts},ensure_ascii=False,separators=(',',':')))
boundary_fc={'type':'FeatureCollection','features':layers['boundary']}
(OUT/'boundary.json').write_text(json.dumps(boundary_fc,ensure_ascii=False,separators=(',',':')))
with gzip.open(RAW/'raw-place-rows.json.gz','wt',encoding='utf8') as f:json.dump(rawrows,f,ensure_ascii=False)
with open(RAW/'raw-place-rows.csv','w',newline='',encoding='utf-8-sig') as f:
 out=csv.writer(f);out.writerow(['type','id','name','lat','lon','wheelchair','toilets:wheelchair','opening_hours','access','source'])
 for row in rawrows:
  t=row['tags'];out.writerow([row['type'],row['id'],t.get('name',''),row['lat'],row['lon'],t.get('wheelchair',''),t.get('toilets:wheelchair',''),t.get('opening_hours',''),t.get('access',''),f"https://www.openstreetmap.org/{row['type']}/{row['id']}"])
# Compress degree-two vertices into geometrically faithful route edges.
counts=Counter(n for p in paths for n in p['nodes']);nodes=[];node_map={};edges=[]
def nodeid(oid,coord):
 if oid not in node_map:node_map[oid]=len(nodes);nodes.append(coord)
 return node_map[oid]
for p in paths:
 start=0
 for end in range(1,len(p['nodes'])):
  if end==len(p['nodes'])-1 or counts[p['nodes'][end]]>1:
   pts=p['coords'][start:end+1];a=nodeid(p['nodes'][start],pts[0]);b=nodeid(p['nodes'][end],pts[-1]);dist=sum(meters(x,y) for x,y in zip(pts,pts[1:]))
   if a!=b and dist>0:edges.append([a,b,round(dist,1),p['flags'],pts,p['id']])
   start=end
(OUT/'walk-network.json').write_text(json.dumps({'snapshot':snapshot,'nodes':nodes,'edges':edges},separators=(',',':')))
# A vector compatibility overview remains usable without WebGL, and is honestly 2D.
overview={k:{'type':'FeatureCollection','features':[feature(f['id'],shape(f['geometry']).simplify(.00005,preserve_topology=True),f['properties']) for f in fs if k!='road' or f['properties']['kind'] in ['primary','secondary','tertiary','motorway','trunk']]} for k,fs in layers.items() if k in ['water','waterway','park','road','boundary']}
(OUT/'overview.json').write_text(json.dumps(overview,ensure_ascii=False,separators=(',',':')))
stats={'snapshot':snapshot,'collectedAt':date,'source':source,'counts':{k:len(v) for k,v in layers.items()},'places':len(pois),'districts':[d['name'] for d in districts],'routeNodes':len(nodes),'routeEdges':len(edges)}
(RAW/'manifest.json').write_text(json.dumps(stats,ensure_ascii=False,indent=2));(OUT/'manifest.json').write_text(json.dumps(stats,ensure_ascii=False))
print(json.dumps(stats,ensure_ascii=False,indent=2),flush=True)
