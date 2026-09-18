"""Conservatively supplement existing footprints, preserving all OSM IDs."""
import hashlib,json,sys,collections
from pathlib import Path
import pyarrow.parquet as pq
from shapely import from_wkb
from shapely.geometry import shape,mapping
from shapely.ops import transform
from shapely.strtree import STRtree
from shapely.prepared import prep
root=Path('research/city')
def read(n):return json.loads((root/(n+'.geojson')).read_text())
def metric(g):return transform(lambda x,y,z=None:((x-127.4)*89500,(y-36.35)*111320),g)
def geographic(g):return transform(lambda x,y,z=None:(x/89500+127.4,y/111320+36.35),g)
base=read('building');base['features']=[f for f in base['features'] if f['properties'].get('source')!='overture']
city=prep(metric(shape(next(f['geometry'] for f in read('boundary')['features'] if f['properties'].get('city')))))
existing=[metric(shape(f['geometry'])) for f in base['features']];bt=STRtree(existing)
roads=[]
for f in read('road')['features']:
 p=f['properties']
 if p.get('bridge') or p.get('tunnel'):continue
 width={'motorway':5,'trunk':4,'primary':4,'secondary':3,'tertiary':2.5,'residential':1.8,'living_street':1.5}.get(p['kind'])
 if width:roads.append(metric(shape(f['geometry'])).buffer(width,cap_style=2))
rt=STRtree(roads);water=[metric(shape(f['geometry'])) for f in read('water')['features']];wt=STRtree(water)
report=collections.Counter();candidates=[];sources=collections.Counter();source_rows=[]
rows=pq.read_table(sys.argv[1]).to_pylist()
for row in rows:
 g=metric(from_wkb(row['geometry']))
 if not g.is_valid:g=g.buffer(0)
 if g.is_empty or g.geom_type not in ('Polygon','MultiPolygon') or not city.covers(g.representative_point()):report['outside_or_invalid']+=1;continue
 if row['is_underground'] or g.area<16:report['underground_or_tiny']+=1;continue
 if any(g.intersection(existing[i]).area>max(2,min(g.area,existing[i].area)*.05) for i in bt.query(g)):report['existing_overlap']+=1;continue
 if any(g.intersection(roads[i]).area>max(3,g.area*.03) for i in rt.query(g)):report['road_conflict']+=1;continue
 if any(g.intersection(water[i]).area>g.area*.05 for i in wt.query(g)):report['water_conflict']+=1;continue
 confidence=min((s['confidence'] for s in row['sources'] if s.get('confidence') is not None),default=1)
 if confidence<.8:report['low_confidence']+=1;continue
 candidates.append((row,g))
ct=STRtree([g for _,g in candidates]);accepted=set()
for n,(row,g) in enumerate(candidates):
 if any(i in accepted and g.intersection(candidates[i][1]).area>max(2,min(g.area,candidates[i][1].area)*.08) for i in ct.query(g)):report['supplement_overlap']+=1;continue
 accepted.add(n);h=row['height'];floors=row['num_floors'];known=h is not None or floors is not None
 if h is None:h=floors*3.2 if floors else 8
 ident=2000000000000+int(hashlib.sha1(row['id'].encode()).hexdigest()[:10],16)
 base['features'].append(dict(type='Feature',id=ident,geometry=mapping(geographic(g)),properties=dict(name=(row['names'] or {}).get('primary',''),h=round(max(2,min(260,h)),1),known=int(known),kind=row['subtype'] or 'yes',source='overture',gers=row['id'])))
 for s in row['sources']:sources[s['dataset']]+=1
 source_rows.append(dict(id=ident,gers=row['id'],sources=row['sources'],heightKnown=known))
report.update(input=len(rows),existing=len(existing),added=len(accepted),total=len(base['features']))
(root/'building.geojson').write_text(json.dumps(base,separators=(',',':'),ensure_ascii=False))
(root/'building-supplement-sources.json').write_text(json.dumps(dict(release='2026-08-19.0',rows=source_rows),separators=(',',':'),ensure_ascii=False))
(root/'building-coverage-report.json').write_text(json.dumps(dict(counts=dict(report),sources=dict(sources),release='2026-08-19.0',method='Preserve OSM; reject duplicate, road/water conflict and low confidence additions. Missing heights rendered at 8m, not measured.'),indent=2))
print(json.dumps(dict(report)))
