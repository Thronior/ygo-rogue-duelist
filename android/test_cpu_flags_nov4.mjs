// CPU misplays from the Nov 4 behaviour flags and Discord reports.
// Half or Nothing on a losing attack (385163982e), a Spirit summoned for Creature Swap that was then held (3b6f27ce28),
// Mask of Weakness that saves nothing (6a462f281a), Last Will after a negated Summon (c2a2c4a926),
// LP costs that kill the CPU (Discord), and Formation Union chained onto a Union's own equip (Discord).
import fs from 'node:fs';import assert from 'node:assert/strict';import {gunzipSync} from 'node:zlib';import {MobileDuel,M,I,L} from './web/duel.js';
import {smartContext} from './web/smart_policy.js';
const meta=JSON.parse(fs.readFileSync(new URL('./web/content.json',import.meta.url))),data=JSON.parse(fs.readFileSync(new URL('./web/engine-data.json',import.meta.url))),scripts=JSON.parse(fs.readFileSync(new URL('./web/scripts.json',import.meta.url))),id=n=>{const c=meta.cards.find(c=>c.name===n);assert(c,n);return c.id};
let checks=0;const same=(a,b,m)=>{assert.deepEqual(a,b,m);checks++};const ok=(v,m)=>{assert(v,m);checks++};
const card=(name,location,controller,sequence,position=1,extra={})=>({code:id(name),attack:data[id(name)]?.attack??0,defense:data[id(name)]?.defense??0,position,controller,location,sequence,type:data[id(name)]?.type||0,...extra});
const mon=(name,controller,sequence,position=1,extra)=>card(name,L.MZONE,controller,sequence,position,extra);
const back=(name,controller,sequence,position=10,extra)=>card(name,L.SZONE,controller,sequence,position,{description:'0',...extra});
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
// The players' replays live outside the repository; their checks run when the review folder is present.
const replayDir='D:/Codex Exports/Replay exports/2026-11-04-review/replays/';
const replays=[];
async function replayAt(prefix,step){
 const file=fs.existsSync(replayDir)&&fs.readdirSync(replayDir).find(x=>x.startsWith(prefix));if(!file)return null;
 const rec=JSON.parse(gunzipSync(fs.readFileSync(replayDir+file)));
 const e=await new MobileDuel([...meta.cards,...(meta.tokenCards||[])]).init([data,scripts]);
 e.start(...rec.start);for(let i=0;i<step;i++)e.respond(rec.responses[i]);replays.push(prefix);return e;
}

// 1. Half or Nothing: the CPU picks between halving its monsters' ATK and ending its Battle Phase.
{
 const HALF=BigInt(id('Half or Nothing')),options=[String(HALF<<20n),String((HALF<<20n)+1n)];
 const choose=(target,extra=[])=>{const skull=mon('Summoned Skull',1,3),theirs=[...(target?[target]:[]),...extra];
  const e=duel({1:{[L.MZONE]:[skull]},0:{[L.MZONE]:theirs}},{phase:8,effect:{code:Number(HALF),player:0},attackCard:at(skull),attackTarget:target?at(target):null});
  return e.auto({type:M.SELECT_OPTION,player:1,options}).index};
 same(choose(mon('Wolf Axwielder',0,2,1,{attack:1950})),1,'385163982e: a 1250 ATK Summoned Skull loses to Wolf Axwielder, so the Battle Phase ends');
 same(choose(mon('Battle Ox',0,2,1,{attack:1000})),0,'half ATK still beats a 1000 ATK monster');
 same(choose(null),0,'a direct attack still deals damage at half ATK');
 same(choose(mon('Wolf Axwielder',0,2,4,{defense:1200})),0,'1250 still destroys a 1200 DEF monster');
 // At the start of the Battle Phase, with no attack declared.
 const e=duel({1:{[L.MZONE]:[mon('Summoned Skull',1,3)]},0:{[L.MZONE]:[mon('Blue-Eyes White Dragon',0,1)]}},{phase:8,effect:{code:Number(HALF),player:0}});
 same(e.auto({type:M.SELECT_OPTION,player:1,options}).index,1,'nothing wins at half ATK: end the Battle Phase');
 const r=await replayAt('385163982e',68);
 if(r){try{same(r.auto(r.pending).index,1,'385163982e step 68: end the Battle Phase')}finally{r.destroy()}}
}

