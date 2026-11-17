// In-game patch notes (CITYDRIVER on Discord; user, 2026-11-16). Each release's notes are the same sheet as the
// Discord image, drawn here from a small HTML fragment per language (tools/patch_notes.py writes patch-notes/) with
// the game's own art, so an update downloads a few KB of text instead of images. After an update the new version's
// sheet opens once on the main menu; the bell beside the Discord button shows every sheet, newest first, back to the
// first one added to the game (v0.2.36). Fragments are already in the player's language, so i18n.js skips them.
import {currentLanguage} from './i18n.js';
import {replayVersion} from './replay-version.js';
const SEEN_KEY='ygo-patch-notes-seen';
// The sheets are laid out 1400 px wide, like the image; the window zooms them to fit.
const SHEET_WIDTH=1400;
let index=null;

async function loadIndex(){
 if(index)return index;
 try{const r=await fetch('patch-notes/index.json',{cache:'no-cache'});index=r.ok?await r.json():{versions:[]}}catch{index={versions:[]}}
 if(!Array.isArray(index.versions))index={versions:[]};
 return index;
}
async function sheet(entry){
 const lang=entry.languages?.includes(currentLanguage())?currentLanguage():'en';
 try{const r=await fetch(`patch-notes/${entry.version}/${lang}.html`);if(r.ok)return r.text()}catch{}
 return '';
}
function fit(box){
 const width=box.clientWidth;if(!width)return;
 for(const s of box.querySelectorAll('.patch-notes-sheet'))s.style.zoom=String(Math.min(1,width/SHEET_WIDTH));
}

// Opens the window with the given entries (newest first). `dialog(title, html)` is mobile.js's window.
// `onClosed` runs when the player closes this window, not when another window replaces it.
async function show(dialog,entries,title,onClosed=null){
 const parts=await Promise.all(entries.map(sheet));
 const body=parts.filter(Boolean).join('');
 dialog(title,body?`<div class="patch-notes" data-no-i18n>${body}</div>`:'<p class="muted patch-notes">No patch notes yet. They start with the next update.</p>');
 const box=document.querySelector('#modal .patch-notes, dialog[open] .patch-notes');if(!box)return;
 box.closest('dialog')?.classList.add('patch-notes-modal');
 fit(box);const ro=new ResizeObserver(()=>fit(box));ro.observe(box);
 const win=box.closest('dialog');
 win?.addEventListener('close',()=>{ro.disconnect();win.classList.remove('patch-notes-modal');if(box.isConnected)onClosed?.()},{once:true});
}

export async function openPatchNotes(dialog){
 const {versions}=await loadIndex();
 await show(dialog,versions,'Patch notes');
}

// On the main menu, when this version has notes and nothing else is open. It counts as seen only once the player
// closes it (user, 2026-11-17): if the game is quit or another window takes its place first, it opens again at the
// next start.
let showing=false;
export async function maybeShowNewPatchNotes(dialog,canShow){
 let seen=null;try{seen=localStorage.getItem(SEEN_KEY)}catch{}
 if(seen===replayVersion||showing)return;
 const {versions}=await loadIndex(),entry=versions.find(v=>v.version===replayVersion);
 if(!entry||showing||!canShow())return;
 showing=true;
 await show(dialog,[entry],`What's new in v${replayVersion}`,()=>{try{localStorage.setItem(SEEN_KEY,replayVersion)}catch{}});
}
