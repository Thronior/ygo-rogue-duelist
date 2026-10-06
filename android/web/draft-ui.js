import {draftCharacterSelect} from './draft-character-select.js';
import {CollectorUI} from './collector-ui.js';
import {validateDraftDeck} from './collector-rules.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(label,action,attrs='')=>`<button data-collector="${action}" ${attrs}>${label}</button>`;
export class DraftUI extends CollectorUI {
 constructor(options){super({...options,validateDeck:validateDraftDeck});this.isDraft=true;this.storageKey='ygo-draft-session-v1';this.backend=async(action,v)=>{if(action==='collector-draft'){this.duelist.draftDeck=structuredClone(v.deck);this.save();return {duelists:[this.duelist]};}throw Error('Unsupported draft operation.');};}
 save(){localStorage.setItem(this.storageKey,JSON.stringify(this.duelist));}
 resetSelection(){clearTimeout(this.timer);clearInterval(this.countdown);this.closePacks?.();this.closePacks=null;this.game?.destroy();this.game=null;this.gameKey=null;this.room=null;this.duelist=null;this.draft=null;this.status='';this.session.connected=false;this.session.code='';localStorage.removeItem(this.storageKey);document.getElementById('collector-reconnect-timer')?.remove();document.getElementById('collector-turn-timer')?.remove();this.mode='characters';this.view={phase:'characters'};this.onView(this.view);this.render();}
 paired(room=this.room,now=Date.now()+(this.serverOffset||0)){return this.session.connected&&room?.players.length===2&&room.seen?.every(t=>now-t<15000);}
 async initialize(){const config=await fetch('./multiplayer-config.json').then(r=>r.json());this.endpoint=config.signalingUrl.replace(/\/$/,'');const raw=localStorage.getItem(this.storageKey);if(!raw){this.resetSelection();return;}try{this.duelist=JSON.parse(raw);}catch{this.resetSelection();return;}this.restoring=true;try{const result=await this.api('poll');if(!result.room||result.room.phase==='complete'||result.room.cancelled){this.resetSelection();return;}await this.accept(result);this.schedule();}catch(error){if(error.status===400){this.resetSelection();return;}this.mode='reconnect';this.status='Unable to check your saved room. Retry when connected.';this.render();}finally{this.restoring=false;}}
 async request(action,value){if(!this.paired())throw Error('Waiting for both players to reconnect.');return super.request(action,value);}
 async api(op,body={}){const response=await fetch(`${this.endpoint}/draft/${op}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:this.duelist.id,token:this.duelist.token,...body},(_,v)=>typeof v==='bigint'?{__bigint:String(v)}:v),signal:AbortSignal.timeout(15000)});const result=await response.json();if(!response.ok){const error=Error(result.error||'Draft service unavailable.');error.status=response.status;throw error;}return result;}
 async sync(result){this.duelist={...this.duelist,...result.record};this.data={duelists:[this.duelist]};this.save();}
 async accept(result){if(!this.alive)return;if(!result.record?.room||!result.room||result.room.cancelled||result.room.phase==='complete'&&result.room.players.length!==2){this.resetSelection();return;}this.serverOffset=result.now-Date.now();this.session.connected=true;this.status='';if(result.room.phase!=='complete'&&result.room.phase!=='waiting'&&result.room.phase!=='drafting'&&!this.paired(result.room,result.now)){await this.sync(result);this.room=result.room;this.seat=result.seat;this.closePacks?.();this.closePacks=null;this.shown=-1;this.mode='paused';this.view={phase:'paused'};this.onView(this.view);this.updateReconnectTimer();this.render();return;}if(result.room?.phase==='drafting'&&this.mode==='editor'){await this.sync(result);this.room=result.room;this.seat=result.seat;return;}if(result.room?.phase==='drafting'){await this.sync(result);this.room=result.room;this.seat=result.seat;this.serverOffset=result.now-Date.now();this.session.connected=true;this.session.code=this.room.code;this.updateReconnectTimer();this.mode='waiting';this.render();if(this.duelist.openedRoom!==this.room.code){this.duelist.openedRoom=this.room.code;this.save();this.action('packs');}return;}if(result.room?.phase==='complete'){await this.sync(result);this.room=result.room;this.seat=result.seat;this.game?.destroy();this.game=null;this.mode='result';this.view={phase:'complete'};this.onView(this.view);this.onResult?.(this.room.winner===this.seat);this.render();return;}await super.accept(result);}
 page(body){this.root.innerHTML=`<div class="collector-page draft-pvp"><header><h1>Draft Duels</h1>${button('Back','back')}</header><div class="collector-content">${this.status?`<p role="status">${esc(this.status)}</p>`:''}${body}</div></div>`;}
 render(){if(!this.alive||this.mode==='duel')return;
  if(this.mode==='characters'){this.selectedCharacter??=this.content.playable[0];this.root.innerHTML=draftCharacterSelect(this.content,this.selectedCharacter,this.image,this.profile);return;}
  if(this.mode==='waiting'){const r=this.room,ready=!!r.ready?.[this.seat],drafting=r.phase==='drafting';this.page(`<section class="tag-room collector-room"><div class="tag-room-heading"><div><small>ROOM CODE</small><strong class="collector-lobby-code">${esc(r.code)}</strong></div><h2>${r.players.length} / 2 players</h2></div><div class="tag-room-players">${[0,1].map(i=>{const p=r.players[i],c=p?this.content.characters[p.character]:null;return `<div class="tag-player-portrait ${p?'':'tag-empty'}">${c?`<img src="assets/${esc(c.sprite)}" alt="${esc(c.name)}">`:''}<strong>${p?esc(p.name):'Waiting for opponent'}</strong><small>${p?(r.ready?.[i]?'Ready':(drafting?'Building deck':'Not ready')):''}</small></div>`}).join('')}</div><p>${drafting?'Open your boosters and build your deck.':'Both players must be ready to open boosters.'}</p><div class="draft-room-actions">${drafting?button('Open boosters','packs',ready?'disabled':'')+button('Edit deck','edit',ready?'disabled':''):''}${button(ready?'Ready — waiting…':drafting?'Ready for Duel':'Ready',drafting?'ready-draft':'open-ready',ready||!this.paired()?'disabled':'')}${button('Cancel room','leave')}</div></section>`);return;}
  if(this.mode==='result'){this.page(`<section class="collector-result ${this.room.winner===this.seat?'triumph':''}"><h2>${this.room.winner==null?'Match ended':this.room.winner===this.seat?'Match won!':'Match lost'}</h2><p>${this.room.score.join(' – ')}</p><p>${esc(this.room.reason)}</p>${button('New draft','new-draft')}${button('Return to menu','exit-now')}</section>`);return;}
  if(this.mode==='siding'){this.page(`<section class="tag-join-screen"><h2>Game complete</h2><p>Match score: ${this.room.score.join(' – ')}</p><p>Your deck stays unchanged. ${this.room.chooser===this.seat?'You':'Your opponent'} will go first.</p>${button(this.room.ready[this.seat]?'Waiting for opponent…':'Next duel','next',this.room.ready[this.seat]?'disabled':'')}</section>`);return;}
  if(this.mode==='home'){this.resetSelection();return;}
  if(this.mode==='reconnect'){this.page(`<p>${esc(this.status)}</p>${button('Retry reconnect','retry-reconnect')}${button('Back to characters','forget-session')}`);return;}
  if(this.mode==='paused'){this.page(`<section class="tag-join-screen"><h2>Waiting for opponent</h2><p>Your draft is saved. Play resumes when both players reconnect.</p></section>`);return;}
  super.render();const title=this.root.querySelector('header h1');if(title)title.textContent='Draft Duels';this.root.querySelector('[data-collector="help"]')?.remove();
 }
 destroy(){super.destroy();this.closePacks?.();this.closePacks=null;}
 editor(){return super.editor().replace(/<i class="collector-limit-icon[^>]*>.*?<\/i>/g,'').replace(/<button data-collector="section" data-section="side"[^>]*>.*?<\/button>/g,'').replace('0 / 15 side · ','');}
 async action(action,el={dataset:{}}){
  if(['open-ready','ready-draft','next'].includes(action)&&!this.paired())throw Error('Waiting for both players to connect.');
  if(['packs','edit','toggle','deselect','add','remove','section','search','sort','filter'].includes(action)&&(this.room?.phase!=='drafting'||this.room.players.length!==2))throw Error('Wait until both players start the draft.');
  if(['packs','edit'].includes(action)&&(this.room?.phase!=='drafting'||this.room.ready?.[this.seat]))throw Error('Wait until both players are ready to open boosters.');
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
  if(action==='retry-reconnect'){await this.initialize();return;}
  if(action==='forget-session'){this.resetSelection();return;}
  if(action==='new-draft'){if(this.room&&this.room.phase!=='complete')throw Error('Finish your active match first.');this.resetSelection();return;}
  if(action==='next'){await this.accept(await this.api('next'));this.schedule();return;}
  if(action==='leave'){await this.api('leave');this.resetSelection();return;}
  if(action==='home'||action==='roster'){if(this.room){this.mode='waiting';this.render();}else this.resetSelection();return;}
  if(action==='back'||action==='exit'){
   if(this.mode==='editor'){this.mode='waiting';this.render();return;}
   if(this.mode==='join'||this.mode==='reconnect'){this.resetSelection();return;}
   if(this.room&&['waiting','drafting'].includes(this.room.phase)){await this.api('leave');this.resetSelection();return;}
   if(this.room&&this.room.phase!=='complete'){this.dialog('Leave Draft Duels?',`<p>Your room is saved. Reopen Draft Duels within the five-minute reconnect allowance to continue.</p>${button('Leave and reconnect later','exit-now')}`);return;}
   if(this.mode==='result'){this.resetSelection();return;}
   this.destroy();await this.onExit();return;
  }
  return super.action(action,el);
 }
}
