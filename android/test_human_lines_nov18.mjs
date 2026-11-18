// CPU lines from the human-vs-CPU replay review of 2026-11-18 (11,480 replays after v0.2.37's cutoff; each human turn
// was replayed with today's CPU in the human's seat and the lines compared). Staged in the real core with
// Debug.AddCard like test_human_lines_nov10.mjs; seat 1 is the CPU, seat 0 passes every prompt.
import fs from 'node:fs';import assert from 'node:assert/strict';
import {MobileDuel,M,R,I,L,B} from './web/duel.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('./web/'+n+'.json',import.meta.url),'utf8'));
const meta=read('content'),data=read('engine-data'),scripts=read('scripts'),all=[...meta.cards,...meta.tokenCards];
const id=n=>{const c=all.find(c=>c.name===n);assert(c,n);return c.id};
const e=await new MobileDuel(all).init([data,scripts]);let checks=0;
const POS={a:'POS_FACEUP_ATTACK',d:'POS_FACEUP_DEFENSE',s:'POS_FACEDOWN_DEFENSE',b:'POS_FACEDOWN',u:'POS_FACEUP'};
const add=(n,o,loc,pos,seq=0)=>`Debug.AddCard(${id(n)},${o},${o},${loc},${seq},${pos})\n`;
const item=x=>Array.isArray(x)?{n:x[0],pos:x[1]}:{n:x,pos:'a'};
const fill=Array(12).fill('Battle Ox');
function play({cpu={},opp={},lp=[8000,8000],turns=1}){
 let t=`Debug.ReloadFieldBegin(DUEL_MODE_MR1,1)\nDebug.SetPlayerInfo(0,${lp[0]},0,0)\nDebug.SetPlayerInfo(1,${lp[1]},0,0)\n`;
 for(const [s,c] of [[0,opp],[1,cpu]]){
  (c.field||[]).forEach((x,i)=>{const {n,pos}=item(x);t+=add(n,s,'LOCATION_MZONE',POS[pos],i)});
  (c.back||[]).forEach((x,i)=>{const {n,pos}=item(x);t+=add(n,s,'LOCATION_SZONE',POS[pos==='a'?'b':pos],i)});
  (c.hand||[]).forEach(n=>t+=add(n,s,'LOCATION_HAND',POS.b));
  (c.grave||[]).forEach(n=>t+=add(n,s,'LOCATION_GRAVE',POS.u));
  [...fill,...(c.deck||[])].forEach(n=>t+=add(n,s,'LOCATION_DECK',POS.b));
 }
 e.start([],[],lp[0],lp[1],0,271828,[],[],t+'Debug.ReloadFieldEnd()\n',0);e.core.startDuel(e.h);e.advance();
 const steps=[];let seen=0,last=-1;
 for(let i=0;i<600&&e.pending&&!e.finished;i++){
  const m=e.pending;
  if(e.player===1&&e.turn!==last){last=e.turn;if(++seen>turns)break}
  if(e.player===0&&seen>=turns&&e.turn>1)break;
  if(m.player===0){
   const r=m.type===M.SELECT_IDLECMD?{type:R.SELECT_IDLECMD,action:m.to_bp?I.TO_BP:I.TO_EP,index:null}:m.type===M.SELECT_BATTLECMD?{type:R.SELECT_BATTLECMD,action:m.to_ep?B.TO_EP:B.TO_M2,index:null}:m.type===M.SELECT_CHAIN?{type:R.SELECT_CHAIN,index:m.forced?0:null}:e.choices(m).at(m.type===M.SELECT_EFFECTYN||m.type===M.SELECT_YESNO?-1:0)?.response??e.auto(m);
   e.respond(r);continue;
  }
  const r=e.auto(m);
  if(m.type===M.SELECT_BATTLECMD&&r.action===B.SELECT_BATTLE)steps.push(`attack ${e.name(m.attacks[r.index].code)}`);
  if(m.type===M.SELECT_IDLECMD){const l={[I.SELECT_SUMMON]:['summon',m.summons],[I.SELECT_SPECIAL_SUMMON]:['special',m.special_summons],[I.SELECT_MONSTER_SET]:['set',m.monster_sets],[I.SELECT_ACTIVATE]:['activate',m.activates],[I.SELECT_POS_CHANGE]:['flip',m.pos_changes]}[r.action];if(l)steps.push(`${l[0]} ${e.name(l[1][r.index].code)}`)}
  e.respond(r);
 }
 const names=(s,l)=>e.query(s,l).filter(Boolean).map(c=>e.name(c.code));
 assert.deepEqual(e.errors.filter(x=>x.trim()),[],'no script errors');
 return {steps,field:names(1,L.MZONE),hand:names(1,L.HAND),grave:names(1,L.GRAVE),theirs:names(0,L.MZONE),lp:[...e.lp],won:e.finished&&e.lp[0]<=0};
}
const ok=(v,why)=>{assert.ok(v,why);checks++};
const never=(r,w)=>{assert.ok(!r.steps.includes(w),`${w} must not happen: ${r.steps.join(' > ')}`);checks++};
const has=(r,w)=>{assert.ok(r.steps.includes(w),`${w} expected: ${r.steps.join(' > ')}`);checks++};
let r;

