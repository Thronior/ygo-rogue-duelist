import {OcgHintTiming as Timing,OcgMessageType as Message,OcgResponseType as Response} from './vendor/package/dist/index.js';
import {toss3DMarkup} from './toss-3d.js';
import {wheelMarkup} from './time-wizard-wheel.js';
export function chainWindowAllowed(m,mode,activeChain=[],context={}){
 if(m?.forced||mode==='always')return true;
 if(mode==='never')return false;
 // These effects have important optional timing windows which the core's
 // Sometimes mask does not expose consistently across platforms. The core
 // still supplies only currently legal choices, so honoring these cards here
 // does not create an illegal activation window. Numinous Healer is only legal right after its owner takes
 // damage, so the player is offered it every time (user request 2026-11-03).
 const sometimesExceptions=new Set(['Pinch Hopper','Hannibal Necromancer','Dark Scorpion - Cliff','Hydrogeddon','Spell Shield Type-8','Michizure','Numinous Healer']);
 if(mode==='sometimes'&&(m?.selects||[]).some(choice=>sometimesExceptions.has(context.card?.(choice.code)?.name)))return true;
 // Kunai with Chain answers an attack, a summon or an activation; its text matches the timing words below in
 // every window, so it waits for those events (Discord 2026-10-29: "Chain sometimes" asked too often).
 const eventOnly=new Set(['Kunai with Chain']),selects=m?.selects||[];
 if(mode==='sometimes'&&selects.length&&selects.every(choice=>eventOnly.has(context.card?.(choice.code)?.name))){const timing=Number(m?.hint_timing||0)|Number(m?.hint_timing_other||0);return !!(timing&(Timing.SUMMON|Timing.SPSUMMON|Timing.FLIPSUMMON|Timing.ATTACK))||activeChain.length>0}
 // Fairy Box and Half or Nothing are legal through the whole Battle Phase, but only matter once an attack is declared
 // (Discord 2026-11-03: they asked too often).
 const attackOnly=new Set(['Fairy Box','Half or Nothing']);
 if(mode==='sometimes'&&selects.length&&selects.every(choice=>attackOnly.has(context.card?.(choice.code)?.name)))return !!((Number(m?.hint_timing||0)|Number(m?.hint_timing_other||0))&Timing.ATTACK);
 // Limiter Removal's text ends with "During the End Phase of this turn, destroy those monsters", which the timing words
 // below read as a reason to ask in every window (Discord 2026-11-11: Chain Sometimes asked for it all the time). It
 // matters around a battle: it asks when an attack is declared, in the Damage Step, and in answer to a chain.
 // Juragedo's field effect (Tribute it: another monster gains 1000 ATK) is legal in almost every window too (Discord
 // 2026-11-15: it asked at every step); it matters in the same battle windows.
 // Blast with Chain (+500 ATK equip; its "if destroyed" text matched every window, Discord 2026-11-16) belongs here too.
 const battleBoost=new Set(['Limiter Removal','Juragedo','Blast with Chain']);
 if(mode==='sometimes'&&selects.length&&selects.every(choice=>battleBoost.has(context.card?.(choice.code)?.name)))return !!((Number(m?.hint_timing||0)|Number(m?.hint_timing_other||0))&(Timing.ATTACK|Timing.DAMAGE_STEP))||activeChain.length>0;
 // A Feint Plan only asks during the opponent's Battle Phase (user request 2026-11-04). Phase bits 0x08-0x80 are the
 // Battle Phase's steps, from its start to its end.
 if(mode==='sometimes'&&selects.length&&selects.every(choice=>context.card?.(choice.code)?.name==='A Feint Plan'))return context.turnPlayer!==undefined&&context.turnPlayer!==m?.player&&!!(Number(context.phase||0)&0xf8);
 // Traps that change ATK/DEF and can be activated in the Damage Step ask there rather than at the attack declaration, so a
 // face-down monster that is flipped by the attack can be chosen (Discord 2026-11-05: Castle Walls). Continuous Traps such
 // as Mirror Wall only act on later attacks, so they keep the attack declaration.
 if(mode==='sometimes'&&selects.length&&!activeChain.length){
  const statTrap=choice=>{const type=Number(context.card?.(choice.code)?.data?.type||0),s=context.script?.(choice.code)||'';return !!(type&4)&&!(type&0x20000)&&s.includes('EFFECT_FLAG_DAMAGE_STEP')&&s.includes('EVENT_FREE_CHAIN')&&(/CATEGORY_(?:ATK|DEF)CHANGE/.test(s)||(s.includes('StatChangeDamageStepCondition')&&!s.includes('EVENT_ATTACK_ANNOUNCE')))};
  // Metalmorph is an equip (no ATK/DEF category) but uses the core's Damage Step stat-change condition: it asks in the
  // Damage Step too, so its 300 DEF can save a flipped monster (Discord 2026-11-17). Kunai with Chain also answers the
  // attack declaration (EVENT_ATTACK_ANNOUNCE), so it keeps that window.
  const timing=Number(m?.hint_timing||0)|Number(m?.hint_timing_other||0);
  if(timing&Timing.DAMAGE_STEP&&selects.some(statTrap))return true;
  if(timing&Timing.ATTACK&&!(timing&Timing.DAMAGE_STEP)&&selects.every(statTrap))return false;
 }
 // Threatening Roar stops attacks, so it needs a window before the Battle Phase: the end of the opponent's Main Phase 1,
 // while they have a monster that could attack.
 if(mode==='sometimes'&&context.turnPlayer!==undefined&&context.turnPlayer!==m?.player&&context.phase===4&&context.attackers!==0&&((Number(m?.hint_timing||0)|Number(m?.hint_timing_other||0))&Timing.MAIN_END)&&selects.some(choice=>context.card?.(choice.code)?.name==='Threatening Roar'))return true;
 // The core uses 0x7f for optional trigger-effect selection, including effects
 // after a Special Summon resolves. These are decisions, not empty timing windows.
 if(m?.spe_count===0x7f&&m.selects?.length)return true;
 // The core supplies only legal activations, including the final response window
 // before a phase closes. Continuous Traps retain the existing Sometimes policy:
 // their text often describes a later effect, not a restriction on setting up the Trap.
 if((m?.selects||[]).some(choice=>{
  const c=context.card?.(choice.code),type=Number(c?.data?.type||0);
  // "When a monster(s) is Set" (Shadow of Eyes) is offered only right after a Set (Discord 2026-11-09: it never asked).
  // Metalmorph follows general response windows rather than text-specific timing.
  if(c?.name==='Metalmorph')return false;
  if((type&4)&&(type&0x20000))return false;
  return /(?:during (?:the |your |your opponent[’']s |either player's |each )?(?:damage step|damage calculation|draw phase|standby phase|end phase|battle phase|main phase(?: [12])?)|(?:when|if) [^.;:]{0,180}(?:summon|declares? an attack|destroyed|sent to the|inflicts?|takes? (?:battle|effect) damage|(?:is|are) set\b))/i.test(c?.desc||'');
 }))return true;
 // The core reports separate timing masks for the responding player and opponent.
 const timing=Number(m?.hint_timing||0)|Number(m?.hint_timing_other||0);
 const opponentEnd=context.turnPlayer!==undefined&&context.turnPlayer!==m?.player&&(context.phase===512||!!(timing&Timing.END_PHASE));
 if(opponentEnd&&(m.selects||[]).some(choice=>{
  const c=context.card?.(choice.code),type=Number(c?.data?.type||0),text=c?.desc||'';
  const continuousTrap=!!(type&4)&&!!(type&0x20000);
  // A face-down Spell that is not a Quick-Play is only listed here under Spell Sanctuary (shadow relic, 2026-11-19), which
  // gives Set Spells Quick-Play timing: Harpie's Feather Duster or Heavy Storm then ask like Mystical Space Typhoon.
  const setSpell=!!(type&2)&&choice.location===0x08&&!(Number(choice.position)&5);
  const removal=(type&4||type&2&&type&0x10000||setSpell)&&/(destroy|banish|return)/i.test(text)&&/(spell|trap|cards? on the field)/i.test(text);
  return continuousTrap||removal;
 }))return true;
 return !!(timing&(Timing.SUMMON|Timing.SPSUMMON|Timing.FLIPSUMMON|Timing.ATTACK))||activeChain.length>0;
}

// A face-down Spell/Trap listed without an effect description is a plain card activation, which is always
// optional. A forced window lists those beside the mandatory trigger (Cure Mermaid's Standby next to a set
// Mirror Wall), so the player saw the Trap as forced. With exactly one other entry, that one is mandatory.
const SZONE=0x08;
const optionalActivation=c=>c?.location===SZONE&&!(Number(c.position)&5)&&String(c.description??'')==='0';
function soleMandatory(m){const left=(m.selects||[]).map((c,i)=>({c,i})).filter(x=>!optionalActivation(x.c));return left.length===1&&m.selects.length>1?left[0].i:null}

// Relic triggers (user, 2026-11-17) are run effects registered with the duel, with no card behind them (code 0,
// location 0). They have no place on the board to tap, so they always activate first; the player's own cards
// come back in the next chain window. Before this a forced Standby relic trigger next to Unity in hand showed only
// Unity, so the player had to activate it.
export const relicTriggerIndex=m=>(m?.selects||[]).findIndex(c=>!Number(c?.code)&&!Number(c?.location));
export function mandatoryChainResponse(m){
 if(m?.type!==Message.SELECT_CHAIN)return null;
 const relic=relicTriggerIndex(m);if(relic>=0)return {type:Response.SELECT_CHAIN,index:relic};
 if(!m.forced)return null;
 const total=m.selects?.length||0,optional=Number(m.spe_count)||0;
 if(total>1&&optional===total-1)return {type:Response.SELECT_CHAIN,index:0};
 const index=soleMandatory(m);return index===null?null:{type:Response.SELECT_CHAIN,index};
}
// Cancel on a forced chain window (user, 2026-11-19) is never greyed out: it activates the effect that has to activate,
// as if the player had picked it. That is the sole mandatory trigger when one is known, otherwise the first listed entry
// that is not a plain card activation. The core lists a forced window by effect id, mandatory effects first (ocgcore
// processor.cpp phase and SEGOC windows), so that entry is a mandatory one. With several mandatory triggers the core asks
// again for the rest, so Cancel keeps resolving them one at a time.
export function forcedCancelResponse(m){
 const known=mandatoryChainResponse(m);if(known)return known;
 if(m?.type!==Message.SELECT_CHAIN||!m.forced||!m.selects?.length)return null;
 return {type:Response.SELECT_CHAIN,index:Math.max(0,m.selects.findIndex(c=>!optionalActivation(c)))};
}

// Only collapse prompts with no timing/order decision left to make. The optional activations of a forced
// window come back in the next chain window, after the mandatory trigger starts the chain.
export function automaticChainResponse(m,skipOptional,M,R){
 if(m?.player!==0||m.type!==M.SELECT_CHAIN)return null;
 const relic=relicTriggerIndex(m);if(relic>=0)return {type:R.SELECT_CHAIN,index:relic};
 if(m.forced&&m.selects?.length===1)return {type:R.SELECT_CHAIN,index:0};
 if(m.forced){const index=soleMandatory(m);if(index!==null)return {type:R.SELECT_CHAIN,index}}
 if(!m.forced&&skipOptional)return {type:R.SELECT_CHAIN,index:null};
 return null;
}

export function liveCardFacts(base,live,cards){
 const attributes={1:'EARTH',2:'WATER',4:'FIRE',8:'WIND',16:'LIGHT',32:'DARK',64:'DIVINE'};
 const attribute=typeof live.attribute==='number'?Object.entries(attributes).filter(([bit])=>live.attribute&Number(bit)).map(([,name])=>name).join(' / ')||base.attribute:live.attribute||base.attribute;
 // Only monsters have a live Type. Spells and Traps keep their own subtype (race 0 would match the first such card).
 const race=base.data?.type&1?cards.find(c=>c.data?.type&1&&c.race&&String(c.data?.race)===String(live.race))?.race||base.race:base.race;
 return {...base,attribute,race,atk:live.attack??base.atk,defense:live.defense??base.defense,level:live.level??base.level,data:{...base.data,race:live.race??base.data.race,attribute:live.attribute??base.data.attribute}};
}

// The engine already rolled; this only controls presentation, never the result. kind 'wheel' is Time Wizard's coin.
export function waitForTossStart(field,kind,isCurrent){
 const button=document.createElement('button');
 button.type='button';button.className='toss-start';button.setAttribute('aria-label',`Start ${kind==='wheel'?'wheel spin':kind==='coin'?'coin toss':'dice roll'}`);
 button.innerHTML=(kind==='wheel'?wheelMarkup():toss3DMarkup(kind,[kind==='coin'?1:5]))+'<strong>Press to start</strong>';
 field.append(button);
 return new Promise(resolve=>{
  const finish=value=>{observer.disconnect();button.removeEventListener('click',start);button.remove();resolve(value)};
  const start=event=>{event.stopPropagation();finish(isCurrent())};
  const observer=new MutationObserver(()=>{if(!button.isConnected||!isCurrent())finish(false)});
  observer.observe(document.body,{childList:true,subtree:true});
  button.addEventListener('click',start,{once:true});button.focus({preventScroll:true});
 });
}

export function collectorResponseOverlay(snapshot,isCollector){
 if(snapshot?.finished||!snapshot?.tag)return '';
 const tag=snapshot.tag,teammate=tag.waitingForPartner,opponent=tag.waitingForOpponent&&(isCollector?snapshot.player===0:true);if(!teammate&&!opponent)return '';
 const who=teammate?'teammate':'opponent';
 return `<div class="collector-response-wait" role="status" aria-live="polite"><span aria-hidden="true">⌛</span><span><strong>Waiting for ${who}…</strong><small>Your ${who} is choosing a response.</small></span></div>`;
}

// True when a hand pick lists every card a reveal showed, so the separate reveal window can be skipped.
// Amazoness Chain Master reveals the whole hand but picks only monsters, so its reveal is shown.
export function revealInPick(cards,selects=[]){const key=c=>`${c.controller}:${c.location}:${c.sequence}`,listed=new Set(selects.map(key));return (cards||[]).every(c=>listed.has(key(c)))}
