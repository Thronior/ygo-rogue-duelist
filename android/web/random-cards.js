// Randomized cards on the client (user, 2026-11-15): the run's cards come from random_cards.py, join the card list
// and the duel engine, and get their picture drawn the first time it is needed (behind the hat animation, hatLoading),
// then kept for the rest of the session so nothing is drawn twice. Until then a card shows its art donor's scan.
import {drawRandomizedCard,donorsFor} from './randomized-card-art.js';
import {keepEnglish} from './i18n.js';

export const RANDOM_PACK={id:'RANDOM-PACK',name:'Random Pack',region:'EN',code:'RANDOM',common:[],rare:[],size:9,rarities:{},rare_display:[],randomized:true};
export const RANDOM_PACK_TEXT='Nine randomized cards: new names, art, stats and effects, made for you when you open it. Randomized cards last for this run only.';
export const isRandomCard=id=>{const n=Number(id);return n>=191000000&&n<201000000};
// Draft Duels' Random Pack cards (199,000,000 and up, collector-rules.js randomBlock) belong to the match, not to a run:
// switching runs never clears them (addDraftRandomCards).
const isDraftCard=id=>Number(id)>=199000000&&isRandomCard(id);
const isRunCard=id=>isRandomCard(id)&&!isDraftCard(id);

const entries=new Map();          // id -> {card, script}
const drawn=new Set();            // ids whose picture is ready in cardImages
const pending=new Map();          // id -> promise of its drawing
let key='',runKey='',generation=0,ctx=null,realCards=null,fontsReady=null;

// content, cardsById and cardImages are mobile.js's shared card tables.
export function setupRandomCards(context){ctx=context}

// Called after every command: when the run's randomized cards changed, fetch them (fetchCards bypasses the command queue).
// Every run numbers its randomized cards from the same first id, so a different run (another save slot, a new run)
// starts from a clean slate: a picture drawn for the old run's card must never show on the new run's card with that id
// (user, 2026-11-15: the art said "Toon World", the card was "Phantom Ghost").
export async function syncRandomCards(wanted,fetchCards){
 wanted=wanted||'';if(wanted===key||!ctx)return false;
 const run=wanted.split(':')[0];
 if(!wanted||run!==runKey)clearRandomCards();
 if(!wanted)return true;
 const result=await fetchCards();
 if((result?.key||wanted).split(':')[0]!==run)return true;
 installRandomCards(result?.cards||[]);key=result?.key||wanted;runKey=run;return true;
}

function clearRandomCards(){
 const {content,cardsById,cardImages}=ctx;
 generation++;backgroundQueue=[];
 content.cards=content.cards.filter(c=>!isRunCard(c.id));
 for(const id of [...entries.keys()]){if(isDraftCard(id))continue;cardsById.delete(id);if(drawn.has(id))URL.revokeObjectURL(cardImages.get(id));cardImages.delete(id);entries.delete(id);drawn.delete(id);pending.delete(id)}
 key='';runKey='';
}

function installRandomCards(list){
 const {content,cardsById,cardImages}=ctx;
 realCards??=content.cards.filter(c=>c.id<100000000);
 const fresh=new Set(list.map(x=>x.card.id));
 // A different run's cards go; cards already drawn for this run keep their picture.
 for(const id of [...entries.keys()])if(isRunCard(id)&&!fresh.has(id)){cardsById.delete(id);if(drawn.has(id))URL.revokeObjectURL(cardImages.get(id));cardImages.delete(id);entries.delete(id);drawn.delete(id);pending.delete(id)}
 content.cards=content.cards.filter(c=>!isRunCard(c.id)||fresh.has(c.id));
 const known=new Set(content.cards.map(c=>c.id));
 for(const x of list){
  const id=x.card.id;entries.set(id,x);cardsById.set(id,x.card);keepEnglish(x.card.desc);   // never partly translated
  if(!known.has(id))content.cards.push(x.card);
  if(!drawn.has(id))cardImages.set(id,`assets/cards/${x.card.randomized.art_from}.jpg`);
 }
}

