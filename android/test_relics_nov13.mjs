// The relics and curse added on 2026-11-13 from the Discord review, in real-core duels: Good Spirits (optional Spirit
// return, also the CPU's choice), Disturbed Sleep (and the CPU's Set rule under it), Gadget Call, Gadget Stronghold,
// Gadget Gadget and the Rain of Mercy curse. Prices, the fusion and curse rolls are in tools/test_relics_nov13.py.
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const {MobileDuel,M,R,I,B,L}=await import('./web/duel.js');
const {smartContext}=await import('./web/smart_policy.js');
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json'),scripts=json('android/web/scripts.json'),id=n=>{const c=meta.cards.find(c=>c.name===n);assert(c,n);return c.id};
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const py=(code,...args)=>execFileSync(python,['-B','-c',"import sys,json;sys.path.insert(0,'.');"+code,...args],{cwd:root,encoding:'utf8',env:{...process.env,PYTHONUTF8:'1'}}).trim();
const runScript=(artifacts,side=0,curses=[],level=0)=>py('import passives;print(passives.multiplayer_script(json.loads(sys.argv[1]),int(sys.argv[2])))',JSON.stringify({curses,artifacts,cursed_artifacts:[],challenge_level:level}),String(side));
const WABOKU=id('Waboku'),ASURA=id('Asura Priest'),OTOHIME=id('Otohime'),VORSE=id('Vorse Raider'),GIANT=id('Giant Soldier of Stone'),OX=id('Battle Ox'),MORPHING=id('Morphing Jar');
const RED=id('Red Gadget'),YELLOW=id('Yellow Gadget'),GREEN=id('Green Gadget'),STRONG=id('Stronghold the Moving Fortress');
const GADGETS=[RED,YELLOW,GREEN];
let checks=0;const ok=(value,why)=>{assert(value,why);checks++},same=(a,b,why)=>{assert.deepEqual(a,b,why);checks++};
for(const name of ['Disturbed Sleep','Gadget Call','Gadget Stronghold','Gadget Gadget'])ok(Object.values(meta.artifacts).some(a=>a[0]===name),name+' is in content.json');

async function duel({script='',deck,enemy,turns=2,drive}){
 const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,scripts]);
 let s=e.start(deck,enemy,8000,8000,5,7,[],[],script);
 for(let i=0;i<6000&&!s.finished&&e.turn<=turns;i++){const m=e.pending;if(!m)break;const answer=drive(e,m);s=e.respond(answer||e.auto())}
 assert.deepEqual(e.errors||[],[],'no script errors');
 return e;
}
const idle=(m,action,codes,list)=>{const at=(m[list]||[]).findIndex(c=>[].concat(codes).includes(c.code));return at<0?null:{type:R.SELECT_IDLECMD,action,index:at}};
const toEnd={type:R.SELECT_IDLECMD,action:I.TO_EP,index:null},noBattle={type:R.SELECT_BATTLECMD,action:B.TO_EP,index:null};
const fill=(...codes)=>Array.from({length:40},(_,n)=>codes[n%codes.length]);
const cards=(e,p,loc,code)=>e.query(p,loc).filter(c=>c&&(!code||c.code===code));
const count=(e,p,loc,code)=>cards(e,p,loc,code).length;

// Good Spirits: the player decides whether Asura Priest returns at the End Phase; without the relic it must return.
async function spirit(artifacts,stay){
 let asked=false,summoned=false;
 const e=await duel({script:runScript(artifacts),deck:fill(ASURA),enemy:fill(WABOKU),turns:1,drive(e,m){
  if(m.player!==0)return null;
  if(m.type===M.SELECT_IDLECMD){const s=!summoned&&idle(m,I.SELECT_SUMMON,ASURA,'summons');if(s){summoned=true;return s}return toEnd}
  if(m.type===M.SELECT_BATTLECMD)return noBattle;
  if(m.type===M.SELECT_EFFECTYN&&m.code===ASURA&&e.phase===512){asked=true;return {type:R.SELECT_EFFECTYN,yes:!stay}}
  return null}});
 const out={asked,onField:count(e,0,L.MZONE,ASURA)};e.destroy();return out;
}
same(await spirit(['good_spirits'],true),{asked:true,onField:1},'Good Spirits: choosing not to return keeps Asura Priest');
same(await spirit(['good_spirits'],false),{asked:true,onField:0},'Good Spirits: choosing to return sends it back');
same(await spirit([],true),{asked:false,onField:0},'without the relic the Spirit returns with no choice');

