import {pageRect,pageWidth,pageHeight} from './ui-zoom.js';
import {explainOnlineError} from './online-status.js';
import {isRandomCard} from './random-cards.js';
import {playUISound} from './ui-sounds.js';
import {play3DToss} from './toss-3d.js';
import {roomCodeControl} from './room-code.js';
import {deckReadyFeedback} from './selection-feedback.js';
import {validEmote,showDuelEmote,clearDuelEmotes} from './duel-emotes.js';
import {lastPlayed} from './experience-ui.js';
import {collectorIntroductionMarkup,collectorLanding} from './collector-introduction.js';
import {collectorRosterMarkup} from './collector-roster.js';
import {validateDeck,deckCards,rankFor,LIMITS} from './collector-rules.js';
import {decode} from './tag-session.js';
import {showAdminText} from './room-admin.js';
import {TagDuel} from './tag-duel.js';
import {replayVersion} from './replay-version.js';
import {HubSocket} from './hub-socket.js';
import {partnerSleeve} from './sleeves.js';
import {deckOrder,deckToolbar,deckCardsArea,deckCardButton,wireDeckToolbar,resetDeckFilters,updateDeckSplit} from './deck-editor-view.js';
import {savedDeckSort,savedDeckStatus} from './deck-sort-preference.js';
import {saveDeckScroll,restoreDeckScroll} from './card-search.js';
import {tapIntent,applyTaps,steadyTap} from './deck-stacks.js';
import {zonesFor,deckFromZones,sectionView,toggleZone,nameCounts} from './collector-deck.js';
// With the room hub open, polls only guard against a missed nudge.
// Same sorts as Draft Duels; the saved Sort and Deck status are shared with solo and Tag (deck-sort-preference.js).
const COLLECTOR_DECK_SORTS=['Newest','Default','Name','Attribute','ATK','DEF','Level'],COLLECTOR_SEARCH='collector-deck';
const SAFETY_POLL=120000,OFFLINE_POLL=30000,PARTNER_CHECK=20000,PROBE_AFTER=4000,MOVE_BUNDLE_MS=200;
const wire=value=>JSON.parse(JSON.stringify(value,(_,v)=>typeof v==='bigint'?{__bigint:String(v)}:v));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(text,action,extra='')=>`<button data-collector="${action}" ${extra}>${text}</button>`;
const collectorLimitIcon=limit=>limit<3?`<i class="collector-limit-icon limit-${limit}" title="${limit===1?'Limited':'Semi-limited'}: maximum ${limit} across all decks" aria-label="${limit===1?'Limited':'Semi-limited'}, maximum ${limit} copies">${limit}</i>`:'';
export class CollectorUI {
 constructor(options){Object.assign(this,{validateDeck},options);this.mode='roster';this.isCollector=true;this.alive=true;this.queue=Promise.resolve();const ui=this;this.session={connected:false,code:'',request:(a,v)=>this.enqueue(()=>this.request(a,v)),get duelReady(){return !!ui.game}};this.click=e=>{const el=e.target.closest('[data-collector],[data-collector-slot]');if(!el)return;e.stopImmediatePropagation();if(this.held){this.held=false;return;}this.enqueue(()=>this.action(el.dataset.collector||(el.dataset.do==='collector-select'?'select':'import'),el));};document.addEventListener('click',this.click,true);this.down=e=>{const card=e.target.closest('[data-collector=toggle][data-id],[data-collector=prize]');if(!card||e.button!==0)return;this.origin=[e.clientX,e.clientY];this.held=false;this.hold=setTimeout(()=>{this.held=true;this.inspect(+card.dataset.id)},450);};this.cancelHold=()=>clearTimeout(this.hold);this.move=e=>{if(this.origin&&Math.hypot(e.clientX-this.origin[0],e.clientY-this.origin[1])>10)this.cancelHold();};document.addEventListener('pointerdown',this.down);document.addEventListener('pointermove',this.move);document.addEventListener('pointerup',this.cancelHold);document.addEventListener('pointercancel',this.cancelHold);}
 enqueue(fn){const next=this.queue.then(()=>this.alive?fn():undefined);this.queue=next.catch(async e=>{if(!this.alive)return;const text=await explainOnlineError(e);if(!this.alive)return;this.status=text;this.dialog(this.isDraft?'Draft Duels':'Ultimate Collector',`<p>${esc(text)}</p>`)});return this.queue;}
 init(){const pending=this.queue.then(()=>this.initialize());this.queue=pending.catch(()=>{});return pending;}
 async initialize(){
 const configPromise=fetch('./multiplayer-config.json').then(r=>r.json());
 this.data=await this.backend('collector-list');if(!this.alive)return;
 this.duelist=null;this.render();
 this.connectionReady=configPromise.then(config=>{this.endpoint=(config.signalingUrl||'').replace(/\/$/,'');if(!this.endpoint)throw Error('Online service is not configured.');});
 this.registrations=new Map();
 for(const d of this.data.duelists.filter(d=>d.status==='alive')){
  const pending=this.connectionReady.then(()=>this.alive?this.api('register',{duelist:d},d):null);
  this.registrations.set(d.id,pending);
  pending.then(result=>this.enqueue(async()=>{
   this.registrations.delete(d.id);if(!result||this.mode!=='roster')return;
   this.data=await this.backend('collector-sync',{id:d.id,record:result.record});if(!this.alive)return;
   if(result.room&&result.room.phase!=='complete'||result.record.status!=='alive'){
    this.duelist=this.data.duelists.find(row=>row.id===d.id);this.restoring=true;
    try{await this.accept(result);}finally{this.restoring=false;this.schedule();}
   }else this.render();
  }),()=>{});
 }
 this.connectionReady.catch(()=>{});
 }

