"""Cache public terrain tiles and a conservative ~90 m sampling grid locally."""
import concurrent.futures,io,json,math,time
from pathlib import Path
import requests,numpy as np
from PIL import Image
Z=12;N=2**Z;bounds=[127.21,36.15,127.58,36.54]
def tile(lon,lat):return ((lon+180)/360*N,(1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2*N)
x0,y1=map(math.floor,tile(bounds[0],bounds[1]));x1,y0=map(math.floor,tile(bounds[2],bounds[3]))
root=Path('public/data/terrain');root.mkdir(parents=True,exist_ok=True)
def get(p):
 x,y=p;path=root/str(Z)/str(x)/(str(y)+'.png');path.parent.mkdir(parents=True,exist_ok=True)
 for attempt in range(3):
  try:
   if path.exists():raw=path.read_bytes()
   else:
    r=requests.get(f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{Z}/{x}/{y}.png',timeout=30);r.raise_for_status();raw=r.content
   im=Image.open(io.BytesIO(raw)).convert('RGB');im.load();assert im.size==(256,256)
   path.write_bytes(raw);a=np.asarray(im,dtype=float);return x,y,a[:,:,0]*256+a[:,:,1]+a[:,:,2]/256-32768
  except Exception:
   if attempt==2:raise
   time.sleep(1)
mosaic=np.empty(((y1-y0+1)*256,(x1-x0+1)*256))
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
 for x,y,a in pool.map(get,[(x,y) for x in range(x0,x1+1) for y in range(y0,y1+1)]):mosaic[(y-y0)*256:(y-y0+1)*256,(x-x0)*256:(x-x0+1)*256]=a
# Decimation after 3x3 averaging; no road-scale precision claim.
h,w=mosaic.shape;h=h//3*3;w=w//3*3
grid=mosaic[:h,:w].reshape(h//3,3,w//3,3).mean(axis=(1,3))
out=dict(zoom=Z,x0=x0,y0=y0,step=3,offset=1.5,width=w//3,height=h//3,values=np.round(grid,1).ravel().tolist(),source='Mapzen Terrain Tiles / SRTM and other sources',sourceUrl='https://registry.opendata.aws/terrain-tiles/',resolution='약 90m 격자 · 지형 추정',downloaded='2026-09-18')
out['excludedWays']=[f['id'] for f in json.loads(Path('research/city/road.geojson').read_text())['features'] if f['properties'].get('bridge') or f['properties'].get('tunnel')]
Path('public/data/elevation-grid.json').write_text(json.dumps(out,separators=(',',':')))
print(json.dumps(dict(tiles=(x1-x0+1)*(y1-y0+1),grid=[w//3,h//3],min=float(grid.min()),max=float(grid.max()))))
