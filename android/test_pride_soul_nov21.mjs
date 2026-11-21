// 2026-11-21: My Pride and Soul, the fused relic of the four Blue-Eyes relics (Dragon Crest, Blue-Eyes Radiance, Twin Eyes,
// Dragon's Claws). Real-core duels, as test_dark_magic_nov19.mjs; the relic's data, recipe and card lists are checked through
// Python at the end.
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const {MobileDuel,M,R,I,B,L}=await import('./web/duel.js');
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json'),scripts=json('android/web/scripts.json'),id=n=>{const c=meta.cards.find(c=>c.name===n);assert(c,n);return c.id};
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const py=(code,...args)=>execFileSync(python,['-B','-c',"import sys,json;sys.path.insert(0,'.');"+code,...args],{cwd:root,encoding:'utf8',env:{...process.env,PYTHONUTF8:'1'},maxBuffer:1<<26}).trim();
const runScript=(artifacts,side=0)=>py('import passives;print(passives.multiplayer_script(json.loads(sys.argv[1]),int(sys.argv[2])))',JSON.stringify({curses:[],artifacts,cursed_artifacts:[],challenge_level:0}),String(side));
let checks=0;const ok=(value,why)=>{assert(value,why);checks++},same=(a,b,why)=>{assert.deepEqual(a,b,why);checks++};

const WABOKU=id('Waboku'),OX=id('Battle Ox'),HOLE=id('Dark Hole');
const BEWD=id('Blue-Eyes White Dragon'),ULTIMATE=id('Blue-Eyes Ultimate Dragon'),BURST=id('Burst Stream of Destruction'),KAIBAMAN=id('Kaibaman');
const HYOZANRYU=id('Hyozanryu'),REDEYES=id('Red-Eyes Black Dragon');
const RELIC='my_pride_and_soul';

const setup=moves=>moves.length?`do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_STARTUP)
e:SetOperation(function(e) e:Reset() ${moves.map(([code,where,p=0])=>`do local c=Duel.GetMatchingGroup(Card.IsCode,${p},LOCATION_DECK,0,nil,${code}):Filter(function(x) return not x:IsLocation(LOCATION_HAND) end,nil):GetFirst() if c then ${where==='field'?`Duel.MoveToField(c,${p},${p},LOCATION_MZONE,POS_FACEUP_ATTACK,true)`:`Duel.SendtoHand(c,${p},REASON_RULE)`} end end`).join(' ')} end) Duel.RegisterEffect(e,0) end`:'';
async function duel({script='',deck,enemy,turns=1,drive}){
 const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,scripts]);
 let s=e.start(deck,enemy,8000,8000,5,7,[],[],script);
 for(let i=0;i<6000&&!s.finished&&e.turn<=turns;i++){const m=e.pending;if(!m)break;const answer=drive(e,m);s=e.respond(answer||e.auto())}
 assert.deepEqual(e.errors||[],[],'no script errors');
 return e;
}
const idle=(m,action,codes,list)=>{const at=(m[list]||[]).findIndex(c=>[].concat(codes).includes(c.code));return at<0?null:{type:R.SELECT_IDLECMD,action,index:at}};
const toEnd={type:R.SELECT_IDLECMD,action:I.TO_EP,index:null},noBattle={type:R.SELECT_BATTLECMD,action:B.TO_EP,index:null};
const fill=(...codes)=>Array.from({length:40},(_,n)=>codes[n%codes.length]);
// The listed cards go to the bottom of the Deck (the core draws from the front of the list, unshuffled), so they stay there.
const deckOf=(cards,filler=WABOKU)=>[...fill(filler).slice(cards.length),...cards];
const cards=(e,p,loc,code)=>e.query(p,loc).filter(c=>c&&(!code||c.code===code));
const count=(e,p,loc,code)=>cards(e,p,loc,code).length;
// Plays each step once, in order; answers the yes/no prompts from `yes` in turn (then yes); picks the listed cards.
const steps=(list,{pick=[],yes=[]}={})=>{const done=new Set();let asked=0;const drive=(e,m)=>{
 if(m.player!==0)return null;
 if(m.type===M.SELECT_IDLECMD){for(const [n,[action,codes,field]] of list.entries()){if(done.has(n))continue;const s=idle(m,action,codes,field);if(s){done.add(n);return s}}return toEnd}
 if(m.type===M.SELECT_BATTLECMD)return noBattle;
 if(m.type===M.SELECT_YESNO){drive.asked=++asked;return {type:R.SELECT_YESNO,yes:yes[asked-1]??true}}
 if(m.type===M.SELECT_EFFECTYN)return {type:R.SELECT_EFFECTYN,yes:true};
 if(m.type===M.SELECT_POSITION)return {type:R.SELECT_POSITION,position:1};
 if(m.type===M.SELECT_CARD)for(const code of pick){const at=m.selects.map((c,i)=>[c,i]).filter(([c])=>c.code===code).map(([,i])=>i).slice(0,m.max);if(at.length&&at.length>=m.min)return {type:R.SELECT_CARD,indicies:at}}
 return null};drive.asked=0;return drive};

