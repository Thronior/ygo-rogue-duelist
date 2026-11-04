// Jar of Greed (a relic fusion) keeps each jar's effect, as approved_relics.has does on the Python side.
const GREED_JARS=['dice_jar','cyber_jar','morphing_jar_2'];
const owns=(r,relic)=>(r.artifacts||[]).includes(relic)||r.mirror_copy===relic||GREED_JARS.includes(relic)&&owns(r,'jar_of_greed');
export const freeJarUse=(r,relic,kind)=>r.challenge_level!==-1&&owns(r,relic)&&r['jar_'+kind+'_used']!==`${r.loop||0}:${r.round||0}`;
export const revealPrice=r=>freeJarUse(r,'cyber_jar','reveal')?0:15;
