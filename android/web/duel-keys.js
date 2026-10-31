// Duel shortcuts press the same buttons a click would, so every guard on those buttons still applies.
const usable=button=>!button.disabled&&button.checkVisibility();
const typing=target=>!!target?.closest?.('input,textarea,select,[contenteditable]');
// A button reached with Tab keeps its own Enter and Space; one left focused by a click does not.
const keyboardFocused=target=>target!==document.body&&!!target?.matches?.(':focus-visible');
export function nextPhaseButton(root){
 const buttons=[...root.querySelectorAll('.phases [data-phase]')],current=buttons.findIndex(button=>button.classList.contains('active'));
 return buttons.slice(current+1).find(usable)||null;
}
export function confirmButton(root){
 const buttons=[...root.querySelectorAll('button.duel-confirm')].filter(usable);
 return buttons.length===1?buttons[0]:null;
}
export function installDuelKeys({root,inDuel,canAct,logOpen,openLog,closeLog}){
 const keydown=e=>{
  const key=e.key.length===1?e.key.toLowerCase():e.key;
  if(![' ','Enter','c','l'].includes(key)||e.ctrlKey||e.altKey||e.metaKey||typing(e.target)||!inDuel())return;
  const dialogOpen=!!document.querySelector('dialog[open]');
  if(key==='l'){if(e.repeat)return;if(logOpen())closeLog();else if(!dialogOpen)openLog();return}
  if(dialogOpen)return;
  if(key==='c'){if(!e.repeat)root.querySelector('#chain-toggle')?.click();return}
  if(keyboardFocused(e.target))return;
  e.preventDefault();
  if(e.repeat||!canAct())return;
  (key===' '?nextPhaseButton(root):confirmButton(root))?.click();
 };
 window.addEventListener('keydown',keydown);
 return ()=>window.removeEventListener('keydown',keydown);
}
