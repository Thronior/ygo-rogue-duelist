// Settings > Hotkeys (user, 2026-11-24): every action of the keymap (hotkeys.js) with its two keys. Click a key, then
// press the new one: Esc cancels, Delete clears it, and a key another action already uses swaps over to it.
import * as hk from './hotkeys.js';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const DEFAULTS=hk.resolve(null);
const isDefault=(map,id)=>map[id].every((k,i)=>k===DEFAULTS[id][i]);
// Single characters and arrows are never run through the translator (a "P" key is not a word).
const keyText=key=>{const label=hk.keyLabel(key);return [...label].length===1||!key?`<span data-no-i18n>${esc(label)}</span>`:esc(label)};

export function hotkeysPane(){
 const map=hk.current(),clashes=hk.conflicts(map);
 const clashWith=id=>clashes.filter(c=>c.a===id||c.b===id).map(c=>hk.action(c.a===id?c.b:c.a).label);
 const row=a=>{
  const keys=map[a.id],others=clashWith(a.id),hint=hk.HINTS[a.id];
  const slot=i=>{const fixed=a.fixed&&i===0;return `<button type="button" class="hotkey-key${keys[i]?'':' empty'}" data-do="hotkey-bind" data-action="${a.id}" data-slot="${i}" ${fixed?'disabled title="Always Back"':'title="Click, then press a key"'}>${keyText(keys[i])}</button>`};
  return `<div class="set-row hotkey-row${others.length?' hotkey-clash':''}" data-hotkey="${a.id}"><span class="set-text"><b>${esc(a.label)}</b>${hint?`<small>${esc(hint)}</small>`:''}${others.map(l=>`<small class="hotkey-clash-note">Same key as: ${esc(l)}</small>`).join('')}</span><span class="hotkey-keys">${slot(0)}${slot(1)}<button type="button" class="hotkey-reset" data-do="hotkey-reset" data-action="${a.id}" title="Reset to default" aria-label="Reset to default" ${isDefault(map,a.id)?'disabled':''}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4.5h4.5"/></svg></button></span></div>`;
 };
 const changed=hk.ACTIONS.some(a=>!isDefault(map,a.id));
 return `<h2>Hotkeys</h2><p class="muted">Click a key, then press the new one. Esc cancels and Delete clears it. If another action already uses that key, the two swap.</p>${hk.GROUPS.map(g=>`<section class="set-group hotkey-group"><h3>${esc(g)}</h3>${hk.ACTIONS.filter(a=>a.group===g).map(row).join('')}</section>`).join('')}<div class="settings-actions hotkey-actions"><button type="button" data-do="hotkey-reset-all" ${changed?'':'disabled'}>Reset All Hotkeys</button></div>`;
}

// Settings actions. deps: settings (the live settings object), save(), render(), toast(text).
export function hotkeyAction(name,el,{settings,save,render,toast}){
 const apply=map=>{settings.hotkeys=hk.overrides(map);save();render()};
 if(name==='hotkey-reset-all'){hk.stopCapture();apply(hk.resolve(null));toast('Hotkeys reset to default');return true}
 if(name==='hotkey-reset'){hk.stopCapture();apply(hk.reset(hk.current(),el.dataset.action));return true}
 if(name!=='hotkey-bind')return false;
 const id=el.dataset.action,slot=Number(el.dataset.slot);
 // A second click on the key that is listening stops listening.
 if(hk.capturing()){const was=el.classList.contains('listening');hk.stopCapture();render();if(was)return true;el=document.querySelector(`.hotkey-key[data-action="${id}"][data-slot="${slot}"]`);if(!el)return true}
 el.classList.add('listening');el.textContent='Press a key…';
 // Clicking anywhere else cancels, like Esc.
 const away=e=>{if(!e.target.closest?.('.hotkey-key.listening')&&hk.capturing()){hk.stopCapture();render()}};
 document.addEventListener('pointerdown',away,{capture:true,once:true});
 hk.captureKey(key=>{
  document.removeEventListener('pointerdown',away,{capture:true});
  const r=hk.bind(hk.current(),id,slot,key);
  if(r.error){render();toast("That key can't be used: Esc, Tab, Delete and the browser's F keys keep their own jobs.");return}
  apply(r.map);
  if(r.swapped.length)toast(`Swapped with: ${r.swapped.map(s=>hk.action(s.id).label).join(', ')}`);
 },()=>{document.removeEventListener('pointerdown',away,{capture:true});render()});
 return true;
}
