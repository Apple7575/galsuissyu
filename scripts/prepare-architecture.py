"""Package the inspected Higgsfield GLB and compact semantic component GLBs.

Run: python scripts/prepare-architecture.py /absolute/path/export.glb
Keeps the committed geometry; combines independent animations into one timeline.
"""
import copy, json, struct, sys
from pathlib import Path

src = Path(sys.argv[1]).read_bytes()
jlen = struct.unpack_from('<I', src, 12)[0]
scene = json.loads(src[20:20+jlen])
binary = src[28+jlen:]
dest = Path('public/models')
assert not scene.get('skins'), 'Review skeleton dependencies before packaging'

def write_glb(g, blob, path):
    g['buffers'] = [{'byteLength': len(blob)}]
    j = json.dumps(g, separators=(',', ':')).encode()
    j += b' ' * (-len(j) % 4)
    blob += b'\0' * (-len(blob) % 4)
    data = struct.pack('<4sII', b'glTF', 2, 28+len(j)+len(blob))
    data += struct.pack('<I4s', len(j), b'JSON')+j
    data += struct.pack('<I4s', len(blob), b'BIN\0')+blob
    path.write_bytes(data)
    print(path.name, len(data))

def merge_animations(g):
    merged = {'name': 'City demonstration', 'samplers': [], 'channels': []}
    for a in g.pop('animations', []):
        offset = len(merged['samplers'])
        merged['samplers'].extend(a['samplers'])
        for c in a['channels']:
            c['sampler'] += offset
            merged['channels'].append(c)
    if merged['channels']:
        g['animations'] = [merged]

full = copy.deepcopy(scene)
merge_animations(full)
write_glb(full, binary, dest/'district-architecture.glb')

def read_acc(g, index):
    a = g['accessors'][index]; v = g['bufferViews'][a['bufferView']]
    components = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[a['type']]
    fmt = {5126: 'f', 5125: 'I', 5123: 'H', 5121: 'B'}[a['componentType']]
    width = struct.calcsize(fmt)*components
    start = v.get('byteOffset', 0)+a.get('byteOffset', 0)
    stride = v.get('byteStride', width)
    return [struct.unpack_from('<'+fmt*components, binary, start+i*stride) for i in range(a['count'])]

