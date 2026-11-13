// Jar of Greed (a relic fusion) keeps each jar's effect, as approved_relics.has does on the Python side.
const GREED_JARS=['dice_jar','cyber_jar','morphing_jar_2'];
const owns=(r,relic)=>(r.artifacts||[]).includes(relic)||r.mirror_copy===relic||GREED_JARS.includes(relic)&&owns(r,'jar_of_greed');
export const freeJarUse=(r,relic,kind)=>r.challenge_level!==-1&&owns(r,relic)&&r['jar_'+kind+'_used']!==`${r.loop||0}:${r.round||0}`;
export const revealPrice=r=>freeJarUse(r,'cyber_jar','reveal')?0:15;
// Cursed Restock: 2 free rerolls per shop for each copy, as approved_relics.restock_free_left counts them (the button
// showed 10 coins while the reroll was free, 2026-11-12).
export const restockFreeLeft=r=>{if(r.challenge_level===-1)return 0;const copies=(r.artifacts||[]).filter(a=>a==='cursed_cursed_restock').length+(r.mirror_copy==='cursed_cursed_restock'?1:0);if(!copies)return 0;const used=r.restock_rerolls||{},key=`${r.loop||0}:${r.round||0}`;return Math.max(0,2*copies-(used.at===key?Number(used.n)||0:0))};
