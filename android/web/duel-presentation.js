import {OcgHintTiming as Timing,OcgMessageType as Message,OcgResponseType as Response} from './vendor/package/dist/index.js';
import {toss3DMarkup} from './toss-3d.js';
export function chainWindowAllowed(m,mode,activeChain=[],context={}){
 if(m?.forced||mode==='always')return true;
 if(mode==='never')return false;
 // These effects have important optional timing windows which the core's
 // Sometimes mask does not expose consistently across platforms. The core
 // still supplies only currently legal choices, so honoring these cards here
 // does not create an illegal activation window.
 const sometimesExceptions=new Set(['Pinch Hopper','Hannibal Necromancer','Dark Scorpion - Cliff','Hydrogeddon','Fairy Box','Spell Shield Type-8','Michizure']);
 if(mode==='sometimes'&&(m?.selects||[]).some(choice=>sometimesExceptions.has(context.card?.(choice.code)?.name)))return true;
 // Kunai with Chain answers an attack, a summon or an activation; its text matches the timing words below in
 // every window, so it waits for those events (Discord 2026-10-29: "Chain sometimes" asked too often).
 const eventOnly=new Set(['Kunai with Chain']),selects=m?.selects||[];
 if(mode==='sometimes'&&selects.length&&selects.every(choice=>eventOnly.has(context.card?.(choice.code)?.name))){const timing=Number(m?.hint_timing||0)|Number(m?.hint_timing_other||0);return !!(timing&(Timing.SUMMON|Timing.SPSUMMON|Timing.FLIPSUMMON|Timing.ATTACK))||activeChain.length>0}
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
  // Metalmorph follows general response windows rather than text-specific timing.
  if(c?.name==='Metalmorph')return false;
  if((type&4)&&(type&0x20000))return false;
  return /(?:during (?:the |your |your opponent[’']s |either player's |each )?(?:damage step|damage calculation|draw phase|standby phase|end phase|battle phase|main phase(?: [12])?)|(?:when|if) [^.;:]{0,180}(?:summon|declares? an attack|destroyed|sent to the|inflicts?|takes? (?:battle|effect) damage))/i.test(c?.desc||'');
 }))return true;
 // The core reports separate timing masks for the responding player and opponent.
 const timing=Number(m?.hint_timing||0)|Number(m?.hint_timing_other||0);
 const opponentEnd=context.turnPlayer!==undefined&&context.turnPlayer!==m?.player&&(context.phase===512||!!(timing&Timing.END_PHASE));
 if(opponentEnd&&(m.selects||[]).some(choice=>{
  const c=context.card?.(choice.code),type=Number(c?.data?.type||0),text=c?.desc||'';
  const continuousTrap=!!(type&4)&&!!(type&0x20000);
  const removal=(type&4||type&2&&type&0x10000)&&/(destroy|banish|return)/i.test(text)&&/(spell|trap|cards? on the field)/i.test(text);
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

export function mandatoryChainResponse(m){
 if(m?.type!==Message.SELECT_CHAIN||!m.forced)return null;
 const total=m.selects?.length||0,optional=Number(m.spe_count)||0;
 if(total>1&&optional===total-1)return {type:Response.SELECT_CHAIN,index:0};
 const index=soleMandatory(m);return index===null?null:{type:Response.SELECT_CHAIN,index};
}

// Only collapse prompts with no timing/order decision left to make. The optional activations of a forced
// window come back in the next chain window, after the mandatory trigger starts the chain.
export function automaticChainResponse(m,skipOptional,M,R){
 if(m?.player!==0||m.type!==M.SELECT_CHAIN)return null;
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

// The engine already rolled; this only controls presentation, never the result.
export function waitForTossStart(field,kind,isCurrent){
 const button=document.createElement('button');
 button.type='button';button.className='toss-start';button.setAttribute('aria-label',`Start ${kind==='coin'?'coin toss':'dice roll'}`);
 button.innerHTML=toss3DMarkup(kind,[kind==='coin'?1:5])+'<strong>Press to start</strong>';
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
 if(!isCollector||snapshot?.finished||snapshot?.player!==0||!snapshot?.tag?.waitingForOpponent)return '';
 return '<div class="collector-response-wait" role="status" aria-live="polite"><span aria-hidden="true">⌛</span><span><strong>Waiting for opponent…</strong><small>Your opponent is choosing a response.</small></span></div>';
}
