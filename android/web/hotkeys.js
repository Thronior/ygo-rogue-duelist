// Keyboard hotkeys (user, 2026-11-24): every keyboard shortcut in the game, its default keys and its label, in one
// place. Settings > Hotkeys rebinds them; the saved overrides live in settings.hotkeys ({action id: [key, key]}) and
// storage.py keeps only that shape. Every screen asks this module whether a key press is one of its actions.
//
// A key is the event's key with letters lowercased, ' ' as 'Space', and the digit row and number pad as their digit
// (an AZERTY digit row types & é " ' without Shift). Ctrl, Alt and Meta presses are never hotkeys: those are the
// browser's own shortcuts. Each action has up to two keys; scopes say where it works, and two actions may share a key
// only when their scopes never meet.
export const SLOTS=2;
export const GROUPS=['General','Duel','Choices','Shop and deck','Menus'];
// 'any' meets every scope. 'card' is the open card window, 'dialog' any other open window, 'menu' every other screen.
export const ACTIONS=[
 {id:'back',group:'General',label:'Back / Close window',keys:['Escape','Backspace'],fixed:'Escape',scopes:['any']},
 {id:'inspect',group:'General',label:'Inspect the card under the mouse',keys:['i'],scopes:['any']},
 {id:'settings',group:'General',label:'Open Settings',keys:['p'],scopes:['duel','shop','draft','routes','title','menu']},
 {id:'run.restart',group:'General',label:'Restart the run (hold 3 seconds, before the first duel ends)',keys:['r'],scopes:['draft','routes','duel']},
 {id:'duel.next-phase',group:'Duel',label:'Next phase (confirms a waiting selection first)',keys:['Space'],scopes:['duel']},
 {id:'duel.confirm',group:'Duel',label:'Confirm selection or activation',keys:['Enter'],scopes:['duel']},
 {id:'duel.cancel',group:'Duel',label:'Cancel / Do not chain',keys:['x'],scopes:['duel']},
 {id:'duel.battle',group:'Duel',label:'Go to the Battle Phase',keys:['b'],scopes:['duel']},
 {id:'duel.main2',group:'Duel',label:'Go to Main Phase 2',keys:['m'],scopes:['duel']},
 {id:'duel.end-turn',group:'Duel',label:'End turn',keys:['e'],scopes:['duel']},
 {id:'duel.chain',group:'Duel',label:'Change chain mode',keys:['c'],scopes:['duel']},
 {id:'duel.log',group:'Duel',label:'Open or close the duel log',keys:['l'],scopes:['duel']},
 {id:'duel.options',group:'Duel',label:'Duel options',keys:['o'],scopes:['duel']},
 ...[1,2,3,4,5].map(n=>({id:'choice-'+n,group:'Choices',label:`Choose option ${n}`,keys:[String(n)],scopes:['duel','routes']})),
 {id:'shop.buy',group:'Shop and deck',label:'Buy the selected items',keys:['b'],scopes:['shop']},
 {id:'shop.reroll',group:'Shop and deck',label:'Reroll the shop',keys:['r'],scopes:['shop']},
 {id:'shop.next',group:'Shop and deck',label:'Next duel',keys:['n'],scopes:['shop','draft']},
 {id:'shop.deck',group:'Shop and deck',label:'Edit deck / Back to shop',keys:['d'],scopes:['shop','routes','draft']},
 {id:'deck.search',group:'Shop and deck',label:'Search cards',keys:['f'],scopes:['draft','menu']},
 {id:'tab.prev',group:'Menus',label:'Previous tab',keys:['q'],scopes:['draft','menu','dialog']},
 {id:'tab.next',group:'Menus',label:'Next tab',keys:['e'],scopes:['draft','menu','dialog']},
 {id:'title.prev',group:'Menus',label:'Main menu: previous',keys:['ArrowLeft','ArrowUp'],scopes:['title']},
 {id:'title.next',group:'Menus',label:'Main menu: next',keys:['ArrowRight','ArrowDown'],scopes:['title']},
 {id:'card.prev',group:'Menus',label:'Card window: previous card',keys:['ArrowLeft'],scopes:['card']},
 {id:'card.next',group:'Menus',label:'Card window: next card',keys:['ArrowRight'],scopes:['card']},
];
// Hints under a label, shown in Settings.
export const HINTS={
 'choice-1':'Card menu, chain or selection choices in a duel; the opponents on the duel select screen.',
 'inspect':'Works on every screen with cards.',
};
const BY_ID=new Map(ACTIONS.map(a=>[a.id,a]));
export const action=id=>BY_ID.get(id);
// Keys that stay the browser's or the window's: focus moves (Tab), find, reload, full screen, developer tools.
// Escape is always Back and cancels rebinding; Delete clears a key while rebinding.
export const RESERVED=new Set(['Escape','Tab','Delete','F1','F3','F5','F6','F7','F10','F11','F12','ContextMenu','PrintScreen','Pause']);
const IGNORED=new Set(['Dead','Unidentified','Process','Shift','Control','Alt','AltGraph','Meta','OS','CapsLock','NumLock','ScrollLock','Fn','FnLock','Hyper','Super','Symbol','SymbolLock','Compose']);
const VALID=/^[^\s\x00-\x1f\x7f]{1,24}$/u;

