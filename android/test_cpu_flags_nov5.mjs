// CPU misplays from the Nov 5 behaviour flags (after v0.2.21).
// Skull Red Bird revived in Defense when it dies either way (555fae5d24), Viser Des Tributed one Standby Phase before
// its target is destroyed (873e35d930), a face-up Cyber Jar switched to Attack as if it were a flip (b3861339e8),
// and Magical Dimension summoning the weaker Spellcaster, then destroying its own monster (e7c616dcbf).
import fs from 'node:fs';import assert from 'node:assert/strict';import {gunzipSync} from 'node:zlib';import {MobileDuel,M,I,L} from './web/duel.js';
import {smartContext} from './web/smart_policy.js';
const meta=JSON.parse(fs.readFileSync(new URL('./web/content.json',import.meta.url))),data=JSON.parse(fs.readFileSync(new URL('./web/engine-data.json',import.meta.url))),scripts=JSON.parse(fs.readFileSync(new URL('./web/scripts.json',import.meta.url))),id=n=>{const c=meta.cards.find(c=>c.name===n);assert(c,n);return c.id};
let checks=0;const same=(a,b,m)=>{assert.deepEqual(a,b,m);checks++};const ok=(v,m)=>{assert(v,m);checks++};
const card=(name,location,controller,sequence,position=1,extra={})=>({code:id(name),attack:data[id(name)]?.attack??0,defense:data[id(name)]?.defense??0,position,controller,location,sequence,type:data[id(name)]?.type||0,...extra});
const mon=(name,controller,sequence,position=1,extra)=>card(name,L.MZONE,controller,sequence,position,extra);
const inHand=(name,controller,sequence)=>card(name,L.HAND,controller,sequence,10);
const filler=(controller,n=20)=>Array.from({length:n},(_,i)=>card('Battle Ox',L.DECK,controller,i,10));
// A stubbed duel; zones are {[player]:{[location]:cards}}. The CPU is seat 1.
function duel(zones,state={}){
 const e=new MobileDuel(meta.cards);
 Object.assign(e,{data,lp:[8000,8000],turn:6,player:1,phase:4,events:[],visuals:[],peak:{},pendingSummons:[],activeChain:[],battleProtected:[false,false],aiModifiers:{}},state);
 const slots=list=>{const out=Array(5).fill(null);for(const c of list)out[c.sequence]=c;return out};
 for(const p of [0,1]){zones[p]={[L.DECK]:filler(p),...zones[p]};for(const loc of [L.MZONE,L.SZONE])zones[p][loc]=slots(zones[p][loc]||[]);}
 e.query=(side,loc)=>zones[side]?.[loc]||[];
 e.core={duelQueryCount:(_,side,loc)=>(zones[side]?.[loc]||[]).length};
 return e;
}
const at=c=>({controller:c.controller,location:c.location,sequence:c.sequence});
const idlePrompt=(extra={})=>({type:M.SELECT_IDLECMD,player:1,summons:[],special_summons:[],pos_changes:[],monster_sets:[],spell_sets:[],activates:[],to_bp:true,to_ep:true,...extra});
// The players' replays live outside the repository; their checks run when the review folder is present.
const replayDir='D:/Codex Exports/Replay exports/2026-11-05-review/replays/';
const replays=[];
async function replayAt(prefix,step){
 const file=fs.existsSync(replayDir)&&fs.readdirSync(replayDir).find(x=>x.startsWith(prefix));if(!file)return null;
 const rec=JSON.parse(gunzipSync(fs.readFileSync(replayDir+file)));
 const e=await new MobileDuel([...meta.cards,...(meta.tokenCards||[])]).init([data,scripts]);
 e.start(...rec.start);for(let i=0;i<step;i++)e.respond(rec.responses[i]);replays.push(prefix);return e;
}

// 1. A monster that dies in either position goes to Attack in Main Phase 1 when it can destroy something first.
{
 const BIRD=id('Skull Red Bird');
 const place=(theirs,state={})=>duel({0:{[L.MZONE]:theirs}},state).auto({type:M.SELECT_POSITION,player:1,code:BIRD,positions:5}).position;
 const board=()=>[mon('Possessed Dark Soul',0,1,1,{attack:1600}),mon('Roulette Barrel',0,2,4),mon('Pale Beast',0,3)];
 same(place(board()),1,'555fae5d24: 1550 ATK beats Pale Beast now; 1200 DEF would lose to it anyway');
 same(place(board(),{phase:256}),4,'Main Phase 2: no attack left, Defense loses no LP');
 same(place([mon('Possessed Dark Soul',0,1,1,{attack:1600}),mon('Roulette Barrel',0,2,4)]),4,'nothing it can destroy: Defense');
 same(place(board(),{player:0}),4,"on the opponent's turn it cannot attack");
 same(place([mon('Pale Beast',0,3)]),1,'it survives in Attack and dies in Defense: Attack, as before');
 const r=await replayAt('555fae5d24',130);
 if(r){try{same(r.auto(r.pending).position,1,'555fae5d24 step 130: Monster Reborn brings the bird back in Attack Position')}finally{r.destroy()}}
}

