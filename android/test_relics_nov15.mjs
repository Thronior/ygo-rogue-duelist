// The relics added on 2026-11-15 from the Discord review, in real-core duels: Magician's Bond, Blue-Eyes Radiance, Master and
// Apprentice, Black Chaos Rite, Dragon Lord's Decree, Twin Eyes, Dragon Blood Fusion, Titan's Charge and the shadow relic
// Poison of the Old Man; also copies the CPU gets from Relic Mirror. Prices, shop rules, weights and translations are in
// tools/test_relics_nov15.py.
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const {MobileDuel,M,R,I,B,L}=await import('./web/duel.js');
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json'),scripts=json('android/web/scripts.json'),id=n=>{const c=meta.cards.find(c=>c.name===n);assert(c,n);return c.id};
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const py=(code,...args)=>execFileSync(python,['-B','-c',"import sys,json;sys.path.insert(0,'.');"+code,...args],{cwd:root,encoding:'utf8',env:{...process.env,PYTHONUTF8:'1'}}).trim();
const runScript=(artifacts,side=0)=>py('import passives;print(passives.multiplayer_script(json.loads(sys.argv[1]),int(sys.argv[2])))',JSON.stringify({curses:[],artifacts,cursed_artifacts:[],challenge_level:0}),String(side));
let checks=0;const ok=(value,why)=>{assert(value,why);checks++},same=(a,b,why)=>{assert.deepEqual(a,b,why);checks++};
for(const name of ["Magician's Bond",'Blue-Eyes Radiance','Master and Apprentice','Black Chaos Rite',"Dragon Lord's Decree",'Twin Eyes','Dragon Blood Fusion',"Titan's Charge",'Poison of the Old Man'])ok(Object.values(meta.artifacts).some(a=>a[0]===name),name+' is in content.json');

const WABOKU=id('Waboku'),OX=id('Battle Ox'),HOLE=id('Dark Hole'),KOUMORI=id('Koumori Dragon');
const DM=id('Dark Magician'),DMG=id('Dark Magician Girl'),DMK=id('Dark Magician Knight'),DMOC=id('Dark Magician of Chaos'),SKILLED=id('Skilled Dark Magician'),KNIVES=id('Thousand Knives');
const BEWD=id('Blue-Eyes White Dragon'),SHINING=id('Blue-Eyes Shining Dragon'),BEUD=id('Blue-Eyes Ultimate Dragon'),REBD=id('Red-Eyes Black Dragon'),SKULL=id('Black Skull Dragon');
// Cards put in place before the first turn, taken from the Deck: [code, 'hand'|'grave'|'field', player].
const setup=moves=>moves.length?`do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_STARTUP)
e:SetOperation(function(e) e:Reset() ${moves.map(([code,where,p=0])=>`do local c=Duel.GetMatchingGroup(Card.IsCode,${p},LOCATION_DECK,0,nil,${code}):Filter(function(x) return not x:IsLocation(LOCATION_HAND) end,nil):GetFirst() if c then ${where==='grave'?'Duel.SendtoGrave(c,REASON_RULE)':where==='field'?`Duel.MoveToField(c,${p},${p},LOCATION_MZONE,POS_FACEUP_ATTACK,true)`:`Duel.SendtoHand(c,${p},REASON_RULE)`} end end`).join(' ')} end) Duel.RegisterEffect(e,0) end`:'';

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
const deckOf=(cards,filler=WABOKU)=>[...cards,...fill(filler).slice(cards.length)];
const cards=(e,p,loc,code)=>e.query(p,loc).filter(c=>c&&(!code||c.code===code));
const count=(e,p,loc,code)=>cards(e,p,loc,code).length;
const yes=m=>({type:m.type===M.SELECT_YESNO?R.SELECT_YESNO:R.SELECT_EFFECTYN,yes:true});
// Plays each step once, in order, whenever the idle menu offers it ([action, codes, list, turn]).
const steps=(list,{pick}={})=>{const done=new Set();return (e,m)=>{
 if(m.player!==0)return null;
 if(m.type===M.SELECT_IDLECMD){for(const [n,[action,codes,field,turn]] of list.entries()){if(done.has(n)||(turn&&e.turn!==turn))continue;const s=idle(m,action,codes,field);if(s){done.add(n);return s}}return toEnd}
 if(m.type===M.SELECT_BATTLECMD)return noBattle;
 if([M.SELECT_YESNO,M.SELECT_EFFECTYN].includes(m.type))return yes(m);
 if(m.type===M.SELECT_POSITION)return {type:R.SELECT_POSITION,position:1};
 if(m.type===M.SELECT_CARD&&pick){const at=m.selects.map((c,i)=>[c,i]).filter(([c])=>pick.includes(c.code)).map(([,i])=>i).slice(0,m.max);if(at.length>=m.min)return {type:R.SELECT_CARD,indicies:at}}
 return null}};
