// The relics added on 2026-11-11 from Discord suggestions, in real-core duels: Illusionary Tribute, Parting Gift,
// Tactical Espionage, Stars Aligned and the cursed Anime Rule #2. Overkill Bounty and the 0-card opening hand are
// checked through the Python rules. Parting Gift and Tactical Espionage sit on the opponent's side here (the way
// Relic Mirror hands relics over), so the test player is the one whose cards they answer.
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const {MobileDuel,M,R,I,B,L}=await import('./web/duel.js');
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json'),scripts=json('android/web/scripts.json'),id=n=>meta.cards.find(c=>c.name===n).id;
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const py=(code,...args)=>execFileSync(python,['-B','-c',"import sys,json;sys.path.insert(0,'.');"+code,...args],{cwd:root,encoding:'utf8',env:{...process.env,PYTHONUTF8:'1'}}).trim();
const relicScript=(artifacts,side=0)=>py('import passives;print(passives.multiplayer_script(json.loads(sys.argv[1]),int(sys.argv[2])))',JSON.stringify({curses:[],artifacts,cursed_artifacts:artifacts.filter(a=>a.startsWith('cursed_')),challenge_level:0}),String(side));
const OX=id('Battle Ox'),SKULL=id('Summoned Skull'),WABOKU=id('Waboku'),RAIGEKI=id('Raigeki'),TRAP_HOLE=id('Trap Hole'),FISSURE=id('Fissure');
let checks=0;const ok=(value,why)=>{assert(value,why);checks++},same=(a,b,why)=>{assert.deepEqual(a,b,why);checks++};
for(const name of ['Illusionary Tribute','Overkill Bounty','Parting Gift','Tactical Espionage','Stars Aligned','Anime Rule #2'])ok(Object.values(meta.artifacts).some(a=>a[0]===name),name+' is in content.json');

// drive(e,m) answers a prompt or returns null to let the CPU policy answer. Stops after `turns` turns.
async function duel({artifacts=[],side=0,deck,enemy,turns=4,drive}){
 const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,scripts]);
 let s=e.start(deck,enemy,8000,8000,5,7,[],[],relicScript(artifacts,side));
 for(let i=0;i<6000&&!s.finished&&e.turn<=turns;i++){const m=e.pending;if(!m)break;const answer=drive(e,m);s=e.respond(answer||e.auto())}
 return e;
}
const idle=(m,action,code,list)=>{const at=(m[list]||[]).findIndex(c=>c.code===code);return at<0?null:{type:R.SELECT_IDLECMD,action,index:at}};
const fill=(...codes)=>Array.from({length:40},(_,n)=>codes[n%codes.length]);
const count=(e,p,loc,code)=>e.query(p,loc).filter(c=>c&&(!code||c.code===code)).length;

// Illusionary Tribute: Set a Trap, then Tribute Summon Summoned Skull by Tributing it. Once per Duel.
async function tribute(artifacts){
 const seen={offers:0,tributedSpell:false,skulls:0,laterOffer:false,secondTribute:false};let done=false,second=false;
 const e=await duel({artifacts,deck:fill(SKULL,WABOKU),enemy:fill(OX),turns:5,drive(e,m){
  if(m.player!==0)return null;
  if(m.type===M.SELECT_IDLECMD){
   const set=idle(m,I.SELECT_SPELL_SET,WABOKU,'spell_sets'),summon=idle(m,I.SELECT_SUMMON,SKULL,'summons'),field=count(e,0,L.MZONE);
   if(summon&&!done&&!field){seen.offers++;return summon}
   // Later: a second Summoned Skull may only Tribute the first one, never another Set Trap.
   if(summon&&done&&!second){second=true;return summon}
   if(set&&count(e,0,L.SZONE)<2)return set;
   return {type:R.SELECT_IDLECMD,action:I.TO_EP,index:null}}
  if(m.type===M.SELECT_TRIBUTE){const at=m.selects.findIndex(c=>c.location===L.SZONE);
   if(done){if(at>=0)seen.laterOffer=true;seen.secondTribute=true;return {type:R.SELECT_TRIBUTE,indicies:[m.selects.findIndex(c=>c.location===L.MZONE)]}}
   if(at>=0){seen.tributedSpell=true;done=true;return {type:R.SELECT_TRIBUTE,indicies:[at]}}}
  if(m.type===M.SELECT_BATTLECMD)return {type:R.SELECT_BATTLECMD,action:B.TO_EP,index:null};
  seen.skulls=Math.max(seen.skulls,count(e,0,L.MZONE,SKULL));return null}});
 seen.skulls=Math.max(seen.skulls,count(e,0,L.MZONE,SKULL)+count(e,0,L.GRAVE,SKULL));e.destroy();return seen;
}
const withTribute=await tribute(['illusionary_tribute']);console.log('Illusionary Tribute',withTribute);
ok(withTribute.offers>0&&withTribute.tributedSpell,'Summoned Skull is Tribute Summoned by Tributing a Set Trap');
ok(withTribute.skulls>=1,'the Tribute Summon succeeds');
ok(withTribute.secondTribute&&!withTribute.laterOffer,'it works once per Duel: the next Tribute Summon is offered monsters only, with Traps still Set');
const noTribute=await tribute([]);console.log('no relic',noTribute);
same(noTribute.offers,0,'without the relic a Set Trap is not a Tribute');

