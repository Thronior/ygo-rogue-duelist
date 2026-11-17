// The relics added on 2026-11-14 from the Discord review, in real-core duels: Guardian's Call, Soul Fusion, Gate Calling,
// Dark Lotus and Ring of Defense (the LP losses it reports). Prices, shop rules and the healing after the Duel are in
// tools/test_relics_nov14.py.
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const {MobileDuel,M,R,I,B,L}=await import('./web/duel.js');
const {smartContext}=await import('./web/smart_policy.js');
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json'),scripts=json('android/web/scripts.json'),id=n=>{const c=meta.cards.find(c=>c.name===n);assert(c,n);return c.id};
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const py=(code,...args)=>execFileSync(python,['-B','-c',"import sys,json;sys.path.insert(0,'.');"+code,...args],{cwd:root,encoding:'utf8',env:{...process.env,PYTHONUTF8:'1'}}).trim();
const runScript=(artifacts,side=0)=>py('import passives;print(passives.multiplayer_script(json.loads(sys.argv[1]),int(sys.argv[2])))',JSON.stringify({curses:[],artifacts,cursed_artifacts:[],challenge_level:0}),String(side));
let checks=0;const ok=(value,why)=>{assert(value,why);checks++},same=(a,b,why)=>{assert.deepEqual(a,b,why);checks++};
for(const name of ["Guardian's Call",'Soul Fusion','Gate Calling','Dark Lotus','Ring of Defense','Ultimate Armory'])ok(Object.values(meta.artifacts).some(a=>a[0]===name),name+' is in content.json');

const WABOKU=id('Waboku'),CELTIC=id('Celtic Guardian'),GRARL=id('Guardian Grarl'),AXE=id('Gravity Axe - Grarl');
const SANGA=id('Sanga of the Thunder'),KAZEJIN=id('Kazejin'),SUIJIN=id('Suijin'),OX=id('Battle Ox');
const GAIA=id('Gaia the Dragon Champion'),FIERCE=id('Gaia The Fierce Knight'),CURSE=id('Curse of Dragon'),GATE=id('Gate Guardian');
// Cards put in place before the first turn: [code, location] for player 0, taken from the Deck.
const setup=moves=>moves.length?`do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_STARTUP)
e:SetOperation(function(e) e:Reset() ${moves.map(([code,where])=>`do local c=Duel.GetFirstMatchingCard(Card.IsCode,0,LOCATION_DECK,0,nil,${code}) if c then ${where==='grave'?'Duel.SendtoGrave(c,REASON_RULE)':'Duel.SendtoHand(c,0,REASON_RULE)'} end end`).join(' ')} end) Duel.RegisterEffect(e,0) end`:'';

async function duel({script='',deck,enemy,turns=1,drive,lp=8000}){
 const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,scripts]);
 let s=e.start(deck,enemy,lp,8000,5,7,[],[],script);
 for(let i=0;i<6000&&!s.finished&&e.turn<=turns;i++){const m=e.pending;if(!m)break;const answer=drive(e,m);s=e.respond(answer||e.auto())}
 assert.deepEqual(e.errors||[],[],'no script errors');
 return e;
}
const idle=(m,action,codes,list)=>{const at=(m[list]||[]).findIndex(c=>[].concat(codes).includes(c.code));return at<0?null:{type:R.SELECT_IDLECMD,action,index:at}};
const toEnd={type:R.SELECT_IDLECMD,action:I.TO_EP,index:null},noBattle={type:R.SELECT_BATTLECMD,action:B.TO_EP,index:null};
const fill=(...codes)=>Array.from({length:40},(_,n)=>codes[n%codes.length]);
const cards=(e,p,loc,code)=>e.query(p,loc).filter(c=>c&&(!code||c.code===code));
const count=(e,p,loc,code)=>cards(e,p,loc,code).length;
// Plays each step once, in order, whenever the idle menu offers it.
const steps=list=>{const done=new Set();return (e,m)=>{
 if(m.player!==0)return null;
 if(m.type===M.SELECT_IDLECMD){for(const [n,[action,codes,field]] of list.entries()){if(done.has(n))continue;const s=idle(m,action,codes,field);if(s){done.add(n);return s}}return toEnd}
 if(m.type===M.SELECT_BATTLECMD)return noBattle;
 if([M.SELECT_YESNO,M.SELECT_EFFECTYN].includes(m.type))return {type:m.type===M.SELECT_YESNO?R.SELECT_YESNO:R.SELECT_EFFECTYN,yes:true};
 if(m.type===M.SELECT_POSITION)return {type:R.SELECT_POSITION,position:1};
 return null}};

