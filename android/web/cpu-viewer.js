import {CPUDeckEditor} from './cpu-deck-editor.js';
import {genreIcons,typeIcon} from './card-search.js';
import {loadDuelResources} from './engine.js';
import {MobileDuel,L} from './duel.js';
// Separate deterministic streams keep each seat shuffled and Replay seed reproducible.
export function shuffleCPUDeck(cards,seed,seat=0){
 const result=[...cards];let state=((seed>>>0)^Math.imul(seat+1,0x9e3779b9))>>>0;
 const random=()=>{state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296};
 for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]]}return result;
}
const freshSeed=previous=>{const value=globalThis.crypto?.getRandomValues?crypto.getRandomValues(new Uint32Array(1))[0]:Date.now()>>>0;return value===(previous>>>0)?(value+1)>>>0:value};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export class CPUViewer {
 constructor({root,content,inspect,dialog,onExit}){
  Object.assign(this,{root,content,inspect,dialog,onExit});this.content={...content,characters:{...content.characters,...content.cpuWatchOpponents},cpuDecks:content.cpuWatchDecks||content.cpuDecks};this.ids=Object.keys(this.content.cpuDecks||{}).map(Number).filter(id=>this.content.cpuDecks[id]?.length&&this.content.characters[id]);this.characters=this.ids.slice(0,2);this.tiers=[0,0];this.seed=Date.now()%2147483647;this.speed=700;this.paused=true;this.reveal=true;this.history=[];this.generation=0;
  this.listener=e=>{const b=e.target.closest('[data-cpu]');if(!b)return;e.stopImmediatePropagation();this.action(b.dataset.cpu,b).catch(error=>{this.paused=true;this.error=error.message;if(this.state)this.render();else{this.setup();this.dialog('CPU duel',`<p>${esc(error.message)}</p>`)}})};root.addEventListener('click',this.listener,true);this.setup();
 }
 setup(){this.editor?.destroy();this.editor=null;clearTimeout(this.timer);this.paused=true;this.engine?.destroy();this.engine=null;this.generation++;this.state=null;this.editSide??=0;
  for(const side of [0,1])this.tiers[side]=Math.min(this.tiers[side],this.content.cpuDecks[this.characters[side]].length-1);
  const side=this.editSide,id=this.characters[side],ch=this.content.characters[id],deck=this.content.cpuDecks[id][this.tiers[side]];
  this.root.innerHTML=`<section class="page character-select-page cpu-setup"><header><button data-cpu="exit">Exit</button><button data-cpu="editor">Deck editor</button></header><div class="cpu-picker-title"><h2>Watch CPU duel</h2><p>Choose two opponents and their current campaign decks</p></div><div class="char-layout"><div class="roster" style="--roster-rows:${Math.ceil(this.ids.length/6)}">${this.ids.map(i=>`<button class="portrait ${i===id?'selected':''}" data-cpu="character" data-id="${i}" aria-label="Choose ${esc(this.content.characters[i].name)}" aria-pressed="${i===id}"><img src="assets/${this.content.characters[i].sprite}" alt=""><span>${esc(this.content.characters[i].name)}</span>${this.characters.includes(i)?`<b class="cpu-seat">CPU ${this.characters.indexOf(i)+1}</b>`:''}</button>`).join('')}</div><div class="duelist-selection"><div class="cpu-side-tabs">${[0,1].map(p=>`<button data-cpu="side" data-side="${p}" class="${side===p?'active':''}" aria-pressed="${side===p}"><small>CPU ${p+1}</small><strong>${esc(this.content.characters[this.characters[p]].name)}</strong></button>`).join('')}</div><aside class="char-details"><div class="duelist-hero" style="background-image:url('assets/${ch.background||'character-backgrounds/'+id+'.jpg'}')"><img src="assets/${ch.sprite}" alt="${esc(ch.name)}"><h2>${esc(ch.name)}</h2></div><div class="cpu-deck-select"><h3>Choose Deck</h3><div class="cpu-tier-tabs">${this.content.cpuDecks[id].map((record,t)=>`<button data-cpu="tier" data-tier="${t}" class="${this.tiers[side]===t?'active':''}" aria-pressed="${this.tiers[side]===t}">${esc(record.label||['Tier 1','Tier 2','Tier 3','Endless'][t]||'Deck')}</button>`).join('')}</div><p>${deck.main.length} main deck cards${deck.extra.length?' · '+deck.extra.length+' Extra Deck':''}</p><button data-cpu="deck">Inspect deck</button></div></aside><p class="cpu-fair-match">8,000 LP each · No relics or curses</p><button class="primary cpu-start" data-cpu="start">Watch duel</button></div></div></section>`;
 }
 async start(repeat=false,{replay=[],paused=false}={}){
  if(!repeat){if(this.characters[0]===this.characters[1])throw Error('Choose two different opponents.');this.seed=freshSeed(this.seed);}
  clearTimeout(this.timer);this.engine?.destroy();this.engine=null;const generation=++this.generation;this.history=[];this.decisions=[];this.paused=true;this.state=null;this.error='';this.preview=null;
  this.root.innerHTML='<section class="loading"><img class="loading-wizard" src="assets/time-wizard.png" alt="Time Wizard"><h2>Preparing CPU duel…</h2><progress></progress></section>';
  const resources=await loadDuelResources();
  if(generation!==this.generation)return;
  const created=await new MobileDuel([...this.content.cards,...(this.content.tokenCards||[])]).init(resources);
  if(generation!==this.generation){created.destroy();return}this.engine=created;
  const decks=this.characters.map((id,p)=>this.content.cpuDecks[id][this.tiers[p]]);
  // Spectator matches deliberately receive no campaign passive script or modifiers.
  const main=decks.map((deck,seat)=>shuffleCPUDeck(deck.main,this.seed,seat));
  this.state=this.engine.start(main[0],main[1],8000,8000,5,this.seed,decks[0].extra,decks[1].extra,'-- SHADOW_RUN_RNG 2\nif Duel.EnableRogueAntiStreak then Duel.EnableRogueAntiStreak() end');this.capture();
  for(let i=0;i<replay.length;i++){
   this.applyDecision(replay[i]);
   if(i%25===24){await new Promise(resolve=>setTimeout(resolve,0));if(generation!==this.generation)return;}
  }
  this.paused=paused||!!this.state.finished;this.render();this.schedule();
 }
 capture(){const events=this.engine.visuals.splice(0).filter(x=>x.kind!=='move'&&x.kind!=='draw');for(const e of events){const actor=this.content.characters[this.characters[e.player??e.card?.controller??this.state.player]].name;this.history.push(e.kind==='lp'?`${actor}: ${e.amount>0?'+':''}${e.amount} LP`:e.kind==='turn'?`${actor}'s turn`:e.text||e.kind)}if(this.history.length>1500)this.history.splice(0,this.history.length-1500);}
 schedule(){clearTimeout(this.timer);if(!this.paused&&!this.state?.finished&&this.engine)this.timer=setTimeout(()=>{try{this.step()}catch(error){this.paused=true;this.error=error.message;this.render()}},this.speed);}
 async stepBack(){if(!this.decisions?.length)return;this.paused=true;clearTimeout(this.timer);const replay=this.decisions.slice(0,-1);await this.start(true,{replay,paused:true});}
 applyDecision(saved){const prompt=this.engine.pending;const actor=this.content.characters[this.characters[prompt.player]].name;
  // Re-run policy bookkeeping, but replay the exact recorded core response.
  const generated=this.engine.auto(prompt),response=structuredClone(saved??generated);this.decisions.push(structuredClone(response));this.history.push(`${actor} · prompt ${prompt.type}: ${JSON.stringify(response,(_,v)=>typeof v==='bigint'?String(v):v)}`);this.state=this.engine.respond(response);this.capture();}
 step(){if(!this.engine||this.state.finished)return;this.applyDecision();if(this.state.finished)this.paused=true;this.render();this.schedule();}
 previewMarkup(){const c=this.content.cards.find(c=>c.id===this.preview);return c?`<img src="assets/cards/${c.id}.jpg" alt="${esc(c.name)}"><h3>${esc(c.name)}</h3><div class="badges">${typeIcon(c)}${esc(c.type||'')} · ${esc(c.race||'')}${c.attribute?' · '+esc(c.attribute):''}</div>${c.data.type&1?`<div class="stats"><img class="genre-icon" src="assets/icons/level-star.png" alt="Level"> ${c.level}<br>ATK ${c.atk} / DEF ${c.defense}</div>`:''}${genreIcons(c)}<div class="card-text">${esc(c.desc)}</div>`:'<p>Tap any card to inspect it. Both hands and set cards are revealed to you.</p>'}
 zone(c,p,loc,seq,col,row,label=''){
  const visible=c&&(this.reveal||!!(c.position&5)),monster=loc===L.MZONE;
  return `<button class="zone ${p?'enemy':''} ${!c?'empty':''} ${monster&&c&&(c.position&12)?'defense':''}" style="grid-column:${col};grid-row:${row}" ${c&&visible?`data-cpu="inspect" data-code="${c.code}" aria-label="Inspect ${esc(this.engine.name(c.code))}"`:'disabled'}>${c?`<img src="${visible?'assets/cards/'+c.code+'.jpg':'assets/card-back.jpg'}" alt="${visible?esc(this.engine.name(c.code)):'Set card'}">`:label}${c&&visible&&!(c.position&5)?'<span class="cpu-set-badge">SET</span>':''}${visible&&monster?`<span class="power">${c.attack} / ${c.defense}</span>`:''}</button>`;
 }
 pile(p,kind,col,row){const items=this.state.players[p][kind],count=Array.isArray(items)?items.filter(Boolean).length:items,top=Array.isArray(items)?items.filter(Boolean).at(-1):null;const visible=top&&(this.reveal||top.position&5),label={deck:'Deck',extra:'Extra',grave:'Graveyard',banished:'Banished'}[kind];return `<button class="zone pile" style="grid-column:${col};grid-row:${row}" data-cpu="pile" data-player="${p}" data-kind="${kind}" aria-label="CPU ${p+1} ${label}">${count?`<img src="${visible?'assets/cards/'+top.code+'.jpg':'assets/card-back.jpg'}" alt="">`:''}<span class="count">${count||0}</span><span class="zone-name">${label}</span></button>`;}
 render(){if(!this.state)return;const s=this.state,chars=this.characters.map(i=>this.content.characters[i]),rows=[];
  this.preview??=s.players[0].hand.find(Boolean)?.code;
  rows.push(this.pile(1,'deck',2,1),this.pile(1,'extra',8,1),this.pile(1,'grave',2,2),this.pile(1,'banished',1,2),this.zone(s.players[1].spells[5],1,L.SZONE,5,8,2,'Field'));
  for(let i=0;i<5;i++){rows.push(this.zone(s.players[1].spells[i],1,L.SZONE,i,7-i,1),this.zone(s.players[1].monsters[i],1,L.MZONE,i,7-i,2),this.zone(s.players[0].monsters[i],0,L.MZONE,i,i+3,4),this.zone(s.players[0].spells[i],0,L.SZONE,i,i+3,5))}
  rows.push(this.zone(s.players[0].spells[5],0,L.SZONE,5,2,4,'Field'),this.pile(0,'extra',2,5),this.pile(0,'grave',8,4),this.pile(0,'banished',9,4),this.pile(0,'deck',8,5));
  rows.push(`<div class="phases">${[[1,'DP'],[2,'SP'],[4,'MP1'],[8,'BP'],[256,'MP2'],[512,'EP']].map(([n,t])=>`<button disabled class="${(n===8?s.phase>=8&&s.phase<256:s.phase===n)?'active':''}">${t}</button>`).join('')}</div>`);
  const hand=p=>s.players[p].hand.filter(Boolean).map(c=>`<button ${this.reveal?`data-cpu="inspect" data-code="${c.code}" aria-label="Inspect ${esc(this.engine.name(c.code))}"`:'disabled'}><img src="${this.reveal?'assets/cards/'+c.code+'.jpg':'assets/card-back.jpg'}" alt="${this.reveal?esc(this.engine.name(c.code)):'Hidden card'}"></button>`).join('');
  const status=s.finished?`${s.finished.player<2?chars[s.finished.player].name+' wins':'Draw'}`:`${chars[s.player].name}'s turn${this.paused?' · Paused':''}`;
  this.root.innerHTML=`<div class="duel cpu-watch"><aside class="inspection"><div class="cpu-inspect-card">${this.previewMarkup()}</div><div class="cpu-playback"><div><button data-cpu="pause" ${s.finished?'disabled':''}>${this.paused?'Play':'Pause'}</button><select id="cpu-speed" aria-label="Playback speed">${[[1400,'0.5×'],[700,'1×'],[250,'3×'],[60,'10×']].map(([v,l])=>`<option value="${v}" ${v===this.speed?'selected':''}>${l}</option>`).join('')}</select></div><div><button data-cpu="back" ${this.decisions?.length?'':'disabled'}>Step back</button><button data-cpu="step" ${s.finished?'disabled':''}>Step</button></div><button data-cpu="reveal">${this.reveal?'Hide':'Reveal'} hands / sets</button><small>Inspecting pauses playback</small></div></aside><section class="duel-main"><div class="duel-particles" aria-hidden="true">${Array.from({length:14},(_,i)=>`<i style="--x:${(i*37+7)%100}%;--y:${(i*19+3)%100}%;--delay:-${i*1.7}s;--duration:${10+i%6}s"></i>`).join('')}</div><div class="lpbar"><div class="life"><strong>${s.lp[0]}</strong><span>${esc(chars[0].name)}</span></div><div class="turn">TURN<b>${s.turn}</b></div><div class="life enemy"><span>${esc(chars[1].name)}</span><strong>${s.lp[1]}</strong></div></div><div class="field-wrap cpu-field"><div class="enemy-hand cpu-hand">${hand(1)}</div><img class="field-character" src="assets/${chars[1].sprite}" alt="CPU 2"><img class="field-character own" src="assets/${chars[0].sprite}" alt="CPU 1"><div class="mat">${rows.join('')}</div><div class="cpu-status" role="status">${esc(this.error||status)}</div></div><div class="hand cpu-hand">${hand(0)}</div><div class="duel-tools duel-tools-left"><button data-cpu="log">Log</button><button data-cpu="restart">Replay seed</button></div><div class="duel-tools duel-tools-right"><button data-cpu="setup">Matchup</button><button data-cpu="exit">Exit</button></div></section></div>`;
  const field=[s.players[0].spells[5],s.players[1].spells[5]].find(c=>c&&(c.position&5));if(field)this.root.querySelector('.duel').style.backgroundImage=`linear-gradient(#04171988,#031017aa),url('assets/fields/${field.code}.jpg')`;
  const speed=this.root.querySelector('#cpu-speed');speed.onpointerdown=()=>clearTimeout(this.timer);speed.onblur=()=>this.schedule();speed.onchange=e=>{this.speed=Number(e.target.value);this.schedule()};
 }
 async action(action,button){
  if(action==='editor'){this.editor=new CPUDeckEditor({root:this.root,content:this.content,inspect:this.inspect,onBack:()=>this.setup()});return}
  if(action==='exit'){this.destroy();return this.onExit()}
  if(action==='side'){this.editSide=Number(button.dataset.side);return this.setup()}
  if(action==='character'){const id=Number(button.dataset.id),other=1-this.editSide;if(this.characters[other]===id)this.characters[other]=this.characters[this.editSide];this.characters[this.editSide]=id;return this.setup()}
  if(action==='tier'){this.tiers[this.editSide]=Number(button.dataset.tier);return this.setup()}
  if(action==='deck'){const p=this.editSide,deck=this.content.cpuDecks[this.characters[p]][this.tiers[p]];return this.dialog('CPU '+(p+1)+' · '+(deck.label||'Deck '+(this.tiers[p]+1)),`<div class="cardgrid">${[...deck.main,...deck.extra].map(id=>`<button class="cardbtn" data-inspect="${id}"><img src="assets/cards/${id}.jpg" alt=""><span>${esc(this.content.cards.find(c=>c.id===id)?.name||id)}</span></button>`).join('')}</div>`)}
  if(action==='pile'){this.paused=true;clearTimeout(this.timer);const p=Number(button.dataset.player),kind=button.dataset.kind,cards=this.engine.query(p,{deck:L.DECK,extra:L.EXTRA,grave:L.GRAVE,banished:L.REMOVED}[kind]).filter(Boolean);this.render();return this.dialog('CPU '+(p+1)+' · '+kind,`<div class="cardgrid">${cards.map(c=>`<button class="cardbtn" data-inspect="${c.code}"><img src="assets/cards/${c.code}.jpg" alt="${esc(this.engine.name(c.code))}"></button>`).join('')}</div>`)}
  if(action==='start')return this.start();if(action==='setup')return this.setup();if(action==='restart')return this.start(true);
  if(action==='pause'){this.paused=!this.paused;this.render();this.schedule()}
  if(action==='back')return this.stepBack();
  if(action==='step'){clearTimeout(this.timer);this.paused=true;this.step()}
  if(action==='reveal'){this.reveal=!this.reveal;this.render()}
  if(action==='inspect'){this.preview=Number(button.dataset.code);this.paused=true;clearTimeout(this.timer);this.render();this.inspect(Number(button.dataset.code))}
  if(action==='log'){this.paused=true;clearTimeout(this.timer);this.render();this.dialog('CPU duel log',`<p>Seed ${this.seed}</p><pre class="cpu-log">${esc(this.history.join('\n'))}</pre>`)}
 }
 back(){if(this.editor)return this.editor.back();this.destroy();return this.onExit()}
 destroy(){this.editor?.destroy();this.editor=null;this.generation++;clearTimeout(this.timer);this.engine?.destroy();this.engine=null;this.root.removeEventListener('click',this.listener,true);}
}
