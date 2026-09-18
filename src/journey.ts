import {distance,type Coordinate} from './city-data';
export function journeyLengths(coords:Coordinate[]){const lengths=[0];for(let i=1;i<coords.length;i++)lengths.push(lengths[i-1]+distance(coords[i-1],coords[i]));return lengths;}
export function journeyPoint(coords:Coordinate[],lengths:number[],progress:number){
 const target=Math.max(0,Math.min(1,progress))*(lengths.at(-1)||0);let i=1;
 while(i<coords.length-1&&lengths[i]<target)i++;
 const a=coords[Math.max(0,i-1)]??[0,0],b=coords[i]??a,t=Math.min(1,Math.max(0,(target-lengths[i-1])/(lengths[i]-lengths[i-1]||1)));
 return {coordinate:[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t] as Coordinate,index:i,traveled:target};
}
