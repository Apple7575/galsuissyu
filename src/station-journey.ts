import {stationPath} from './station-world';
export const journeyLengths=[0];
for(let i=1;i<stationPath.length;i++){const a=stationPath[i-1],b=stationPath[i];journeyLengths.push(journeyLengths[i-1]+Math.hypot(b[0]-a[0],b[2]-a[2]));}
export const journeyDistance=journeyLengths.at(-1)!;
export const journeySpeed=1.4;
export const waitStart=journeyLengths[3]/journeySpeed;
export const waitSeconds=4;
export const journeyDuration=journeyDistance/journeySpeed+waitSeconds;
export function journeyAt(seconds:number){
 const time=Math.max(0,Math.min(journeyDuration,seconds)),waiting=time>=waitStart&&time<waitStart+waitSeconds;
 const distance=Math.min(journeyDistance,Math.max(0,(time-(time>=waitStart?Math.min(waitSeconds,time-waitStart):0))*journeySpeed));
 let segment=1;while(segment<journeyLengths.length-1&&journeyLengths[segment]<distance)segment++;
 const a=stationPath[segment-1],b=stationPath[segment],f=(distance-journeyLengths[segment-1])/(journeyLengths[segment]-journeyLengths[segment-1]);
 return {time,distance,waiting,finished:time>=journeyDuration,segment,x:a[0]+(b[0]-a[0])*f,z:a[2]+(b[2]-a[2])*f,heading:Math.atan2(b[0]-a[0],b[2]-a[2]),stage:waiting?2:distance>=journeyLengths[4]?4:distance>=journeyLengths[3]?3:distance>=journeyLengths[1]?1:0};
}