// Guardian's Call: Celtic Guardian takes Gravity Axe - Grarl, then a Guardian Grarl comes from the hand; only one per turn.
async function guardian(artifacts){
 let offered=0;const deck=fill(WABOKU);
 const drive=steps([[I.SELECT_SUMMON,CELTIC,'summons'],[I.SELECT_ACTIVATE,AXE,'activates'],[I.SELECT_SPECIAL_SUMMON,GRARL,'special_summons'],[I.SELECT_SPECIAL_SUMMON,GRARL,'special_summons']]);
 const e=await duel({script:runScript(artifacts)+'\n'+setup([[CELTIC,'hand'],[AXE,'hand'],[GRARL,'hand'],[GRARL,'hand']]),deck:[CELTIC,AXE,GRARL,GRARL,...deck.slice(4)],enemy:fill(WABOKU),drive(e,m){
  if(m.player===0&&m.type===M.SELECT_IDLECMD&&(m.special_summons||[]).some(c=>c.code===GRARL))offered++;return drive(e,m)}});
 const out={grarls:count(e,0,L.MZONE,GRARL),axe:count(e,0,L.SZONE,AXE),offered:offered>0};e.destroy();return out;
}
const called=await guardian(['guardians_call']);console.log("Guardian's Call",called);
same(called.axe,1,'Gravity Axe - Grarl is equipped');
same(called.grarls,1,'one Guardian Grarl is Special Summoned from the hand, and only one per turn');
const plainGuardian=await guardian([]);console.log('no relic',plainGuardian);
same(plainGuardian.grarls,0,'without the relic Guardian Grarl cannot be Special Summoned from a hand of 2+ cards');

// Soul Fusion: Gaia the Fierce Knight and Curse of Dragon in the GY become Gaia the Dragon Champion, which cannot attack.
async function soul(artifacts){
 let attacked=false;
 const drive=steps([[I.SELECT_SPECIAL_SUMMON,GAIA,'special_summons']]);
 const e=await duel({script:runScript(artifacts)+'\n'+setup([[FIERCE,'grave'],[CURSE,'grave']]),deck:[...fill(WABOKU).slice(0,38),FIERCE,CURSE,GAIA],enemy:fill(WABOKU),turns:1,drive(e,m){
  if(m.player===0&&m.type===M.SELECT_BATTLECMD&&(m.attacks||[]).some(c=>c.code===GAIA))attacked=true;return drive(e,m)}});
 const out={gaia:count(e,0,L.MZONE,GAIA),banished:count(e,0,L.REMOVED),grave:count(e,0,L.GRAVE,FIERCE)+count(e,0,L.GRAVE,CURSE),canAttack:attacked};e.destroy();return out;
}
const fused=await soul(['soul_fusion']);console.log('Soul Fusion',fused);
same(fused.gaia,1,'Gaia the Dragon Champion is Fusion Summoned');
ok(fused.banished===2&&fused.grave===0,'its materials are banished from the GY');
same(fused.canAttack,false,'it cannot attack the turn it is Summoned');
same((await soul([])).gaia,0,'without the relic there is no summon from the GY');

