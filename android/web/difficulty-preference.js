export function rememberedLevel(profile,character){
 const level=Number(profile.character_last_levels?.[character]??0),max=Math.min(6,Number(profile.character_levels?.[character]??-1)+1);
 return Number.isInteger(level)&&(level===-1?profile.relicless_unlocked:level>=0&&level<=max)?level:0;
}

export function hasReliclessClear(profile,character){
 if(profile.testing_all_clears)return true;
 return (profile.run_history||[]).some(r=>Number(r.character)===Number(character)&&r.challenge_level===-1&&r.result==='complete'&&r.round>=9);
}
