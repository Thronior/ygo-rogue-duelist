// Visual effects each player can switch off in Settings → Effects. Stored as settings.effectsOff, so everything is
// on by default. An effect that is off does no work at all; none of them changes duel pacing or rules.
export const VISUAL_EFFECTS=[
 ['flames','Monster Flames','Flames behind monsters with 2000 or more ATK.'],
 ['shake','Screen Shake','The board shaking on heavy hits, big summons and long chains.'],
 ['impact','Hit & Heal Effects','Flashes, shockwaves, healing sparkles and larger damage numbers.'],
 ['finisher','Finishing Blow Banners','OVERKILL, PERFECT and the other banners. The voice line still plays.'],
 ['lp','Low LP Warning','The field turning red as LP drops, and the heartbeat under 1000 LP.'],
 ['portrait','Portrait Reactions','Portraits flinching, bobbing and tipping over.'],
 ['chain','Chain Effects','Growing chain badges and the field darkening on long chains.'],
 ['summon','Heavy Summon Effects','Dust rings and flashes when high-Level monsters land.'],
 ['stat','Stat Change Pop-ups','The "+500 ATK" text over a monster when its ATK changes.'],
 ['warnings','Hand & Deck Warnings','The hand shaking over the limit and the deck glowing when low.'],
 ['particles','Floating Particles','Slow particles drifting over the duel background.'],
 ['coins','Coin & Shop Effects','Coin bursts, reward celebrations and the shop reroll reels.']
];
let off=new Set();
export const effectOn=key=>!off.has(key);
export function applyEffectOptions(list){
 off=new Set(Array.isArray(list)?list:[]);
 for(const [key] of VISUAL_EFFECTS)document.documentElement.classList.toggle('no-fx-'+key,off.has(key));
}