// 2. Viser Des with a live target is kept until its third Standby Phase destroys that monster.
{
 const HELPOEMER=inHand('Helpoemer',1,1),viser=mon('Viser Des',1,2,4),gator=mon('Cyber-Tech Alligator',0,2);
 const choose=targets=>{const e=duel({1:{[L.MZONE]:[viser],[L.HAND]:[HELPOEMER]},0:{[L.MZONE]:[gator,mon('Ms. Judge',0,3)]}});if(targets)e.cardTargets=new Map([['1:2',at(gator)]]);
  const s=smartContext(e,1,L,idlePrompt({summons:[HELPOEMER]}));return {worth:s.tributeWorth(HELPOEMER),cost:s.expendable(viser)}};
 same(choose(true).worth,false,'873e35d930: Viser Des is not Tributed while Cyber-Tech Alligator waits to be destroyed');
 ok(choose(true).cost>choose(false).cost,'a pending Viser Des is worth more than its 500 ATK');
 // The core's CARD_TARGET message starts the link; leaving the field ends it.
 const e=await new MobileDuel(meta.cards).init([data,scripts]);
 try{
  const deck=Array(40).fill(id('Blue-Eyes White Dragon'));e.start(deck,deck,8000,8000,5,1,[],[],'');
  e.onMessage({type:M.CARD_TARGET,card:{controller:1,location:L.MZONE,sequence:2},target:{controller:0,location:L.MZONE,sequence:2}});
  ok(e.cardTargets.has('1:2'),'CARD_TARGET is tracked');
  e.onMessage({type:M.MOVE,code:id('Cyber-Tech Alligator'),from:{controller:0,location:L.MZONE,sequence:2,position:1},to:{controller:0,location:L.GRAVE,sequence:0,position:1}});
  ok(!e.cardTargets.has('1:2'),'the target leaving the field ends the link');
  e.onMessage({type:M.CARD_TARGET,card:{controller:1,location:L.MZONE,sequence:2},target:{controller:0,location:L.MZONE,sequence:3}});
  e.onMessage({type:M.MOVE,code:id('Viser Des'),from:{controller:1,location:L.MZONE,sequence:2,position:1},to:{controller:1,location:L.GRAVE,sequence:0,position:1}});
  ok(!e.cardTargets.has('1:2'),'Viser Des leaving the field ends the link');
 }finally{e.destroy()}
 const r=await replayAt('873e35d930',106);
 if(r){try{const m=r.pending,a=r.auto(m),summoned=a.action===I.SELECT_SUMMON?r.name(m.summons[a.index].code):null;ok(summoned!=='Helpoemer','873e35d930 step 106: Helpoemer is not summoned over Viser Des');ok(r.cardTargets?.has('1:2'),'873e35d930: the replay tracks Viser Des\'s target')}finally{r.destroy()}}
}

// 3. A face-up Flip monster gains nothing from a switch to Attack Position.
{
 const switchJar=position=>{const jar=mon('Cyber Jar',1,4,position);const e=duel({1:{[L.MZONE]:[jar]},0:{[L.MZONE]:[mon('La Jinn the Mystical Genie of the Lamp',0,3)]}});
  const a=e.auto(idlePrompt({pos_changes:[at(jar)]}));return a.action===I.SELECT_POS_CHANGE};
 same(switchJar(4),false,'b3861339e8: a face-up Defense Cyber Jar stays in Defense against 3300 ATK');
 const r=await replayAt('b3861339e8',143);
 if(r){try{const m=r.pending,a=r.auto(m);ok(!(a.action===I.SELECT_POS_CHANGE&&r.name(m.pos_changes[a.index].code)==='Cyber Jar'),'b3861339e8 step 143: Cyber Jar is not switched to Attack')}finally{r.destroy()}}
}

// 4. Magical Dimension: summon the strongest Spellcaster; the optional destroy only when the opponent has a monster.
{
 const r=await replayAt('e7c616dcbf',5);
 if(r){try{const m=r.pending,a=r.auto(m);same(r.name(m.selects[a.indicies[0]].code),'Skilled Dark Magician','e7c616dcbf step 5: Skilled Dark Magician (1900) over Blast Magician (1400)')}finally{r.destroy()}}
 const r2=await replayAt('e7c616dcbf',8);
 if(r2){try{same(r2.auto(r2.pending).yes,false,'e7c616dcbf step 8: no opposing monster, so our own is not destroyed')}finally{r2.destroy()}}
 const ask=theirs=>duel({1:{[L.MZONE]:[mon('Dark Magician',1,2)]},0:{[L.MZONE]:theirs}},{effect:{code:id('Magical Dimension'),player:1}}).auto({type:M.SELECT_YESNO,player:1,description:String((BigInt(id('Magical Dimension'))<<20n)+1n)}).yes;
 same(ask([]),false,'only our monsters on the field: decline');
 same(ask([mon('Vorse Raider',0,1)]),true,'an opposing monster: destroy it');
}

console.log(`PASS ${checks} checks${replays.length?` (replays: ${replays.join(', ')})`:' (replay folder not found)'}`);
