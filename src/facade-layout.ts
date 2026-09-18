/** Sample across the whole facade, never stop at the sixteenth floor. */
export function facadeLayout(height:number,length:number,budget:number){
 const floors=Math.max(1,Math.floor((height-2.5)/3.2)+1);
 const fullBays=Math.max(1,Math.min(45,Math.floor(length/2.8)));
 const density=Math.min(1,Math.sqrt(Math.max(1,budget)/(floors*fullBays)));
 const rows=Math.max(1,Math.floor(floors*density)),bays=Math.max(1,Math.floor(fullBays*density));
 const heights=Array.from({length:rows},(_,row)=>1.6+(rows===1?(floors-1)/2:Math.round(row*(floors-1)/(rows-1)))*3.2);
 return {bays,heights};
}
