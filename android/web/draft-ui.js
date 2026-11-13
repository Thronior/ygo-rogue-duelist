import {clearDuelEmotes} from './duel-emotes.js';
import {roomCodeControl} from './room-code.js';
import {draftCharacterSelect} from './draft-character-select.js';
import {CollectorUI} from './collector-ui.js';
import {validateDraftDeck} from './collector-rules.js';
import {replayVersion} from './replay-version.js';
import {relicImage,relicArtwork} from './ui-art.js';
import {relicCard} from './relic-inspect.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(label,action,attrs='')=>`<button data-collector="${action}" ${attrs}>${label}</button>`;
// Draft loop (rooms Worker DraftRegistry, 2026-11-13): duel → Draft Screen → boosters → deck editor → next duel.
// `draft:2` asks the Worker for loop rules; rooms of older clients keep best of three.
const DRAFT_PROTOCOL=2;
export class DraftUI extends CollectorUI {
 constructor(options){super({...options,validateDeck:validateDraftDeck});this.isDraft=true;this.storageKey='ygo-draft-session-v1';this.python=options.backend;this.installHold();
  // The Main Deck minimum grows 20 → 30 → 40 with each draft (draft-pool.mjs minDeckFor).
  this.validateDeck=(deck,pool,cards)=>validateDraftDeck(deck,pool,cards,this.minDeck());
  this.backend=async(action,v)=>{if(action==='collector-draft'){this.duelist.draftDeck=structuredClone(v.deck);this.save();return {duelists:[this.duelist]};}throw Error('Unsupported draft operation.');};}
 minDeck(){return this.room?.loop?this.room.minDeck||40:40;}
 save(){localStorage.setItem(this.storageKey,JSON.stringify(this.duelist));}
 resetSelection(){this.closeHub();this.duelLog=null;this.hubInfo=null;clearTimeout(this.timer);clearInterval(this.countdown);this.closePacks?.();this.closePacks=null;this.game?.destroy();this.game=null;this.gameKey=null;this.room=null;this.duelist=null;this.draft=null;this.status='';this.session.connected=false;this.session.code='';localStorage.removeItem(this.storageKey);document.getElementById('collector-reconnect-timer')?.remove();document.getElementById('collector-turn-timer')?.remove();this.drawTurnTimer();this.mode='characters';this.view={phase:'characters'};this.onView(this.view);this.render();}
 paired(room=this.room,now=Date.now()+(this.serverOffset||0)){return this.session.connected&&room?.players.length===2&&room.seen?.every(t=>now-t<15000);}
 async initialize(){const config=await fetch('./multiplayer-config.json').then(r=>r.json());this.endpoint=config.signalingUrl.replace(/\/$/,'');const raw=localStorage.getItem(this.storageKey);if(!raw){this.resetSelection();return;}try{this.duelist=JSON.parse(raw);}catch{this.resetSelection();return;}this.restoring=true;try{const result=await this.api('poll');if(!result.room||result.room.phase==='complete'||result.room.cancelled){this.resetSelection();return;}await this.accept(result);this.schedule();}catch(error){if(error.status===400){this.resetSelection();return;}this.mode='reconnect';this.status=error.status===426?error.message:'Unable to check your saved room. Retry when connected.';this.render();}finally{this.restoring=false;}}
 async api(op,body={}){const response=await fetch(`${this.endpoint}/v2/draft/${op}`,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({id:this.duelist.id,token:this.duelist.token,version:replayVersion,net:3,draft:DRAFT_PROTOCOL,...(this.sleeve?{sleeve:this.sleeve()}:{}),...body},(_,v)=>typeof v==='bigint'?{__bigint:String(v)}:v),signal:AbortSignal.timeout(15000)});const result=await response.json();if(!response.ok){const error=Error(result.error||'Draft service unavailable.');error.status=response.status;throw error;}return result;}
 async sync(result){this.duelist={...this.duelist,...result.record};this.data={duelists:[this.duelist]};this.save();}
 // Each draft round has its own boosters, so "already opened" is remembered per round.
 packsKey(r=this.room){return r.loop?`${r.code}:${r.round||0}`:r.code;}
 // Relic scripts for the duel (draft_relics.duel_setup), built the same way on both clients from the room.
 async duelSetup(r){if(!r.loop||!r.relics?.some(x=>x.length))return {};const order=[r.first,1-r.first];return await this.python('draft-duel-setup',{relics:order.map(i=>r.relics[i]),characters:order.map(i=>r.players[i].character),decks:order.map(i=>r.decks[i]),seed:r.seed});}
 duelRelics(r){return r.loop?[...(r.relics?.[this.seat]||[])]:[];}
 async accept(result){if(!this.alive)return;if(!result.record?.room||!result.room||result.room.cancelled||result.room.phase==='complete'&&result.room.players.length!==2){this.resetSelection();return;}this.hydrate(result);this.serverOffset=result.now-Date.now();this.session.connected=true;this.status='';
  const phase=result.room.phase;
  if(phase==='siding'&&!this.paired(result.room,result.now)){await this.sync(result);this.room=result.room;this.seat=result.seat;this.connectHub();this.closePacks?.();this.closePacks=null;this.shown=-1;this.mode='paused';this.view={phase:'paused'};this.onView(this.view);this.updateReconnectTimer();this.render();return;}
  if(phase==='picking'||phase==='decided'){await this.sync(result);const round=result.room.round;this.room=result.room;this.seat=result.seat;this.closePacks?.();this.closePacks=null;this.game?.destroy();this.game=null;this.connectHub();this.session.code=this.room.code;this.updateReconnectTimer();if(phase==='picking'&&this.pickRound!==round){this.pickRound=round;this.choice={};}this.mode=phase;this.view={phase};this.onView(this.view);this.render();return;}
  if(phase==='drafting'&&this.mode==='editor'){await this.sync(result);this.room=result.room;this.seat=result.seat;this.connectHub();return;}
  if(phase==='drafting'){await this.sync(result);this.room=result.room;this.seat=result.seat;this.game?.destroy();this.game=null;this.connectHub();this.serverOffset=result.now-Date.now();this.session.connected=true;this.session.code=this.room.code;this.updateReconnectTimer();this.mode='waiting';this.view={phase:'drafting'};this.onView(this.view);this.render();if(!this.room.ready?.[this.seat]&&!this.closePacks){if(this.duelist.packsFinishedRoom===this.packsKey())await this.action('edit');else await this.action('packs');}return;}
  if(phase==='complete'){await this.sync(result);this.room=result.room;this.seat=result.seat;this.closeHub();this.game?.destroy();this.game=null;this.mode='result';this.view={phase:'complete'};this.onView(this.view);this.onResult?.(this.room.winner===this.seat);this.render();return;}
  await super.accept(result);}
 page(body){this.root.innerHTML=`<div class="collector-page draft-pvp"><header><h1>Draft Duels</h1>${button('Back','back')}</header><div class="collector-content">${this.status?`<p role="status">${esc(this.status)}</p>`:''}${body}</div></div>`;}
 // Draft Screen tiles show art and a name only, like the shop: hover for a tooltip, hold or right-click for details.
 relicTip(key){const a=this.content.artifacts[key];return a?`${a[0]}: ${a[2]||''}`:key;}
 inspectRelic(key){if(this.content.artifacts[key])this.dialog('',relicCard(this.content,key));}
 inspectOffer(kind,value){if(kind==='relic')this.inspectRelic(value);else if(this.inspectPack)this.inspectPack(value);else this.dialog(this.content.packs.find(p=>p.id===value)?.name||value,'');}
 // One listener set on the root: a 500 ms press (or right-click) inspects; the tap that ends a hold does not select.
 installHold(){const root=this.root;if(!root)return;root.draftOwner=this;if(root.draftHold)return;root.draftHold=true;let g=null;const owner=()=>root.draftOwner,target=e=>owner()?.alive&&owner().mode==='picking'?e.target?.closest?.('[data-draft-inspect]'):null;
  const cancel=()=>{if(g){clearTimeout(g.timer);g=null;}};
  root.addEventListener('pointerdown',e=>{cancel();const el=target(e);if(!el||e.button!==0)return;const x=e.clientX,y=e.clientY;g={x,y,timer:setTimeout(()=>{g=null;const ui=owner();ui.heldAt=Date.now();ui.inspectOffer(el.dataset.kind,el.dataset.draftInspect);},500)};},true);
  root.addEventListener('pointermove',e=>{if(g&&Math.hypot(e.clientX-g.x,e.clientY-g.y)>14)cancel();},{capture:true,passive:true});
  for(const type of ['pointerup','pointercancel','scroll'])root.addEventListener(type,cancel,{capture:true,passive:true});
  root.addEventListener('contextmenu',e=>{const el=target(e);if(!el)return;e.preventDefault();cancel();const ui=owner();ui.heldAt=Date.now();ui.inspectOffer(el.dataset.kind,el.dataset.draftInspect);});}
 relicIcons(seat){return (this.room.relics?.[seat]||[]).map(k=>{const a=this.content.artifacts[k],info=this.content.artifactInfo[k];return a?`<button class="draft-owned-relic" data-collector="inspect-relic" data-relic="${esc(k)}" title="${esc(this.relicTip(k))}" aria-label="${esc(a[0])}">${relicArtwork(relicImage(info?.art))}</button>`:''}).join('');}
 // Score, goal and both players' relics in one compact strip.
 standing(){const r=this.room,me=this.seat,name=i=>esc(r.players[i]?.name||''),set=i=>`<span class="draft-relic-set">${this.relicIcons(i)}</span>`;
  return `<div class="draft-standing">${set(me)}<b>${name(me)}</b><span class="draft-score">${r.score[me]} – ${r.score[1-me]}</span><b>${name(1-me)}</b>${set(1-me)}<span class="draft-goal">First to ${r.target} wins</span></div>`;}
 pickingMarkup(){const r=this.room,me=this.seat,o=r.offer,picks=r.picks,turn=r.pickOrder.find(s=>!picks[s]),mine=turn===me,c=this.choice||{};
  const owner=(kind,i)=>picks[me]?.[kind]===i?'Your pick':picks[1-me]?.[kind]===i?'Opponent’s pick':'';
  const tile=(kind,i,value,art,name,tip)=>{const tag=owner(kind,i),chosen=c[kind]===i;return `<button data-collector="choose-${kind}" data-index="${i}" data-kind="${kind}" data-draft-inspect="${esc(value)}" class="draft-offer ${chosen?'selected':''} ${tag?'taken':''}" title="${esc(tip)}" aria-pressed="${chosen}" ${!mine||tag?'disabled':''}>${art}<b>${esc(name)}</b>${tag?`<em class="draft-pick-owner">${tag}</em>`:''}</button>`;};
  const relic=(k,i)=>{const a=this.content.artifacts[k],info=this.content.artifactInfo[k];return tile('relic',i,k,relicArtwork(relicImage(info?.art)),a?.[0]||k,this.relicTip(k));};
  const pack=(id,i)=>{const p=this.content.packs.find(p=>p.id===id);return tile('pack',i,id,`<img src="assets/packs/${esc(id)}.jpg${id==='DRAFT-DARTZ'?'?v=dartz-cover-20261020':''}" alt="">`,p?.name||id,p?.name||id);};
  const label=picks[me]?'Waiting for your opponent…':mine?'Confirm':'Opponent is picking…';
  return `<section class="draft-pick-screen"><div class="draft-pick-head"><h2>Draft ${r.round}</h2>${this.standing()}<span class="draft-min"><span>First to ${r.target} wins</span> · <span>Deck ${Math.min(40,20+10*r.round)}+</span></span></div><div class="draft-offers"><div class="draft-offer-group"><h3>Relics</h3><div class="draft-offer-row">${o.relics.map(relic).join('')}</div></div><div class="draft-offer-group"><h3>Character packs</h3><div class="draft-offer-row">${o.packs.map(pack).join('')}</div></div></div>${button(label,'confirm-pick',`class="draft-confirm start-run" ${!mine||c.relic===undefined||c.pack===undefined||!this.paired()?'disabled':''}`)}</section>`;}
 decidedMarkup(){const r=this.room,won=r.winner===this.seat,votes=r.continueVotes||[],voted=votes[this.seat]===true;
  return `<section class="collector-result draft-decided ${won?'triumph':''}"><h2>${won?'Match won!':'Match lost'}</h2>${this.standing()}<p>${won?'You':'Your opponent'} reached ${r.target} wins first.</p><p>Keep playing? If you both agree, the goal becomes ${r.target+3} wins and the drafts go on.</p><p role="status">${voted?'You want to continue. Waiting for your opponent…':votes[1-this.seat]?'Your opponent wants to continue!':''}</p>${button(voted?'Waiting…':`Continue to ${r.target+3} wins`,'continue-match',`class="start-run" ${voted||!this.paired()?'disabled':''}`)}${button('End match','end-match')}</section>`;}
 render(){if(!this.alive||this.mode==='duel')return;document.querySelectorAll('.duel-portrait-timer').forEach(el=>el.remove());clearDuelEmotes();
  if(this.mode==='characters'){this.selectedCharacter??=this.content.playable[0];this.root.innerHTML=draftCharacterSelect(this.content,this.selectedCharacter,this.image,this.profile);return;}
  if(this.mode==='picking'){this.page(this.pickingMarkup());return;}
  // Reaching the goal wins the match and unlocks the Gaia The Fierce Knight sleeve (sleeves.js); marking twice changes nothing.
  if((this.mode==='decided'||this.mode==='result')&&this.room.winner===this.seat)document.dispatchEvent(new CustomEvent('sleeve-mark',{detail:'draft'}));
  if(this.mode==='decided'){this.page(this.decidedMarkup());return;}
  if(this.mode==='waiting'){const r=this.room,ready=!!r.ready?.[this.seat],drafting=r.phase==='drafting';this.page(`<section class="tag-room collector-room"><div class="tag-room-heading"><div><small>ROOM CODE</small>${roomCodeControl(r.code)}</div><h2>${r.players.length} / 2 players</h2></div>${r.loop&&r.game>0?this.standing():''}<div class="tag-room-players">${[0,1].map(i=>{const p=r.players[i],c=p?this.content.characters[p.character]:null;return `<div class="tag-player-portrait ${p?'':'tag-empty'}">${c?`<img src="assets/${esc(c.sprite)}" alt="${esc(c.name)}">`:''}<strong>${p?esc(p.name):'Waiting for opponent'}</strong><small>${p?(r.ready?.[i]?'Ready':(drafting?'Building deck':'Not ready')):''}</small></div>`}).join('')}</div><p>${drafting?`Open your boosters and build your deck (at least ${this.minDeck()} cards).`:'Both players must be ready to open boosters.'}</p><div class="draft-room-actions">${drafting?button('Open boosters','packs',ready?'disabled':'')+button('Edit deck','edit',ready?'disabled':''):''}${button(ready?'Ready — waiting…':drafting?'Ready for Duel':'Ready',drafting?'ready-draft':'open-ready',ready||!this.paired()?'disabled':'')}${button(r.loop&&r.game>0?'Leave match':'Cancel room','leave')}</div></section>`);return;}
  if(this.mode==='result'){const r=this.room,loop=r.loop;this.page(`<section class="collector-result ${r.winner===this.seat?'triumph':''}"><h2>${r.winner==null?'Match ended':r.winner===this.seat?'Match won!':'Match lost'}</h2><p>${r.score.join(' – ')}${loop?` · First to ${r.target} wins`:''}</p><p>${esc(loop&&r.ended&&r.ended!=='Match ended'?r.ended:r.reason)}</p>${button('New draft','new-draft')}${button('Return to menu','exit-now')}</section>`);return;}
  if(this.mode==='siding'){this.page(`<section class="tag-join-screen"><h2>Game complete</h2><p>Match score: ${this.room.score.join(' – ')}</p><p>Your deck stays unchanged. ${this.room.chooser===this.seat?'You':'Your opponent'} will go first.</p>${button(this.room.ready[this.seat]?'Waiting for opponent…':'Next duel','next',this.room.ready[this.seat]?'disabled':'')}</section>`);return;}
  if(this.mode==='home'){this.resetSelection();return;}
  if(this.mode==='reconnect'){this.page(`<p>${esc(this.status)}</p>${button('Retry reconnect','retry-reconnect')}${button('Back to characters','forget-session')}`);return;}
  if(this.mode==='paused'){this.page(`<section class="tag-join-screen"><h2>Waiting for opponent</h2><p>Your draft is saved. Play resumes when both players reconnect.</p></section>`);return;}
  super.render();const title=this.root.querySelector('header h1');if(title)title.textContent='Draft Duels';this.root.querySelector('[data-collector="help"]')?.remove();
 }
 destroy(){super.destroy();this.closePacks?.();this.closePacks=null;}
 editor(){const errors=this.validateDeck(this.draft,this.duelist.pool,this.content.cards);return super.editor().replace('<span>Changes saved automatically</span>',button('Ready to Duel','ready-draft',errors.length?'disabled':'')).replace(/<i class="collector-limit-icon[^>]*>.*?<\/i>/g,'').replace(/<button data-collector="section" data-section="side"[^>]*>.*?<\/button>/g,'').replace('0 / 15 side · ','').replace(' / 40–60 main',` / ${this.minDeck()}–60 main`);}
 async action(action,el={dataset:{}}){
  if(['open-ready','ready-draft','next','confirm-pick','continue-match'].includes(action)&&!this.paired())throw Error('Waiting for both players to connect.');
  if(['packs','edit','toggle','deselect','add','remove','section','search','sort','filter'].includes(action)&&(this.room?.phase!=='drafting'||this.room.players.length!==2))throw Error('Wait until both players start the draft.');
  if(['packs','edit'].includes(action)&&(this.room?.phase!=='drafting'||this.room.ready?.[this.seat]))throw Error('Wait until both players are ready to open boosters.');
  if(action==='help'){this.dialog('Draft Duels','<p>Choose a character, open their four starting boosters and build a deck of at least 20 cards. After each duel both players draft: the loser picks one relic and one character pack (two boosters) first, then the winner. The minimum deck grows to 30, then 40 cards. Relics are active in every later duel. First to 3 wins takes the match; if both agree, play on to 6, 9 and more. Maximum three copies by card name, no banned list or siding, 8,000 LP each.</p>');return;}
  if(action==='select-character'){this.selectedCharacter=+el.dataset.character;this.render();return;}
  if(action==='draft-host'||action==='draft-join'){
   const character=this.selectedCharacter??this.content.playable[0];
   this.duelist={id:crypto.randomUUID(),token:crypto.randomUUID()+crypto.randomUUID(),character,name:this.content.characters[character].name,pool:[],deck:{main:[],side:[],extra:[]}};this.save();
   await this.sync(await this.api('register',{duelist:this.duelist}));
   if(action==='draft-join'){this.mode='join';this.render();return;}
   await this.accept(await this.api('host'));this.schedule();return;
  }
  if(action==='join-room'){await this.accept(await this.api('join',{code:document.getElementById('collector-code').value}));this.schedule();return;}
  if(action==='packs'){const key=this.packsKey();this.closePacks?.();this.closePacks=this.openPacks((this.duelist.packs||[]).map((cards,i)=>({id:this.duelist.packIds[i],cards})),()=>{this.closePacks=null;if(!this.alive||this.room?.phase!=='drafting')return;this.duelist.packsFinishedRoom=key;this.save();this.enqueue(()=>this.action('edit'));});return;}
  if(action==='choose-relic'||action==='choose-pack'){if(this.mode!=='picking'||Date.now()-(this.heldAt||0)<700)return;this.choice??={};this.choice[action==='choose-relic'?'relic':'pack']=+el.dataset.index;this.render();return;}
  if(action==='inspect-relic'){this.inspectRelic(el.dataset.relic);return;}
  if(action==='confirm-pick'){const c=this.choice||{};if(c.relic===undefined||c.pack===undefined)throw Error('Choose one relic and one character pack.');await this.accept(await this.api('pick',{relic:c.relic,pack:c.pack}));this.schedule();return;}
  if(action==='continue-match'){await this.accept(await this.api('continue',{value:true}));this.schedule();return;}
  if(action==='end-match'){await this.accept(await this.api('continue',{value:false}));return;}
  if(action==='open-ready'){await this.accept(await this.api('open-ready'));this.schedule();return;}
  if(action==='ready-draft'){await this.sync(await this.api('deck',{deck:this.duelist.draftDeck||this.duelist.deck}));const result=await this.api('ready');this.mode='waiting';await this.accept(result);this.schedule();return;}
  if(action==='retry-reconnect'){await this.initialize();return;}
  if(action==='forget-session'){this.resetSelection();return;}
  if(action==='new-draft'){if(this.room&&this.room.phase!=='complete')throw Error('Finish your active match first.');this.resetSelection();return;}
  if(action==='next'){await this.accept(await this.api('next'));this.schedule();return;}
  if(action==='leave'){if(this.room?.loop&&this.room.game>0&&this.room.phase!=='decided'){this.dialog('Leave the match?','<p>Leaving now gives your opponent the match win.</p>'+button('Leave match','leave-now'));return;}await this.api('leave');this.resetSelection();return;}
  if(action==='leave-now'){document.querySelector('dialog[open]')?.close();await this.api('leave');this.resetSelection();return;}
  if(action==='home'||action==='roster'){if(this.room){this.mode=['picking','decided'].includes(this.room.phase)?this.room.phase:'waiting';this.render();}else this.resetSelection();return;}
  if(action==='back'||action==='exit'){
   if(this.mode==='editor'){this.mode='waiting';this.render();return;}
   if(this.mode==='join'||this.mode==='reconnect'){this.resetSelection();return;}
   if(this.room&&this.room.loop&&this.room.game>0&&this.room.phase!=='complete'&&this.room.phase!=='duel'){this.dialog('Leave Draft Duels?',`<p>Your match is saved. Reopen Draft Duels within the five-minute reconnect allowance to continue${this.room.phase==='decided'?'':', or leave the match now and give your opponent the win'}.</p>${button('Leave and reconnect later','exit-now')}${this.room.phase==='decided'?'':button('Leave match','leave-now')}`);return;}
   if(this.room&&['waiting','drafting'].includes(this.room.phase)){await this.api('leave');this.resetSelection();return;}
   if(this.room&&this.room.phase!=='complete'){this.dialog('Leave Draft Duels?',`<p>Your room is saved. Reopen Draft Duels within the five-minute reconnect allowance to continue.</p>${button('Leave and reconnect later','exit-now')}`);return;}
   if(this.mode==='result'){this.resetSelection();return;}
   this.destroy();await this.onExit();return;
  }
  return super.action(action,el);
 }
}
