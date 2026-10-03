export function rememberedLevel(profile,character){
 const level=Number(profile.character_last_levels?.[character]??0),max=Math.min(5,Number(profile.character_levels?.[character]??-1)+1);
 return Number.isInteger(level)&&(level===-1?profile.relicless_unlocked:level>=0&&level<=max)?level:0;
}
