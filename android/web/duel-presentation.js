import {OcgHintTiming as Timing} from './vendor/package/dist/index.js';
import {toss3DMarkup} from './toss-3d.js';
export function chainWindowAllowed(m,mode,activeChain=[]){
 if(m?.forced||mode==='always')return true;
 if(mode==='never')return false;
 // The core reports separate timing masks for the responding player and opponent.
 const timing=Number(m?.hint_timing||0)|Number(m?.hint_timing_other||0);
 return !!(timing&(Timing.SUMMON|Timing.SPSUMMON|Timing.FLIPSUMMON|Timing.ATTACK))||activeChain.length>0;
}

// Only collapse prompts with no timing/order decision left to make.
export function automaticChainResponse(m,skipOptional,M,R){
 if(m?.player!==0||m.type!==M.SELECT_CHAIN)return null;
 if(m.forced&&m.selects?.length===1)return {type:R.SELECT_CHAIN,index:0};
 if(!m.forced&&skipOptional)return {type:R.SELECT_CHAIN,index:null};
 return null;
}

export function liveCardFacts(base,live,cards){
 const attribute={1:'EARTH',2:'WATER',4:'FIRE',8:'WIND',16:'LIGHT',32:'DARK',64:'DIVINE'}[live.attribute]||base.attribute;
 const race=cards.find(c=>c.race&&String(c.data?.race)===String(live.race))?.race||base.race;
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