// Draft Duels and Tag (2026-11-16): Random Pack cards built from shared seeds (random_cards.draft_cards).
// Adds or replaces them; a card drawn before keeps its picture unless its data changed (a new match reuses ids).
export function addDraftRandomCards(list){
 if(!ctx)return;const {content,cardsById,cardImages}=ctx;realCards??=content.cards.filter(c=>c.id<100000000);
 content.cards=[...content.cards];const known=new Map(content.cards.map((c,i)=>[c.id,i]));
 for(const x of list){
  const id=x.card.id,old=entries.get(id);
  if(old&&old.script===x.script&&old.card.name===x.card.name)continue;
  if(drawn.has(id))URL.revokeObjectURL(cardImages.get(id));drawn.delete(id);pending.delete(id);
  entries.set(id,x);cardsById.set(id,x.card);keepEnglish(x.card.desc);
  if(known.has(id))content.cards[known.get(id)]=x.card;else content.cards.push(x.card);
  cardImages.set(id,`assets/cards/${x.card.randomized.art_from}.jpg`);
 }
}

// Before a duel starts: the engine learns the randomized cards' data and scripts (randomizer.lua is in scripts.json).
export function prepareEngine(engine){
 for(const [id,{card,script}] of entries){
  engine.cards.set(id,card);
  engine.data[id]={...card.data,race:BigInt(card.data.race)};
  engine.scripts[`c${id}.lua`]=script;
 }
}

const loadImage=src=>new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=()=>no(Error('Could not load '+src));i.src=src});

async function drawOne(id){
 const x=entries.get(id),started=generation;if(!x)return;
 fontsReady??=Promise.all([document.fonts.load('600 20px "YGO Card Name"'),document.fonts.load('500 20px "YGO Card Text"')]).catch(()=>{});
 await fontsReady;
 const d=donorsFor(x.card,realCards);
 const [frame,art,orb]=await Promise.all([loadImage(`assets/cards/${d.frame}.jpg`),loadImage(`assets/cards/${d.art}.jpg`),d.orb?loadImage(`assets/cards/${d.orb}.jpg`):null]);
 const canvas=drawRandomizedCard(document.createElement('canvas'),x.card,{frame,art,orb,keepStars:d.keepStars},{name:'YGO Card Name',text:'YGO Card Text'});
 const blob=await new Promise(ok=>canvas.toBlob(ok,'image/jpeg',.9));
 // The run changed while this was drawing: the picture belongs to a card that is gone.
 if(started!==generation||entries.get(id)!==x)return;
 ctx.cardImages.set(id,URL.createObjectURL(blob));drawn.add(id);
}

// Draw these cards' pictures (each once per session). Resolves when all are ready; failures keep the donor scan.
export function drawRandomCards(ids){
 const jobs=[];
 for(const raw of new Set(ids)){
  const id=Number(raw);if(!isRandomCard(id)||drawn.has(id)||!entries.has(id))continue;
  if(!pending.has(id))pending.set(id,drawOne(id).catch(()=>{}).finally(()=>pending.delete(id)));
  jobs.push(pending.get(id));
 }
 return Promise.all(jobs);
}

export const needsDrawing=ids=>ids.some(id=>isRandomCard(id)&&entries.has(Number(id))&&!drawn.has(Number(id)));

// The run's own cards, a few at a time while the player is busy elsewhere, so the deck editor shows real pictures.
let backgroundQueue=[],backgroundTimer=0;
export function drawInBackground(ids){
 backgroundQueue=[...new Set([...backgroundQueue,...ids.map(Number).filter(id=>isRandomCard(id)&&!drawn.has(id))])];
 if(!backgroundTimer&&backgroundQueue.length)backgroundTimer=setTimeout(step,400);
 async function step(){
  backgroundTimer=0;const batch=backgroundQueue.splice(0,3);
  await drawRandomCards(batch);
  if(backgroundQueue.length)backgroundTimer=setTimeout(step,120);
 }
}

