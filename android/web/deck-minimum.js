// Keep the campaign display in step with approved_relics.minimum.
export function deckMinimum(run,character={}){
 if(character.copycat||character.engine_deck)return 20;
 const progress=run.loop>0?40:Math.min(40,20+10*Math.floor(Math.max(0,run.round||0)/3));
 const burden=run.challenge_level!==-1&&((run.artifacts||[]).includes('cursed_collectors_burden')||run.mirror_copy==='cursed_collectors_burden');
 return Math.max(progress,burden?40:20);
}
export function deckMinimumNotice(run){
 const increase=Number(run.last_deck_minimum_increase)||0;
 return increase>0?`<p class="deck-minimum-increase" role="status">Minimum Deck Size +${increase}</p>`:'';
}
