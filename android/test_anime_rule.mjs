// Anime Rule #1 (Muniqui's report, 2026-11-02): with Morphing Jar #2 it turned every face-down Special Summon face-up.
// The relic only adds the option to Normal Summon in face-up Defense Position. Real duels with the scripts the game generates.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {MobileDuel,M,R,I,L} from './web/duel.js';
import {TagDuel} from './web/tag-duel.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const read=name=>JSON.parse(fs.readFileSync(new URL('./web/'+name+'.json',import.meta.url)));
const meta=read('content'),files=[read('engine-data'),read('scripts')],id=name=>meta.cards.find(c=>c.name===name).id;
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const scripts=JSON.parse(execFileSync(python,['-B','-c',`
import sys,json;sys.path.insert(0,'.')
import passives
plain=dict(curses=[],artifacts=[]);anime=dict(curses=[],artifacts=['anime_rule'])
mirrored=dict(curses=['relic_mirror'],artifacts=[],mirrored_relics=['anime_rule'])
print(json.dumps(dict(plain=passives.script(plain),anime=passives.script(anime),cpu=passives.script(mirrored),pvp=passives.multiplayer_script(plain,0)+chr(10)+passives.multiplayer_script(anime,1))))`],{cwd:root}).toString());
const ATTACK=1,DEFENSE=4,SET=8,JAR='Morphing Jar #2',VORSE='Vorse Raider',POLY='Polymerization',KURIBOH='Kuriboh';
const deck=(...names)=>Array.from({length:40},(_,i)=>id(names[i%names.length]));
// Runs once before the first draw, so each case starts from a known board.
const board=(...cards)=>`\nlocal e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START|PHASE_DRAW) e:SetOperation(function(e) e:Reset() ${cards.join(' ')} end) Duel.RegisterEffect(e,0)`;
const field=(p,name,position='POS_FACEUP_ATTACK')=>`Duel.MoveToField(Duel.CreateToken(${p},${id(name)}),${p},${p},LOCATION_MZONE,${position},true)`;
const set=(p,name)=>field(p,name,'POS_FACEDOWN_DEFENSE');
const hand=(p,name)=>`Duel.SendtoHand(Duel.CreateToken(${p},${id(name)}),nil,REASON_RULE)`;
const grave=(p,name)=>`Duel.SendtoGrave(Duel.CreateToken(${p},${id(name)}),REASON_RULE)`;
const start=(duel,script,mine=deck(VORSE),theirs=deck(VORSE))=>duel.start(mine,theirs,8000,8000,5,7,[],[],script);
// Answers with hook(m), or the CPU policy when it returns nothing, until the hook returns 'stop'.
function play(duel,hook,limit=600){for(let n=0;n<limit&&duel.pending&&!duel.finished;n++){const m=duel.pending,r=hook(m);if(r==='stop')return true;duel.respond(r||duel.auto())}return false}
const idle=(m,p=0)=>m.type===M.SELECT_IDLECMD&&m.player===p;
const command=(action,index)=>({type:R.SELECT_IDLECMD,action,index}),pass=command(I.TO_EP,null);
const positions=(duel,p)=>duel.query(p,L.MZONE).filter(Boolean).map(c=>c.position).sort((a,b)=>a-b);
const count=(n,position)=>Array(n).fill(position);
function finish(duel){assert.deepEqual(duel.errors,[]);duel.destroy()}
// Flip Summons name on seat's first Main Phase and stops when the effect has resolved.
function flipSummon(duel,seat,name,answer=()=>null){
 let flipped=false;
 const done=play(duel,m=>{
  if(m.type===M.SELECT_IDLECMD){
   if(m.player!==seat)return pass;
   if(flipped)return 'stop';
   const index=m.pos_changes.findIndex(c=>c.code===id(name));
   assert.ok(index>=0,`${name} can be Flip Summoned`);
   flipped=true;return command(I.SELECT_POS_CHANGE,index);
  }
  return answer(m);
 });
 assert.ok(done,`${name} resolved`);
}
const activate=(duel,name)=>{
 let used=false;
 assert.ok(play(duel,m=>{if(!idle(m))return m.type===M.SELECT_IDLECMD?pass:null;if(used)return 'stop';const index=m.activates.findIndex(c=>c.code===id(name));assert.ok(index>=0,`${name} can be activated`);used=true;return command(I.SELECT_ACTIVATE,index)}),`${name} resolved`);
};
const accept=m=>m.type===M.SELECT_EFFECTYN&&m.player===0?{type:R.SELECT_EFFECTYN,yes:true}:m.type===M.SELECT_CHAIN&&m.player===0&&m.selects.length?{type:R.SELECT_CHAIN,index:0}:null;

const solo=await new MobileDuel(meta.cards).init(files);

