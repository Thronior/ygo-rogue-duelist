// CPU fixes from Discord 2026-11-24 (user approved all three).
// 1. Mirror Force (and wipes) weigh total ATK, not only the monster count: it was held against a lone 6000 ATK attacker
//    although the wipe opened the CPU's lethal, then spent next turn on 2 monsters.
// 2. King Tiger Wanghu destroys summoned monsters with 1400 or less ATK: the CPU Normal Summoned Sinister Serpent into it.
// 3. Patrician of Darkness: its controller picks the target of every attack, and the CPU did not know how to fight it.
// Real core, staged with Debug.AddCard like test_human_lines_nov10.mjs; seat 1 is the CPU. Run from android/.
import fs from 'node:fs';import assert from 'node:assert/strict';
import {MobileDuel,M,R,I,L,B} from './web/duel.js';
import {smartContext} from './web/smart_policy.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('./web/'+n+'.json',import.meta.url),'utf8'));
const meta=read('content'),data=read('engine-data'),scripts=read('scripts'),all=[...meta.cards,...meta.tokenCards];
const id=n=>{const c=all.find(c=>c.name===n);assert(c,n);return c.id};
const e=await new MobileDuel(all).init([data,scripts]);let checks=0;
const POS={a:'POS_FACEUP_ATTACK',d:'POS_FACEUP_DEFENSE',s:'POS_FACEDOWN_DEFENSE',b:'POS_FACEDOWN',u:'POS_FACEUP'};
const add=(n,o,loc,pos,seq=0)=>`Debug.AddCard(${id(n)},${o},${o},${loc},${seq},${pos})\n`;
const item=x=>Array.isArray(x)?{n:x[0],pos:x[1]}:{n:x,pos:'a'};
const fill=Array(12).fill('Battle Ox');
// attack: seat 0 attacks once with its first monster in its turn (turn 1 has no Battle Phase, so seat 0 passes it, the
// CPU plays turn 2 and seat 0 attacks in turn 3). Without it, the CPU's turn 2 is played. Seat 0 passes everything else.
function play({cpu={},opp={},lp=[8000,8000],attack=false}){
 let t=`Debug.ReloadFieldBegin(DUEL_MODE_MR1,1)\nDebug.SetPlayerInfo(0,${lp[0]},0,0)\nDebug.SetPlayerInfo(1,${lp[1]},0,0)\n`;
 for(const [s,c] of [[0,opp],[1,cpu]]){
  (c.field||[]).forEach((x,i)=>{const {n,pos}=item(x);t+=add(n,s,'LOCATION_MZONE',POS[pos],i)});
  (c.back||[]).forEach((x,i)=>{const {n,pos}=item(x);t+=add(n,s,'LOCATION_SZONE',POS[pos==='a'?'b':pos],i)});
  (c.hand||[]).forEach(n=>t+=add(n,s,'LOCATION_HAND',POS.b));
  [...fill,...(c.deck||[])].forEach(n=>t+=add(n,s,'LOCATION_DECK',POS.b));
 }
 e.start([],[],lp[0],lp[1],0,271828,[],[],t+'Debug.ReloadFieldEnd()\n',0);e.core.startDuel(e.h);e.advance();
 const steps=[],last=attack?3:2;
 for(let i=0;i<600&&e.pending&&!e.finished&&e.turn<=last;i++){
  const m=e.pending;
  if(m.player===0){
   let r;
   if(m.type===M.SELECT_IDLECMD)r={type:R.SELECT_IDLECMD,action:m.to_bp&&attack?I.TO_BP:I.TO_EP,index:null};
   else if(m.type===M.SELECT_BATTLECMD)r=attack&&m.attacks.length&&!steps.some(x=>x.startsWith('they attack'))?{type:R.SELECT_BATTLECMD,action:B.SELECT_BATTLE,index:0}:{type:R.SELECT_BATTLECMD,action:m.to_ep?B.TO_EP:B.TO_M2,index:null};
   else if(m.type===M.SELECT_CHAIN)r={type:R.SELECT_CHAIN,index:m.forced?0:null};
   else r=e.choices(m).at(m.type===M.SELECT_EFFECTYN||m.type===M.SELECT_YESNO?-1:0)?.response??e.auto(m);
   if(m.type===M.SELECT_BATTLECMD&&r.action===B.SELECT_BATTLE)steps.push(`they attack ${e.name(m.attacks[r.index].code)}`);
   e.respond(r);continue;
  }
  const r=e.auto(m);
  if(m.type===M.SELECT_BATTLECMD&&r.action===B.SELECT_BATTLE)steps.push(`attack ${e.name(m.attacks[r.index].code)}`);
  if(m.type===M.SELECT_CHAIN&&r.index!=null&&m.selects?.[r.index])steps.push(`chain ${e.name(m.selects[r.index].code)}`);
  if(m.type===M.SELECT_IDLECMD){const l={[I.SELECT_SUMMON]:['summon',m.summons],[I.SELECT_SPECIAL_SUMMON]:['special',m.special_summons],[I.SELECT_MONSTER_SET]:['set',m.monster_sets],[I.SELECT_ACTIVATE]:['activate',m.activates],[I.SELECT_POS_CHANGE]:['flip',m.pos_changes]}[r.action];if(l)steps.push(`${l[0]} ${e.name(l[1][r.index].code)}`)}
  e.respond(r);
 }
 const names=(s,l)=>e.query(s,l).filter(Boolean).map(c=>e.name(c.code));
 assert.deepEqual(e.errors.filter(x=>x.trim()),[],'no script errors');
 return {steps,field:names(1,L.MZONE),back:names(1,L.SZONE),grave:names(1,L.GRAVE),theirs:names(0,L.MZONE),lp:[...e.lp]};
}
const ok=(v,why)=>{assert.ok(v,why);checks++};
const has=(r,w)=>{assert.ok(r.steps.includes(w),`${w} expected: ${r.steps.join(' > ')}`);checks++};
const never=(r,w)=>{assert.ok(!r.steps.includes(w),`${w} must not happen: ${r.steps.join(' > ')}`);checks++};
// A staged policy state (no core) like test_removal_resources.mjs: seat 1 is the CPU.
function staged(state){
 const m=new MobileDuel(meta.cards);Object.assign(m,{data,lp:[8000,8000],activeChain:[],battleProtected:[false,false],lastSummoned:[],attackCard:null,attackTarget:null},state);
 const zones={};m.query=(side,loc)=>zones[side+':'+loc]||[];
 const card=(n,side,loc,seq=0,extra={})=>({code:id(n),controller:side,location:loc,sequence:seq,position:loc===L.MZONE?1:8,attack:data[id(n)].attack,defense:data[id(n)].defense,...extra});
 const put=(side,loc,names)=>zones[side+':'+loc]=names.map((n,i)=>card(n,side,loc,i));
 return {m,put};
}

