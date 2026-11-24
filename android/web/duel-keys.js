// Duel shortcuts press the same buttons a click would, so every guard on those buttons still applies.
// Which key does what comes from the keymap (hotkeys.js, rebindable in Settings > Hotkeys).
import {ACTIONS,current,eventKey,typing} from './hotkeys.js';
const usable=button=>!!button&&!button.disabled&&button.checkVisibility();
// A button reached with Tab keeps its own Enter and Space; one left focused by a click does not.
const keyboardFocused=target=>target!==document.body&&!!target?.matches?.(':focus-visible');
const DUEL=ACTIONS.filter(a=>a.scopes.includes('duel')&&(a.id.startsWith('duel.')||a.id.startsWith('choice-')));
const PHASES={'duel.battle':8,'duel.main2':256,'duel.end-turn':512};
export function nextPhaseButton(root){
 const buttons=[...root.querySelectorAll('.phases [data-phase]')],current=buttons.findIndex(button=>button.classList.contains('active'));
 return buttons.slice(current+1).find(usable)||null;
}
// A later phase only (Battle from Main Phase 1, Main Phase 2 from Battle, End from any): never back to an earlier one.
export function phaseButton(root,phase){
 const buttons=[...root.querySelectorAll('.phases [data-phase]')],current=buttons.findIndex(button=>button.classList.contains('active'));
 return buttons.slice(current+1).find(b=>Number(b.dataset.phase)===phase&&usable(b))||null;
}
export function confirmButton(root){
 const buttons=[...root.querySelectorAll('button.duel-confirm,button.reaction-confirm')].filter(usable);
 return buttons.length===1?buttons[0]:null;
}
export function cancelButton(scope){return [...(scope?.querySelectorAll?.('button.reaction-decline,button.duel-cancel')||[])].find(usable)||null}
// Option n of what is open now: a card's Summon / Set / Activate menu, a selection window's choices, the prompt
// under the board, or the cards that can chain.
export function choiceButtons(root,dialog){
 const pop=document.querySelector('.action-pop');
 if(pop?.querySelectorAll)return [...pop.querySelectorAll('button')].filter(usable);
 if(dialog)return [...(dialog.querySelectorAll?.('[data-response],[data-target]')||[])].filter(usable);
 const prompt=[...root.querySelectorAll('.prompt [data-response]')].filter(usable);
 if(prompt.length)return prompt;
 return [...root.querySelectorAll('.reaction-available:not(.reaction-orb),.zone.selectable')].filter(usable);
}
function duelAction(e){const key=eventKey(e);if(!key)return null;const map=current();return DUEL.find(a=>map[a.id].includes(key))?.id||null}
export function installDuelKeys({root,inDuel,canAct,logOpen,openLog,closeLog,options=()=>{}}){
 const keydown=e=>{
  if(e.defaultPrevented||e.ctrlKey||e.altKey||e.metaKey||typing(e.target)||!inDuel())return;
  const id=duelAction(e);if(!id)return;
  const dialog=document.querySelector('dialog[open]'),dialogOpen=!!dialog;
  if(id==='duel.log'){if(e.repeat)return;if(logOpen())closeLog();else if(!dialogOpen)openLog();return}
  // Cancel and the numbered choices also work in a duel's selection window.
  if(id==='duel.cancel'){if(e.repeat||!canAct())return;const b=cancelButton(dialogOpen?dialog:root);if(b){e.preventDefault();b.click()}return}
  if(id.startsWith('choice-')){if(e.repeat||!canAct())return;const b=choiceButtons(root,dialog)[Number(id.slice(7))-1];if(b){e.preventDefault();b.click()}return}
  if(dialogOpen)return;
  if(id==='duel.chain'){if(!e.repeat)root.querySelector('#chain-toggle')?.click();return}
  if(id==='duel.options'){if(!e.repeat){e.preventDefault();options()}return}
  if(keyboardFocused(e.target))return;
  e.preventDefault();
  if(e.repeat||!canAct())return;
  // Space confirms a pending selection too (Discord, Nov 15): the phase can't change while one waits.
  if(id==='duel.next-phase')(confirmButton(root)||nextPhaseButton(root))?.click();
  else if(id==='duel.confirm')confirmButton(root)?.click();
  else if(PHASES[id])phaseButton(root,PHASES[id])?.click();
 };
 window.addEventListener('keydown',keydown);
 return ()=>window.removeEventListener('keydown',keydown);
}
