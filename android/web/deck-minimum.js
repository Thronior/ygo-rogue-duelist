// Keep the campaign display in step with approved_relics.minimum.
const copies=(run,key)=>run.challenge_level===-1?0:(run.artifacts||[]).filter(k=>k===key).length+(run.mirror_copy===key?1:0);
export function deckMinimum(run,character={}){
 if(character.copycat||character.engine_deck)return 20;
 const progress=run.secret_challenge?(run.secret_deck_minimum??40):run.loop>0?40:Math.min(40,20+10*Math.floor(Math.max(0,run.round||0)/3));
 if(copies(run,'cursed_singleton_pact'))return 20;
 return Math.max(20,progress+10*copies(run,'cursed_collectors_burden')-(run.secret_challenge?0:10*copies(run,'deck_thinning')));
}
// approved_relics.copy_limit: null means no limit.
export function copyLimit(run){return (run.artifacts||[]).includes('broken_limiter')?null:copies(run,'cursed_singleton_pact')?1:3}
export function copyLimitText(run){const limit=copyLimit(run);return limit===null?'No copy limit (Broken Limiter).':limit===1?'One copy of each card (Singleton Pact).':'Maximum three copies.'}
export function deckMinimumNotice(run){
 const increase=Number(run.last_deck_minimum_increase)||0;
 return increase>0?`<p class="deck-minimum-increase" role="status">Minimum Deck Size +${increase}</p>`:'';
}