const offered=(m,code)=>m.player===0&&m.type===M.SELECT_IDLECMD&&(m.special_summons||[]).some(c=>c.code===code);

// Magician's Bond: Normal Summoning Skilled Dark Magician adds Thousand Knives; a second Normal Summon the same turn
// (Conscription Drum) adds nothing more.
async function bond(artifacts){
 let before=null,asked=0;const play=steps([[I.SELECT_SUMMON,SKILLED,'summons'],[I.SELECT_SUMMON,SKILLED,'summons']]);
 const e=await duel({script:runScript(artifacts)+'\n'+setup([[SKILLED,'hand'],[SKILLED,'hand']]),deck:deckOf([SKILLED,SKILLED,KNIVES,KNIVES,KNIVES]),enemy:fill(WABOKU),drive(e,m){
  if(m.player===0&&m.type===M.SELECT_IDLECMD&&before===null)before=count(e,0,L.HAND,KNIVES);
  if(m.player===0&&m.type===M.SELECT_YESNO)asked++;
  return play(e,m)}});
 const out={summoned:count(e,0,L.MZONE,SKILLED),added:count(e,0,L.HAND,KNIVES)+count(e,0,L.GRAVE,KNIVES)-before,asked};e.destroy();return out;
}
const bonded=await bond(['magicians_bond','cursed_conscription_drum']);console.log("Magician's Bond",bonded);
same(bonded,{summoned:2,added:1,asked:1},'one card that mentions "Dark Magician" is added, once per turn');
same((await bond(['cursed_conscription_drum'])).added,0,'without the relic nothing is added');
// Special Summons count too (2026-11-16 balance picks): Monster Reborn brings Dark Magician back from the GY.
const REBORN=id('Monster Reborn');
async function rebornBond(artifacts){
 let before=null,asked=0;const play=steps([[I.SELECT_ACTIVATE,REBORN,'activates']]);
 const e=await duel({script:runScript(artifacts)+'\n'+setup([[DM,'grave'],[REBORN,'hand']]),deck:deckOf([DM,REBORN,KNIVES,KNIVES,KNIVES]),enemy:fill(WABOKU),drive(e,m){
  if(m.player===0&&m.type===M.SELECT_IDLECMD&&before===null)before=count(e,0,L.HAND,KNIVES);
  if(m.player===0&&m.type===M.SELECT_YESNO)asked++;
  return play(e,m)}});
 const out={revived:count(e,0,L.MZONE,DM),added:count(e,0,L.HAND,KNIVES)+count(e,0,L.GRAVE,KNIVES)-before,asked};e.destroy();return out;
}
const rebonded=await rebornBond(['magicians_bond']);console.log("Magician's Bond (Special Summon)",rebonded);
same(rebonded,{revived:1,added:1,asked:1},'a Special Summoned Dark Magician also adds a card that mentions it');
same((await rebornBond([])).added,0,'without the relic Monster Reborn adds nothing');