// Gate Calling: Tribute Summon Sanga of the Thunder, then Kazejin comes from the hand (Suijin stays: once per turn).
async function gate(artifacts){
 let out=null;const play=steps([[I.SELECT_SUMMON,SANGA,'summons']]);
 // Two Battle Ox start on the field so Sanga has its Tributes.
 const field=`do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_STARTUP)
e:SetOperation(function(e) e:Reset() local g=Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_DECK,0,nil,${OX}) local n=0 for c in g:Iter() do if n<2 then Duel.MoveToField(c,0,0,LOCATION_MZONE,POS_FACEUP_ATTACK,true) n=n+1 end end end) Duel.RegisterEffect(e,0) end`;
 const e=await duel({script:runScript(artifacts)+'\n'+setup([[SANGA,'hand'],[KAZEJIN,'hand'],[SUIJIN,'hand']])+'\n'+field,deck:[SANGA,KAZEJIN,SUIJIN,OX,OX,...fill(WABOKU).slice(5)],enemy:fill(WABOKU),drive(e,m){
  // Counted in Main Phase 1 after the summon, before the End Phase hand limit discards.
  if(m.player===0&&m.type===M.SELECT_IDLECMD&&count(e,0,L.MZONE,SANGA)&&!out)out={sanga:count(e,0,L.MZONE,SANGA),others:count(e,0,L.MZONE,KAZEJIN)+count(e,0,L.MZONE,SUIJIN),hand:count(e,0,L.HAND,KAZEJIN)+count(e,0,L.HAND,SUIJIN)};
  return play(e,m)}});
 e.destroy();return out;
}
const gated=await gate(['gate_calling']);console.log('Gate Calling',gated);
same(gated,{sanga:1,others:1,hand:1},'Sanga brings one of the other two from the hand, once per turn');
same(await gate([]),{sanga:1,others:0,hand:2},'without the relic the others stay in the hand');
// Special Summons count too (2026-11-16 balance picks): Monster Reborn brings Sanga back from the GY.
const REBORN=id('Monster Reborn');
async function reborn(artifacts){
 let out=null;const play=steps([[I.SELECT_ACTIVATE,REBORN,'activates']]);
 const e=await duel({script:runScript(artifacts)+'\n'+setup([[SANGA,'grave'],[REBORN,'hand'],[KAZEJIN,'hand'],[SUIJIN,'hand']]),deck:[SANGA,REBORN,KAZEJIN,SUIJIN,...fill(WABOKU).slice(4)],enemy:fill(WABOKU),drive(e,m){
  if(m.player===0&&m.type===M.SELECT_IDLECMD&&count(e,0,L.MZONE,SANGA)&&!out)out={sanga:count(e,0,L.MZONE,SANGA),others:count(e,0,L.MZONE,KAZEJIN)+count(e,0,L.MZONE,SUIJIN),hand:count(e,0,L.HAND,KAZEJIN)+count(e,0,L.HAND,SUIJIN)};
  return play(e,m)}});
 e.destroy();return out;
}
const revived=await reborn(['gate_calling']);console.log('Gate Calling (Special Summon)',revived);
same(revived,{sanga:1,others:1,hand:1},'a Special Summoned Sanga also brings one of the other two, once per turn');
same(await reborn([]),{sanga:1,others:0,hand:2},'without the relic Monster Reborn only brings Sanga');

// Dark Lotus: at the first Standby Phase, Gate Guardian comes from the Deck ignoring its summoning conditions; not again.
async function lotus(artifacts,turns=3){
 let asked=0;
 const e=await duel({script:runScript(artifacts),deck:[GATE,...fill(WABOKU).slice(1)],enemy:fill(WABOKU),turns,drive(e,m){
  if(m.player===0&&m.type===M.SELECT_YESNO)asked++;
  if(m.player===0&&m.type===M.SELECT_CARD){const at=m.selects.findIndex(c=>c.code===GATE);if(at>=0)return {type:R.SELECT_CARD,indicies:[at]}}
  return steps([])(e,m)}});
 const out={gate:count(e,0,L.MZONE,GATE),asked};e.destroy();return out;
}
const bloomed=await lotus(['dark_lotus']);console.log('Dark Lotus',bloomed);
same(bloomed,{gate:1,asked:1},'Gate Guardian is Special Summoned from the Deck at the first Standby Phase, and only then');
same((await lotus([])).gate,0,'without the relic it stays in the Deck');

// Ring of Defense: Messenger of Peace's upkeep (100 LP, a cost) is reported each of your Standby Phases; Blood Crown's
// 300 End Phase damage comes from a cursed relic, not a card, so it is not.
const MESSENGER=id('Messenger of Peace');
async function ring(artifacts){
 const e=await duel({script:runScript(artifacts)+'\n'+setup([[MESSENGER,'hand']]),deck:[MESSENGER,...fill(WABOKU).slice(1)],enemy:fill(WABOKU),turns:3,drive:steps([[I.SELECT_ACTIVATE,MESSENGER,'activates']])});
 const out={lost:e.events.filter(x=>x.kind==='self_lp_loss').map(x=>x.amount),messenger:count(e,0,L.SZONE,MESSENGER),lp:e.lp[0]};e.destroy();return out;
}
const ringed=await ring(['ring_of_defense','cursed_blood_crown']);console.log('Ring of Defense',ringed);
same(ringed.messenger,1,'Messenger of Peace stays on the field');
same(ringed.lost,[100],'its 100 LP upkeep is reported; Blood Crown damage is not');
ok(ringed.lp<=8000-100-300,'both losses happened');
same((await ring(['cursed_blood_crown'])).lost,[],'without the relic nothing is reported');
// Trapbound Idol's 300 LP per Spell is a cursed relic's cost, not a card's: only the upkeep counts.
same((await ring(['ring_of_defense','cursed_trapbound_idol'])).lost,[100],"a curse's LP cost is not refunded");

