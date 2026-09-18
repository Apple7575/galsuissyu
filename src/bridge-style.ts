import type {LayerSpecification} from 'maplibre-gl';
// Zoom must be the input to a top-level interpolate/step expression.
export const bridgeLayers:LayerSpecification[]=[
 {id:'bridge-casing',type:'line',source:'bridges',minzoom:12,layout:{'line-cap':'butt','line-join':'round'},paint:{'line-color':'#f6f8f8','line-width':['interpolate',['exponential',2],['zoom'],10,['+',['*',['get','width'],.0082],2],20,['+',['*',['get','width'],8.4],2]]}},
 {id:'bridge-deck',type:'line',source:'bridges',minzoom:12,layout:{'line-cap':'butt','line-join':'round'},paint:{'line-color':'#a5b3ba','line-width':['interpolate',['exponential',2],['zoom'],10,['*',['get','width'],.0082],20,['*',['get','width'],8.4]]}},
 {id:'bridge-center',type:'line',source:'bridges',minzoom:14,paint:{'line-color':'#f6edbb','line-width':1,'line-dasharray':[3,4]}},
];
