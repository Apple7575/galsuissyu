"""Add OSM water multipolygons that are composed of multiple ways.
Run after extract-daejeon.py, before build-city-tiles.mjs. Safe to repeat.
Usage: python scripts/augment-city-water.py country.osm.pbf
"""
import json,sys,osmium
from pathlib import Path
from shapely.geometry import shape,mapping
root=Path('research/city');public=Path('public/data')
city=shape(json.loads((root/'boundary-geocode.json').read_text())[0]['geojson'])
factory=osmium.geom.GeoJSONFactory();extra=[]
class Water(osmium.SimpleHandler):
 def area(self,a):
  if a.from_way():return
  t=dict(a.tags)
  if not (t.get('natural')=='water' or t.get('water') or t.get('landuse') in ['reservoir','basin']):return
  try:g=shape(json.loads(factory.create_multipolygon(a)))
  except Exception:return
  if not g.is_valid:g=g.buffer(0)
  if g.intersects(city.buffer(.005)):
   g=g.intersection(city)
   if not g.is_empty:extra.append({'type':'Feature','id':a.orig_id()+1000000000000,'geometry':mapping(g),'properties':{'name':t.get('name:ko') or t.get('name','')}})
Water().apply_file(sys.argv[1],locations=True,idx='flex_mem')
fc=json.loads((root/'water.geojson').read_text());fc['features']=[f for f in fc['features'] if f['id']<1000000000000]+extra
(root/'water.geojson').write_text(json.dumps(fc,ensure_ascii=False,separators=(',',':')))
overview=json.loads((public/'overview.json').read_text());overview['water']={**fc,'features':[{**f,'geometry':mapping(shape(f['geometry']).simplify(.00005,preserve_topology=True))} for f in fc['features']]}
(public/'overview.json').write_text(json.dumps(overview,ensure_ascii=False,separators=(',',':')))
for p in [root/'manifest.json',public/'manifest.json']:
 m=json.loads(p.read_text());m['counts']['water']=len(fc['features']);p.write_text(json.dumps(m,ensure_ascii=False,indent=2))
print(f'Water relations: {len(extra)}; total water polygons: {len(fc["features"])}')