// Blue-Eyes Radiance: 3 Blue-Eyes White Dragon from the hand bring Blue-Eyes Shining Dragon from the Deck; it survives the
// player's own Dark Hole that turn, but not two turns later. Once per turn: the second Shining Dragon is not offered.
async function radiance(artifacts){
 let again=false,used=false,hole=0,gyAfter=null;
 const e=await duel({script:runScript(artifacts)+'\n'+setup([...Array(6).fill([BEWD,'hand']),[HOLE,'hand'],[HOLE,'hand']]),deck:deckOf([BEWD,BEWD,BEWD,BEWD,BEWD,BEWD,HOLE,HOLE,SHINING,SHINING]),enemy:fill(WABOKU),turns:3,drive(e,m){
  if(m.player!==0)return null;
  if(m.type===M.SELECT_IDLECMD){
   if(e.turn===1&&!used){const s=idle(m,I.SELECT_SPECIAL_SUMMON,SHINING,'special_summons');if(s){used=true;return s}}
   if(e.turn===1&&used&&offered(m,SHINING))again=true;
   if(e.turn===1&&used)gyAfter??=count(e,0,L.GRAVE,BEWD);
   if(used&&count(e,0,L.MZONE,SHINING)&&(e.turn===1&&hole===0||e.turn===3&&hole===1)){const s=idle(m,I.SELECT_ACTIVATE,HOLE,'activates');if(s){hole++;return s}}
   return toEnd}
  if(m.type===M.SELECT_CARD&&m.selects.some(c=>c.code===BEWD)){const at=m.selects.map((c,i)=>[c,i]).filter(([c])=>c.code===BEWD&&c.location===L.HAND).map(([,i])=>i).slice(0,m.max);return {type:R.SELECT_CARD,indicies:at}}
  return steps([])(e,m)}});
 const out={shining:count(e,0,L.MZONE,SHINING),gy:gyAfter,again,hole,shiningGY:count(e,0,L.GRAVE,SHINING),turn:e.turn};e.destroy();return out;
}
const radiant=await radiance(['blue_eyes_radiance']);console.log('Blue-Eyes Radiance',radiant);
ok(radiant.gy===3,'3 Blue-Eyes White Dragon are sent to the GY');
same(radiant.again,false,'once per turn: no second Shining Dragon that turn');
same(radiant.hole,2,'Dark Hole was played on turns 1 and 3');
ok(radiant.shining===0&&radiant.shiningGY===1,'immune to the first Dark Hole, destroyed by the second after the opponent\'s turn ended');
{
 let survived=null;
 const e=await duel({script:runScript(['blue_eyes_radiance'])+'\n'+setup([...Array(3).fill([BEWD,'hand']),[HOLE,'hand']]),deck:deckOf([BEWD,BEWD,BEWD,HOLE,SHINING]),enemy:fill(WABOKU),drive(e,m){
  if(m.player===0&&m.type===M.SELECT_IDLECMD&&count(e,0,L.GRAVE,HOLE))survived??=count(e,0,L.MZONE,SHINING);
  return steps([[I.SELECT_SPECIAL_SUMMON,SHINING,'special_summons'],[I.SELECT_ACTIVATE,HOLE,'activates']])(e,m)}});
 e.destroy();same(survived,1,'Blue-Eyes Shining Dragon is unaffected by Dark Hole the turn it arrives');
}
{
 let shown=false;
 const e=await duel({script:runScript([])+'\n'+setup(Array(3).fill([BEWD,'hand'])),deck:deckOf([BEWD,BEWD,BEWD,SHINING]),enemy:fill(WABOKU),drive(e,m){if(offered(m,SHINING))shown=true;return steps([])(e,m)}});
 e.destroy();same(shown,false,'without the relic Shining Dragon cannot be Special Summoned');
}

// Master and Apprentice: Dark Hole destroys Dark Magician, then Dark Magician Knight comes from the hand ignoring its
// Summoning conditions.
async function apprentice(artifacts){
 const seen=new Set();const play=steps([[I.SELECT_ACTIVATE,HOLE,'activates'],[I.SELECT_ACTIVATE,HOLE,'activates']],{pick:[DMK]});
 const e=await duel({script:runScript(artifacts)+'\n'+setup([[DM,'field'],[DMK,'hand'],[DMG,'hand'],[HOLE,'hand'],[HOLE,'hand']]),deck:deckOf([DM,DMK,DMG,HOLE,HOLE]),enemy:fill(WABOKU),drive(e,m){
  for(const c of cards(e,0,L.MZONE))seen.add(c.code);
  return play(e,m)}});
 for(const c of cards(e,0,L.MZONE))seen.add(c.code);
 const out={knight:seen.has(DMK),girl:seen.has(DMG),holes:count(e,0,L.GRAVE,HOLE)};e.destroy();return out;
}
const taught=await apprentice(['master_and_apprentice']);console.log('Master and Apprentice',taught);
// Dark Magician Knight's own effect then destroys the only card on the field, itself: a second "Dark Magician" monster
// destroyed that turn, so (once per turn) Dark Magician Girl stays in the hand.
same(taught,{knight:true,girl:false,holes:1},'Dark Magician Knight is summoned ignoring its Summoning conditions; once per turn');
same(await apprentice([]),{knight:false,girl:false,holes:1},'without the relic nothing is summoned');

