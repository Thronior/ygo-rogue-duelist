// The new version's patch notes open on the main menu until the player closes them (user, 2026-11-17): showing them
// is not enough to count as seen, and a window that replaces them leaves them unseen for the next start.
import assert from 'node:assert/strict';
const store=new Map();
globalThis.localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v))};
globalThis.ResizeObserver=class{observe(){}disconnect(){}};
const {replayVersion}=await import('./web/replay-version.js');
globalThis.fetch=async url=>({ok:true,json:async()=>({versions:[{version:replayVersion,languages:['en']}]}),text:async()=>`<div class="patch-notes-sheet">${url}</div>`});
// A tiny stand-in for the game's <dialog id="modal">.
function fakeModal(){
 const listeners=[],classes=new Set();let open=false,content=null;
 const box={get isConnected(){return content===box},clientWidth:0,querySelectorAll:()=>[],closest:()=>win};
 const win={classList:{add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c)},addEventListener:(t,f)=>listeners.push(f),
  close(){open=false;for(const f of listeners.splice(0))f()},get open(){return open}};
 const dialog=(title,html)=>{content=html.includes('patch-notes')?box:{};open=true;dialog.title=title};
 globalThis.document={querySelector:()=>content===box?box:null};
 return {win,dialog};
}
const {maybeShowNewPatchNotes}=await import('./web/patch-notes.js');
let checks=0;const ok=(v,why)=>{assert(v,why);checks++};
const seen=()=>store.get('ygo-patch-notes-seen');

// First start: shown, but not seen until closed; replaced by another window, so still unseen.
const a=fakeModal();await maybeShowNewPatchNotes(a.dialog,()=>true);
ok(a.win.open&&a.dialog.title.includes(replayVersion),'opens on the first start');
ok(seen()===undefined,'showing it does not count as seen');
a.dialog('Another window','<p>other</p>');a.win.close();
ok(seen()===undefined,'a window that replaced it leaves it unseen');
// The main menu redraws in the same session: not opened twice.
let again=false;await maybeShowNewPatchNotes(()=>{again=true},()=>true);
ok(!again,'opens at most once per start');

// Next start (fresh module): opens again, and the player's close marks it seen.
const fresh=await import('./web/patch-notes.js?next-start');
const b=fakeModal();await fresh.maybeShowNewPatchNotes(b.dialog,()=>true);
ok(b.win.open,'opens again at the next start');
b.win.close();
ok(seen()===replayVersion,'closing it marks this version seen');
ok(!b.win.classList.contains('patch-notes-modal'),'the window loses its patch-notes style');
const later=await import('./web/patch-notes.js?third-start');let shown=false;
await later.maybeShowNewPatchNotes(()=>{shown=true},()=>true);
ok(!shown,'not shown again once closed');
console.log(`PASS patch notes stay until closed: ${checks} checks`);