// The report: Morphing Jar #2 Special Summons your five monsters face-down, whichever player flips it.
for(const owner of [0,1]){
 start(solo,scripts.anime+board(set(owner,JAR),...count(owner?5:4,field(0,KURIBOH)),field(1,KURIBOH)));
 flipSummon(solo,owner,JAR);
 assert.deepEqual(positions(solo,0),count(5,SET),`seat ${owner}'s Jar: your Special Summons stay face-down`);
 assert.deepEqual(positions(solo,1),count(owner?2:1,SET),`seat ${owner}'s Jar: the opponent's Special Summons stay face-down`);
 finish(solo);
}

// Morphing Jar itself summons nothing: it only discards and draws, and a Set monster beside it stays Set.
start(solo,scripts.anime+board(set(0,'Morphing Jar'),set(0,'Battle Ox')));
flipSummon(solo,0,'Morphing Jar');
assert.deepEqual(positions(solo,0),[ATTACK,SET],'Morphing Jar is Flip Summoned to Attack Position; the Set monster stays Set');
for(const p of [0,1])assert.equal(solo.query(p,L.HAND).filter(Boolean).length,5,'Morphing Jar still draws 5');
finish(solo);

// The Shallow Grave (Special Summon Steps) and Bubonic Vermin (a plain Special Summon).
start(solo,scripts.anime+board(hand(0,'The Shallow Grave'),grave(0,VORSE),grave(1,VORSE)));
activate(solo,'The Shallow Grave');
assert.deepEqual([positions(solo,0),positions(solo,1)],[[SET],[SET]],'The Shallow Grave Special Summons face-down');
finish(solo);
start(solo,scripts.anime+board(set(0,'Bubonic Vermin')),deck('Bubonic Vermin'));
flipSummon(solo,0,'Bubonic Vermin',accept);
assert.deepEqual(positions(solo,0),[ATTACK,SET],'Bubonic Vermin Special Summons a copy face-down');
finish(solo);

// Cyber Jar lets each player pick face-up Attack or face-down Defense; the relic used to swap the second for face-up Defense.
{
 const offered=[];
 start(solo,scripts.anime+board(set(0,'Cyber Jar')));
 flipSummon(solo,0,'Cyber Jar',m=>{if(m.type!==M.SELECT_POSITION||m.player!==0)return null;offered.push(m.positions);return {type:R.SELECT_POSITION,position:SET}});
 assert.deepEqual([...new Set(offered)],[ATTACK|SET],'Cyber Jar offers its printed positions');
 assert.deepEqual(positions(solo,0),count(5,SET),'Cyber Jar Special Summons face-down when chosen');
 finish(solo);
}

// An effect that turns a monster face-down was never part of the relic.
start(solo,scripts.anime+board(field(0,KURIBOH),hand(0,'Book of Moon')));
activate(solo,'Book of Moon');
assert.deepEqual(positions(solo,0),[SET],'Book of Moon turns a monster face-down');
finish(solo);

// The option: a Normal Summon, Tribute Summons included, asks for Attack or face-up Defense, alongside Set.
function normalSummon(script,position,name=VORSE,...cards){
 let labels=null,summoned=false,setOffered=false;
 start(solo,script+board(...cards),deck(name),deck(POLY));
 const done=play(solo,m=>{
  if(m.type===M.SELECT_POSITION&&m.player===0){labels=solo.choices(m).map(a=>a.label);return {type:R.SELECT_POSITION,position}}
  if(!idle(m))return null;
  if(summoned)return 'stop';
  setOffered=m.monster_sets.length>0;summoned=true;
  return command(I.SELECT_SUMMON,0);
 });
 assert.ok(done&&summoned,'the Normal Summon resolved');assert.ok(setOffered,'Set is offered beside the Normal Summon');
 const result={labels,positions:positions(solo,0)};finish(solo);return result;
}
const choice=['Face-up attack','Face-up defense'];
assert.deepEqual(normalSummon(scripts.plain,ATTACK),{labels:null,positions:[ATTACK]},'without the relic a Normal Summon is in Attack Position');
assert.deepEqual(normalSummon(scripts.anime,ATTACK),{labels:choice,positions:[ATTACK]},'Attack Position is still available');
assert.deepEqual(normalSummon(scripts.anime,DEFENSE),{labels:choice,positions:[DEFENSE]},'face-up Defense Position is the option the relic adds');
assert.deepEqual(normalSummon(scripts.anime,DEFENSE,'Blue-Eyes White Dragon',...count(2,field(0,KURIBOH))),{labels:choice,positions:[DEFENSE]},'a Tribute Summon is a Normal Summon');