// The CPU with a copy (Relic Mirror): its Dark Lotus picks the strongest monster, Gate Guardian, over Battle Ox.
{
 const e=await duel({script:runScript(['dark_lotus'],1),deck:fill(WABOKU),enemy:[GATE,OX,...fill(WABOKU).slice(2)],turns:2,drive:steps([])});
 const field=cards(e,1,L.MZONE).map(c=>c.code);e.destroy();console.log('CPU Dark Lotus',field);
 ok(field.includes(GATE),'the CPU summons Gate Guardian with Dark Lotus');
}
// Ultimate Armory: Celtic Guardian with 3 Legendary Swords survives Dark Hole; with 2 it does not.
const SWORD=id('Legendary Sword'),HOLE=id('Dark Hole');
async function armory(artifacts,swords){
 const hand=[CELTIC,...Array(swords).fill(SWORD),HOLE];
 const e=await duel({script:runScript(artifacts)+'\n'+setup(hand.map(c=>[c,'hand'])),deck:[...hand,...fill(WABOKU).slice(hand.length)],enemy:fill(WABOKU),
  drive:steps([[I.SELECT_SUMMON,CELTIC,'summons'],...Array(swords).fill([I.SELECT_ACTIVATE,SWORD,'activates']),[I.SELECT_ACTIVATE,HOLE,'activates']])});
 const out=count(e,0,L.MZONE,CELTIC);e.destroy();return out;
}
same(await armory(['ultimate_armory'],3),1,'with 3 Equip Spells Dark Hole cannot destroy it');
same(await armory(['ultimate_armory'],2),0,'with 2 it is destroyed');
same(await armory([],3),0,'without the relic it is destroyed');

// The CPU knows: Fissure is no longer worth playing into the armored monster.
{
 const e=new MobileDuel(meta.cards);Object.assign(e,{data,lp:[8000,8000],player:1,turn:4,phase:4,activeChain:[],battleProtected:[false,false],aiModifiers:{activeRelics:[[],[]],statRelics:[[],[]],spellTrapZones:5}});
 const zones={};e.query=(side,loc)=>zones[`${side}:${loc}`]||[];
 const card=(code,side,loc,sequence=0)=>({code,controller:side,location:loc,sequence,position:1,attack:data[code].attack,defense:data[code].defense});
 zones[`0:${L.MZONE}`]=[card(CELTIC,0,L.MZONE)];
 zones[`0:${L.SZONE}`]=[0,1,2].map(s=>({...card(SWORD,0,L.SZONE,s),equipCard:{controller:0,location:L.MZONE,sequence:0}}));
 const fissure=card(id('Fissure'),1,L.HAND);zones[`1:${L.HAND}`]=[fissure];
 const score=()=>smartContext(e,1,L,{activates:[fissure]}).activation(fissure,false);
 const plain=score();e.aiModifiers.activeRelics[0]=['ultimate_armory'];const armored=score();
 ok(plain>0&&armored<0,`the CPU plays Fissure only without Ultimate Armory (${plain} / ${armored})`);
}

// The CPU with a copy of Soul Fusion (Relic Mirror) Fusion Summons Gaia the Dragon Champion from its GY.
{
 const grave=`do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_STARTUP)
e:SetOperation(function(e) e:Reset() for _,code in ipairs({${FIERCE},${CURSE}}) do local c=Duel.GetFirstMatchingCard(Card.IsCode,1,LOCATION_DECK,0,nil,code) if c then Duel.SendtoGrave(c,REASON_RULE) end end end) Duel.RegisterEffect(e,0) end`;
 const e=await duel({script:runScript(['soul_fusion'],1)+'\n'+grave,deck:fill(WABOKU),enemy:[FIERCE,CURSE,...fill(WABOKU).slice(2),GAIA],turns:2,drive:steps([])});
 const field=cards(e,1,L.MZONE).map(c=>c.code),banished=count(e,1,L.REMOVED);console.log('CPU Soul Fusion',field,banished,cards(e,1,L.GRAVE).map(c=>c.code),cards(e,1,L.EXTRA).map(c=>c.code),e.turn);e.destroy();
 ok(field.includes(GAIA)&&banished===2,'the CPU uses Soul Fusion');
}
console.log('PASS Nov 14 duels:',checks,'checks');