def component(file, predicate, bounds=None):
    g = copy.deepcopy(scene)
    keep = set()
    def add(i):
        if i in keep: return
        keep.add(i)
        for child in g['nodes'][i].get('children', []): add(child)
    for i, node in enumerate(g['nodes']):
        if predicate(node.get('name', '')): add(i)
    parents = {child:i for i,n in enumerate(g['nodes']) for child in n.get('children', [])}
    for i in list(keep):
        while i in parents:
            i = parents[i]; keep.add(i)
    ids = sorted(keep); mapping = {old:new for new,old in enumerate(ids)}
    nodes = []
    for i in ids:
        n = g['nodes'][i]
        n.pop('extras', None)
        n.pop('camera', None)
        n.pop('extensions', None)
        n['children'] = [mapping[c] for c in n.get('children', []) if c in keep]
        if not n['children']: n.pop('children')
        nodes.append(n)
    g['nodes'] = nodes
    g['scenes'] = [{'nodes':[mapping[i] for i in ids if i not in parents or parents[i] not in keep]}]
    g['scene'] = 0
    for a in g.get('animations', []):
        a['channels'] = [c for c in a['channels'] if c['target']['node'] in keep]
        for c in a['channels']: c['target']['node'] = mapping[c['target']['node']]
    merge_animations(g)
    mesh_ids = sorted({n['mesh'] for n in nodes if 'mesh' in n})
    mesh_map = {old:new for new,old in enumerate(mesh_ids)}
    g['meshes'] = [g['meshes'][i] for i in mesh_ids]
    for n in nodes:
        if 'mesh' in n: n['mesh'] = mesh_map[n['mesh']]
    # A shared bench/paving mesh contains multiple units. Keep triangles from one unit.
    overrides = {}
    if bounds:
        x0,x1,z0,z1 = bounds
        for mesh in g['meshes']:
            retained=[]
            for p in mesh['primitives']:
                positions=read_acc(g,p['attributes']['POSITION'])
                indices=[v[0] for v in read_acc(g,p['indices'])]
                selected=[]
                for j in range(0,len(indices),3):
                    tri=indices[j:j+3]
                    cx=sum(positions[k][0] for k in tri)/3
                    cz=sum(positions[k][2] for k in tri)/3
                    if x0<=cx<=x1 and z0<=cz<=z1: selected.extend(tri)
                if not selected: continue
                used_vertices=sorted(set(selected)); vmap={old:new for new,old in enumerate(used_vertices)}
                overrides[p['indices']] = [(vmap[i],) for i in selected]
                for attr, index in p['attributes'].items():
                    data=read_acc(g,index)
                    overrides[index]=[data[i] for i in used_vertices]
                retained.append(p)
            mesh['primitives']=retained
    # Drop unused binary views so a single tree doesn't carry the full city download.
    used = set()
    for mesh in g['meshes']:
        for p in mesh['primitives']:
            used.update(p['attributes'].values()); used.add(p['indices'])
    for a in g.get('animations', []):
        needed=sorted({c['sampler'] for c in a['channels']})
        smap={old:new for new,old in enumerate(needed)}
        a['samplers']=[a['samplers'][i] for i in needed]
        for c in a['channels']:c['sampler']=smap[c['sampler']]
        for samp in a['samplers']:used.update((samp['input'],samp['output']))
    accmap={old:new for new,old in enumerate(sorted(used))}
    output=bytearray(); views=[]; accessors=[]
    for old in sorted(used):
        a=copy.deepcopy(g['accessors'][old]); v=copy.deepcopy(g['bufferViews'][a['bufferView']])
        output.extend(b'\0'*(-len(output)%4)); start=len(output)
        if old in overrides:
            values=overrides[old]
            fmt={5126:'f',5125:'I',5123:'H',5121:'B'}[a['componentType']]
            flat=[x for row in values for x in row]
            chunk=struct.pack('<'+fmt*len(flat),*flat)
            a.pop('byteOffset',None);a['count']=len(values)
            if 'min' in a:a['min']=[min(row[i] for row in values) for i in range(len(values[0]))]
            if 'max' in a:a['max']=[max(row[i] for row in values) for i in range(len(values[0]))]
            v={'target':v.get('target',34962)}
        else:
            begin=v.get('byteOffset',0); chunk=binary[begin:begin+v['byteLength']]
        output.extend(chunk)
        v.update(buffer=0,byteOffset=start,byteLength=len(chunk))
        a['bufferView']=len(views);views.append(v);accessors.append(a)
    for mesh in g['meshes']:
        for p in mesh['primitives']:
            p['attributes']={k:accmap[v] for k,v in p['attributes'].items()}
            p['indices']=accmap[p['indices']]
    for a in g.get('animations',[]):
        for samp in a['samplers']:
            samp['input']=accmap[samp['input']];samp['output']=accmap[samp['output']]
    for key in ['cameras','extensions','extensionsUsed','extensionsRequired']:g.pop(key,None)
    g['accessors']=accessors;g['bufferViews']=views
    # Empty primitives can arise when a color is absent from the selected paving patch.
    for n in nodes:
        if 'mesh' in n and not g['meshes'][n['mesh']]['primitives']:n.pop('mesh')
    write_glb(g,bytes(output),dest/'assets'/f'{file}.glb')

component('WC01_traveler',lambda n:n=='WC01_main_traveler')
component('HU01_person',lambda n:n=='HU01_walker')
component('BU01_bus',lambda n:n=='BU01_blue_bus')
component('BL01_museum',lambda n:n.startswith('BL01_'))
component('CR01_crossing',lambda n:n.startswith('CR01_') and 'north_crossing' not in n)
component('BS01_shelter',lambda n:n.startswith('BS01_'))
component('SG01_wc_sign',lambda n:n.startswith('SG01_'))
component('BN01_bench',lambda n:n.startswith('BN01_'),(12.8,15.2,3.7,6.3))
component('TR01_tree',lambda n:n.startswith('TR01_tree00_'))
component('SW01_sidewalk',lambda n:n.startswith('SW01_pavers') or n.startswith('SW01_kerb'),(-6.6,-3.4,-5,5))
component('PW01_path',lambda n:n.startswith('PW01_path'),(9.4,12.6,-5,5))