// Black Chaos Rite: Tribute Dark Magician; Dark Magician of Chaos comes from the Deck. Once per Duel (2 more tries, 3 turns).
async function rite(artifacts){
 const e=await duel({script:runScript(artifacts)+'\n'+setup([[DM,'field'],[DM,'field']]),deck:deckOf([DM,DM,DMOC,DMOC]),enemy:fill(WABOKU),turns:3,
  drive:steps([[I.SELECT_SPECIAL_SUMMON,DMOC,'special_summons'],[I.SELECT_SPECIAL_SUMMON,DMOC,'special_summons'],[I.SELECT_SPECIAL_SUMMON,DMOC,'special_summons']])});
 const out={chaos:count(e,0,L.MZONE,DMOC),dm:count(e,0,L.MZONE,DM),gy:count(e,0,L.GRAVE,DM)};e.destroy();return out;
}
const rited=await rite(['black_chaos_rite']);console.log('Black Chaos Rite',rited);
same(rited,{chaos:1,dm:1,gy:1},'one Dark Magician is Tributed for Dark Magician of Chaos, once per Duel');
same((await rite([])).chaos,0,'without the relic it stays in the Deck');

// Dragon Lord's Decree: discard 2 Koumori Dragon; Blue-Eyes White Dragon comes from the hand. Once per Duel. Blue-Eyes
// Shining Dragon keeps its Summoning conditions, so it is never offered.
async function decree(artifacts){
 let shining=false;
 const hand=[BEWD,BEWD,SHINING,KOUMORI,KOUMORI,KOUMORI,KOUMORI];
 const e=await duel({script:runScript(artifacts)+'\n'+setup(hand.map(c=>[c,'hand'])),deck:deckOf(hand),enemy:fill(WABOKU),turns:3,drive(e,m){
  if(offered(m,SHINING))shining=true;
  return steps([[I.SELECT_SPECIAL_SUMMON,BEWD,'special_summons'],[I.SELECT_SPECIAL_SUMMON,BEWD,'special_summons']],{pick:[KOUMORI]})(e,m)}});
 const out={bewd:count(e,0,L.MZONE,BEWD),discarded:count(e,0,L.GRAVE,KOUMORI),shining};e.destroy();return out;
}
const decreed=await decree(['dragon_lords_decree']);console.log("Dragon Lord's Decree",decreed);
ok(decreed.bewd===1&&decreed.discarded>=2,'2 Dragons discarded, 1 Blue-Eyes White Dragon Special Summoned');
same(decreed.shining,false,'Blue-Eyes Shining Dragon is not offered (its Summoning conditions apply)');
same((await decree([])).bewd,0,'without the relic nothing is summoned');

// Twin Eyes: at the first Standby Phase a Blue-Eyes or Red-Eyes monster comes from the Deck in Attack Position; not again.
async function twin(artifacts){
 let asked=0;
 const e=await duel({script:runScript(artifacts),deck:deckOf([BEWD,REBD,BEWD,REBD]),enemy:fill(WABOKU),turns:3,drive(e,m){
  if(m.player===0&&m.type===M.SELECT_CARD&&m.selects.some(c=>c.code===REBD))asked++;
  return steps([])(e,m)}});
 const field=cards(e,0,L.MZONE).filter(c=>[BEWD,REBD].includes(c.code));const out={eyes:field.length,attack:field.every(c=>c.position&1),asked};e.destroy();return out;
}
const twinned=await twin(['twin_eyes']);console.log('Twin Eyes',twinned);
same(twinned,{eyes:1,attack:true,asked:1},'one Blue-Eyes or Red-Eyes monster in Attack Position at the first Standby Phase only');
same((await twin([])).eyes,0,'without the relic nothing is summoned');