// The CPU rule itself: smart.spiritStays.
const make=()=>{
 const e=new MobileDuel(meta.cards);Object.assign(e,{data,lp:[8000,8000],player:1,turn:4,phase:512,activeChain:[],battleProtected:[false,false],aiModifiers:{activeRelics:[[],[]],statRelics:[[],[]],spellTrapZones:5}});
 const zones={};e.query=(side,loc)=>zones[`${side}:${loc}`]||[];
 const card=(code,side=1,loc=L.MZONE,pos=1,sequence=0)=>({code,controller:side,location:loc,sequence,position:pos,attack:data[code].attack,defense:data[code].defense});
 const put=(side,loc,...cards)=>zones[`${side}:${loc}`]=cards;
 return {e,card,put};
};
// The CPU (seat 1) answers the End Phase return (duel.js auto): stay when safe, return when beaten, and Otohime always
// returns for its summon effect again.
{
 const {e,card,put}=make(),priest=card(ASURA);put(1,L.MZONE,priest);
 const answer=code=>e.auto({type:M.SELECT_EFFECTYN,player:1,code}).yes;
 e.aiModifiers.activeRelics[1]=['good_spirits'];
 same(answer(ASURA),false,'the CPU keeps Asura Priest when nothing threatens it');
 put(0,L.MZONE,card(VORSE,0));same(answer(ASURA),true,'it sends Asura Priest back before Vorse Raider can destroy it');
 put(0,L.MZONE);put(1,L.MZONE,card(OTOHIME));same(answer(OTOHIME),true,'Otohime goes back to be summoned again');
 put(1,L.MZONE,priest);e.aiModifiers.activeRelics[1]=[];same(answer(ASURA),true,'without the relic the return is not optional, so it is accepted');
}
{
 const {e,card,put}=make(),priest=card(ASURA);put(1,L.MZONE,priest);
 ok(smartContext(e,1,L,{}).spiritStays(priest),'Asura Priest stays on an empty board');
 put(0,L.MZONE,card(VORSE,0));
 ok(!smartContext(e,1,L,{}).spiritStays(priest),'it goes back when Vorse Raider (1900) would beat it');
 put(0,L.MZONE);put(1,L.MZONE,card(OTOHIME));
 ok(!smartContext(e,1,L,{}).spiritStays(card(OTOHIME)),'Otohime always goes back');
}

// Disturbed Sleep: the Set Morphing Jar turns face-up Attack Position at the End Phase and its FLIP effect resolves
// (both players discard their hands and draw 5).
async function sleep(artifacts){
 let set=false;
 const e=await duel({script:runScript(artifacts),deck:fill(MORPHING,WABOKU),enemy:fill(WABOKU),turns:1,drive(e,m){
  if(m.player!==0)return null;
  if(m.type===M.SELECT_IDLECMD){const s=!set&&idle(m,I.SELECT_MONSTER_SET,MORPHING,'monster_sets');if(s){set=true;return s}return toEnd}
  return null}});
 const jar=cards(e,0,L.MZONE,MORPHING)[0];const out={position:jar?.position,enemyGrave:count(e,1,L.GRAVE)};e.destroy();return out;
}
const slept=await sleep(['disturbed_sleep']);console.log('Disturbed Sleep',slept);
same(slept.position,1,'the Set monster is face-up Attack Position after the End Phase');
ok(slept.enemyGrave>=5,"its FLIP effect made the opponent discard");
same((await sleep([])).position,8,'without the relic it stays face-down Defense');

// The CPU under Disturbed Sleep: Giant Soldier of Stone (1300/2000) would normally be Set against Battle Ox, but a Set
// monster spends the next turn in Attack Position, so Setting it is no safer and its damage counts as Attack.
{
 const {e,card,put}=make();e.phase=4;const giant=card(GIANT,1,L.HAND,0);put(1,L.HAND,giant);put(0,L.MZONE,card(OX,0));
 const prompt={monster_sets:[giant],summons:[giant]};
 ok(smartContext(e,1,L,prompt).preferSet(giant),'without the relic the wall is Set');
 same(smartContext(e,1,L,prompt).incomingDamage(giant,false),0,'Set, it takes no damage');
 e.aiModifiers.activeRelics[0]=['disturbed_sleep'];
 const smart=smartContext(e,1,L,prompt);
 ok(smart.sleepFlips&&!smart.preferSet(giant),'under Disturbed Sleep it is not kept back for a Set');
 same(smart.incomingDamage(giant,false),400,'a Set monster is counted in Attack Position (1700 - 1300)');
 ok(smart.preferSet({...giant,code:MORPHING}),'a FLIP monster is still Set: the End Phase activates its effect');
}

