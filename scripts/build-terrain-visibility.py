"""Render measured DEM values as a subtle hypsometric layer and 20m contours."""
import json,math
from pathlib import Path
import numpy as np,contourpy
from PIL import Image
root=Path('public/data');g=json.loads((root/'elevation-grid.json').read_text());a=np.array(g['values']).reshape(g['height'],g['width'])
stops=np.array([0,60,150,300,600,900]);colors=np.array([[197,226,205],[204,227,193],[218,219,162],[219,200,153],[196,173,147],[170,156,148]])
rgb=np.stack([np.interp(a,stops,colors[:,i]) for i in range(3)],axis=-1).astype('uint8');Image.fromarray(rgb).save(root/'terrain-elevation.png')
def ll(x,y):
 px=g['x0']*256+g['offset']+x*g['step'];py=g['y0']*256+g['offset']+y*g['step'];n=256*2**g['zoom']
 return [round(px/n*360-180,6),round(math.degrees(math.atan(math.sinh(math.pi*(1-2*py/n)))),6)]
generator=contourpy.contour_generator(z=a);features=[]
for height in range(20,int(a.max())+1,20):
 for line in generator.lines(height):
  if len(line)<5:continue
  features.append(dict(type='Feature',properties=dict(elevation=height,major=int(height%100==0)),geometry=dict(type='LineString',coordinates=[ll(x,y) for x,y in line])))
Path('research/city/terrain-contours.geojson').write_text(json.dumps(dict(type='FeatureCollection',features=features),separators=(',',':')))
stylepath=root/'map-style.json';style=json.loads(stylepath.read_text());style['sources']['terrain-tint']={'type':'image','url':'/data/terrain-elevation.png','coordinates':[ll(-.5,-.5),ll(g['width']-.5,-.5),ll(g['width']-.5,g['height']-.5),ll(-.5,g['height']-.5)]}
style['sources']['terrain-contours']={'type':'vector','tiles':['/data/contour-tiles/{z}/{x}/{y}.pbf'],'minzoom':11,'maxzoom':14,'bounds':[127.21,36.15,127.58,36.54]}
style['layers']=[l for l in style['layers'] if l['id'] not in ['terrain-tint','terrain-contours','terrain-contour-labels']]
at=next(i for i,l in enumerate(style['layers']) if l['id']=='city-water')
style['layers'].insert(at,{'id':'terrain-tint','type':'raster','source':'terrain-tint','paint':{'raster-opacity':.46,'raster-fade-duration':0}})
shade=next(l for l in style['layers'] if l['id']=='terrain-shading');shade['paint'].update({'hillshade-exaggeration':.55,'hillshade-shadow-color':'#465b50','hillshade-highlight-color':'#ffffee','hillshade-accent-color':'#778568'})
at=next(i for i,l in enumerate(style['layers']) if l['id']=='road-casing')
style['layers'][at:at]=[
 {'id':'terrain-contours','type':'line','source':'terrain-contours','minzoom':11,'paint':{'line-color':'#7c876e','line-opacity':['interpolate',['linear'],['zoom'],11,.22,14,.45,18,.27],'line-width':['case',['==',['get','major'],1],1.25,.65]}},
 {'id':'terrain-contour-labels','type':'symbol','source':'terrain-contours','minzoom':13,'filter':['==',['get','major'],1],'layout':{'symbol-placement':'line','symbol-spacing':500,'text-field':['concat',['to-string',['get','elevation']],'m'],'text-font':['sans-serif'],'text-size':12},'paint':{'text-color':'#68795e','text-halo-color':'#f7f8ef','text-halo-width':1.5}}
]
stylepath.write_text(json.dumps(style,separators=(',',':'),ensure_ascii=False))
print(json.dumps({'contourLines':len(features),'range':[float(a.min()),float(a.max())],'contourInterval':20}))
