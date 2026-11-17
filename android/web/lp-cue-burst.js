// LP bursts (player report, 2026-11-17: heal builds with Fire Princess ran very badly). Every LP change is its own
// cue, and an LP cue does not wait: it adds a floating number, flashes, sparks and a sound, then reads the layout for
// the next one. Fire Princess burns on every gain, and stacked relics (Healing Echo, Healing Spring, Damage Echo...)
// add gains and burns of their own, so one Standby Phase sent 265 LP cues and 214 relic pulses at once. They all ran
// in one task, each layout read restyling everything the cues before it had added: 19.8 s frozen at 4x CPU.
// A long run of LP and relic cues now plays as one gain and one loss per player, each relic pulsing once, so a
// burst costs the same however many events it holds. Short runs (normal duels) are untouched.
export const LP_BURST_LIMIT=6;

// cues: the visual cues of one presentation pass. Returns the cues to play; the input is not changed.
export function compactLifeBursts(cues,limit=LP_BURST_LIMIT){
 const out=[];
 for(let i=0;i<cues.length;){
  if(!isBurstCue(cues[i])){out.push(cues[i++]);continue}
  let j=i;while(j<cues.length&&isBurstCue(cues[j]))j++;
  const run=cues.slice(i,j);i=j;
  if(run.filter(c=>c.kind==='lp').length<=limit){out.push(...run);continue}
  const relics=new Set(),players=new Map();
  for(const c of run){
   if(c.kind==='relic'){if(!relics.has(c.relic)){relics.add(c.relic);out.push(c)}continue}
   let p=players.get(c.player);
   if(!p)players.set(c.player,p={start:Number(c.before)||0,gain:0,loss:0,gains:0,losses:0,costOnly:true,direct:false});
   const amount=Number(c.amount)||0;
   if(amount>0){p.gain+=amount;p.gains++}
   else if(amount<0){p.loss-=amount;p.losses++;if(!c.cost)p.costOnly=false;if(c.directDamage)p.direct=true}
  }
  for(const [player,p] of players){
   if(p.gain)out.push({kind:'lp',player,amount:p.gain,before:p.start,burst:p.gains});
   // The loss plays after the gain, from the LP the gain reached, so a lethal total still reads as lethal.
   if(p.loss)out.push({kind:'lp',player,amount:-p.loss,before:p.start+p.gain,cost:p.costOnly,directDamage:p.direct,burst:p.losses});
  }
 }
 return out;
}
const isBurstCue=c=>c?.kind==='lp'||c?.kind==='relic';
