// Sandbox setup (survey answers, 2026-11-25): any deck (a saved deck from the Deck editor, or any character's deck from
// any tier) against any CPU deck, with relics chosen for each side. It is the Watch CPU duel screen (cpu-viewer.js)
// with "You" and "Opponent" seats and a relic picker; mobile.js plays the duel (startSandbox) and saves nothing.
import {CPUViewer} from './cpu-viewer.js';
import {relicImage,relicArtwork} from './ui-art.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Relics per side (sandbox.py LIMIT).
export const SANDBOX_LIMIT=30;
const STORE='ygo-sandbox-setup-v1';
// The last setup (seats, tiers, saved deck keys and relics) is remembered on this device; the decks themselves stay in
// the Deck editor's saved drafts (cpu-deck-editor.js).
export function loadSandboxSetup(){try{return JSON.parse(localStorage.getItem(STORE)||'null')}catch{return null}}
export class SandboxSetup extends CPUViewer{
 get text(){return {title:'Free Duel',subtitle:'Build any deck and duel any opponent. Nothing here changes your progress.',footer:'8,000 LP each · Nothing is saved',start:'Duel',testLabel:false,ownDeck:'Saved deck'}}
 seatLabel(p){return p===1?'Opponent':'You'}
 allowed(){return (this.content.sandboxRelics||[]).filter(k=>this.content.artifacts?.[k])}
 setup(){
  // The parent constructor calls setup() before this class's fields exist.
  if(!this.relics){this.relics=[[],[]];this.ownDecks=[null,null];this.restore(this.options?.initial)}
  super.setup();this.remember();
 }
 restore(v){
  if(!v||typeof v!=='object')return;const allowed=new Set(this.allowed());
  for(const p of [0,1]){
   const id=Number(v.characters?.[p]),tier=Number(v.tiers?.[p]);
   if(this.ids.includes(id)){this.characters[p]=id;if(Number.isInteger(tier)&&tier>=0&&tier<this.content.cpuDecks[id].length)this.tiers[p]=tier}
   const key=v.own?.[p],own=typeof key==='string'?this.ownDeckList().find(x=>x.key===key):null;
   if(own?.deck.main.length){this.ownDecks[p]={...own,deck:structuredClone(own.deck)};if(own.character!=null){this.characters[p]=own.character;this.tiers[p]=own.tier}}
   this.relics[p]=[...new Set((Array.isArray(v.relics?.[p])?v.relics[p]:[]).filter(k=>allowed.has(k)))].slice(0,SANDBOX_LIMIT);
  }
  // Set both ways: setup() only defaults the seat after this runs, so a remembered seat 0 left it undefined and Free
  // Duels could not open a second time (2026-11-25).
  this.editSide=Number(v.side)===1?1:0;
  const own=this.ownDecks[this.editSide];this.category=own?'mine':this.content.characters[this.characters[this.editSide]].ultimate_collector?'uc':'regular';
 }
 remember(){try{localStorage.setItem(STORE,JSON.stringify({characters:this.characters,tiers:this.tiers,own:this.ownDecks.map(o=>o?.key||null),relics:this.relics,side:this.editSide}))}catch{}}
 relicIcon(key){const a=this.content.artifacts[key],info=this.content.artifactInfo?.[key];return `<span class="sandbox-relic-icon" title="${esc(a?.[0]||key)}">${relicArtwork(relicImage(info?.art),'loading="lazy" decoding="async"')}</span>`}
 seatExtra(side){
  const list=this.relics[side],shown=list.slice(0,8);
  return `<div class="sandbox-relics"><h3>${side?'Opponent relics':'Your relics'}</h3><button class="sandbox-relic-button" data-cpu="relics" aria-label="Choose relics"><span class="sandbox-relic-icons">${shown.length?shown.map(k=>this.relicIcon(k)).join('')+(list.length>shown.length?`<b>+${list.length-shown.length}</b>`:''):'<em>No relics</em>'}</span><small>Choose relics · ${list.length}/${SANDBOX_LIMIT}</small></button></div>`;
 }
 // "Duel with this deck" in the Deck editor puts the edited deck in your seat.
 editedDeck(deck,title,label){
  const row=this.editor?.row;if(!deck.main.length){if(this.editor){this.editor.notice='Add some cards first.';this.editor.render()}return}
  const character=row?.character!=null?Number(row.character):null,tier=character!=null?(this.content.cpuDecks[character]||[]).findIndex(r=>r.label===row.label):-1;
  this.ownDecks[0]={key:row?.key||'edited',title,label,deck:structuredClone(deck),character:tier>=0?character:null,tier};
  if(tier>=0){this.characters[0]=character;this.tiers[0]=tier}
  this.editSide=1;this.category=this.content.characters[this.characters[1]].ultimate_collector?'uc':'regular';this.setup();
 }
 async action(action,button){
  if(action==='relics')return this.chooseRelics(this.editSide);
  if(action==='start')return this.begin();
  // Mirror matches are allowed here, so picking a character never swaps the other seat.
  if(action==='character'){const id=Number(button.dataset.id);if(!this.ids.includes(id))return;this.ownDecks[this.editSide]=null;this.characters[this.editSide]=id;return this.setup()}
  if(action==='own'){const o=this.ownDeckList().find(x=>x.key===button.dataset.key);if(!o?.deck.main.length)return;const side=this.editSide;this.ownDecks[side]={...o,deck:structuredClone(o.deck)};if(o.character!=null){this.characters[side]=o.character;this.tiers[side]=o.tier}
   if(side===0){this.editSide=1;this.category=this.ownDecks[1]?'mine':this.content.characters[this.characters[1]].ultimate_collector?'uc':'regular'}return this.setup()}
  return super.action(action,button);
 }
 begin(){
  const decks=[0,1].map(p=>this.ownDecks[p]?.deck||this.content.cpuDecks[this.characters[p]][this.tiers[p]]);
  if(decks.some(d=>!d?.main?.length))return this.dialog('Free Duel','<p>Both decks need at least one Main Deck card.</p>');
  this.remember();
  return this.options.onDuel({characters:[...this.characters],decks:decks.map(d=>({main:[...d.main],extra:[...(d.extra||[])]})),relics:this.relics.map(r=>[...r])});
 }
 // Tap a relic to add or remove it; the search matches the shown (translated) name and effect.
 chooseRelics(side){
  this.relicPicker?.remove();
  const content=this.content,picked=new Set(this.relics[side]),keys=this.allowed().sort((a,b)=>content.artifacts[a][0].localeCompare(content.artifacts[b][0]));
  const d=document.createElement('dialog');d.className='cpu-test-picker sandbox-relic-picker';this.relicPicker=d;let only=false;
  d.innerHTML=`<header><h2>${side?'Opponent relics':'Your relics'}</h2><button type="button" data-relic-done>Done</button></header><div class="sandbox-relic-tools"><input type="search" aria-label="Search relics" placeholder="Relic name or effect" autocomplete="off"><button type="button" data-relic-only aria-pressed="false">Chosen only</button><button type="button" data-relic-clear>Clear</button></div><p class="sandbox-relic-count" role="status"></p><div class="sandbox-relic-list">${keys.map(k=>`<button type="button" class="sandbox-relic" data-relic="${esc(k)}" aria-pressed="${picked.has(k)}">${relicArtwork(relicImage(content.artifactInfo?.[k]?.art),'loading="lazy" decoding="async"')}<span><strong>${esc(content.artifacts[k][0])}</strong><small>${esc(content.artifacts[k][2]||'')}</small></span></button>`).join('')}</div>`;
  const input=d.querySelector('input'),count=d.querySelector('.sandbox-relic-count'),tiles=[...d.querySelectorAll('.sandbox-relic')];
  const status=(note='')=>{count.textContent=note||`${picked.size}/${SANDBOX_LIMIT} chosen`};
  // Only the hidden flags change while searching: no re-render of the list.
  const filter=()=>{const q=input.value.trim().toLowerCase();for(const t of tiles)t.hidden=(only&&!picked.has(t.dataset.relic))||(!!q&&!t.textContent.toLowerCase().includes(q))};
  input.oninput=filter;
  d.addEventListener('click',e=>{
   e.stopPropagation();
   if(e.target.closest('[data-relic-done]')){d.close();return}
   if(e.target.closest('[data-relic-clear]')){picked.clear();for(const t of tiles)t.setAttribute('aria-pressed','false');status();filter();return}
   const toggle=e.target.closest('[data-relic-only]');if(toggle){only=!only;toggle.setAttribute('aria-pressed',String(only));filter();return}
   const tile=e.target.closest('[data-relic]');if(!tile)return;const key=tile.dataset.relic;
   if(picked.has(key))picked.delete(key);else if(picked.size>=SANDBOX_LIMIT){status(`Up to ${SANDBOX_LIMIT} relics per side.`);return}else picked.add(key);
   tile.setAttribute('aria-pressed',String(picked.has(key)));status();
  });
  d.onclose=()=>{d.remove();if(this.relicPicker===d)this.relicPicker=null;this.relics[side]=[...picked];this.setup()};
  document.body.append(d);status();d.showModal();
 }
 back(){if(this.relicPicker?.open){this.relicPicker.close();return}return super.back()}
 destroy(){this.relicPicker?.remove();this.relicPicker=null;super.destroy()}
}