export function eventKey(e){
 const digit=/^(?:Digit|Numpad)(\d)$/.exec(e?.code||'');if(digit)return digit[1];
 const k=e?.key;if(typeof k!=='string'||!k)return null;
 if(k===' '||k==='Spacebar')return 'Space';
 if(k==='Esc')return 'Escape';
 if(IGNORED.has(k))return null;
 if([...k].length===1)return k.toLowerCase();
 return VALID.test(k)?k:null;
}
const ARROWS={ArrowLeft:'←',ArrowRight:'→',ArrowUp:'↑',ArrowDown:'↓'};
export function keyLabel(key){
 if(!key)return '—';
 if(ARROWS[key])return ARROWS[key];
 if(key==='Escape')return 'Esc';
 if([...key].length===1)return key.toUpperCase();
 return key;
}
export const scopesMeet=(a,b)=>a.includes('any')||b.includes('any')||a.some(s=>b.includes(s));
export const bindable=key=>typeof key==='string'&&VALID.test(key)&&!RESERVED.has(key);

// Saved overrides -> the full keymap {id: [key or '', ...]} (always SLOTS long). Unknown actions, bad keys and
// reserved keys are dropped; the fixed key stays in its first slot.
export function resolve(saved){
 const out={};
 for(const a of ACTIONS){
  const row=saved&&typeof saved==='object'&&Array.isArray(saved[a.id])?saved[a.id]:a.keys;
  const keys=[];for(let i=0;i<SLOTS;i++){const k=row[i];keys.push(typeof k==='string'&&(bindable(k)||k===a.fixed)?k:'')}
  if(a.fixed){keys[0]=a.fixed;if(keys[1]===a.fixed)keys[1]=''}
  if(keys[1]&&keys[1]===keys[0])keys[1]='';
  out[a.id]=keys;
 }
 return out;
}
// The full keymap -> overrides to save: only actions that differ from their defaults.
export function overrides(map){
 const out={};
 for(const a of ACTIONS){const keys=map[a.id]||[],def=resolve(null)[a.id];if(keys.some((k,i)=>k!==def[i]))out[a.id]=[...keys]}
 return out;
}
// Every pair of actions whose scopes meet and that share a key.
export function conflicts(map){
 const out=[];
 for(let i=0;i<ACTIONS.length;i++)for(let j=i+1;j<ACTIONS.length;j++){
  const a=ACTIONS[i],b=ACTIONS[j];if(!scopesMeet(a.scopes,b.scopes))continue;
  for(const k of map[a.id]||[])if(k&&(map[b.id]||[]).includes(k))out.push({key:k,a:a.id,b:b.id});
 }
 return out;
}
// Puts key in action id's slot. A key another action already uses (where their scopes meet) moves over: that action
// takes this slot's old key, so nothing ends up with two jobs. Returns {map, swapped:[{id,slot}], error}.
export function bind(map,id,slot,key){
 const a=action(id);
 if(!a||!(slot>=0&&slot<SLOTS))return {map,swapped:[],error:'unknown'};
 if(a.fixed&&slot===0)return {map,swapped:[],error:'fixed'};
 if(key===''){const next={...map,[id]:[...map[id]]};next[id][slot]='';return {map:next,swapped:[],error:null}}
 if(!bindable(key))return {map,swapped:[],error:'reserved'};
 const next={};for(const k of Object.keys(map))next[k]=[...map[k]];
 const old=next[id][slot];
 if(old===key)return {map:next,swapped:[],error:null};
 const other=next[id].indexOf(key);
 // Already this action's other key: the two slots trade places.
 if(other>=0){next[id][other]=old;next[id][slot]=key;return {map:next,swapped:[],error:null}}
 const swapped=[];
 for(const b of ACTIONS){
  if(b.id===id||!scopesMeet(a.scopes,b.scopes))continue;
  const at=next[b.id].indexOf(key);if(at<0)continue;
  // It takes the old key unless that would clash again somewhere else (fixed keys are reserved, so never moved).
  const free=old&&!next[b.id].includes(old)&&ACTIONS.every(c=>c.id===id||c.id===b.id||!scopesMeet(b.scopes,c.scopes)||!next[c.id].includes(old));
  next[b.id][at]=free?old:'';swapped.push({id:b.id,slot:at});
 }
 next[id][slot]=key;
 return {map:next,swapped,error:null};
}
export function reset(map,id){return {...map,[id]:[...resolve(null)[id]]}}