// 1. Dragon monsters you control gain 800 ATK/DEF; others do not.
{
 let seen=null;
 const e=await duel({script:runScript([RELIC])+'\n'+setup([[HYOZANRYU,'field'],[OX,'field']]),deck:deckOf([HYOZANRYU,OX]),enemy:fill(WABOKU),drive(e,m){
  if(m.player===0&&m.type===M.SELECT_IDLECMD&&!seen){const h=cards(e,0,L.MZONE,HYOZANRYU)[0],o=cards(e,0,L.MZONE,OX)[0];seen={dragon:[h?.attack,h?.defense],ox:[o?.attack,o?.defense]}}
  return steps([])(e,m)}});
 e.destroy();console.log('My Pride and Soul ATK/DEF',seen);
 same(seen,{dragon:[2900,3600],ox:[1700,1000]},'Hyozanryu 2100/2800 -> 2900/3600; Battle Ox (Beast-Warrior) stays 1700/1000');
}

// 2. At the start of the Duel: Special Summon a "Blue-Eyes" monster from the Deck in Attack Position, then add a card that
// mentions "Blue-Eyes White Dragon". With no "Blue-Eyes" monster in the Deck, the search still happens.
async function opening(artifacts,deck,pick){
 let seen=null;
 // The opening hand is drawn after EVENT_STARTUP, from the shuffled Deck, so a card may also be drawn: the hand size shows
// the one card added (the usual opening hand + 1).
 const e=await duel({script:runScript(artifacts),deck:[...deck,...fill(WABOKU).slice(deck.length)],enemy:fill(WABOKU),drive(e,m){
  if(m.player===0&&m.type===M.SELECT_IDLECMD&&!seen){const b=cards(e,0,L.MZONE,BEWD)[0];
   seen={bewd:count(e,0,L.MZONE,BEWD),position:b?.position??null,hand:count(e,0,L.HAND),added:count(e,0,L.HAND,pick.at(-1)),atk:b?.attack??null}}
  return steps([],{pick})(e,m)}});
 e.destroy();return seen;
}
const plain=await opening([],[BEWD,BURST,KAIBAMAN],[BEWD,BURST]),drawn=plain.hand;
same({bewd:plain.bewd,position:plain.position},{bewd:0,position:null},'without the relic nothing is summoned');
const opened=await opening([RELIC],[BEWD,BURST,KAIBAMAN],[BEWD,BURST]);console.log('My Pride and Soul, start of the Duel',opened);
same(opened,{bewd:1,position:1,hand:drawn+1,added:1,atk:3800},'Blue-Eyes White Dragon in face-up Attack Position (3000 + 800) and Burst Stream of Destruction to the hand');
same(await opening([RELIC],[BEWD,BURST,KAIBAMAN],[BEWD,KAIBAMAN]),{bewd:1,position:1,hand:drawn+1,added:1,atk:3800},'the player picks the card to add (Kaibaman)');
same(await opening([RELIC],[BURST,KAIBAMAN],[KAIBAMAN]),{bewd:0,position:null,hand:drawn+1,added:1,atk:null},'with no "Blue-Eyes" monster in the Deck, only the search happens');
{
 const RED=await opening([RELIC],[REDEYES,BURST],[REDEYES,BURST]);
 same(RED.bewd+(RED.position===null?0:1),0,'a Red-Eyes monster is not a "Blue-Eyes" monster: nothing is summoned');
}

