// Visual effects each player can switch off in Settings → Effects. Stored as settings.effectsOff, so everything is
// on by default. An effect that is off does no work at all; none of them changes duel pacing or rules.
export const VISUAL_EFFECTS=[
 ['flames','Monster Flames','Behind monsters with 2000 or more ATK.'],
 ['shake','Screen Shake','On heavy hits and big summons.'],
 ['impact','Hit & Heal Effects','Flashes, sparkles and big damage numbers.'],
 ['finisher','Finishing Blow Banners','OVERKILL, PERFECT and the others.'],
 ['lp','Low LP Warning','Red field and heartbeat at low LP.'],
 ['portrait','Portrait Reactions',''],
 ['chain','Chain Effects','Chain badges and a darker field.'],
 ['summon','Heavy Summon Effects','When high-Level monsters land.'],
 ['cutins','Summon Cut-ins','Fusion Summons and legendary monsters.'],
 ['stat','Stat Change Pop-ups','The "+500 ATK" texts.'],
 ['warnings','Hand & Deck Warnings','Full hand and low Deck.'],
 ['particles','Floating Particles',''],
 ['coins','Coin & Shop Effects','Coin bursts and shop reels.'],
 ['coinText','Coin Reward Pop-ups','The "+15 Tribute Summon" texts.'],
 ['vibration','Vibration','On big hits and chain prompts.']
];
let off=new Set();
export const effectOn=key=>!off.has(key);
export function applyEffectOptions(list){
 off=new Set(Array.isArray(list)?list:[]);
 for(const [key] of VISUAL_EFFECTS)document.documentElement.classList.toggle('no-fx-'+key,off.has(key));
}
