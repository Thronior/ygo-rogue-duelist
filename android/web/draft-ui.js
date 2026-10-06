import {draftCharacterSelect} from './draft-character-select.js';
import {CollectorUI} from './collector-ui.js';
import {validateDraftDeck} from './collector-rules.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(label,action,attrs='')=>`<button data-collector="${action}" ${attrs}>${label}</button>`;
export class DraftUI extends CollectorUI {
 constructor(options){super({...options,validateDeck:validateDraftDeck});this.isDraft=true;this.storageKey='ygo-draft-session-v1';this.backend=async(action,v)=>{if(action==='collector-draft'){this.duelist.draftDeck=structuredClone(v.deck);this.save();return {duelists:[this.duelist]};}throw Error('Unsupported draft operation.');};}
 save(){localStorage.setItem(this.storageKey,JSON.stringify(this.duelist));}
 async initialize(){const config=await fetch('./multiplayer-config.json').then(r=>r.json());this.endpoint=config.signalingUrl.replace(/\/$/,'');const raw=localStorage.getItem(this.storageKey);if(raw){this.duelist=JSON.parse(raw);this.data={duelists:[this.duelist]};this.restoring=true;try{await this.accept(await this.api('register',{duelist:this.duelist}));}finally{this.restoring=false;}this.schedule();}else{this.mode='characters';this.render();}}
 async api(op,body={}){const response=await fetch(`${this.endpoint}/draft/${op}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:this.duelist.id,token:this.duelist.token,...body},(_,v)=>typeof v==='bigint'?{__bigint:String(v)}:v),signal:AbortSignal.timeout(15000)});const result=await response.json();if(!response.ok)throw Error(result.error||'Draft service unavailable.');return result;}
 async sync(result){this.duelist={...this.duelist,...result.record};this.data={duelists:[this.duelist]};this.save();}
 async accept(result){if(!this.alive)return;if(result.room?.phase==='drafting'&&this.mode==='editor'){await this.sync(result);this.room=result.room;this.seat=result.seat;return;}if(result.room?.phase==='drafting'){await this.sync(result);this.room=result.room;this.seat=result.seat;this.serverOffset=result.now-Date.now();this.session.connected=true;this.session.code=this.room.code;this.updateReconnectTimer();this.mode='waiting';this.render();if(this.duelist.openedRoom!==this.room.code){this.duelist.openedRoom=this.room.code;this.save();this.action('packs');}return;}if(result.room?.phase==='complete'){await this.sync(result);this.room=result.room;this.seat=result.seat;this.game?.destroy();this.game=null;this.mode='result';this.view={phase:'complete'};this.onView(this.view);this.onResult?.(this.room.winner===this.seat);this.render();return;}await super.accept(result);}
 page(body){this.root.innerHTML=`<div class="collector-page draft-pvp"><header><h1>Draft Duels</h1>${button('Back','back')}</header><div class="collector-content">${this.status?`<p role="status">${esc(this.status)}</p>`:''}${body}</div></div>`;}
 render(){if(!this.alive||this.mode==='duel')return;
  if(this.mode==='characters'){this.selectedCharacter??=this.content.playable[0];this.root.innerHTML=draftCharacterSelect(this.content,this.selectedCharacter,this.image,this.profile);return;}
  if(this.mode==='waiting'){const r=this.room,ready=!!r.ready?.[this.seat],drafting=r.phase==='drafting';this.page(`<section class="tag-room collector-room"><div class="tag-room-heading"><div><small>ROOM CODE</small><strong class="collector-lobby-code">${esc(r.code)}</strong></div><h2>${r.players.length} / 2 players</h2></div><div class="tag-room-players">${[0,1].map(i=>{const p=r.players[i],c=p?this.content.characters[p.character]:null;return `<div class="tag-player-portrait ${p?'':'tag-empty'}">${c?`<img src="assets/${esc(c.sprite)}" alt="${esc(c.name)}">`:''}<strong>${p?esc(p.name):'Waiting for opponent'}</strong><small>${p?(r.ready?.[i]?'Ready':(drafting?'Building deck':'Not ready')):''}</small></div>`}).join('')}</div><p>${drafting?'Open your boosters and build your deck.':'Both players must be ready to open boosters.'}</p><div class="draft-room-actions">${drafting?button('Open boosters','packs',ready?'disabled':'')+button('Edit deck','edit',ready?'disabled':''):''}${button(ready?'Ready — waiting…':drafting?'Ready for Duel':'Ready',drafting?'ready-draft':'open-ready',ready?'disabled':'')}${button('Cancel room','leave')}</div></section>`);return;}
  if(this.mode==='result'){this.page(`<section class="collector-result ${this.room.winner===this.seat?'triumph':''}"><h2>${this.room.winner==null?'Match ended':this.room.winner===this.seat?'Match won!':'Match lost'}</h2><p>${this.room.score.join(' – ')}</p><p>${esc(this.room.reason)}</p>${button('New draft','new-draft')}${button('Return to menu','exit-now')}</section>`);return;}
  if(this.mode==='siding'){this.page(`<section class="tag-join-screen"><h2>Game complete</h2><p>Match score: ${this.room.score.join(' – ')}</p><p>Your deck stays unchanged. ${this.room.chooser===this.seat?'You':'Your opponent'} will go first.</p>${button(this.room.ready[this.seat]?'Waiting for opponent…':'Next duel','next',this.room.ready[this.seat]?'disabled':'')}</section>`);return;}
  if(this.mode==='home'){const legal=!this.validateDeck(this.duelist.draftDeck||this.duelist.deck,this.duelist.pool,this.content.cards).length;this.page(`<h2>${esc(this.duelist.name)}</h2><p>${this.duelist.packIds?.length||8} boosters opened · ${this.duelist.pool.length} cards</p><div class="collector-home">${button('Edit deck','edit')}${button('View opened boosters','packs')}${button('Host','host',legal?'':'disabled')}${button('Join','join',legal?'':'disabled')}</div>${legal?'':'<p>Build a deck with at least 40 cards before hosting or joining.</p>'}`);return;}
  super.render();const title=this.root.querySelector('header h1');if(title)title.textContent='Draft Duels';this.root.querySelector('[data-collector="help"]')?.remove();
 }
 destroy(){super.destroy();this.closePacks?.();this.closePacks=null;}
 editor(){return super.editor().replace(/<i class="collector-limit-icon[^>]*>.*?<\/i>/g,'').replace(/<button data-collector="section" data-section="side"[^>]*>.*?<\/button>/g,'').replace('0 / 15 side · ','');}
 async action(action,el={dataset:{}}){
  if(action==='help'){this.dialog('Draft Duels','<p>Choose a character, open twice their starting boosters, and build a 40–60 card deck. Maximum three copies by card name, no banned list or siding. Best of three with 8,000 LP each. Reopen this mode to reconnect automatically.</p>');return;}
  if(action==='select-character'){this.selectedCharacter=+el.dataset.character;this.render();return;}
  if(action==='draft-host'||action==='draft-join'){
   const character=this.selectedCharacter??this.content.playable[0];
   this.duelist={id:crypto.randomUUID(),token:crypto.randomUUID()+crypto.randomUUID(),character,name:this.content.characters[character].name,pool:[],deck:{main:[],side:[],extra:[]}};this.save();
   await this.sync(await this.api('register',{duelist:this.duelist}));
   if(action==='draft-join'){this.mode='join';this.render();return;}
   await this.accept(await this.api('host'));this.schedule();return;
  }
  if(action==='join-room'){await this.accept(await this.api('join',{code:document.getElementById('collector-code').value}));this.schedule();return;}
  if(action==='packs'){this.closePacks?.();this.closePacks=this.openPacks((this.duelist.packs||[]).map((cards,i)=>({id:this.duelist.packIds[i],cards})),()=>{this.closePacks=null;});return;}
  if(action==='open-ready'){await this.accept(await this.api('open-ready'));this.schedule();return;}
  if(action==='ready-draft'){await this.sync(await this.api('deck',{deck:this.duelist.draftDeck||this.duelist.deck}));await this.accept(await this.api('ready'));this.schedule();return;}
  if(action==='new-draft'){if(this.room&&this.room.phase!=='complete')throw Error('Finish your active match first.');localStorage.removeItem(this.storageKey);this.duelist=null;this.room=null;this.mode='characters';this.render();return;}
  if(action==='next'){await this.accept(await this.api('next'));this.schedule();return;}
  if(action==='home'&&this.mode==='join'){this.mode='characters';this.render();return;}
  if(action==='back'||action==='exit'){if(this.mode==='editor'||this.mode==='join'){this.mode=['waiting','drafting'].includes(this.room?.phase)?'waiting':'home';this.render();return;}if(this.room&&this.room.phase!=='complete'){this.dialog('Leave Draft Duels?',`<p>Your room is saved. Reopen Draft Duels within the five-minute reconnect allowance to continue.</p>${button('Leave and reconnect later','exit-now')}`);return;}this.destroy();await this.onExit();return;}
  if(action==='roster'){this.mode='home';this.render();return;}
  return super.action(action,el);
 }
}