// The live keymap, read from the saved settings on every use (cached while the saved object stays the same).
let source=()=>null,cachedFrom,cached=resolve(null);
export function setSource(fn){source=fn;cachedFrom=undefined}
export function current(){const saved=source();if(saved!==cachedFrom){cachedFrom=saved;cached=resolve(saved)}return cached}
export const keysFor=id=>current()[id]||[];
export function matches(id,e){const key=eventKey(e);return !!key&&keysFor(id).includes(key)}
export function labelFor(id){return keysFor(id).filter(Boolean).map(keyLabel).join(' / ')||'—'}
// Typing in a field is never a hotkey.
export const typing=target=>!!target?.closest?.('input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="button"]),textarea,select,[contenteditable]:not([contenteditable="false"])');
export const plain=e=>!e.ctrlKey&&!e.altKey&&!e.metaKey&&!e.isComposing;

// Rebinding: the next key press goes to onKey(key) instead of the game; Escape cancels and Delete clears the slot.
// It listens first (registered when this module loads, before any other key handler).
let capture=null;
export const capturing=()=>!!capture;
export function captureKey(onKey,onCancel=()=>{}){capture={onKey,onCancel}}
export function stopCapture(){const c=capture;capture=null;return c}
if(typeof window!=='undefined')window.addEventListener('keydown',e=>{
 if(!capture)return;
 e.preventDefault();e.stopImmediatePropagation();
 if(e.repeat)return;
 const key=eventKey(e);if(!key)return;   // a lone Shift or Ctrl waits for the real key
 const c=stopCapture();
 if(key==='Escape')c.onCancel();else c.onKey(key==='Delete'?'':key,e);
},true);

// The game's hotkeys outside the duel: one listener, which runs the first handler whose action uses the key and works
// in the current scope. A handler returns true when it acted; only then is the key's own job (scrolling, typing) stopped.
export function installHotkeys({scope,handlers,repeats=new Set()}){
 const keydown=e=>{
  if(capture||e.defaultPrevented||!plain(e)||typing(e.target))return;
  const key=eventKey(e);if(!key)return;
  const here=scope();if(!here)return;
  const map=current();
  for(const a of ACTIONS){
   const run=handlers[a.id];if(!run||!map[a.id].includes(key)||!(a.scopes.includes('any')||a.scopes.includes(here)))continue;
   if(e.repeat&&!repeats.has(a.id)){e.preventDefault();return}
   if(run(e)){e.preventDefault();return}
  }
 };
 window.addEventListener('keydown',keydown);
 return ()=>window.removeEventListener('keydown',keydown);
}
