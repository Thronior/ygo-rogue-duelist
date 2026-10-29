export const freeJarUse=(r,relic,kind)=>r.challenge_level!==-1&&((r.artifacts||[]).includes(relic)||r.mirror_copy===relic)&&r['jar_'+kind+'_used']!==`${r.loop||0}:${r.round||0}`;
export const revealPrice=r=>freeJarUse(r,'cyber_jar','reveal')?0:15;