// Gadget Call: Normal Summon one Gadget; each search Special Summons the next Gadget instead, which searches again.
async function gadgets(artifacts,deck=fill(...GADGETS)){
 let summoned=false;
 const e=await duel({script:runScript(artifacts),deck,enemy:fill(WABOKU),turns:1,drive(e,m){
  if(m.player!==0)return null;
  if(m.type===M.SELECT_IDLECMD){const s=!summoned&&idle(m,I.SELECT_SUMMON,GADGETS,'summons');if(s){summoned=true;return s}return toEnd}
  if(m.type===M.SELECT_BATTLECMD)return noBattle;
  if(m.type===M.SELECT_EFFECTYN)return {type:R.SELECT_EFFECTYN,yes:true};
  if(m.type===M.SELECT_POSITION)return {type:R.SELECT_POSITION,position:1};
  return null}});
 const field=cards(e,0,L.MZONE);const out={monsters:field.length,gadgets:field.filter(c=>GADGETS.includes(c.code)).length,attacks:field.map(c=>c.attack),stronghold:count(e,0,L.HAND,STRONG)};e.destroy();return out;
}
const called=await gadgets(['gadget_call']);console.log('Gadget Call',called);
same(called.monsters,5,'the Gadgets summon each other until all 5 Monster Zones are full');
const plain=await gadgets([]);console.log('no relic',plain);
same(plain.monsters,1,'without the relic the searched Gadget goes to the hand');

// Gadget Stronghold: the Stronghold in the Deck starts in the hand (6 cards).
async function opening(artifacts){
 let hand=null;const deck=fill(WABOKU);deck[20]=STRONG;
 const e=await duel({script:runScript(artifacts),deck,enemy:fill(WABOKU),turns:1,drive(e,m){if(m.player===0&&m.type===M.SELECT_IDLECMD&&hand===null)hand=cards(e,0,L.HAND).map(c=>c.code);return m.player===0&&m.type===M.SELECT_IDLECMD?toEnd:null}});
 e.destroy();return hand;
}
const strongHand=await opening(['gadget_stronghold']);
ok(strongHand.includes(STRONG),'Gadget Stronghold: the Stronghold is in the opening hand');
ok(!(await opening([])).includes(STRONG),'without the relic it stays at the bottom of the Deck');

// Gadget Gadget: one Normal Summon brings 2 Gadgets with different names, the Stronghold, and 500 ATK each.
const deck=fill(...GADGETS);deck[39]=STRONG;
const fused=await gadgets(['gadget_gadget'],deck);console.log('Gadget Gadget',fused);
ok(fused.gadgets>=3,'the Normal Summon brings 2 more Gadgets');
ok(fused.stronghold>=1,'and adds Stronghold the Moving Fortress to the hand');
ok(fused.attacks.every(a=>a>=1700),'Gadgets gain 500 ATK');

// Rain of Mercy: the opponent gains 400 LP at the start of their Standby Phase (800 amplified).
async function rain(level){
 const e=await duel({script:runScript([],0,['rain_of_mercy'],level),deck:fill(WABOKU),enemy:fill(WABOKU),turns:2,drive(e,m){
  if(m.player!==0)return null;if(m.type===M.SELECT_IDLECMD)return toEnd;if(m.type===M.SELECT_BATTLECMD)return noBattle;return null}});
 const lp=e.lp.slice();e.destroy();return lp;
}
same(await rain(0),[8000,8400],'Rain of Mercy: the opponent gains 400 LP in their Standby Phase');
same(await rain(2),[8000,8800],'amplified: 800 LP');

// TRUANT's relics (2026-11-13). Cards are put in place at the first Draw Phase by a small setup script.
const POLY=id('Polymerization'),MOKEY=id('Mokey Mokey'),YAMATA=id('Yamata Dragon'),AXE=id('Axe of Despair');
const setup=body=>`local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START|PHASE_DRAW) e:SetOperation(function(e) e:Reset() ${body} end) Duel.RegisterEffect(e,0)`;
const place=(p,code)=>`Duel.MoveToField(Duel.CreateToken(${p},${code}),${p},${p},LOCATION_MZONE,POS_FACEUP_ATTACK,true)`;