// Dragon Blood Fusion: banish Blue-Eyes White Dragon; Blue-Eyes Ultimate Dragon comes from the Extra Deck (it lists it as
// material). Once per turn: Red-Eyes Black Dragon cannot also bring Black Skull Dragon that turn.
async function blood(artifacts,turns=1){
 let skullOffered=false;
 const e=await duel({script:runScript(artifacts)+'\n'+setup([[BEWD,'field'],[REBD,'field']]),deck:[...deckOf([BEWD,REBD]),BEUD,SKULL],enemy:fill(WABOKU),turns,drive(e,m){
  if(e.turn===1&&count(e,0,L.MZONE,BEUD)&&offered(m,SKULL))skullOffered=true;
  return steps([[I.SELECT_SPECIAL_SUMMON,BEUD,'special_summons',1],[I.SELECT_SPECIAL_SUMMON,SKULL,'special_summons',3]])(e,m)}});
 const out={beud:count(e,0,L.MZONE,BEUD),skull:count(e,0,L.MZONE,SKULL),banished:count(e,0,L.REMOVED),skullOffered};e.destroy();return out;
}
const bled=await blood(['dragon_blood_fusion'],3);console.log('Dragon Blood Fusion',bled);
same(bled,{beud:1,skull:1,banished:2,skullOffered:false},'Blue-Eyes Ultimate Dragon on turn 1, Black Skull Dragon only on turn 3');
same((await blood([])).beud,0,'without the relic Blue-Eyes Ultimate Dragon cannot be summoned');

// Titan's Charge: Blue-Eyes White Dragon destroys a Battle Ox and attacks again; once per turn, so 2 of the 3 go.
async function charge(artifacts){
 let attacks=0;
 const e=await duel({script:runScript(artifacts)+'\n'+setup([[BEWD,'field'],[OX,'field',1],[OX,'field',1],[OX,'field',1]]),deck:deckOf([BEWD]),enemy:fill(OX),turns:3,drive(e,m){
  if(m.player!==0)return null;
  if(e.turn===3&&m.type===M.SELECT_IDLECMD&&m.to_bp)return {type:R.SELECT_IDLECMD,action:I.TO_BP,index:null};
  if(e.turn===3&&m.type===M.SELECT_BATTLECMD){const at=(m.attacks||[]).findIndex(c=>c.code===BEWD);if(at>=0){attacks++;return {type:R.SELECT_BATTLECMD,action:B.SELECT_BATTLE,index:at}}return noBattle}
  if(m.type===M.SELECT_CARD)return {type:R.SELECT_CARD,indicies:[0]};
  return steps([])(e,m)}});
 const out={destroyed:count(e,1,L.GRAVE,OX),attacks,bewd:count(e,0,L.MZONE,BEWD)};e.destroy();return out;
}
const charged=await charge(['titans_charge']);console.log("Titan's Charge",charged);
same([charged.destroyed,charged.attacks,charged.bewd],[2,2,1],'a second attack in a row, once per turn');
const plainCharge=await charge([]);same([plainCharge.destroyed,plainCharge.attacks],[1,1],'without the relic one attack');

// Poison of the Old Man: each of your End Phases a coin toss gains or loses 500 LP. Let's Go Gambling can redo the toss.
async function poison(artifacts,turns=1){
 let redo=0;
 const e=await duel({script:runScript(artifacts),deck:fill(WABOKU),enemy:fill(WABOKU),turns,drive(e,m){
  if(m.player===0&&m.type===M.SELECT_YESNO&&Number(m.description)===0x7f34a1)redo++;
  return steps([])(e,m)}});
 const out={lp:e.lp[0],redo};e.destroy();return out;
}
const poisoned=await poison(['cursed_poison_of_the_old_man']);console.log('Poison of the Old Man',poisoned);
ok([7500,8500].includes(poisoned.lp),'one End Phase: 500 LP gained or lost');
const twice=await poison(['cursed_poison_of_the_old_man'],3);ok([7000,8000,9000].includes(twice.lp),`two End Phases: once per turn each (${twice.lp})`);
same((await poison(['cursed_poison_of_the_old_man','lets_go_gambling'])).redo,1,"it is a real coin toss: Let's Go Gambling offers its redo");
same((await poison([])).lp,8000,'without the relic LP stay');