 // text/plain keeps this a CORS simple request (no OPTIONS preflight); the service parses the raw body.
 async api(op,body={},d=this.duelist){const response=await fetch(`${this.endpoint}/v2/collector/${op}`,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({id:d.id,token:d.token,version:replayVersion,net:3,...(this.sleeve?{sleeve:this.sleeve()}:{}),...body},(_,v)=>typeof v==='bigint'?{__bigint:String(v)}:v),signal:AbortSignal.timeout(15000)});const result=await response.json();if(!response.ok){const error=Error(result.error||'Collector service unavailable.');error.status=response.status;throw error;}return result;}
 // The opponent's card sleeve from the room (rooms Worker, collector.mjs sleeveOf), checked like a Tag partner's.
 opponentSleeve(){const other=this.room?.players?.[1-this.seat]?.sleeve;return other?partnerSleeve(this.content,{sleeve:other.key,profile:other.proof}):null}
 async sync(result){this.data=await this.backend('collector-sync',{id:this.duelist.id,record:result.record});this.duelist=this.data.duelists.find(d=>d.id===this.duelist.id);}
 schedule(){clearTimeout(this.timer);if(!this.alive||!this.room||this.room.phase==='complete')return;this.timer=setTimeout(()=>this.enqueue(async()=>{if(!this.alive||!this.room||this.room.phase==='complete')return;try{await this.accept(await this.api('poll'));this.session.connected=true;}catch(e){this.session.connected=false;if(e.status===426){this.updateRequired=true;throw e;}this.status='Connection interrupted. Reconnecting automatically…';if(this.mode!=='duel')this.render();}finally{if(!this.updateRequired)this.schedule();}}),this.pollDelay());}
 // Everything live arrives on the hub. A 426 (this version may no longer play online) stops polling and is shown by enqueue().
 pollDelay(){return this.hub?.isOpen?SAFETY_POLL:OFFLINE_POLL;}
 // Hub state outranks a poll reply, which can be older and never carries the duel log.
 hydrate(result){
 const r=result.room;if(!r?.hub)return;
 if(r.phase==='duel'){
  const log=this.duelLog;
  if(log?.code!==r.code||log.game!==r.game){this.duelLog={code:r.code,game:r.game,events:[],confirmed:0,outbox:new Map()};this.helloDue=true;}
  r.events=this.duelLog.events;
 }
 this.overlay(r);
 }
 overlay(r){
 const h=this.hubInfo;if(!r)return;
 if(!h?.online||h.code!==r.code){r.seen=[Infinity,Infinity];return;}
 r.seen=h.online.map((on,seat)=>on?Infinity:h.offlineAt[seat]??Infinity);r.charged=h.online.map((_,seat)=>h.chargedAt[seat]&&h.offlineAt[seat]?h.chargedAt[seat]-h.offlineAt[seat]:h.grace);r.disconnectLeft=h.disconnectLeft;
 if(r.phase==='duel'&&h.game===r.game){r.actor=h.actor;r.turn=h.turn;r.turnLeft=h.turnLeft;r.clockAt=h.clockAt;}
 }
 connectHub(){
 const r=this.room;if(!r?.hub||r.phase==='complete'){this.closeHub();return;}
 if(this.hub&&this.hubCode===r.code){if(this.helloDue)this.hubHello();return;}
 this.closeHub();this.hubCode=r.code;
 this.hub=new HubSocket(`${this.endpoint.replace(/^http/,'ws')}/v3/${this.isDraft?'draft':'collector'}/hub`,['shadowrun','id.'+this.duelist.id,'auth.'+this.duelist.token],{onOpen:()=>{this.session.connected=true;this.hubHello();this.schedule();},onClose:()=>{this.session.connected=false;this.schedule();},onMessage:text=>this.hubMessage(text)});
 this.hub.start();
 }
 closeHub(){this.hub?.stop();this.hub=null;this.hubCode=null;}
 hubSend(data){return !!this.hub?.send(JSON.stringify(data));}
 hubHello(){if(this.hubSend({t:'hello',game:this.room?.game,after:this.duelLog?.confirmed||0}))this.helloDue=false;}
 hubClock(m){
 this.hubInfo={...this.hubInfo,code:this.room?.code,game:m.game??this.hubInfo?.game??this.room?.game};
 for(const key of ['online','offlineAt','chargedAt','disconnectLeft','grace','actor','turn','turnLeft','clockAt'])if(m[key]!==undefined)this.hubInfo[key]=m[key];
 if(m.now)this.serverOffset=m.now-Date.now();
 this.overlay(this.room);
 }
 nudge(){if(this.nudging)return;this.nudging=true;this.enqueue(async()=>{this.nudging=false;if(this.alive&&this.room){await this.accept(await this.api('poll'));this.schedule();}});}
 hubMessage(text){
 let m;try{m=JSON.parse(text)}catch{return;}
 if(!this.alive)return;
 this.session.connected=true;
 if(m.t==='presence'){
  const before=this.paired?.();this.hubClock(m);
  if(this.isDraft&&(before!==this.paired()||this.mode==='paused'))this.nudge();
  return;
 }
 if(m.t==='room'){this.nudge();return;}
 if(m.t==='emote'){if(this.room?.phase==='duel')showDuelEmote(m.emoji,m.seat===this.seat);return;}
 // Room tool text and emotes (room-admin.js); duel changes arrive as hub events below. `side` is a room seat.
 if(m.t==='admin'){const a=m.action||{};if(a.kind==='text')showAdminText(a.text,a.seconds);if(a.kind==='emote'&&this.room?.phase==='duel')showDuelEmote(a.emoji,(a.side??1-this.seat)===this.seat);return;}
 if(m.t==='desync'){this.resultSent=[];this.rebuild();return;}
 const log=this.duelLog;
 if(m.t==='sync'){
  this.hubClock(m);
  if(m.game!==this.room?.game||m.phase!==this.room?.phase){this.nudge();return;}
  if(!log||log.game!==m.game)return;
  let split=false;
  m.events.forEach((event,i)=>{const n=m.from+i,mine=log.events[n];if(!mine)log.events[n]=event;else if(mine.seat!==event.seat||JSON.stringify(mine.response)!==JSON.stringify(event.response))split=true;});
  log.confirmed=Math.max(log.confirmed,m.count);for(const n of log.outbox.keys())if(n<log.confirmed)log.outbox.delete(n);
  if(split){this.rebuild();return;}
  for(const packet of log.outbox.values())this.hubSend(packet);
  this.enqueue(()=>this.updateDuel(this.room));return;
 }
 if(m.t==='ev'){
  this.hubClock(m);
  if(!log||log.game!==m.game){this.nudge();return;}
  if(m.n>log.events.length){this.hubHello();return;}
  if(m.n===log.events.length)log.events.push({seat:m.seat,response:m.response,...(m.h===undefined?{}:{h:m.h}),...(m.admin?{admin:m.admin}:{})});
  log.confirmed=Math.max(log.confirmed,m.n+1);log.outbox.delete(m.n);
  this.enqueue(()=>this.updateDuel(this.room));return;
 }
 if(m.t==='reject'){if(log&&m.game===log.game)this.rebuild();else this.nudge();}
 }
 // Replays the confirmed log into a fresh engine. Anything the hub refused is dropped and its prompt returns.
 // Quick answers in a row (Chain Sometimes passes, forced picks) reach the hub as one bundle, which it stores in one
 // write instead of one per answer (Cloudflare's daily row limit, user 2026-11-14). An answer that hands the next
 // prompt to the opponent goes at once, with anything waiting. Unconfirmed answers stay in the outbox as before.
 queueMove(packet){(this.moveQueue??=[]).push(packet);clearTimeout(this.moveTimer);
  if(packet.nextActor!==this.seat||this.moveQueue.length>=24)return this.flushMoves();
  this.moveTimer=setTimeout(()=>this.flushMoves(),MOVE_BUNDLE_MS);}
 flushMoves(){clearTimeout(this.moveTimer);const q=this.moveQueue||[];this.moveQueue=[];if(!q.length)return;
  if(q.length===1){this.hubSend(q[0]);return;}
  const bundle={t:'rs',game:q[0].game,n:q[0].n,items:q.map(({response,nextActor,turn,h})=>({response,nextActor,turn,h}))};
  if(JSON.stringify(bundle).length>60000){for(const packet of q)this.hubSend(packet);return;}
  this.hubSend(bundle);}
 rebuild(){clearTimeout(this.moveTimer);this.moveQueue=[];const log=this.duelLog;this.game?.destroy();this.game=null;if(log){log.events.length=log.confirmed;log.outbox.clear();}this.hubHello();this.enqueue(()=>this.updateDuel(this.room));}
 netStatus(){return {online:!!this.hub?.isOpen,partnerOnline:this.hubInfo?.online?.[1-this.seat]??true,rtt:this.hub?.rtt==null?null:this.hub.rtt,route:'relay',partner:'Opponent'};}
 async accept(result){if(!this.alive)return;this.hydrate(result);const ended=result.room&&result.room.phase!=='duel'&&result.room.game>0&&result.room.phase!=='waiting'&&result.room.phase!=='drafting';const checkpoint=ended?result.room.code+':'+result.room.game:null;await this.sync(result);if(checkpoint&&checkpoint!==this.cloudCheckpoint){this.cloudCheckpoint=checkpoint;try{await this.onCheckpoint?.();}catch(error){console.warn('Post-duel backup:',error.message);}}if(!this.alive)return;this.room=result.record.room?result.room:null;this.seat=result.seat;this.serverOffset=result.now-Date.now();this.connectHub();this.updateReconnectTimer();this.session.code=this.room?.code||'';this.session.connected=true;
 if(this.duelist.status!=='alive'){this.game?.destroy();this.game=null;this.mode='shadow';this.view={phase:'gameover'};this.onView(this.view);this.onResult?.(false);this.render();return;}
 const r=this.room;if(r?.phase!=='duel')clearDuelEmotes();if(r?.phase==='duel'){this.seenEmotes??={};for(const [seat,event] of Object.entries(r.emotes||{})){const key=r.code+':'+seat;if(this.seenEmotes[key]===event.id)continue;this.seenEmotes[key]=event.id;if(!this.restoring&&event.game===r.game&&result.now-event.at<5000)showDuelEmote(event.emoji,+seat===this.seat);}}if(!r){this.closeHub();this.mode='home';this.render();return;}
 if(r.phase==='duel'){if(this.restoring)this.coinRoom=r.code;if(!this.restoring&&r.game===1&&!r.events.length&&this.coinRoom!==r.code){this.coinRoom=r.code;const coin=document.createElement('div');coin.className='collector-coin-toss';document.body.append(coin);try{await play3DToss(coin,'coin',[r.first===this.seat?1:0],{active:()=>this.alive,sound:this.sound||(()=>{})});if(this.alive){coin.textContent=r.first===this.seat?'You go first':'Opponent goes first';await new Promise(resolve=>setTimeout(resolve,650));}}finally{coin.remove();}}if(!this.alive)return;this.mode='duel';const enemyRelics=(this.opponentRelics?.(r)||[]).filter(k=>this.content.artifacts[k]);this.view={phase:'duel',characters:r.players.map(p=>p.character),modifiers:enemyRelics.map(id=>({kind:'opponent-relic',id,name:this.content.artifacts[id][0],description:this.content.artifacts[id][2]})),run:{character:this.duelist.character,opponent:r.players[1-this.seat].character,pool:this.duelist.pool,selected:[],artifacts:this.duelRelics?.(r)||[],opponent_relics:enemyRelics,curses:[],challenge_level:0,lp:8000,gold:0,round:1,stats:{},duel:{id:r.code+'-'+r.game}}};this.onView(this.view);await this.updateDuel(r);return;}
 this.game?.destroy();this.game=null;this.view={phase:r.phase};this.onView(this.view);this.mode=r.phase==='siding'?'siding':r.phase==='waiting'?'waiting':r.claimed?'home':this.prizeRoom===r.code?'prizes':'victory';if(this.mode==='victory')this.onResult?.(true);if(this.mode==='siding'&&this.sidingGame!==r.game){this.sidingGame=r.game;this.draft=structuredClone(r.decks[this.seat]);this.zones=null;this.section='deck';this.deckOrderKey=null;resetDeckFilters(this,COLLECTOR_SEARCH,false);}this.render();}
 updateReconnectTimer(){
 clearInterval(this.countdown);if(!this.alive)return;const draw=()=>{
  const r=this.room,last=r?.seen?.[1-this.seat],now=Date.now()+(this.serverOffset||0);
  if(r?.phase==='duel'&&r.actor===1-this.seat&&Date.now()-(this.checkedAt||0)>=PARTNER_CHECK){this.checkedAt=Date.now();this.hubSend({t:'check'});}
  const visible=this.alive&&this.session.connected&&r?.players.length===2&&r.phase!=='complete'&&Number.isFinite(last)&&now-last>20000;
  let el=document.getElementById('collector-reconnect-timer');
  if(!visible){el?.remove();return;}
  if(!el){el=document.createElement('div');el.id='collector-reconnect-timer';el.setAttribute('role','status');document.body.append(el);}
  const seconds=Math.max(0,Math.ceil(((r.disconnectLeft?.[1-this.seat]??300000)-Math.max(0,now-last-(r.charged?.[1-this.seat]||0)))/1000));
  el.textContent=`Opponent disconnected · Reconnect time remaining ${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
 };const update=()=>{draw();this.drawTurnTimer();};update();this.countdown=setInterval(update,1000);
 }
 drawTurnTimer(){
 document.getElementById('collector-turn-timer')?.remove();
 const r=this.room,portraits=[document.querySelector('.field-character.own'),document.querySelector('.field-character:not(.own)')];
 if(!this.alive||r?.phase!=='duel'||portraits.some(p=>!p)){document.querySelectorAll('.duel-portrait-timer').forEach(el=>el.remove());return;}
 const now=Date.now()+(this.serverOffset||0),paused=!this.session.connected||r.seen.some(t=>now-t>=15000),actor=r.actor;
 for(const [index,portrait] of portraits.entries()){
  const seat=index===0?this.seat:1-this.seat,id='collector-portrait-timer-'+index;let el=document.getElementById(id);
  if(!el){el=document.createElement('div');el.id=id;el.setAttribute('role','timer');document.body.append(el)}
  const ms=(r.turnLeft?.[seat]??180000)-(actor===seat&&!paused?Math.max(0,now-r.clockAt):0),sec=Math.max(0,Math.ceil(ms/1000)),text=`${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`;
  el.className='duel-portrait-timer'+(actor===seat?' active':'')+(paused?' paused':'');el.textContent=text;el.setAttribute('aria-label',`${index===0?'Your':'Opponent'} timer: ${text}${paused?' (paused)':''}`);
  const box=pageRect(portrait),width=Math.max(38,box.width);el.style.width=width+'px';el.style.left=Math.max(2,Math.min(pageWidth()-width-2,box.left+(box.width-width)/2))+'px';el.style.top=Math.min(pageHeight()-22,box.bottom+3)+'px';
 }
 }
 async updateDuel(r){if(!this.alive||r?.phase!=='duel'||r!==this.room)return;if(!r.hub){if(!this.oldMatchNotice){this.oldMatchNotice=true;this.dialog(this.isDraft?'Draft Duels':'Ultimate Collector','<p>This match started on an older version of the game, so it cannot continue here. Reopen it on the version it started on, or surrender it from there.</p>');}return;}const key=r.code+':'+r.game,engineSeat=this.seat^r.first;let fresh=false;
 if(this.gameKey!==key||!this.game){this.game?.destroy();this.game=new TagDuel([...this.content.cards,...this.content.tokenCards]);const created=this.game;await created.init();if(!this.alive){created.destroy();return;}this.randomCards?.prepare?.(created);const setup=this.duelSetup?await this.duelSetup(r):{};if(!this.alive){created.destroy();return;}if(this.game!==created)return;this.gameKey=key;this.applied=0;this.shown=-1;const order=[r.first,1-r.first];this.game.startTag({teams:order.map(i=>[{main:r.decks[i].main,extra:r.decks[i].extra}]),lp:8000,enemyLP:8000,seed:r.seed,mode:'pvp',rules:2,names:order.map(i=>[this.content.characters[r.players[i].character].name]),...setup});fresh=true;}
 while(this.applied<r.events.length){const event=r.events[this.applied];
 // A room tool change (hub.mjs MatchHub.admin) takes a step of its own, so the engine's answer count moves with it.
 if(event.admin){try{this.game.adminApply({...event.admin,side:event.admin.side^r.first});}catch(error){console.warn('Room tool change refused:',error.message);}this.game.responseNumber++;this.applied++;continue;}
 try{this.game.respondFor(event.seat^r.first,this.applied,decode(structuredClone(event.response)));}catch(error){console.warn('Duel step refused:',error.message);if(this.applied<this.duelLog.confirmed){this.status=error.message;return;}this.rebuild();return;}this.applied++;if(event.h!==undefined&&event.h!==this.game.checksum()&&!this.splitSeen?.has(key+':'+this.applied)){(this.splitSeen??=new Set()).add(key+':'+this.applied);console.warn('Duel state split at step',this.applied);this.rebuild();return;}}
 if(fresh||this.shown!==this.applied){const visuals=this.game.visuals.splice(0),cues=(this.restoring||fresh&&this.applied)?[]:this.game.cuesFor(engineSeat,visuals);const snap=this.game.snapshotFor(engineSeat);await this.onDuel(snap,cues);if(!this.alive)return;this.shown=this.applied;}
 if(!this.alive||this.gameKey!==key||!this.game)return;
 // Responses already carry the next actor, so the timer needs a vote only when the two disagree.
 const confirmed=this.duelLog.confirmed===this.applied,actor=this.game.respondingSeat===null?null:this.game.respondingSeat^r.first,turn=this.game.turn||1,clockKey=key+':'+this.applied;
 if(confirmed&&this.hubInfo?.game===r.game&&(this.hubInfo.actor!==actor||this.hubInfo.turn!==turn)&&this.clockSent!==clockKey&&this.hubSend({t:'clock',game:r.game,number:this.applied,turn,actor}))this.clockSent=clockKey;
 if(this.game.finished&&confirmed&&!this.resultSent?.includes(key)){const winner=this.game.finished.player;if(this.hubSend({t:'result',game:r.game,n:this.applied,winner:winner===0||winner===1?winner^r.first:2}))this.resultSent=[...(this.resultSent||[]),key];}
 }
 async request(action,value){if(action==='emote'){if(this.room?.phase!=='duel'||!validEmote(value))return;if(Date.now()-(this.lastEmote||0)<1500)return;this.lastEmote=Date.now();this.hubSend({t:'emote',emoji:value,game:this.room.game});}else if(action==='duel-response'){
 // A repeated tap lands here after the prompt was answered, so it is ignored rather than reported.
 const r=this.room,log=this.duelLog,number=this.applied;if(!this.game||this.game.respondingSeat!==(this.seat^r.first)||value.number!==number)return;
 const response=wire(value.response);
 // The prompt was cleared on the tap, so a refused answer has to put it back.
 try{this.game.respondFor(this.seat^r.first,number,decode(structuredClone(response)));}catch(error){this.shown=-1;await this.updateDuel(r);throw error;}
 this.applied++;
 const nextActor=this.game.respondingSeat===null?null:this.game.respondingSeat^r.first,turn=this.game.turn||1,h=this.game.checksum(),packet={t:'r',game:r.game,n:number,response,nextActor,turn,h};
 log.events[number]={seat:this.seat,response};log.outbox.set(number,packet);this.queueMove(packet);
 // No echo soon means a dead socket; finding out now beats the next routine ping.
 clearTimeout(this.probe);this.probe=setTimeout(()=>{if(log.outbox.size)this.hub?.ping();},PROBE_AFTER);
 // The answer is already on screen; it reaches the hub when the link allows. The clock display follows at once.
 if(this.hubInfo){this.hubInfo.actor=nextActor;this.hubInfo.turn=Math.max(this.hubInfo.turn||1,turn);this.overlay(r);}
 await this.updateDuel(r);return;
 }else if(action==='surrender'){await this.accept(await this.api('surrender',{game:this.room.game,turn:this.game?.turn}));}this.schedule();}
 render(){if(!this.alive||this.mode==='duel')return;document.querySelectorAll('.duel-portrait-timer').forEach(el=>el.remove());clearDuelEmotes();if((this.mode==='editor'||this.mode==='siding')&&this.draft){this.renderDeckEditor();return;}const oldScroll=this.root.querySelector('.collector-content')?.scrollTop||0,oldCards=this.root.querySelector('.cardgrid')?.scrollTop||0,keepScroll=this.lastRenderedMode===this.mode;this.lastRenderedMode=this.mode;const d=this.duelist,r=this.room;let body='';
 if(this.mode==='roster'){body=(collectorLanding(this.data.duelists)==='introduction'?collectorIntroductionMarkup():'')+collectorRosterMarkup(this.data.duelists,this.content.characters);}
 else if(this.mode==='import'){body='<h2>Choose a saved run</h2><p>This permanently moves the selected save out of single player.</p><div class="save-slot-grid">'+this.getSlots().map(s=>{const r=s.run,c=r?this.content.characters[r.character]:null,inDuel=r?.stage==='duel',eligible=r&&c&&!c.copycat&&!inDuel;return `<button class="save-slot" data-collector="select-import" data-source="${s.slot}" ${eligible?'':'disabled'}><span class="slot-number">Slot ${s.slot}${c?' · '+esc(c.name):''}</span><span class="slot-portrait">${c?`<img src="assets/${esc(c.sprite)}" alt="${esc(c.name)}">`:''}</span><span class="slot-detail">${r?`Loop ${(r.loop||0)+1} · Duel ${Math.min(9,(r.round||0)+1)}/9<br>${Number(r.lp||0).toLocaleString()} LP<br><small>Last played: ${esc(lastPlayed(r.last_played_at))}</small>`:'Empty'}</span><b class="slot-action">${inDuel?'finish your duel to import this collector':eligible?'Select this run':r?'Copycat cannot be imported':'Empty'}</b></button>`}).join('')+'</div>';}
 else if(this.mode==='import-name'){const s=this.getSlots().find(s=>s.slot===this.importSource),c=this.content.characters[s.run.character];body=`<section class="tag-join-screen"><h2>Name your duelist</h2><p>Slot ${s.slot} · ${esc(c.name)}</p><label for="collector-name">Duelist name</label><input id="collector-name" maxlength="32" autocomplete="off"><p>This permanently moves this save out of single player.</p>${(s.run.pool||[]).some(isRandomCard)?'<p class="collector-random-note">Randomized cards are banned in Ultimate Collector: they stay behind.</p>':''}<div>${button('Back','import-back')}${button('Import','move',`data-source="${s.slot}"`)}</div></section>`;}
 else if(this.mode==='shadow'){body=this.resultMarkup(false);}
 else if(this.mode==='home'){const legal=this.validateDeck(d.draftDeck||d.deck,d.pool,this.content.cards).length===0;body=`<h2>${esc(d.name)} · ${rankFor(d.wins)}</h2><div class="collector-home">${button('Edit deck','edit')}${button('Duelist history','history',legal?'':'disabled')}${button('Host','host',legal?'':'disabled')}${button('Join','join',legal?'':'disabled')}</div>`+(legal?'':'<p>Build a legal Main Deck to unlock the other options.</p>');}
 else if(this.mode==='join'){body='<section class="tag-join-screen"><h2>Join a room</h2><label for="collector-code">Enter room code</label><input id="collector-code" maxlength="5" autocapitalize="characters" autocorrect="off" spellcheck="false" autocomplete="off" placeholder="ABCDE" aria-label="Room code"><div>'+button('Back','home')+button('Join','join-room')+'</div></section>';}
 else if(this.mode==='waiting'){body=`<section class="tag-room collector-room"><div class="tag-room-heading"><div><small>ROOM CODE</small>${roomCodeControl(r.code)}</div><h2>${r.players.length} / 2 players</h2></div><div class="tag-room-players">${[0,1].map(i=>{const p=r.players[i],c=p?this.content.characters[p.character]:null;return `<div class="tag-player-portrait ${p?'':'tag-empty'}">${c?`<img src="assets/${esc(c.sprite)}" alt="${esc(c.name)}">`:''}<strong>${p?esc(p.name):'Waiting for opponent'}</strong></div>`}).join('')}</div><p>${r.players.length===2?'Opponent joined. Preparing the duel…':'Waiting for an opponent…'}</p>${button('Cancel room','leave')}</section>`;}
 else if(this.mode==='history'){body=`<h2>${rankFor(d.wins)} · ${d.wins} match wins</h2>`+d.history.map(h=>`<section class="panel"><h3>${h.won?'Won':'Lost'} against ${esc(h.opponent||'opponent')}</h3><p>${esc(h.reason)}</p><p>${(h.games||[]).map(g=>`Game ${g.game}: ${esc(g.result)} · ${g.turns} turns`).join('<br>')}</p><div class="collector-cards">${(h.cards||[]).map(id=>this.cardTile(id,'inspect')).join('')}</div></section>`).join('');}
 else if(this.mode==='victory'){body=this.resultMarkup(true);}
 else if(this.mode==='prizes'){const limitsByName=new Map();for(const c of this.content.cards)limitsByName.set(c.name,Math.min(limitsByName.get(c.name)??3,LIMITS[c.id]??3));body=`<h2>Match won · ${rankFor(d.wins)}</h2>`;if(r.claimed)body+='<p>Your prize cards are in your collection.</p>'+button('Return to roster','roster');else{body+=`<div class="collector-prizes"><p class="draft-count">${this.prizeSet?.size||0} / 5 prize cards selected</p><p class="draft-inspect-help">Tap to select · Hold a card to inspect · Drag to scroll</p><div class="cardgrid">${r.prizes.map((id,i)=>{const c=this.content.cards.find(c=>c.id===id),selected=this.prizeSet?.has(i);return `<button class="cardbtn ${selected?'selected':''}" data-collector="prize" data-index="${i}" data-id="${id}" aria-pressed="${!!selected}">${collectorLimitIcon(limitsByName.get(c?.name)??3)}<img src="${this.image(id)}" alt="${esc(c?.name)}"><span>${esc(c?.name)}</span></button>`}).join('')}</div><button class="duel-confirm collector-prize-confirm" data-collector="claim" aria-label="Claim five selected cards" title="Claim five selected cards" ${this.prizeSet?.size===5?'':'disabled'}><span class="duel-decision-icon" aria-hidden="true">✓</span></button></div>`;}}
 if(this.mode==='siding'&&r.ready.every(Boolean)&&r.nextFirst==null){body+=`<div class="collector-first-overlay"><section role="dialog" aria-modal="true" aria-label="Choose who starts"><h2>${r.chooser===this.seat?'Choose who starts':'Waiting for opponent'}</h2><p>${r.chooser===this.seat?'Siding is complete. You lost the previous duel, so you choose who starts.':'Siding is complete. Your opponent is choosing who starts.'}</p>${r.chooser===this.seat?button('I go first','first','data-first="'+this.seat+'"')+button('Opponent goes first','first','data-first="'+(1-this.seat)+'"'):''}</section></div>`;}
 if(this.mode==='home')body+=`<div class="collector-delete-corner">${button('Delete Collector','delete-collector')}</div>`;
 this.root.innerHTML=`<div class="collector-page"><header><h1>Ultimate Collector</h1><small>${r&&r.phase!=='complete'?'Room '+esc(r.code):''}</small>${button('Help','help')}${button('Back','back')}</header><div class="collector-content">${this.status?`<p role="status">${esc(this.status)}</p>`:''}${body}</div></div>`;if(keepScroll){this.root.querySelector('.collector-content').scrollTop=oldScroll;const grid=this.root.querySelector('.cardgrid');if(grid)grid.scrollTop=oldCards;}}
 resultMarkup(won){const d=this.duelist,c=this.content.characters[d.character];return `<section class="collector-result ${won?'triumph':'shadow-realm'}">${won?'<div class="collector-result-aura" aria-hidden="true"></div>':`<div class="collector-defeat-particles" aria-hidden="true">${Array.from({length:28},(_,i)=>`<i style="--x:${(i*37+11)%100}%;--y:${(i*53+7)%100}%;--size:${2+i%4}px;--drift:${(i%2?1:-1)*(12+i%23)}px;--duration:${8+i%7}s;--delay:-${i*.73}s"></i>`).join('')}</div>`}<img class="collector-result-portrait" src="assets/${esc(c.sprite)}" alt="${esc(c.name)}"><p class="collector-result-kicker">${won?'The Gods favored you':'THE SHADOWS HAVE CLAIMED YOU'}</p><h2>${won?'VICTORY':"YOUR DUELIST WAS SENT TO THE SHADOW REALM"}</h2><p class="collector-result-name">${esc(d.name)}</p><p>${won?`${rankFor(d.wins)} · Your collection lives on.`:'This duelist and their collection are lost forever.'}</p>${button(won?'Claim your five prize cards':'Return to Ultimate Collector',won?'open-prizes':'roster')}</section>`;}
 cardTile(id,action,index=id,selected=false){const c=this.content.cards.find(c=>c.id===id);return `<div class="collector-card ${selected?'selected':''}">${button(`<img src="${this.image(id)}" alt="${esc(c?.name)}"><span>${esc(c?.name)}</span>`,action,`data-index="${index}" data-id="${id}"`)}${action==='inspect'?'':button('Inspect','inspect',`data-id="${id}"`)}</div>`;}
 // The deck editor works like solo, Tag and Draft Duels (user, 2026-11-21): search window, type tabs, Deck status, Sort,
 // Deselect, stacks, paging and the wide-screen split (deck-editor-view.js). Sections are Deck (Main + Fusion, the Extra
 // Deck tab shows the Fusion Monsters) and Side Deck; siding shows every match card, selected = in the Deck.
 cardById(id){this.cardIndex??=new Map(this.content.cards.map(c=>[c.id,c]));return this.cardIndex.get(id);}
 nameLimit(name){if(!this.nameLimits){this.nameLimits=new Map();for(const c of this.content.cards)this.nameLimits.set(c.name,Math.min(this.nameLimits.get(c.name)??3,LIMITS[c.id]??3));}return this.nameLimits.get(name)??3;}
 editorPage(){
  const siding=this.mode==='siding',r=this.room,pool=siding?deckCards(r.startDecks[this.seat]):this.duelist.pool,lookup=id=>this.cardById(id),info=this.content.artifactInfo;
  if(!this.zones||this.zones.length!==pool.length)this.zones=zonesFor(pool,this.draft);
  this.section=!siding&&this.section==='side'?'side':'deck';this.deckFilter??='All';this.deckSort??=savedDeckSort(COLLECTOR_DECK_SORTS);this.deckStatus??=savedDeckStatus();if(this.deckStatus==='Marked')this.deckStatus='First';
  this.draft=deckFromZones(pool,this.zones);
  const view=sectionView(this.zones,this.section,siding),ids=view.visible.map(i=>pool[i]),run={pool:ids,artifacts:[],curses:[],challenge_level:0,new_cards_from:ids.length};
  this.editorView={...view,run,pool};
  const used=nameCounts(pool,this.zones,id=>lookup(id)?.name),limit=id=>this.nameLimit(lookup(id)?.name);
  const order=deckOrder(this,{pool:ids,selected:view.selected,lookup,run,info,searchKey:COLLECTOR_SEARCH}),inDeck=new Set(view.selected);
  const cardMarkup=k=>deckCardButton({id:ids[k],index:k,card:lookup(ids[k]),run,info,image:this.image,selected:inDeck.has(k),attrs:'data-collector="toggle"',extra:collectorLimitIcon(limit(ids[k]))});
  // A name at its limit counts as full, so a stack's next tap takes its copies out; siding keeps every card.
  const stack={run,attr:'data-index',extra:'data-collector="toggle"',limit:siding?null:id=>(used.get(lookup(id)?.name)||0)>=limit(id)};
  const d=this.draft,errors=this.validateDeck(d,pool,this.content.cards,siding?r.startDecks[this.seat]:null),target=siding?r.startDecks[this.seat].main.length:40;
  // The two sections lead the filter row, so short landscape phones keep the card area.
  const sections=siding?'':[['deck','Deck'],['side','Side Deck']].map(([s,label])=>button(label,'section',`data-section="${s}" class="${this.section===s?'active':''}" aria-pressed="${this.section===s}"`)).join('')+'<span class="collector-section-gap" aria-hidden="true"></span>';
  const arrow=`<button class="tag-choose-opponent draft-next deck-count-arrow" data-collector="${siding?'ready':'home'}" ${siding&&(errors.length||r.ready[this.seat])?'disabled':''} aria-label="${siding?'Ready for next duel':'Back'}" title="${siding?'Ready for next duel':'Back'}"><span><span class="tag-next-label"><strong>${d.main.length}/${target}${siding?'':'+'}</strong></span></span></button>`;
  const footer=`<footer class="collector-deck-footer"><p>${errors.map(esc).join('<br>')||(siding?'Deck sizes restored. Ready for the next duel.':'Deck is legal.')}</p>${siding?button('Reset changes','reset-siding')+`<p>${r.ready[1-this.seat]?'Opponent ready':'Waiting for opponent to finish siding'}</p>`:'<span>Changes saved automatically</span>'}</footer>`;
  const action=(label,name,attrs)=>siding&&name==='deselect-all'?'':button(label,name,attrs);
  return `<div class="page draft-deck-page collector-deck-editor${siding?' collector-siding':''}"><header><h2>Ultimate Collector</h2><div class="tools">${button('Help','help')}${button('Back','back')}</div></header><div class="scroll draft-scroll collector-deck-scroll">${this.status?`<p role="status">${esc(this.status)}</p>`:''}<div class="draft-summary"><div><p class="draft-count">${d.main.length} / ${siding?target:'40–60'} main · ${d.side.length} / 15 side · ${d.extra.length} / 15 Fusion</p><p class="draft-inspect-help">${siding?'Tap a card to move it between Main and Side (Fusion cards use Fusion).':'Tap to select'} · Hold a card to inspect · Drag to scroll</p></div>${arrow}</div>${deckToolbar(this,{searchKey:COLLECTOR_SEARCH,sorts:COLLECTOR_DECK_SORTS,idPrefix:'collector',action}).replace('<div class="draft-tabs deck-filter-row">','<div class="draft-tabs deck-filter-row">'+sections)}${deckCardsArea(this,order,view.selected,cardMarkup,stack)}</div>${footer}</div>`;
 }
 renderDeckEditor(){
  const r=this.room,keep=saveDeckScroll(this.root.querySelector('.collector-deck-scroll'));this.lastRenderedMode=this.mode;
  const overlay=this.mode==='siding'&&r.ready.every(Boolean)&&r.nextFirst==null?`<div class="collector-first-overlay"><section role="dialog" aria-modal="true" aria-label="Choose who starts"><h2>${r.chooser===this.seat?'Choose who starts':'Waiting for opponent'}</h2><p>${r.chooser===this.seat?'Siding is complete. You lost the previous duel, so you choose who starts.':'Siding is complete. Your opponent is choosing who starts.'}</p>${r.chooser===this.seat?button('I go first','first','data-first="'+this.seat+'"')+button('Opponent goes first','first','data-first="'+(1-this.seat)+'"'):''}</section></div>`:'';
  this.root.innerHTML=this.editorPage()+overlay;
  restoreDeckScroll(this.root.querySelector('.collector-deck-scroll'),keep);
  const v=this.editorView;wireDeckToolbar(this.root,this,{searchKey:COLLECTOR_SEARCH,cards:()=>v.visible.map(i=>this.cardById(v.pool[i])).filter(Boolean),idPrefix:'collector',render:()=>this.render()});
  if(this.mode==='editor')deckReadyFeedback(this.root,this.draft.main.length,40,this);
  if(!this.onEditorResize&&typeof window!=='undefined'){let timer=0;this.onEditorResize=()=>{clearTimeout(timer);timer=setTimeout(()=>{if(this.alive&&['editor','siding'].includes(this.mode)&&this.editorView)this.checkCollectorSplit()},200)};window.addEventListener('resize',this.onEditorResize,{passive:true});}
  this.checkCollectorSplit();
 }
 checkCollectorSplit(){if(updateDeckSplit(this,this.root.querySelector('.collector-deck-scroll')))this.renderDeckEditor();}
 // A tap keeps what it meant when it was drawn (deck-stacks.js tapIntent), like solo and Tag.
 tapCard(el){const v=this.editorView,siding=this.mode==='siding',{toggles}=applyTaps(v.run,v.selected,[steadyTap(v.run,tapIntent(el,'index'))]);
  for(const k of toggles){const i=v.visible[k];if(i!==undefined)toggleZone(this.zones,i,this.section,siding,!!(this.cardById(v.pool[i])?.data.type&64));}
  this.draft=deckFromZones(v.pool,this.zones);}
 async action(action,el={dataset:{}}){const x=el.dataset;
 if(action==='delete-collector'){if(this.mode!=='home')return;this.dialog('Delete Collector?',`<p>Permanently delete <b>${esc(this.duelist.name)}</b> and their collection? This frees their slot and cannot be undone in the game.</p>${button('Cancel','cancel-delete')}${button('Delete Collector','confirm-delete')}`);return;}
 if(action==='cancel-delete'){document.querySelector('dialog[open]')?.close();return;}
 if(action==='confirm-delete'){if(this.mode!=='home')return;await this.sync(await this.api('delete'));this.data=await this.backend('collector-delete',{id:this.duelist.id});document.querySelector('dialog[open]')?.close();clearTimeout(this.timer);this.duelist=null;this.room=null;this.mode='roster';this.render();return;}
 if(action==='open-prizes'){this.prizeRoom=this.room.code;this.mode='prizes';this.render();return;}
 if(action==='help'){this.dialog('Ultimate Collector',collectorIntroductionMarkup());return;}
 if(action==='inspect'){this.inspect(+x.id);return;}
 if(action==='exit'||action==='back'){if(this.room&&this.room.phase!=='complete'){this.dialog('Leave Ultimate Collector?',`<p>Your match remains active. Reopen Ultimate Collector within five minutes to reconnect or your duelist will be lost.</p>${button('Leave and reconnect later','exit-now')}`);return;}if(this.mode==='roster'){this.destroy();await this.onExit();return;}this.mode=['editor','history','join'].includes(this.mode)?'home':this.mode==='import-name'?'import':'roster';this.render();return;}
 if(action==='exit-now'){document.querySelector('dialog[open]')?.close();this.destroy();await this.onExit();return;}
 if(action==='roster'){this.room=null;this.mode='roster';this.duelist=null;this.render();return;}
 if(action==='select'){this.duelist=this.data.duelists.find(d=>d.status==='alive'&&d.slot===+x.collectorSlot);if(!this.duelist)return;await this.connectionReady;const pending=this.registrations?.get(this.duelist.id);let result;try{result=pending?await pending:await this.api('register',{duelist:this.duelist});}catch{result=await this.api('register',{duelist:this.duelist});}this.registrations?.delete(this.duelist.id);if(!this.alive)return;await this.accept(result);this.schedule();return;}
 if(action==='home'){this.mode='home';}
 if(action==='import-back'){this.mode='import';}
 if(action==='select-import'){const s=this.getSlots().find(s=>s.slot===+x.source);if(s?.run?.stage==='duel'){this.dialog('Ultimate Collector','<p>finish your duel to import this collector</p>');return;}if(!s?.run||this.content.characters[s.run.character]?.copycat)return;this.importSource=+x.source;this.mode='import-name';}
 if(action==='import'){this.importSlot=+x.collectorSlot;this.mode='import';}
 if(action==='move'){await this.connectionReady;const name=document.getElementById('collector-name').value;this.data=await this.backend('collector-import',{source:+x.source,slot:this.importSlot,name});this.duelist=this.data.duelists.find(d=>d.status==='alive'&&d.slot===this.importSlot);await this.accept(await this.api('register',{duelist:this.duelist}));return;}
 if(action==='edit'){this.draft=structuredClone(this.duelist.draftDeck||this.duelist.deck);this.zones=null;this.section='deck';this.deckOrderKey=null;resetDeckFilters(this,COLLECTOR_SEARCH,false);this.mode='editor';}
 if(action==='section'){this.section=x.section;this.deckOrderKey=null;if(this.mode!=='siding')this.mode='editor';}
 if(action==='deck-filter')this.deckFilter=x.filter;
 if(action==='deselect-all'&&this.mode==='editor'){this.dialog('Deselect all?',`<p>Take every card out of your deck?</p>${button('Deselect all','deselect-all-confirm','class="primary"')}`);return;}
 if(action==='reset-siding'&&this.mode==='siding'){this.draft=structuredClone(this.room.decks[this.seat]);this.zones=null;}
 if(action==='deselect-all-confirm'&&this.mode==='editor'&&this.zones){document.querySelector('dialog[open]')?.close();const side=this.section==='side';this.zones=this.zones.map(z=>(side?z==='side':z==='main'||z==='extra')?null:z);this.draft=deckFromZones(this.duelist.pool,this.zones);}
 if(action==='toggle'&&(this.mode==='editor'||this.mode==='siding')&&this.editorView){this.tapCard(el);playUISound('deck-select');}
 if(this.mode==='editor'&&['toggle','deselect-all-confirm'].includes(action)){this.data=await this.backend('collector-draft',{id:this.duelist.id,deck:this.draft});this.duelist=this.data.duelists.find(d=>d.id===this.duelist.id);}
 if(action==='history')this.mode='history';
 if(action==='host'||action==='join-room'){await this.sync(await this.api('deck',{deck:this.duelist.draftDeck||this.duelist.deck}));await this.accept(await this.api(action==='host'?'host':'join',{code:document.getElementById('collector-code')?.value}));this.schedule();return;}
 if(action==='join')this.mode='join';
 if(action==='leave'){await this.accept(await this.api('leave'));return;}
 if(action==='ready'){await this.accept(await this.api('side',{deck:this.draft}));this.schedule();return;}
 if(action==='first'){await this.accept(await this.api('first',{first:+x.first}));this.schedule();return;}
 if(action==='prize'){this.prizeSet??=new Set();const i=+x.index;if(this.prizeSet.has(i))this.prizeSet.delete(i);else if(this.prizeSet.size<5)this.prizeSet.add(i);}
 if(action==='claim'){await this.accept(await this.api('prizes',{indices:[...this.prizeSet]}));this.prizeSet.clear();return;}
 this.render();}
 destroy(){this.alive=false;if(this.onEditorResize)window.removeEventListener('resize',this.onEditorResize);this.closeHub();clearInterval(this.countdown);document.getElementById('collector-reconnect-timer')?.remove();document.getElementById('collector-turn-timer')?.remove();document.querySelectorAll('.duel-portrait-timer').forEach(el=>el.remove());clearDuelEmotes();clearTimeout(this.timer);this.game?.destroy();document.removeEventListener('click',this.click,true);clearTimeout(this.hold);document.removeEventListener('pointerdown',this.down);document.removeEventListener('pointermove',this.move);document.removeEventListener('pointerup',this.cancelHold);document.removeEventListener('pointercancel',this.cancelHold);}
}
