// Duel Bets: the duel supply. A worker records real CPU duels (idle-bets-worker.js); each one is kept in
// IndexedDB (up to LIBRARY_CAP) so a phone that can't record as fast as nine boards play reuses older duels,
// and every recorded result feeds the per-deck stats that settle unwatched bracket duels.
import {loadDuelResources} from './engine.js';
export const LIBRARY_CAP=300;
const sig=tl=>tl.seed+':'+tl.seats.map(s=>s.id+'.'+s.tier).join(':');
const DB='ygo-duel-bets',STORE='timelines',META='meta';
// Each version bump drops the stored duels: 2 added the top Graveyard card and Extra/banished counts,
// 3 removed the 40-turn limit (older duels could end as turn-limit draws), 4 records phases, 5 the events behind Duel Feats.
function open(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,5);r.onupgradeneeded=()=>{const db=r.result;// Only the stored duels are dropped; the per-deck stats (META) carry over.
  if(db.objectStoreNames.contains(STORE))db.deleteObjectStore(STORE);db.createObjectStore(STORE,{keyPath:'key',autoIncrement:true});if(!db.objectStoreNames.contains(META))db.createObjectStore(META)};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
const done=req=>new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});

export class DuelSupply{
 // pool: [{id,tier,label,key}] · deckList: {key: {main,extra}} · cards: content cards (+ tokens)
 // modsFor(ids): the character upgrades a duel between these characters is played with ({lp,passives,sig}; sig '' = none).
 // weight(id): how often a character is picked (Spotlight).
 constructor({pool,deckList,cards,modsFor=()=>({sig:''}),weight=()=>1,featured=()=>[]}){Object.assign(this,{pool,deckList,cards,modsFor,weight,featured});this.fresh=[];this.waiting=[];this.jobs=new Map();this.nextId=1;this.index=[];this.stats={};this.busy=0;this.target=1;this.msAvg=600;this.closed=false;this.recent=[];this.queue=[];this.active=new Set()}
 async start(){
  try{this.db=await open();this.index=(await done(this.db.transaction(STORE).objectStore(STORE).getAllKeys()))||[];this.stats=(await done(this.db.transaction(META).objectStore(META).get('stats')))||{}}catch{this.db=null}
  this.worker=new Worker(new URL('./idle-bets-worker.js',import.meta.url),{type:'module'});
  this.worker.onmessage=e=>this.message(e.data);this.worker.onerror=e=>{this.failed=String(e.message||'Worker failed');this.flushWaiting()};
  // Shared with the game's duels (cached once loaded); the worker gets only the scripts these decks need.
  const [data,all]=await loadDuelResources();if(this.closed)return;
  const needed=new Set([...Object.values(this.deckList).flatMap(d=>[...d.main,...d.extra]),...this.cards.filter(c=>c.token||c.type==='Token'||(Number(c.data?.type)&0x4000)).map(c=>c.id)].map(id=>`c${id}.lua`));
  const scripts={};for(const [name,text] of Object.entries(all))if(!/^c\d+\.lua$/.test(name)||needed.has(name))scripts[name]=text;
  this.allScripts=all;
  this.worker.postMessage({type:'init',cards:this.cards,deckList:this.deckList,data,scripts});
  this.ready=new Promise(r=>this.readyResolve=r);
  this.pump();
 }
 setTarget(n){this.target=Math.max(0,n);this.pump()}
 randomSeat(){let total=0;for(const d of this.pool)total+=this.weight(d.id);let r=Math.random()*total;for(const d of this.pool){r-=this.weight(d.id);if(r<=0)return d}return this.pool[this.pool.length-1]}
 // A stored duel still fits when it was played with the upgrades these two characters have now.
 fits(tl){return (tl.mods||'')===this.modsFor(tl.seats.map(x=>x.id)).sig}
 // Roster duelists (featured) come up in at least 1 of 10 duels each (user, 2026-11-27).
 randomPair(){const f=this.featured()||[];const a=f.length&&Math.random()<Math.min(.8,.1*f.length)?f[Math.floor(Math.random()*f.length)]:this.randomSeat();let b=this.randomSeat(),guard=0;while(b.id===a.id&&guard++<20)b=this.randomSeat();return [a,b]}
 // One duel between these two decks (bracket boards). Resolves with the timeline.
 // alive() false = the board no longer needs it (settled meanwhile), so it is dropped unplayed.
 record(pair,priority=true,alive=()=>true){return new Promise((resolve,reject)=>{const id=this.nextId++;this.jobs.set(id,{resolve,reject,pair,priority,alive});priority?this.queue.unshift(id):this.queue.push(id);this.pump()})}
 // A duel for a free board: a fresh one if ready, else an older one from the library, else wait.
 async take(){
  while(this.fresh.length){const tl=this.fresh.shift();if(this.fits(tl))return this.use(tl)}
  // Wait a little for a new duel; a phone that can't keep up replays an older one instead.
  return new Promise((resolve,reject)=>{const w={resolve,reject};this.waiting.push(w);this.pump();
   w.timer=setTimeout(async()=>{if(!this.waiting.includes(w))return;const old=await this.fromLibrary();if(old&&this.waiting.includes(w)){this.waiting.splice(this.waiting.indexOf(w),1);resolve(this.use(old))}},Math.min(4000,Math.max(800,this.msAvg*2)))})}
 async fromLibrary(){
  if(!this.db||this.index.length<4)return null;
  // Never a duel that is already playing on another board, and not one shown moments ago.
  for(let tries=0;tries<6;tries++){
   const choices=this.index.filter(k=>!this.recent.includes(k));const key=choices[Math.floor(Math.random()*choices.length)];
   if(key==null)return null;this.recent.push(key);if(this.recent.length>Math.min(40,this.index.length>>1))this.recent.shift();
   try{const tl=(await done(this.db.transaction(STORE).objectStore(STORE).get(key)))?.tl;if(tl&&!this.active.has(sig(tl))&&this.fits(tl))return tl}catch{return null}}
  return null}
 use(tl){this.active.add(sig(tl));return tl}
 release(tl){if(tl)this.active.delete(sig(tl))}
 // Duration and result of a random library duel: the stand-in for a bracket duel nobody is watching.
 async sample(){if(!this.db||!this.index.length)return null;const key=this.index[Math.floor(Math.random()*this.index.length)];try{return (await done(this.db.transaction(STORE).objectStore(STORE).get(key)))?.tl||null}catch{return null}}
 pump(){
  if(this.closed||!this.worker||this.busy)return;
  while(this.queue.length){const id=this.queue.shift(),j=this.jobs.get(id);if(!j)continue;if(!j.alive()){this.jobs.delete(id);j.reject(Error('stale'));continue}this.send(id,j.pair);return}
  if(this.fresh.length+0<this.target+this.waiting.length){const id=this.nextId++;this.jobs.set(id,{fresh:true,pair:this.randomPair()});this.send(id,this.jobs.get(id).pair)}
 }
 send(id,pair){this.busy=1;const m=this.modsFor(pair.map(d=>d.id));this.worker.postMessage({type:'sim',id,seats:pair.map(d=>({id:d.id,tier:d.tier,key:d.key})),seed:(Math.random()*2**32)>>>0,lp:m.lp,passives:m.passives,sig:m.sig})}
 message(m){
  if(m.type==='ready'){this.readyResolve?.();return}
  if(m.type==='missing'){this.worker?.postMessage({type:'script',name:m.name,text:this.allScripts?.[m.name]});return}
  const job=this.jobs.get(m.id);this.jobs.delete(m.id);this.busy=0;
  if(m.type==='done'){
   this.msAvg=this.msAvg*.8+m.ms*.2;this.learn(m.tl);this.store(m.tl);
   if(job?.resolve)job.resolve(m.tl);else{const w=this.waiting.shift();if(w){clearTimeout(w.timer);w.resolve(this.use(m.tl))}else this.fresh.push(m.tl)}
  }else{job?.reject?.(Error(m.error||'Duel failed'));this.failures=(this.failures||0)+1}
  // A phone that records slowly rests between spare duels instead of running hot; duels a board is waiting for go straight on.
  const rest=this.closed||this.queue.length?0:Math.min(1500,Math.max(30,this.msAvg*.5));setTimeout(()=>this.pump(),rest);
 }
 flushWaiting(){for(const w of this.waiting.splice(0))w.reject(Error(this.failed||'No duels'));for(const [,j] of this.jobs)j.reject?.(Error(this.failed||'No duels'));this.jobs.clear()}
 learn(tl){for(const p of [0,1]){const k=tl.seats[p].id+':'+tl.seats[p].tier,st=this.stats[k]??={g:0,w:0,ex:0,de:0};st.g++;if(tl.winner===p){st.w++;if([16,20,31,33].includes(tl.reason))st.ex++;if(tl.reason===21)st.de++}}
  clearTimeout(this.statsTimer);this.statsTimer=setTimeout(()=>{try{this.db?.transaction(META,'readwrite').objectStore(META).put(this.stats,'stats')}catch{}},2000)}
 async store(tl){if(!this.db)return;try{const key=await done(this.db.transaction(STORE,'readwrite').objectStore(STORE).add({tl,at:Date.now()}));this.index.push(key);
   while(this.index.length>LIBRARY_CAP){const old=this.index.shift();this.db.transaction(STORE,'readwrite').objectStore(STORE).delete(old)}}catch{}}
 close(){this.closed=true;clearTimeout(this.statsTimer);try{this.db?.transaction(META,'readwrite').objectStore(META).put(this.stats,'stats')}catch{}this.worker?.terminate();this.worker=null;for(const w of this.waiting.splice(0))w.reject(Error('closed'));for(const [,j] of this.jobs)j.reject?.(Error('closed'));this.jobs.clear();this.db?.close()}
}
