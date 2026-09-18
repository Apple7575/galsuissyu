"""Extract compact, independently loadable GLBs from the approved Higgsfield scene.
Keeps real geometry/materials. No texture synthesis or visual flattening.
Usage: python3 scripts/split-pilot-assets.py /absolute/path/to/approved.glb
"""
import copy, hashlib, json, math, struct, sys
from pathlib import Path

source = Path(sys.argv[1])
out = Path(__file__).resolve().parents[1] / 'public/models/pilot'
out.mkdir(parents=True, exist_ok=True)
raw = source.read_bytes()
magic, version, length = struct.unpack_from('<III', raw)
assert (magic, version, length) == (0x46546C67, 2, len(raw))
jl = struct.unpack_from('<I', raw, 12)[0]
g = json.loads(raw[20:20 + jl])
binary = raw[28 + jl:]
assert not g.get('skins') and not g.get('animations') and not g.get('images')

# Prefixes describe meshes present in the source, not inferred Blender collections.
groups = [
 ('station', '대전역', ('StationMass','StationGlass','StationMullion','StationDoor','StationCanopy','StationColumn','StationRoof','StationSign','StationLabel','StationClock','ClockHands'), 1),
 ('bakery', '성심당 본점', ('BakeryMain','BakeryStone','BakeryPilaster','BakeryWindow','BakeryAwning','BakeryBalcony','BakeryRail','BakeryParapet','BakeryRound','BakerySign','BakeryLabel'), 1),
 ('metro', '지하철 출입구', ('MetroPlaza','MetroStep','MetroCanopy','MetroGlass','MetroSign','MetroLabel','MetroRoundel','MetroM'), 1),
 ('elevator', '엘리베이터', ('Elevator',), 1),
 ('toilet', '화장실', ('WC',), 1),
 ('bus', '저상버스·경사판', ('Bus',), 1),
 ('stop', '버스 정류장', ('Stop',), 1),
 ('wheelchair', '휠체어 여행자', ('WheelUser','Wheelchair'), .65),
 ('senior', '지팡이 이용자', ('Senior',), .55),
 ('stroller', '유아차와 보호자', ('Guardian','Stroller'), .55),
 ('tree', '가로수', ('RestTree',), 1),
 ('bench', '휴식 벤치', ('RestBench','RestLeg'), 1),
 ('lamp', '가로등', ('StreetLampPost_0','StreetLampHead_0'), 1),
 ('road', '도로·횡단보도·점자블록', ('Road','Sidewalk','LaneDash','Crosswalk','Tactile'), 1),
 ('pins', '장소 번호 핀', ('StationPin','BakeryPin','MetroPin'), 1),
 ('risk', '공사 위험 표지', ('Risk',), 1),
 ('shop', '저층 상가', ('ArchShop_',), 1),
 ('midrise', '중층 건물', ('ArchMid_',), 1),
 ('highrise', '고층 빌딩', ('ArchHigh_',), 1),
]

only = sys.argv[2] if len(sys.argv)>2 else None
revision = int(sys.argv[3]) if len(sys.argv)>3 else 3
manifest = {'version':1, 'sourceSha256':hashlib.sha256(raw).hexdigest(),
 'sourceProject':'492517c6-a7bf-4b2f-bcfc-ca029794e76e', 'sourceRevision':revision,
 'units':'metres', 'upAxis':'Y', 'origin':'ground-centre',
 'placementNote':'Model appearance is reconstructed. Coordinates and operational accessibility are separate records.', 'assets':[]}