// Vampiric Contact (cursed): Vorse Raider destroys Mokey Mokey on turn 3, +500 LP; when the CPU's Vorse Raider destroys
// our Mokey Mokey on turn 2 we take 1600 battle damage and lose 300 more LP (its ATK).
async function vampire(artifacts,mine,theirs){
 let attacked=false;
 const e=await duel({script:runScript(artifacts)+'\n'+setup(place(0,mine)+' '+place(1,theirs)),deck:fill(WABOKU),enemy:fill(POLY),turns:3,drive(e,m){
  if(m.player!==0)return null;
  if(m.type===M.SELECT_IDLECMD)return e.turn===3&&!attacked?{type:R.SELECT_IDLECMD,action:I.TO_BP,index:null}:toEnd;
  if(m.type===M.SELECT_BATTLECMD){if(!attacked&&m.attacks?.length){attacked=true;return {type:R.SELECT_BATTLECMD,action:B.SELECT_BATTLE,index:0}}return noBattle}
  return null}});
 const lp=e.lp[0];e.destroy();return lp;
}
const vamp=['cursed_vampiric_contact'];
same(await vampire(vamp,VORSE,MOKEY),8500,'Vampiric Contact: destroying a monster by battle gains 500 LP');
same(await vampire([],VORSE,MOKEY),8000,'without the relic no LP is gained');
same(await vampire(vamp,MOKEY,VORSE),6100,'losing Mokey Mokey (300 ATK) by battle costs 300 LP on top of the 1600 damage');
same(await vampire([],MOKEY,VORSE),6400,'without the relic only the battle damage');

// Armory Aid: the only Equip Spell in the Deck (Axe of Despair, mid-Deck) starts in the hand.
async function armory(artifacts){
 let hand=null;const deck=fill(WABOKU);deck[20]=AXE;
 const e=await duel({script:runScript(artifacts),deck,enemy:fill(WABOKU),turns:1,drive(e,m){if(m.player===0&&m.type===M.SELECT_IDLECMD&&hand===null)hand=cards(e,0,L.HAND).map(c=>c.code);return m.player===0&&m.type===M.SELECT_IDLECMD?toEnd:null}});
 e.destroy();return hand;
}
ok((await armory(['armory_aid'])).includes(AXE),'Armory Aid: an Equip Spell from the Deck starts in the hand');
ok(!(await armory([])).includes(AXE),'without the relic it stays in the Deck');

// Spiritual Retribution: Yamata Dragon (Level 7) is Tribute Summoned by banishing 2 monsters from the GY, once per Duel.
async function retribution(artifacts){
 const seen={offered:[],picked:0};
 const grave=Array.from({length:4},()=>`Duel.SendtoGrave(Duel.CreateToken(0,${OX}),REASON_RULE)`).join(' ');
 const e=await duel({script:runScript(artifacts)+'\n'+setup(grave),deck:fill(YAMATA),enemy:fill(WABOKU),turns:3,drive(e,m){
  if(m.player!==0)return null;
  if(m.type===M.SELECT_IDLECMD){const s=idle(m,I.SELECT_SUMMON,YAMATA,'summons');if(e.turn===1||e.turn===3)seen.offered[e.turn]??=!!s;if(s&&!seen.done){seen.done=true;return s}return toEnd}
  if(m.type===M.SELECT_BATTLECMD)return noBattle;
  if(m.type===M.SELECT_CARD&&m.selects?.every(c=>c.location===L.GRAVE)){seen.picked=m.max??2;return {type:R.SELECT_CARD,indicies:[0,1]}}
  return null}});
 const out={turn1:!!seen.offered[1],turn3:!!seen.offered[3],banished:count(e,0,L.REMOVED),summonedOnce:seen.done===true};e.destroy();return out;
}
const spirit3=await retribution(['spiritual_retribution']);console.log('Spiritual Retribution',spirit3);
same(spirit3,{turn1:true,turn3:false,banished:2,summonedOnce:true},'Yamata Dragon is summoned with 2 GY monsters banished, and only once per Duel');
same((await retribution([])).turn1,false,'without the relic Yamata Dragon cannot be summoned with an empty field');

console.log(`PASS Nov 13 relics: ${checks} checks`);