// A Normal Set stays face-down and the Flip Summon goes to Attack Position, with no prompt for either.
{
 let isSet=false,flipped=false,asked=false;
 start(solo,scripts.anime,deck(VORSE),deck(POLY));
 assert.ok(play(solo,m=>{
  if(m.type===M.SELECT_POSITION)asked=true;
  if(!idle(m))return m.type===M.SELECT_IDLECMD?pass:null;
  if(!isSet){isSet=true;return command(I.SELECT_MONSTER_SET,0)}
  if(solo.turn===1){assert.deepEqual(positions(solo,0),[SET],'a Normal Set is face-down');return pass}
  if(flipped)return 'stop';
  flipped=true;return command(I.SELECT_POS_CHANGE,0);
 }),'the Set monster was Flip Summoned');
 assert.deepEqual(positions(solo,0),[ATTACK],'a Flip Summon goes to Attack Position');
 assert.equal(asked,false,'neither a Set nor a Flip Summon asks for a position');
 finish(solo);
}

// The CPU with the relic (Relic Mirror): it answers the prompt, keeps its own face-down Special Summons, and you gain nothing.
{
 const offered=[];
 start(solo,scripts.cpu,deck(POLY),deck(VORSE));
 assert.ok(play(solo,m=>{if(m.type===M.SELECT_POSITION)offered.push([m.player,m.positions]);return idle(m)?(solo.turn>1?'stop':pass):null}),'the CPU took its turn');
 assert.deepEqual(offered,[[1,ATTACK|DEFENSE]],'the CPU is asked once, for its Normal Summon');
 assert.deepEqual(positions(solo,1),[ATTACK],'the CPU answers with a legal position');
 finish(solo);
 start(solo,scripts.cpu+board(set(1,JAR),...count(4,field(1,KURIBOH))));
 flipSummon(solo,1,JAR);
 assert.deepEqual(positions(solo,1),count(5,SET),'the CPU\'s Special Summons stay face-down');
 finish(solo);
 assert.equal(normalSummon(scripts.cpu,ATTACK).labels,null,'the relic is the CPU\'s alone');
 // Both CPUs playing it out, from a deck full of these cases.
 const cases=deck(VORSE,JAR,VORSE,'Bubonic Vermin',VORSE,'Cyber Jar',VORSE,'The Shallow Grave','Book of Moon');
 start(solo,scripts.cpu,cases,cases);
 assert.ok(play(solo,()=>solo.turn>10?'stop':null,3000)||solo.finished,'the duel keeps moving');
 finish(solo);
}
solo.destroy();

// Tag: both partners get the option, and Morphing Jar #2 behaves for the team.
const tag=await new TagDuel(meta.cards).init(files);
const team=(...names)=>names.map(name=>({main:deck(name),extra:[]}));
const tagConfig={lp:8000,enemyLP:8000,seed:17};
{
 const asked=new Set();
 tag.startTag({...tagConfig,teams:[team(VORSE,VORSE),team(POLY,POLY)],passives:scripts.anime});
 assert.ok(play(tag,m=>{
  if(m.type===M.SELECT_POSITION&&m.player===0){assert.equal(m.positions,ATTACK|DEFENSE);asked.add(tag.activeSeats[0]);return {type:R.SELECT_POSITION,position:DEFENSE}}
  if(asked.size===2)return 'stop';
  if(m.type!==M.SELECT_IDLECMD)return null;
  return idle(m)&&m.summons.length?command(I.SELECT_SUMMON,0):pass;
 }),'both partners took a turn');
 finish(tag);
 tag.startTag({...tagConfig,teams:[team(VORSE,VORSE),team(POLY,POLY)],passives:scripts.anime+board(set(0,JAR),...count(4,field(0,KURIBOH)))});
 flipSummon(tag,0,JAR);
 assert.deepEqual(positions(tag,0),count(5,SET),'Tag: Morphing Jar #2 stays face-down');
 finish(tag);
}
// Versus finals keep each player's relics to their own seat. Seat 1 holds it here.
{
 const asked=[];let flipped=false;
 tag.startTag({...tagConfig,mode:'pvp',teams:[team(VORSE),team(VORSE)],passives:scripts.pvp+board(set(1,JAR),...count(3,field(1,KURIBOH)))});
 assert.ok(play(tag,m=>{
  if(m.type===M.SELECT_POSITION){asked.push(m.player);return {type:R.SELECT_POSITION,position:DEFENSE}}
  if(m.type!==M.SELECT_IDLECMD)return null;
  if(m.player===0)return m.summons.length?command(I.SELECT_SUMMON,0):pass;
  if(!flipped){flipped=true;return command(I.SELECT_POS_CHANGE,m.pos_changes.findIndex(c=>c.code===id(JAR)))}
  if(asked.length)return 'stop';
  assert.deepEqual(positions(tag,1),count(4,SET),'versus: the holder\'s Special Summons stay face-down');
  return command(I.SELECT_SUMMON,0);
 }),'the holder Normal Summoned');
 assert.deepEqual(asked,[1],'versus: only the holder gets the option');
 finish(tag);
}
tag.destroy();
console.log('PASS Anime Rule #1: Morphing Jar #2, The Shallow Grave, Bubonic Vermin and Cyber Jar stay face-down, Morphing Jar is unaffected, Normal Summon offers Attack and face-up Defense beside Set, Flip Summons are unchanged, for the player, the CPU and Tag');