for key, name, prefixes, scale in groups:
 if only and key!=only:continue
 if not only and key in ['shop','midrise','highrise']:continue
 indices=[i for i,n in enumerate(g['nodes']) if n.get('name','').startswith(prefixes) and 'mesh' in n]
 assert indices, key
 nmap={v:i+1 for i,v in enumerate(indices)}
 mids=sorted({g['nodes'][i]['mesh'] for i in indices}); mmap={v:i for i,v in enumerate(mids)}
 meshes=copy.deepcopy([g['meshes'][i] for i in mids])
 aids=set(); materials=set()
 for mesh in meshes:
  for p in mesh['primitives']:
   aids.update(p['attributes'].values())
   if 'indices' in p:aids.add(p['indices'])
   if 'material' in p:materials.add(p['material'])
 aids=sorted(aids); amap={v:i for i,v in enumerate(aids)}
 accessors=copy.deepcopy([g['accessors'][i] for i in aids])
 bids=sorted({a['bufferView'] for a in accessors}); bmap={v:i for i,v in enumerate(bids)}
 views=[]; data=bytearray()
 for bid in bids:
  view=copy.deepcopy(g['bufferViews'][bid]); offset=view.get('byteOffset',0)
  data.extend(b'\0' * ((-len(data))%4))
  view['byteOffset']=len(data);view['buffer']=0
  data.extend(binary[offset:offset+view['byteLength']]);views.append(view)
 for a in accessors:a['bufferView']=bmap[a['bufferView']]
 materials=sorted(materials); matmap={v:i for i,v in enumerate(materials)}
 for mesh in meshes:
  for p in mesh['primitives']:
   p['attributes']={k:amap[v] for k,v in p['attributes'].items()}
   if 'indices' in p:p['indices']=amap[p['indices']]
   if 'material' in p:p['material']=matmap[p['material']]
 nodes=[]
 for i in indices:
  n=copy.deepcopy(g['nodes'][i]);n['mesh']=mmap[n['mesh']]
  if 'children' in n:n['children']=[nmap[c] for c in n['children'] if c in nmap]
  nodes.append(n)
 # Find world bounds from accessor corners transformed by node TRS.
 corners=[]
 for n in nodes:
  t=n.get('translation',[0,0,0]);s=n.get('scale',[1,1,1]);qx,qy,qz,qw=n.get('rotation',[0,0,0,1])
  for p in meshes[n['mesh']]['primitives']:
   a=accessors[p['attributes']['POSITION']]
   for lx in [a['min'][0],a['max'][0]]:
    for ly in [a['min'][1],a['max'][1]]:
     for lz in [a['min'][2],a['max'][2]]:
      x,y,z=lx*s[0],ly*s[1],lz*s[2]
      tx=2*(qy*z-qz*y);ty=2*(qz*x-qx*z);tz=2*(qx*y-qy*x)
      corners.append((x+qw*tx+qy*tz-qz*ty+t[0],y+qw*ty+qz*tx-qx*tz+t[1],z+qw*tz+qx*ty-qy*tx+t[2]))
 low=[min(v[i] for v in corners) for i in range(3)];high=[max(v[i] for v in corners) for i in range(3)]
 root={'name':'pilot_'+key,'children':list(range(1,len(nodes)+1)),
  'translation':[-(low[0]+high[0])/2*scale,-low[1]*scale,-(low[2]+high[2])/2*scale],
  'scale':[scale]*3,'extras':{'assetId':key,'appearance':'reconstructed','groundOrigin':True}}
 doc={'asset':{'version':'2.0','generator':'Galsuissyu approved-scene splitter'},'scene':0,'scenes':[{'nodes':[0]}],
  'nodes':[root]+nodes,'meshes':meshes,'materials':[g['materials'][i] for i in materials],
  'accessors':accessors,'bufferViews':views,'buffers':[{'byteLength':len(data)}]}
 extensions=set()
 for m in doc['materials']:extensions.update(m.get('extensions',{}))
 if extensions:doc['extensionsUsed']=sorted(extensions)
 j=json.dumps(doc,separators=(',',':'),ensure_ascii=False).encode();j+=b' '*((-len(j))%4);data.extend(b'\0'*((-len(data))%4))
 output=struct.pack('<III',0x46546C67,2,28+len(j)+len(data))+struct.pack('<II',len(j),0x4E4F534A)+j+struct.pack('<II',len(data),0x004E4942)+data
 file=out/(key+'.glb');file.write_bytes(output)
 tris=sum((accessors[p['indices']]['count']//3 if 'indices' in p else accessors[p['attributes']['POSITION']]['count']//3) for n in nodes for p in meshes[n['mesh']]['primitives'])
 manifest['assets'].append({'id':key,'name':name,'url':'/models/pilot/'+key+'.glb','bytes':len(output),'meshes':len(nodes),'triangles':tris,'dimensions':[round((high[i]-low[i])*scale,3) for i in range(3)]})
if only:
 previous=json.loads((out/'manifest.json').read_text())
 asset=manifest['assets'][0]
 asset.update({'sourceRevision':revision,'sourceSha256':manifest['sourceSha256']})
 asset['sourceProject']=sys.argv[4] if len(sys.argv)>4 else manifest['sourceProject']
 if any(a['id']==only for a in previous['assets']):previous['assets']=[asset if a['id']==only else a for a in previous['assets']]
 else:previous['assets'].append(asset)
 manifest=previous
(out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
print(json.dumps(manifest,ensure_ascii=False))