// Stars Aligned: only Level 4 monsters on your field and in your GY, so the End Phase summons another from the hand.
async function stars(artifacts){
 let asked=false;
 const e=await duel({artifacts,deck:fill(OX),enemy:fill(WABOKU),turns:1,drive(e,m){
  if(m.player!==0)return null;
  if(m.type===M.SELECT_IDLECMD)return (!count(e,0,L.MZONE)&&idle(m,I.SELECT_SUMMON,OX,'summons'))||{type:R.SELECT_IDLECMD,action:I.TO_EP,index:null};
  if(m.type===M.SELECT_BATTLECMD)return {type:R.SELECT_BATTLECMD,action:B.TO_EP,index:null};
  if(m.type===M.SELECT_CARD&&m.selects.every(c=>c.location===L.HAND)){asked=true;return {type:R.SELECT_CARD,indicies:[0]}}
  return null}});
 const out={asked,oxen:count(e,0,L.MZONE,OX)};e.destroy();return out;
}
const withStars=await stars(['stars_aligned']);console.log('Stars Aligned',withStars);
ok(withStars.asked,'the End Phase asks for a monster from the hand');
same(withStars.oxen,2,'a second Level 4 monster is Special Summoned');
same((await stars([])).oxen,1,'without the relic nothing is summoned');

// Anime Rule #2: Fissure destroys the opponent's Battle Ox (1700 ATK) for 850 damage; no direct attacks.
async function burn(artifacts){
 let direct=false,lp=8000;
 const e=await duel({artifacts,deck:fill(FISSURE,OX),enemy:fill(OX),turns:3,drive(e,m){
  if(m.player!==0)return null;
  if(m.type===M.SELECT_IDLECMD){
   const fissure=count(e,1,L.MZONE)?idle(m,I.SELECT_ACTIVATE,FISSURE,'activates'):null;if(fissure)return fissure;
   const summon=!count(e,0,L.MZONE)&&e.turn>1?idle(m,I.SELECT_SUMMON,OX,'summons'):null;if(summon)return summon;
   return m.to_bp&&e.turn>1?{type:R.SELECT_IDLECMD,action:I.TO_BP,index:null}:{type:R.SELECT_IDLECMD,action:I.TO_EP,index:null}}
  if(m.type===M.SELECT_BATTLECMD){if(!count(e,1,L.MZONE)&&(m.attacks||[]).length)direct=true;lp=Math.min(lp,e.lp[1]);return {type:R.SELECT_BATTLECMD,action:B.TO_EP,index:null}}
  return null}});
 const out={lp:Math.min(lp,e.lp[1]),direct,oxGone:count(e,1,L.GRAVE,OX)};e.destroy();return out;
}
const withBurn=await burn(['cursed_anime_rule_2']);console.log('Anime Rule #2',withBurn);
ok(withBurn.oxGone>=1,'Fissure destroys the opponent\'s Battle Ox');
same(withBurn.lp,8000-850,'the opponent takes half its ATK as damage');
ok(!withBurn.direct,'your monsters cannot attack directly');
const noBurn=await burn([]);console.log('no relic',noBurn);
ok(noBurn.direct&&noBurn.lp===8000,'without the relic there is no burn and a direct attack is offered');