// The hat (user, 2026-11-15): shown while randomized cards are made or drawn. It shakes in a beam of light for at least
// minimum ms and stops as soon as the work is done after that.
let hatStyle=false;
export async function hatLoading(work,{minimum=1000,title=''}={}){
 if(!hatStyle){hatStyle=true;const s=document.createElement('style');s.textContent=HAT_CSS;document.head.append(s)}
 // A modal <dialog> sits in the top layer, above any window already open (a purchases list, a reward screen).
 const el=document.createElement('dialog');el.className='random-hat-loader';el.setAttribute('role','status');
 el.innerHTML=`<div class="rh-rays"></div><div class="rh-glow"></div><img class="rh-hat" src="assets/random-hat.png" alt="">${title?`<p class="rh-title">${title}</p>`:''}`;
 el.addEventListener('cancel',event=>event.preventDefault());
 document.body.append(el);el.showModal();
 try{const [result]=await Promise.all([typeof work==='function'?work():work,new Promise(r=>setTimeout(r,minimum))]);return result}
 finally{el.classList.add('rh-done');setTimeout(()=>{el.close();el.remove()},220)}
}
const HAT_CSS=`.random-hat-loader{position:fixed;inset:0;width:100%;height:100%;max-width:none;max-height:none;margin:0;padding:0;border:0;overflow:hidden;color:inherit;background:radial-gradient(circle at 50% 46%,#2a1a6ef2,#07051afa 70%);animation:rh-in .18s ease-out}
.random-hat-loader[open]{display:grid;place-items:center}
.random-hat-loader::backdrop{background:transparent}
.random-hat-loader.rh-done{opacity:0;transition:opacity .2s}
.rh-rays{position:absolute;left:50%;top:46%;width:150vmax;height:150vmax;transform:translate(-50%,-50%);background:repeating-conic-gradient(from 0deg,#ffe9a826 0deg 6deg,transparent 6deg 18deg,#c9a6ff26 18deg 24deg,transparent 24deg 36deg);animation:rh-spin 6s linear infinite;-webkit-mask:radial-gradient(circle,#000 0,#0000 60%);mask:radial-gradient(circle,#000 0,#0000 60%)}
.rh-glow{position:absolute;left:50%;top:46%;width:min(70vmin,420px);height:min(70vmin,420px);transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle,#fff9 0,#ffe9a855 30%,#0000 70%);animation:rh-pulse .9s ease-in-out infinite alternate}
.rh-hat{position:absolute;left:50%;top:46%;width:min(46vmin,280px);transform:translate(-50%,-50%);filter:drop-shadow(0 0 16px #fffb) drop-shadow(0 10px 14px #0009);animation:rh-shake .5s ease-in-out infinite}
.rh-title{position:absolute;left:0;right:0;top:calc(46% + min(30vmin,190px));margin:0;text-align:center;font:clamp(22px,5vmin,34px)/1 "YGO Display",sans-serif;letter-spacing:.12em;color:#fff;text-shadow:0 0 10px #c9a6ff,0 2px 6px #000}
@keyframes rh-in{from{opacity:0}}
@keyframes rh-spin{to{transform:translate(-50%,-50%) rotate(360deg)}}
@keyframes rh-pulse{from{opacity:.65;transform:translate(-50%,-50%) scale(.92)}to{opacity:1;transform:translate(-50%,-50%) scale(1.06)}}
@keyframes rh-shake{0%,100%{transform:translate(-50%,-50%) rotate(-5deg)}20%{transform:translate(-52%,-51%) rotate(4deg)}40%{transform:translate(-48%,-50%) rotate(-4deg)}60%{transform:translate(-51%,-52%) rotate(5deg)}80%{transform:translate(-49%,-50%) rotate(-3deg)}}
@media (prefers-reduced-motion:reduce){.rh-rays,.rh-hat,.rh-glow{animation:none}}`;