// 1. Mirror Force. A lone 4500 ATK attacker into a 5500 ATK board: the wipe is worth it, and at 2000 LP it opens our lethal.
let r=play({cpu:{back:['Mirror Force'],field:['Summoned Skull','Blue-Eyes White Dragon']},opp:{field:['Blue-Eyes Ultimate Dragon']},attack:true});
has(r,'chain Mirror Force');ok(r.field.includes('Blue-Eyes White Dragon')&&!r.theirs.length,'Mirror Force saves Blue-Eyes: '+r.field);
r=play({cpu:{back:['Mirror Force'],field:['Summoned Skull','Blue-Eyes White Dragon']},opp:{field:['Blue-Eyes Ultimate Dragon']},lp:[2000,8000],attack:true});
has(r,'chain Mirror Force');
// A 2500 ATK hit that would leave us at 500 LP.
r=play({cpu:{back:['Mirror Force']},opp:{field:['Summoned Skull']},lp:[8000,3000],attack:true});
has(r,'chain Mirror Force');ok(r.lp[1]===3000,'no damage taken: '+r.lp);
// Their lone Battle Ox would destroy our Celtic Guardian; without the Ox, Celtic Guardian's 1400 is lethal next turn.
r=play({cpu:{back:['Mirror Force'],field:['Celtic Guardian']},opp:{field:['Battle Ox']},lp:[1400,8000],attack:true});
has(r,'chain Mirror Force');
// A weak lone attacker at full LP still does not get the wipe.
r=play({cpu:{back:['Mirror Force']},opp:{field:['Battle Ox']},attack:true});
never(r,'chain Mirror Force');ok(r.back.includes('Mirror Force'),'Mirror Force kept: '+r.back);
// The same rule in numbers, from the policy (seat 0 attacks seat 1).
{
 const p=1,{m,put}=staged({player:0,phase:8});
 const mirror=({atks,own=[],target=null,lp=8000,olp=8000})=>{
  m.lp=[olp,lp];put(p,L.SZONE,['Mirror Force']);put(0,L.MZONE,atks);put(p,L.MZONE,own);
  const c=m.query(p,L.SZONE)[0];m.attackCard=m.query(0,L.MZONE)[0];m.attackTarget=target===null?null:m.query(p,L.MZONE)[target];
  return smartContext(m,p,L,{selects:[c]}).activation(c,true);
 };
 ok(mirror({atks:['Blue-Eyes White Dragon']})>=0,'a lone 3000 ATK attacker');
 ok(mirror({atks:['Summoned Skull'],lp:3000})>=0,'a 2500 hit at 3000 LP');
 ok(mirror({atks:['Blue-Eyes White Dragon'],own:['Summoned Skull','Gemini Elf'],target:0})>=0,'a 3000 attacker into our stronger board');
 ok(mirror({atks:['Battle Ox'],own:['Celtic Guardian'],target:0,olp:1400})>=0,'the wipe opens our lethal');
 ok(mirror({atks:['Battle Ox'],own:['Gemini Elf'],target:0,olp:1000})<0,'our Gemini Elf destroys the attacker anyway');
 ok(mirror({atks:['Battle Ox']})<0,'a weak lone attacker at full LP');
 ok(mirror({atks:['Battle Ox','Kuriboh']})<0,'two weak attackers at full LP');
 ok(mirror({atks:['Gemini Elf'],lp:4000})<0,'a 1900 hit at 4000 LP');
}