// 3. Your opponent cannot activate Trap Cards during your Battle Phase, and can outside it. The CPU Sets Waboku on turn 2;
// on turn 3 you Normal Summon Battle Ox (a chain window in Main Phase 1), then attack with Blue-Eyes White Dragon.
const BATTLE=new Set([0x8,0x10,0x20,0x40,0x80]);
async function traps(artifacts){
 const offered={main:0,battle:0};let summoned=false,attacked=false;
 const e=await duel({script:runScript(artifacts)+'\n'+setup([[BEWD,'field'],[OX,'hand']]),deck:deckOf([BEWD,OX]),enemy:fill(WABOKU),turns:3,drive(e,m){
  if(m.player===1){if(e.turn===3&&m.type===M.SELECT_CHAIN&&(m.selects||[]).some(c=>c.code===WABOKU))offered[BATTLE.has(e.phase)?'battle':'main']++;
   // The CPU keeps its Wabokus: it never activates them on turn 3, so every window offers them again.
   if(e.turn===3&&m.type===M.SELECT_CHAIN)return {type:R.SELECT_CHAIN,index:-1};return null}
  if(m.type===M.SELECT_IDLECMD){if(e.turn!==3)return toEnd;if(!summoned){const s=idle(m,I.SELECT_SUMMON,OX,'summons');if(s){summoned=true;return s}}return attacked?toEnd:{type:R.SELECT_IDLECMD,action:I.TO_BP,index:null}}
  if(m.type===M.SELECT_BATTLECMD){const a=(m.attacks||[]).findIndex(c=>c.code===BEWD);if(!attacked&&a>=0){attacked=true;return {type:R.SELECT_BATTLECMD,action:B.SELECT_BATTLE,index:a}}return noBattle}
  return steps([],{pick:[BEWD]})(e,m)}});
 const out={...offered,set:count(e,1,L.SZONE,WABOKU)>0,attacked};e.destroy();return out;
}
const locked=await traps([RELIC]),open=await traps([]);console.log('My Pride and Soul, Trap lock',locked,'without',open);
ok(open.set&&open.attacked&&open.main>0&&open.battle>0,'without the relic the CPU may activate Waboku in Main Phase 1 and in the Battle Phase');
ok(locked.set&&locked.attacked&&locked.main>0,'with the relic Waboku can still be activated in your Main Phase');
same(locked.battle,0,'with the relic Waboku is never offered during your Battle Phase');