// 1. Keep the Tribute when a plain summon beside it hits harder this turn (replays 085cf23e949c@5, 3d2fe67585c5@5:
// players kept Silent Magician LV4 / Beta and summoned a Level 4 monster, one cleared the lone Set monster and the
// other hit directly; the CPU Tributed for Dark Magician Girl and dealt nothing).
const DM='Summoned Skull';
r=play({cpu:{field:['Beta The Magnet Warrior'],hand:[DM,'Battle Ox']},opp:{field:[['Kuriboh','s']]}});
never(r,`summon ${DM}`);has(r,'summon Battle Ox');ok(r.lp[0]===8000-1700,'one attacker clears the Set Kuriboh, the other hits for 1700: '+r.lp+' '+r.steps.join(' > '));
// Control: two face-up blockers. Two 1700s deal 200, Summoned Skull clears one: the Tribute still happens.
r=play({cpu:{field:['Beta The Magnet Warrior'],hand:[DM,'Battle Ox']},opp:{field:['Mystic Clown','Mystic Clown']}});has(r,`summon ${DM}`);
// Control: no Level 4 or lower monster in hand, so the Tribute is the only upgrade.
r=play({cpu:{field:['Beta The Magnet Warrior'],hand:[DM,'Waboku']},opp:{field:[['Kuriboh','s']]}});has(r,`summon ${DM}`);

// 2. Raigeki on their only monster in our Main Phase 1 when that opens direct attacks (replay 83c83eaa240c@5: Raigeki
// on Summoned Skull, Master Kyonshee hit for 1750; the CPU Set a monster and kept Raigeki).
r=play({cpu:{hand:['Raigeki','Battle Ox']},opp:{field:['Summoned Skull']}});
has(r,'activate Raigeki');has(r,'summon Battle Ox');ok(r.lp[0]===8000-1700&&!r.theirs.length,'Skull gone, Battle Ox hits: '+r.lp+' '+r.steps.join(' > '));
// Dark Hole with nothing of ours on the field does the same job.
r=play({cpu:{hand:['Dark Hole','Battle Ox']},opp:{field:['Summoned Skull']}});has(r,'activate Dark Hole');ok(r.lp[0]===8000-1700,'Dark Hole then 1700: '+r.lp);
// Control: a weak lone monster is beaten in battle instead.
r=play({cpu:{hand:['Raigeki','Battle Ox']},opp:{field:['Mystic Clown']}});never(r,'activate Raigeki');
// Control: no attacker to follow up, so Raigeki is kept.
r=play({cpu:{hand:['Raigeki','Waboku']},opp:{field:['Vorse Raider']}});never(r,'activate Raigeki');
// Control: Dark Hole would also destroy our own monster.
r=play({cpu:{field:[['Mystical Elf','d']],hand:['Dark Hole','Battle Ox']},opp:{field:['Summoned Skull']}});never(r,'activate Dark Hole');

