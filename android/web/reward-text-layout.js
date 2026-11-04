// Coin reward text layout: how much a reward matters, and a mostly random free spot for its text.
const area=(a,b)=>Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
// 10+ coins is a big payout and 5+ a medium one; size and time still grow within each tier.
export const rewardTier=value=>value>=10?'big':value>=5?'medium':'small';
const TIER_RANGE={small:[0,.3],medium:[.42,.62],big:[.72,1]};
export function rewardWeight(value,top,tier=rewardTier(value)){
 const [low,high]=TIER_RANGE[tier],within=Math.min(1,Math.log(1+Math.max(0,value))/Math.log(1+Math.max(top,100)));
 return low+(high-low)*within;
}
// A few random tries, keeping the one that covers the least. Small rewards don't mind sitting behind the window.
export function rewardTextSpot(w,h,width,height,box,taken,weight,random=Math.random){
 const margin=6,frame={x:box.left,y:box.top,w:box.right-box.left,h:box.bottom-box.top},size=w*h||1;let best=null,cost=Infinity;
 for(let i=0;i<16;i++){
  const spot={x:margin+random()*Math.max(0,width-w-2*margin),y:margin+random()*Math.max(0,height-h-2*margin),w,h};
  const covered=taken.reduce((sum,x)=>sum+area(spot,x),0)/size,hidden=area(spot,frame)/size,score=covered*2+hidden*(weight<.4?.25:4);
  if(score<cost){cost=score;best=spot}
 }
 return best;
}