// 2. Creature Swap with a Spirit: it returns to our hand at the End Phase, so handing it over is free.
{
 const swap=back('Creature Swap',1,0),use=(mine,theirs)=>smartContext(duel({1:{[L.MZONE]:[mine],[L.SZONE]:[swap]},0:{[L.MZONE]:[theirs]}}),1,L,{type:M.SELECT_IDLECMD,to_bp:true}).activation(swap,false);
 same(use(mon('Fushi No Tori',1,2),mon('Y-Dragon Head',0,2,1,{attack:1500}))>=80,true,'3b6f27ce28: the summoned Fushi No Tori buys Y-Dragon Head');
 same(use(mon('Gemini Elf',1,2),mon('Y-Dragon Head',0,2,1,{attack:1500})),-1,'a 1900 ATK non-Spirit is not traded for 1500');
 same(use(mon('Fushi No Tori',1,2,8),mon('Y-Dragon Head',0,2,1,{attack:1500})),-1,'a face-down Spirit stays and costs what it is worth');
 const r=await replayAt('3b6f27ce28',63);
 if(r){try{const m=r.pending,a=r.auto(m);same(a.action===I.SELECT_ACTIVATE&&r.name(m.activates[a.index].code),'Creature Swap','3b6f27ce28 step 63: the planned swap goes through')}finally{r.destroy()}}
}

// 3. Mask of Weakness only when 700 less ATK changes the battle or stops lethal.
{
 const MASK=id('Mask of Weakness');
 const use=(defender,attacker=mon('Wolf Axwielder',0,3,1,{attack:2150}),state={})=>{const mask=back('Mask of Weakness',1,1);
  const e=duel({1:{[L.MZONE]:defender?[defender]:[],[L.SZONE]:[mask]},0:{[L.MZONE]:[attacker,mon('Sasuke Samurai #4',0,2)]}},{player:0,phase:8,inDamageStep:true,attackCard:at(attacker),attackTarget:defender?at(defender):null,...state});
  return smartContext(e,1,L,{}).activation(mask,true)};
 same(use(mon('Mask of Darkness',1,2,8)),-1,'6a462f281a: 1450 ATK still destroys a 400 DEF Mask of Darkness');
 same(use(mon('Battle Ox',1,2)),90,'1450 ATK loses to Battle Ox: the defender survives and the attacker dies');
 same(use(null),90,'a direct attack is cut by 700');
 same(use(mon('Gemini Elf',1,2),undefined,{activeChain:[{code:MASK,player:1,link:1}]}),-1,'a copy already on the chain saves Gemini Elf; the second stays');
 same(use(mon('Gemini Elf',1,2)),90,'the first copy saves Gemini Elf');
 for(const step of [55,57]){const r=await replayAt('6a462f281a',step);if(r){try{same(r.auto(r.pending).index,null,`6a462f281a step ${step}: Mask of Weakness is held`)}finally{r.destroy()}}}
}

// 4. Last Will: a monster whose Summon was negated never was on the field.
{
 // The message order the core sends (c2a2c4a926): SUMMONING, Horn of Heaven resolves, MOVE to the GY with no SUMMONED.
 const engine=await new MobileDuel(meta.cards).init([data,scripts]);
 try{
  const deck=Array(40).fill(id('Blue-Eyes White Dragon'));engine.start(deck,deck,8000,8000,5,1,[],[],'');
  const tracked=summoned=>{engine.fieldToGraveTurn=[0,0];const zone={controller:1,location:L.MZONE,sequence:2,position:1},code=id('Great Angus');
   engine.onMessage({type:M.SUMMONING,code,...zone});if(summoned)engine.onMessage({type:M.SUMMONED});engine.onMessage({type:M.CHAIN_SOLVING,chain_size:1});
   engine.onMessage({type:M.MOVE,card:code,from:zone,to:{controller:1,location:L.GRAVE,sequence:0,position:5}});return engine.fieldToGraveTurn[1]};
  same(tracked(false),0,'c2a2c4a926: Horn of Heaven destroys the summoning Great Angus; Last Will does not count it');
  same(tracked(true),engine.turn,'a monster that landed and was destroyed counts');
 }finally{engine.destroy()}
 const r=await replayAt('c2a2c4a926',39);
 if(r){try{const m=r.pending,a=r.auto(m);ok(!(a.action===I.SELECT_ACTIVATE&&r.name(m.activates[a.index].code)==='Last Will'),'c2a2c4a926 step 39: no Last Will without a monster to replace')}finally{r.destroy()}}
}