// 4. When a "Blue-Eyes" monster you control is destroyed (Dark Hole): You can Special Summon 1 LIGHT Dragon from the hand,
// Deck or Extra Deck, ignoring its Summoning conditions. Once per turn; a "no" keeps the turn's use.
async function fallen({artifacts=[RELIC],onField=BEWD,pick,holes=1,yes=[],deck=[HYOZANRYU]}){
 const drive=steps(Array.from({length:holes},()=>[I.SELECT_ACTIVATE,HOLE,'activates']),{pick:[pick,HYOZANRYU].filter(Boolean),yes});
 const holeCards=Array(holes).fill(HOLE);
 const e=await duel({script:runScript(artifacts)+'\n'+setup([[onField,'field'],...holeCards.map(c=>[c,'hand'])]),deck:[...deckOf([onField,...holeCards,...deck]),ULTIMATE],enemy:fill(WABOKU),drive});
 const out={ultimate:count(e,0,L.MZONE,ULTIMATE),hyozanryu:count(e,0,L.MZONE,HYOZANRYU),asked:drive.asked,holes:count(e,0,L.GRAVE,HOLE)};e.destroy();return out;
}
const fromExtra=await fallen({pick:ULTIMATE});console.log('My Pride and Soul, destroyed (Extra Deck)',fromExtra);
same(fromExtra,{ultimate:1,hyozanryu:0,asked:1,holes:1},'Blue-Eyes Ultimate Dragon from the Extra Deck, ignoring its Summoning conditions');
const fromDeck=await fallen({pick:HYOZANRYU});console.log('My Pride and Soul, destroyed (Deck)',fromDeck);
same(fromDeck,{ultimate:0,hyozanryu:1,asked:1,holes:1},'Hyozanryu (LIGHT Dragon) from the Deck');
same(await fallen({pick:ULTIMATE,yes:[false]}),{ultimate:0,hyozanryu:0,asked:1,holes:1},'"You can": a no summons nothing');
same(await fallen({artifacts:[],pick:ULTIMATE}),{ultimate:0,hyozanryu:0,asked:0,holes:1},'without the relic nothing is summoned');
same(await fallen({onField:REDEYES,pick:ULTIMATE}),{ultimate:0,hyozanryu:0,asked:0,holes:1},'a destroyed Red-Eyes Black Dragon is not a "Blue-Eyes" monster');
same(await fallen({onField:OX,pick:ULTIMATE}),{ultimate:0,hyozanryu:0,asked:0,holes:1},'a destroyed Battle Ox is not a "Blue-Eyes" monster');
// Once per turn: the Ultimate Dragon it summoned is destroyed by a second Dark Hole the same turn; no second summon.
const twice=await fallen({pick:ULTIMATE,holes:2});console.log('My Pride and Soul, twice in a turn',twice);
same(twice,{ultimate:0,hyozanryu:0,asked:1,holes:2},'once per turn: the second Blue-Eyes destroyed that turn summons nothing');
// A "no" does not spend it: two Blue-Eyes White Dragons, each destroyed by its own Hammer Shot (the highest-ATK Attack Position
// monster); the second destruction that turn still asks, and Hyozanryu comes out.
{
 const SHOT=id('Hammer Shot'),drive=steps([[I.SELECT_ACTIVATE,SHOT,'activates'],[I.SELECT_ACTIVATE,SHOT,'activates']],{pick:[BEWD,HYOZANRYU],yes:[false,true]});
 const e=await duel({script:runScript([RELIC])+'\n'+setup([[BEWD,'field'],[BEWD,'field'],[SHOT,'hand'],[SHOT,'hand']]),deck:deckOf([BEWD,BEWD,SHOT,SHOT,HYOZANRYU]),enemy:fill(WABOKU),drive});
 const out={bewd:count(e,0,L.GRAVE,BEWD),hyozanryu:count(e,0,L.MZONE,HYOZANRYU),asked:drive.asked};e.destroy();console.log('My Pride and Soul, no then yes',out);
 same(out,{bewd:2,hyozanryu:1,asked:2},'after a no, the next Blue-Eyes destroyed that turn may still summon');
}