// 3. Snipe Hunter clears the lone Set wall so the rest attack directly (replay a0d7481415c5@3: players summoned it,
// discarded, sniped a Set Giant Soldier of Stone and hit for 3400; the CPU summoned Gemini Elf into the wall). The
// discard here is a dead Spirit Message (no Destiny Board); a live card such as Waboku (1600) still outweighs the snipe.
const SH='Snipe Hunter',WALL=['Giant Soldier of Stone','s'];
r=play({cpu:{field:['Skilled Dark Magician'],hand:[SH,'Gemini Elf','Spirit Message "I"']},opp:{field:[WALL]}});
has(r,`summon ${SH}`);has(r,`activate ${SH}`);
// With no Skilled Dark Magician beside it Snipe Hunter alone still opens 1500.
r=play({cpu:{hand:[SH,'Gemini Elf','Spirit Message "I"']},opp:{field:[WALL]}});has(r,`summon ${SH}`);has(r,`activate ${SH}`);
// Control: two blockers, so one snipe opens nothing.
r=play({cpu:{field:['Skilled Dark Magician'],hand:[SH,'Gemini Elf','Spirit Message "I"']},opp:{field:[WALL,WALL]}});never(r,`summon ${SH}`);
// Control: a Blue-Eyes that Snipe Hunter's body would make summonable is not a cheap discard.
r=play({cpu:{field:['Skilled Dark Magician'],hand:[SH,'Gemini Elf','Blue-Eyes White Dragon']},opp:{field:[WALL]}});never(r,`summon ${SH}`);
// Control: Waboku is the only discard and worth more than the snipe.
r=play({cpu:{field:['Skilled Dark Magician'],hand:[SH,'Gemini Elf','Waboku']},opp:{field:[WALL]}});never(r,`summon ${SH}`);
// Control: nothing to discard but Exodia, so no line.
r=play({cpu:{field:['Skilled Dark Magician'],hand:[SH,'Exodia the Forbidden One']},opp:{field:[WALL]}});never(r,`activate ${SH}`);

// 4. Lethal through an unknown Set monster: the biggest attacker goes into the Set card, the small one finishes
// (replays bdb29027094e@13, aad37bdfca99@5, 8240bd04afa6@33: the CPU sent Alpha into a 2000 DEF wall and Summoned
// Skull then had to attack the flipped wall).
const DWELL=['The Dragon Dwelling in the Cave','s'];
r=play({cpu:{field:['Summoned Skull','Alpha The Magnet Warrior']},opp:{field:[DWELL]},lp:[1400,8000]});
ok(r.won,'Skull clears the wall, Alpha hits for exactly 1400: '+r.steps.join(' > ')+' '+r.lp);
ok(r.steps[0]==='attack Summoned Skull','the big attacker goes first: '+r.steps.join(' > '));
// Control: a Set floater. Giant Rat brings another Giant Rat, so the big monster is kept for it (replay 53e2653434de@5).
r=play({cpu:{field:['Summoned Skull','Blue-Eyes White Dragon']},opp:{field:[['Giant Rat','s']],deck:['Giant Rat']},lp:[1500,8000]});
ok(r.won&&r.steps[0]==='attack Summoned Skull','Skull takes the Set Giant Rat, Blue-Eyes the one it brings: '+r.steps.join(' > ')+' '+r.lp);
// Control: a known face-up Defense blocker needs no margin; the plan still wins.
r=play({cpu:{field:['Summoned Skull','Alpha The Magnet Warrior']},opp:{field:[['Mystical Elf','d']]},lp:[1400,8000]});ok(r.won,'face-up wall: '+r.steps.join(' > '));

// 5. Hayabusa Knight attacks twice, so its summon can be the lethal one (replays d0a3dc3f7b74@11, 35b2a28ae2fb@5:
// players summoned Hayabusa Knight and swung twice; the CPU counted one attack and summoned a bigger monster).
r=play({cpu:{hand:['Hayabusa Knight','Vorse Raider']},opp:{},lp:[2000,8000]});
has(r,'summon Hayabusa Knight');ok(r.won,'two 1000 swings beat 2000 LP where Vorse Raider deals 1900: '+r.steps.join(' > ')+' '+r.lp);
// Through a Set blocker: Battle Ox clears it, Hayabusa Knight hits twice.
r=play({cpu:{field:['Battle Ox'],hand:['Hayabusa Knight','Vorse Raider']},opp:{field:[['Kuriboh','s']]},lp:[2000,8000]});
has(r,'summon Hayabusa Knight');ok(r.won,'Ox clears, Hayabusa hits twice: '+r.steps.join(' > ')+' '+r.lp);
// Control: Vorse Raider alone is lethal at 1900, so the bigger summon stays.
r=play({cpu:{hand:['Hayabusa Knight','Vorse Raider']},opp:{},lp:[1900,8000]});ok(r.won,'still lethal at 1900: '+r.steps.join(' > '));

e.destroy();
console.log(`PASS human lines Nov 18: ${checks} checks`);