// Parting Gift on the opponent's side: my Raigeki sends their monster to the GY, so they draw 1.
async function gift(artifacts){
 let before=-1,after=-1;
 const e=await duel({artifacts,side:1,deck:fill(RAIGEKI),enemy:fill(OX),turns:3,drive(e,m){
  if(m.player!==0)return null;
  if(m.type===M.SELECT_IDLECMD){
   if(before>=0&&after<0)after=count(e,1,L.HAND);
   const raigeki=count(e,1,L.MZONE)&&before<0?idle(m,I.SELECT_ACTIVATE,RAIGEKI,'activates'):null;
   if(raigeki){before=count(e,1,L.HAND);return raigeki}
   return {type:R.SELECT_IDLECMD,action:I.TO_EP,index:null}}
  return null}});
 e.destroy();return {before,after};
}
const withGift=await gift(['parting_gift']);console.log('Parting Gift',withGift);
ok(withGift.before>=0,'Raigeki was activated against a monster');
same(withGift.after,withGift.before+1,'the relic\'s owner draws 1 card');
const noGift=await gift([]);same(noGift.after,noGift.before,'without the relic nobody draws');

// Tactical Espionage on the opponent's side: my Set Trap Hole cannot answer their Normal Summon.
async function espionage(artifacts){
 let offered=false,summoned=false;
 const e=await duel({artifacts,side:1,deck:fill(TRAP_HOLE),enemy:fill(OX),turns:2,drive(e,m){
  if(m.player!==0)return null;
  if(m.type===M.SELECT_IDLECMD)return (!count(e,0,L.SZONE)&&idle(m,I.SELECT_SPELL_SET,TRAP_HOLE,'spell_sets'))||{type:R.SELECT_IDLECMD,action:I.TO_EP,index:null};
  if(m.type===M.SELECT_CHAIN&&(m.selects||[]).some(c=>c.code===TRAP_HOLE)){offered=true;return {type:R.SELECT_CHAIN,index:null}}
  return null}});
 summoned=count(e,1,L.MZONE,OX)>0;e.destroy();return {offered,summoned};
}
const withSpy=await espionage(['tactical_espionage']);console.log('Tactical Espionage',withSpy);
ok(withSpy.summoned,'the opponent Normal Summoned Battle Ox');
ok(!withSpy.offered,'Trap Hole cannot be activated in answer to that summon');
ok((await espionage([])).offered,'without the relic Trap Hole is offered');

// Overkill Bounty, the opening hand at 0 and Faulty Printer at 20%.
const rules=JSON.parse(py(`import approved_relics as ar,challenge_levels as cl,content
run=dict(artifacts=['overkill_bounty'],curses=[],challenge_level=0)
print(json.dumps(dict(big=ar.rewards(run,[dict(kind='overkill',amount=2500)],False),small=ar.rewards(run,[dict(kind='overkill',amount=999)],False),none=ar.rewards(dict(run,artifacts=[]),[dict(kind='overkill',amount=5000)],False),
 opening=ar.opening(dict(artifacts=['cursed_premature_triumph']*3,challenge_level=0),5),thin=cl.curse_opening_hand(dict(curses=['short_handed']*3,challenge_level=0),5),printer=content.ART_INFO['faulty_printer']['amount'])))`));
console.log('rules',rules);
same(rules.big['Overkill Bounty'],40,'2500 excess damage pays 40 coins');
ok(!('Overkill Bounty' in rules.small)&&!('Overkill Bounty' in rules.none),'under 1000 excess, or without the relic, it pays nothing');
same([rules.opening,rules.thin],[0,0],'opening hand reductions now stop at 0 cards');
same(rules.printer,20,'Faulty Printer misprints 20% of purchases');
console.log(`PASS relics of 2026-11-11 (${checks} checks)`);
process.exit(0);
