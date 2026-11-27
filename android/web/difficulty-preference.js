export function alternateUnlocked(profile,character){
 // Testing Code "alteregos" (debug) unlocks every alternate variant.
 return !!profile.variants_unlocked||(profile.character_levels?.[character]??-1)>=2||(profile.run_history||[]).some(r=>r.character===character&&r.challenge_level===-1&&r.result==='complete'&&r.round>=9);
}
// Shared Challenge Level starts (user, 2026-11-26): once 3 different characters have beaten Level X, every character can
// start at X, up to 5. Unlocks only: character_levels (the roster colours, "Completed") stay each character's own clears.
// Same rule as challenge_levels.shared_start.
export function sharedStart(profile){
 const levels=Object.values(profile?.character_levels||{}).map(Number).filter(Number.isFinite);let best=0;
 for(let x=1;x<=5;x++)if(levels.filter(l=>l>=x).length>=3)best=x;
 return best;
}
export const unlockedLevel=(profile,character)=>Math.min(6,Math.max(Number(profile?.character_levels?.[character]??-1)+1,sharedStart(profile)));
export function rememberedLevel(profile,character){
 const level=Number(profile.character_last_levels?.[character]??0),max=unlockedLevel(profile,character);
 return Number.isInteger(level)&&(level===-1?profile.relicless_unlocked:level>=0&&level<=max)?level:0;
}

export function hasReliclessClear(profile,character){
 if(profile.testing_all_clears)return true;
 return (profile.run_history||[]).some(r=>Number(r.character)===Number(character)&&r.challenge_level===-1&&r.result==='complete'&&r.round>=9);
}