// 2. King Tiger Wanghu. Celtic Guardian (1400) would beat the Defense Position Wanghu, but it is destroyed when summoned.
r=play({cpu:{hand:['Celtic Guardian']},opp:{field:[['King Tiger Wanghu','d']]}});
never(r,'summon Celtic Guardian');has(r,'set Celtic Guardian');ok(r.field.includes('Celtic Guardian'),'it stays on the field: '+r.field);
r=play({cpu:{hand:['Sinister Serpent'],field:['Summoned Skull']},opp:{field:['King Tiger Wanghu']}});
never(r,'summon Sinister Serpent');has(r,'set Sinister Serpent');
// A 1700 ATK monster is out of its reach and is still summoned to attack.
r=play({cpu:{hand:['Celtic Guardian','Battle Ox']},opp:{field:[['King Tiger Wanghu','d']]}});
has(r,'summon Battle Ox');
// Special Summons too; Sangan's search still pays for its destruction.
r=play({cpu:{hand:['Sinister Serpent','Sangan','Celtic Guardian']},opp:{field:['King Tiger Wanghu']}});
{
 const smart=smartContext(e,1,L),hand=e.query(1,L.HAND).filter(Boolean),card=n=>hand.find(c=>e.name(c.code)===n);
 const left=['Sinister Serpent','Sangan','Celtic Guardian'].filter(card);assert.ok(left.length>=2,'two still in hand: '+left);
 for(const n of left)ok(smart.wanghuDestroys(card(n))===(n!=='Sangan'),n+(n==='Sangan'?' still pays':' is destroyed'));
 const doomed=left.find(n=>n!=='Sangan');ok(smart.specialOk(card(doomed))===false&&smart.preferSet(card(doomed))===true,doomed+' is not Special Summoned and is Set');
}
// Face-down, Wanghu destroys nothing.
{
 const {m,put}=staged({player:1,phase:4});put(0,L.MZONE,['King Tiger Wanghu']);put(1,L.HAND,['Celtic Guardian']);
 ok(smartContext(m,1,L).wanghuDestroys(m.query(1,L.HAND)[0])===true,'face-up Wanghu');
 m.query(0,L.MZONE)[0].position=8;ok(smartContext(m,1,L).wanghuDestroys(m.query(1,L.HAND)[0])===false,'Set Wanghu');
}

// 3. Patrician of Darkness: they would send Gemini Elf and Battle Ox into Patrician, so it is removed first, after
// which both attacks get through Kuriboh.
const PD='Patrician of Darkness';
r=play({cpu:{field:['Gemini Elf','Battle Ox'],back:['Raigeki Break'],hand:['Battle Ox']},opp:{field:[PD,'Kuriboh']}});
has(r,'activate Raigeki Break');ok(!r.theirs.includes(PD)&&r.lp[0]<8000,'Patrician destroyed, then the attacks: '+r.steps.join(' > '));
r=play({cpu:{field:['Gemini Elf','Battle Ox'],hand:['Exiled Force']},opp:{field:[PD,'Kuriboh']}});
has(r,'summon Exiled Force');ok(!r.theirs.includes(PD)&&r.lp[0]<8000,'Exiled Force takes Patrician: '+r.steps.join(' > '));
// Beside Blue-Eyes, removing Patrician opens nothing for Gemini Elf: the bigger threat goes.
r=play({cpu:{field:['Gemini Elf'],hand:['Exiled Force']},opp:{field:[PD,'Blue-Eyes White Dragon']}});
ok(r.theirs.includes(PD)&&!r.theirs.includes('Blue-Eyes White Dragon'),'Exiled Force takes Blue-Eyes: '+r.theirs);
// No attack that their pick turns into a loss.
r=play({cpu:{field:['Gemini Elf','Battle Ox']},opp:{field:[PD,'Kuriboh']}});
never(r,'attack Gemini Elf');never(r,'attack Battle Ox');
// The policy's battle plan: under Patrician they pick the targets, so Battle Ox is not counted on Kuriboh.
{
 const p=1,{m,put}=staged({player:p,phase:4,lp:[2500,8000]});
 put(p,L.MZONE,['Summoned Skull','Battle Ox']);
 put(0,L.MZONE,['Mystic Tomato','Kuriboh']);
 const plain=smartContext(m,p,L,{to_bp:true}).planDamage();
 put(0,L.MZONE,[PD,'Kuriboh']);
 const smart=smartContext(m,p,L,{to_bp:true}),walled=smart.planDamage();
 ok(plain>=2500,'without Patrician the attacks are lethal: '+plain);
 ok(walled<2500,'with Patrician they are not: '+walled);
 ok(smart.planDamage([],[m.query(0,L.MZONE)[0]])>=2500,'with it removed they are again');
}
e.destroy();
console.log(`PASS CPU flags Nov 24 (Mirror Force total ATK, King Tiger Wanghu, Patrician of Darkness): ${checks} checks`);