// The CPU with copies (Relic Mirror).
{
 const e=await duel({script:runScript(['twin_eyes'],1),deck:fill(WABOKU),enemy:deckOf([OX,BEWD,REBD]),turns:2,drive:steps([])});
 const field=cards(e,1,L.MZONE).map(c=>c.code);e.destroy();console.log('CPU Twin Eyes',field);
 ok(field.includes(BEWD)||field.includes(REBD),'the CPU summons a Blue-Eyes or Red-Eyes monster with Twin Eyes');
}
{
 const e=await duel({script:runScript(['black_chaos_rite'],1)+'\n'+setup([[DM,'field',1]]),deck:fill(WABOKU),enemy:deckOf([DM,DMOC]),turns:2,drive:steps([])});
 const field=cards(e,1,L.MZONE).map(c=>c.code);e.destroy();console.log('CPU Black Chaos Rite',field);
 ok(field.includes(DMOC),'the CPU Tributes Dark Magician for Dark Magician of Chaos');
}
{
 const e=await duel({script:runScript(['dragon_blood_fusion'],1)+'\n'+setup([[BEWD,'field',1]]),deck:fill(WABOKU),enemy:[...deckOf([BEWD]),BEUD],turns:2,drive:steps([])});
 const field=cards(e,1,L.MZONE).map(c=>c.code);e.destroy();console.log('CPU Dragon Blood Fusion',field);
 ok(field.includes(BEUD),'the CPU banishes Blue-Eyes White Dragon for Blue-Eyes Ultimate Dragon');
}
{
 const e=await duel({script:runScript(['blue_eyes_radiance'],1)+'\n'+setup(Array(3).fill([BEWD,'hand',1])),deck:fill(WABOKU),enemy:deckOf([BEWD,BEWD,BEWD,SHINING]),turns:2,drive:steps([])});
 const field=cards(e,1,L.MZONE).map(c=>c.code),gy=count(e,1,L.GRAVE,BEWD);e.destroy();console.log('CPU Blue-Eyes Radiance',field,gy);
 ok(field.includes(SHINING)&&gy===3,'the CPU sends 3 Blue-Eyes White Dragon for Blue-Eyes Shining Dragon');
}
{
 const e=await duel({script:runScript(['cursed_poison_of_the_old_man'],1),deck:fill(WABOKU),enemy:fill(WABOKU),turns:2,drive:steps([])});
 const lp=[...e.lp];e.destroy();console.log('CPU Poison of the Old Man',lp);
 ok(lp[0]===8000&&[7500,8500].includes(lp[1]),"the CPU's copy tosses in the CPU's End Phase and changes only its LP");
}
{
 // Destroyed by battle: Blue-Eyes White Dragon attacks the CPU's Dark Magician; its Master and Apprentice brings Dark Magician Girl.
 let attacked=false;const seen=new Set();
 const e=await duel({script:runScript(['master_and_apprentice'],1)+'\n'+setup([[BEWD,'field'],[DM,'field',1],[DMG,'hand',1]]),deck:deckOf([BEWD]),enemy:deckOf([DM,DMG],OX),turns:3,drive(e,m){
  for(const c of cards(e,1,L.MZONE))seen.add(c.code);
  if(m.player!==0)return null;
  if(e.turn===3&&m.type===M.SELECT_IDLECMD&&m.to_bp&&!attacked)return {type:R.SELECT_IDLECMD,action:I.TO_BP,index:null};
  if(e.turn===3&&m.type===M.SELECT_BATTLECMD&&!attacked){const at=(m.attacks||[]).findIndex(c=>c.code===BEWD);if(at>=0){attacked=true;return {type:R.SELECT_BATTLECMD,action:B.SELECT_BATTLE,index:at}}}
  if(m.type===M.SELECT_CARD){const at=m.selects.findIndex(c=>c.code===DM);return {type:R.SELECT_CARD,indicies:[Math.max(0,at)]}}
  return steps([])(e,m)}});
 for(const c of cards(e,1,L.MZONE))seen.add(c.code);
 const out={attacked,dmGY:count(e,1,L.GRAVE,DM),girl:seen.has(DMG)};e.destroy();console.log('CPU Master and Apprentice',out);
 same(out,{attacked:true,dmGY:1,girl:true},'after a battle the CPU Special Summons Dark Magician Girl from its hand');
}
console.log('PASS Nov 15 duels:',checks,'checks');