// 5. LP costs (Discord): never pay the last of our LP. The core allows paying exactly what is left.
{
 const policy=(lp,cards)=>smartContext(duel({1:{[L.MZONE]:[mon('Summoned Skull',1,1)],[L.HAND]:cards},0:{[L.MZONE]:[mon('Dark Magician',0,0)]}},{lp:[8000,lp]}),1,L,{type:M.SELECT_IDLECMD,to_bp:true});
 const burial=card('Premature Burial',L.HAND,1,0,10),sphinx=card('Andro Sphinx',L.HAND,1,1,10);
 same(policy(800,[burial]).lpCost(burial),800,'"by paying 800 Life Points" is read as a cost');
 same(policy(500,[sphinx]).activation(sphinx,true),-1,'no 500 LP effect at 500 LP');
 ok(policy(501,[sphinx]).activation(sphinx,true)>=0,'with 1 LP to spare the effect is still used');
 // Real core: Messenger of Peace's Standby Phase upkeep.
 const engine=await new MobileDuel(meta.cards).init([data,scripts]);
 const upkeep=lp=>{const lua=`local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START|PHASE_DRAW) e:SetOperation(function(e) e:Reset()
  Duel.MoveToField(Duel.CreateToken(1,${id('Messenger of Peace')}),1,1,LOCATION_SZONE,POS_FACEUP,true) end) Duel.RegisterEffect(e,0)`;
  const deck=Array(40).fill(id('Blue-Eyes White Dragon'));engine.start(deck,deck,8000,lp,5,123,[],[],lua);
  for(let n=0;n<400&&!engine.finished&&engine.pending&&engine.turn<=2;n++)engine.respond(engine.auto());
  assert.deepEqual(engine.errors,[]);return {lp:engine.lp[1],finished:!!engine.finished,kept:engine.query(1,L.SZONE).some(c=>c&&engine.name(c.code)==='Messenger of Peace')}};
 try{
  same(upkeep(100),{lp:100,finished:false,kept:false},'Discord: at 100 LP the CPU lets Messenger of Peace go instead of paying its last 100');
  engine.destroy();
  same(upkeep(8000),{lp:7900,finished:false,kept:true},'with LP to spare the upkeep is paid');
 }finally{engine.destroy()}
}

// 6. Formation Union (Discord): never chained onto a Union's own equip, only when it adds an equip.
{
 const engine=await new MobileDuel(meta.cards).init([data,scripts]);
 const lua=`local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START|PHASE_DRAW) e:SetOperation(function(e) e:Reset()
  Duel.MoveToField(Duel.CreateToken(1,${id('X-Head Cannon')}),1,1,LOCATION_MZONE,POS_FACEUP_ATTACK,true) Duel.SSet(1,Duel.CreateToken(1,${id('Formation Union')})) Duel.SendtoHand(Duel.CreateToken(1,${id('Y-Dragon Head')}),1,REASON_RULE) end) Duel.RegisterEffect(e,0)`;
 try{
  const deck=Array(40).fill(id('Blue-Eyes White Dragon'));engine.start(deck,deck,8000,8000,5,123,[],[],lua);
  const used=[];
  for(let n=0;n<400&&!engine.finished&&engine.pending&&engine.turn<=2;n++){const m=engine.pending,r=engine.auto();const list=m.type===M.SELECT_CHAIN?m.selects:m.type===M.SELECT_IDLECMD&&r.action===I.SELECT_ACTIVATE?m.activates:null;if(m.player===1&&list?.[r.index])used.push(engine.name(list[r.index].code));engine.respond(r);}
  assert.deepEqual(engine.errors,[]);
  same(used,['Y-Dragon Head'],'Discord: Y-Dragon Head equips itself; Formation Union is not chained on top');
  ok(engine.query(1,L.SZONE).some(c=>c&&engine.name(c.code)==='Formation Union'),'Formation Union stays set');
  ok(engine.query(1,L.MZONE).some(c=>c&&engine.name(c.code)==='X-Head Cannon'&&c.attack===2200),'X-Head Cannon has Y-Dragon Head equipped');
 }finally{engine.destroy()}
 const fu=back('Formation Union',1,0),board=()=>({1:{[L.MZONE]:[mon('X-Head Cannon',1,1),mon('Y-Dragon Head',1,2)],[L.SZONE]:[fu]}});
 same(smartContext(duel(board()),1,L,{type:M.SELECT_IDLECMD,activates:[fu]}).activation(fu,false),78,'the Union cannot equip itself this turn: Formation Union does it');
 const offered={...mon('Y-Dragon Head',1,2),description:'0'};
 same(smartContext(duel(board()),1,L,{type:M.SELECT_IDLECMD,activates:[fu,offered]}).activation(fu,false),-1,'its own equip is free');
 same(smartContext(duel(board()),1,L,{type:M.SELECT_CHAIN,selects:[fu]}).activation(fu,true),-1,'never as a chain response');
 const full={1:{[L.MZONE]:[mon('X-Head Cannon',1,1),mon('Y-Dragon Head',1,2)],[L.SZONE]:[fu,...[1,2,3,4].map(i=>back('Mirror Force',1,i))]}};
 same(smartContext(duel(full),1,L,{type:M.SELECT_IDLECMD,activates:[fu]}).activation(fu,false),-1,'no free zone to equip into');
}
console.log(`CPU flags Nov 4: ${checks} checks passed${replays.length?` (replays: ${replays.join(', ')})`:' (replay folder not found: stub and real-core checks only)'}`);
