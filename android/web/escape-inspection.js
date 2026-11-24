// Escape closes inspection, open windows and menu screens (the caller decides what is open). Android Back stays separate.
// The Back hotkey's second key (Backspace by default, Settings > Hotkeys) does the same, but never while typing in a
// field and only when there is something to close, so it never eats a key it has no job for.
import {matches,typing,plain} from './hotkeys.js';
export function installEscapeInspection(isInspectionOpen,closeInspection){
 const keydown=e=>{
  if(e.key!=='Escape'){
   if(!matches('back',e)||!plain(e)||typing(e.target)||!isInspectionOpen())return;
  }
  e.preventDefault();e.stopImmediatePropagation();
  if(!e.repeat&&isInspectionOpen())closeInspection();
 };
 window.addEventListener('keydown',keydown,true);
 return ()=>window.removeEventListener('keydown',keydown,true);
}