// 5. A copy for player 1 (Relic Mirror; the seat translation Tag's 1v1 finals use too): the CPU's opening Blue-Eyes White
// Dragon and search, its 800 ATK, and its own choice to summon when you destroy that Blue-Eyes with Dark Hole.
{
 let opened=null;
 const e=await duel({script:runScript([RELIC],1)+'\n'+setup([[HOLE,'hand']]),deck:deckOf([HOLE]),enemy:deckOf([BEWD,BURST,HYOZANRYU]),drive(e,m){
  if(m.player===0&&m.type===M.SELECT_IDLECMD&&!opened)opened={field:cards(e,1,L.MZONE).map(c=>c.code),atk:cards(e,1,L.MZONE,BEWD)[0]?.attack,burst:count(e,1,L.HAND,BURST)};
  return steps([[I.SELECT_ACTIVATE,HOLE,'activates']])(e,m)}});
 const after={bewd:count(e,1,L.GRAVE,BEWD),hyozanryu:count(e,1,L.MZONE,HYOZANRYU)};e.destroy();console.log('CPU My Pride and Soul',opened,after);
 same(opened,{field:[BEWD],atk:3800,burst:1},'the CPU\'s copy summons Blue-Eyes White Dragon (3800) and adds Burst Stream of Destruction');
 same(after,{bewd:1,hyozanryu:1},'the CPU\'s Blue-Eyes destroyed by your Dark Hole: it summons Hyozanryu from its Deck');
 const mirrored=runScript([RELIC],1);
 ok(mirrored.includes('Duel.GetTurnPlayer()==1 and Duel.IsBattlePhase()'),'the CPU\'s copy locks your Traps during its own Battle Phase');
}

// 6. Data: recipe, price (the 4 pieces' prices), art, text, card lists; the pieces' own effects are not part of it.
const facts=JSON.parse(py(`import content,relic_fusions,passives,campaign as g,approved_relic_effects as fx
run={'artifacts':['dragon','blue_eyes_radiance','twin_eyes','dragon_triumph']};made=relic_fusions.fuse(dict(run,history_mode='tag'))
arts=[k for k,v in content.ART_INFO.items() if v['art']=='Burst Stream of Destruction']
monster=lambda c:c['data']['type']&1
print(json.dumps(dict(relic=content.ARTIFACTS['my_pride_and_soul'],info=content.ART_INFO['my_pride_and_soul'],recipe=relic_fusions.RECIPES['my_pride_and_soul'],
 pieces=sum(content.ARTIFACTS[k][1] for k in relic_fusions.RECIPES['my_pride_and_soul']),made=[m['relic'] for m in made],arts=arts,
 blue=sorted(fx.BLUE_EYES)==sorted(c['id'] for c in g.CARDS if monster(c) and 'Blue-Eyes' in c['name']),
 mentions=sorted(fx.BLUE_EYES_MENTIONS)==sorted(c['id'] for c in g.CARDS if '"Blue-Eyes White Dragon"' in c.get('desc','')),
 script=passives.script({'curses':[],'artifacts':['my_pride_and_soul'],'challenge_level':0}))))`));
same(facts.recipe,['dragon','blue_eyes_radiance','twin_eyes','dragon_triumph'],'the four Blue-Eyes relics fuse');
same(facts.made,['my_pride_and_soul'],'owning all four fuses them');
ok(facts.relic[0]==='My Pride and Soul'&&facts.relic[1]===395&&facts.pieces===395,'priced like the other fusions: 70 + 85 + 150 + 90 = 395');
ok(facts.info.art==='Burst Stream of Destruction'&&facts.info.effect==='fused_my_pride_and_soul','Burst Stream of Destruction art; its own effect');
same(facts.arts,['my_pride_and_soul'],'no other relic uses the Burst Stream of Destruction art');
ok(!/Dragon Crest|Blue-Eyes Radiance|Twin Eyes|Dragon's Claws/.test(facts.relic[2]),'the text never names its pieces');
ok(facts.blue&&facts.mentions,'"Blue-Eyes" monsters and cards that mention "Blue-Eyes White Dragon" match the card list');
ok(!facts.script.includes('EVENT_BATTLE_DESTROYING')&&!facts.script.includes('EFFECT_SPSUMMON_PROC')&&!facts.script.includes('PHASE_STANDBY'),'no Dragon\'s Claws burn, Radiance summon or Twin Eyes Standby summon');
console.log(`PASS My Pride and Soul (${checks} checks)`);
