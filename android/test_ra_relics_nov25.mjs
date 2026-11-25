// Ra support relics (user, 2026-11-25), standard and fused (Sun God's Ascension, Solar Covenant). Runs the relic Lua that passives.py writes:
// Sun's Judgment (each LP payment of yours, by any effect, inflicts half of it to the opponent, rounded down; also Ra's own
// 1000 LP destroy effect), Desert Sunlight (1,000 LP per face-up Divine-Beast at your Standby Phase, none without one) and
// Seal of the Sun (a Divine-Beast Summoned to your field cannot be destroyed by card effects until the end of your next
// Standby Phase: it survives the opponent's turn, then falls in your next Main Phase).
import fs from 'node:fs';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';import {MobileDuel,M,L} from './web/duel.js';import {DuelEngine} from './web/engine.js';
const read=name=>JSON.parse(fs.readFileSync(new URL('./web/'+name+'.json',import.meta.url),'utf8'));
const repo=name=>JSON.parse(fs.readFileSync(new URL('../'+name,import.meta.url),'utf8'));
const meta=read('content'),data=read('engine-data'),scripts=read('scripts'),tokens=repo('data/custom-tokens.json');
for(const t of tokens)data[t.id]=t.data;
const cards=[...meta.cards,...meta.tokenCards.filter(c=>!tokens.some(t=>t.id===c.id)),...tokens.map(t=>({...t,type:'Token',race:'Token'}))];
const id=n=>{const c=meta.cards.find(c=>c.name===n);assert.ok(c,n+' is in the card pool');return c.id};
const relics=artifacts=>{const r=spawnSync(fileURLToPath(new URL('../python/python.exe',import.meta.url)),['-B','-c',`import passives;print(passives.script({'character':9,'artifacts':${JSON.stringify(artifacts)},'curses':[]},telemetry=False))`],{cwd:fileURLToPath(new URL('../',import.meta.url)),encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout};
const RA=10000010,OBELISK=10000000,SLIFER=10000020,OX=id('Battle Ox'),FILLER=id('Blue-Eyes White Dragon');
const engine=await new MobileDuel(cards).init([data,scripts]);
let ascend_atk=null;
const field=(code,pos='POS_FACEUP_ATTACK')=>`Duel.MoveToField(Duel.CreateToken(0,${code}),0,0,LOCATION_MZONE,${pos},true)`;
// Monsters arrive at the start of turn 1's Draw Phase, before its Standby Phase. `main` runs at the start of every Main
// Phase 1 of either player (turn number in `t`), before the first idle command is recorded.
const setup=(parts,main='')=>`local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START|PHASE_DRAW) e:SetOperation(function(e) e:Reset() ${parts.join(' ')} end) Duel.RegisterEffect(e,0)
local m=Effect.GlobalEffect() m:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) m:SetCode(EVENT_PHASE_START|PHASE_MAIN1) m:SetOperation(function(e) local t=Duel.GetTurnCount() ${main} end) Duel.RegisterEffect(m,0)`;
function play(label,{artifacts=[],parts=[],main,turns,pick}){
 engine.start(Array(40).fill(FILLER),Array(40).fill(FILLER),8000,8000,2,777,[],[],setup(parts,main)+'\n'+relics(artifacts),2);
 const seen={};
 for(let n=0;n<800&&!engine.finished&&engine.pending&&engine.turn<=turns;n++){
  const m=engine.pending,choices=engine.choices(m);let response;
  if(m.type===M.SELECT_IDLECMD&&!(engine.turn in seen))seen[engine.turn]={lp:[...engine.lp],field:engine.query(0,L.MZONE).filter(Boolean).map(c=>c.code)};
  response=pick?.(m,choices);
  if(response!==undefined);
  else if(m.type===M.SELECT_IDLECMD)response=(choices.find(c=>/End turn/.test(c.label))||choices.find(c=>/battle phase/i.test(c.label))).response;
  else if(m.type===M.SELECT_BATTLECMD)response=choices.find(c=>/End turn/.test(c.label)).response;
  else if(m.type===M.SELECT_PLACE&&choices.length)response=choices[0].response;
  else response=DuelEngine.prototype.auto.call(engine,m);
  engine.respond(response);
 }
 assert.deepEqual(engine.errors.filter(x=>x.trim()),[],label);
 const out={seen,lp:[...engine.lp],grave:engine.query(0,L.GRAVE).filter(Boolean).map(c=>c.code),field:engine.query(0,L.MZONE).filter(Boolean).map(c=>c.code)};
 engine.destroy();return out;
}
try{
 // Sun's Judgment: a plain 1000 LP payment (any effect counts, not only Ra's) and an odd 1001 one (500, rounded down).
 const pay=`if t==1 then Duel.PayLPCost(0,1000) Duel.PayLPCost(0,1001) end`;
 const judged=play("Sun's Judgment",{artifacts:['sun_judgment'],main:pay,turns:2});
 assert.deepEqual(judged.seen[1].lp,[5999,7000],"half of each LP payment of yours is dealt to the opponent");
 const plain=play("No Sun's Judgment",{main:pay,turns:2});
 assert.deepEqual(plain.seen[1].lp,[5999,8000],'without the relic the opponent takes nothing');
 // Ra's own effect: pay 1000 LP, destroy 1 monster (the opponent's Battle Ox). The opponent takes 500.
 let used=false;
 const ra=play("Sun's Judgment with Ra",{artifacts:['sun_judgment'],parts:[field(RA),`Duel.MoveToField(Duel.CreateToken(1,${OX}),1,1,LOCATION_MZONE,POS_FACEUP_ATTACK,true)`],turns:2,
  pick:(m,choices)=>{
   if(m.type===M.SELECT_IDLECMD&&m.player===0&&!used){const c=choices.find(c=>c.code===RA&&/activate|effect/i.test(c.label))||choices.find(c=>c.code===RA&&!/summon|set|position|attack/i.test(c.label));if(c){used=true;return c.response}}
   if(m.type===M.SELECT_CARD&&m.player===0){const c=choices.find(c=>c.code===OX);if(c)return c.response}
  }});
 assert.ok(used,"Ra's destroy effect was offered: "+JSON.stringify(ra.seen[1]));
 assert.deepEqual(ra.lp,[7000,7500],"Ra pays 1000 LP and the opponent takes 500");
 // Desert Sunlight: two face-up Divine-Beasts at your Standby Phase are 2,000 LP; Battle Ox adds nothing; none, no LP.
 const sun=play('Desert Sunlight',{artifacts:['desert_sunlight'],parts:[field(OBELISK),field(SLIFER),field(OX)],turns:3}).seen;
 assert.equal(sun[1].lp[0],10000,'1,000 LP for each face-up Divine-Beast at your Standby Phase');
 assert.equal(sun[3].lp[0],12000,'again at your next Standby Phase, not at the opponent\'s');
 const dark=play('Desert Sunlight without a god',{artifacts:['desert_sunlight'],parts:[field(OX)],turns:3}).seen;
 assert.equal(dark[3].lp[0],8000,'no face-up Divine-Beast, no LP');
 // Seal of the Sun: Ra is Special Summoned in your turn 1 Main Phase, then each Main Phase destroys every monster you
 // control by card effect. Ra survives turn 1 and the opponent's turn 2, and falls in your turn 3; Battle Ox falls at once.
 const wreck=`if t==1 then local ra=Duel.CreateToken(0,${RA}) Duel.SpecialSummon(ra,0,0,0,true,false,POS_FACEUP_ATTACK) end
  Duel.Destroy(Duel.GetFieldGroup(0,LOCATION_MZONE,0),REASON_EFFECT)`;
 const sealed=play('Seal of the Sun',{artifacts:['seal_of_the_sun'],parts:[field(OX)],main:wreck,turns:3});
 assert.deepEqual(sealed.seen[1].field,[RA],'Ra survives the destruction right after its Summon; Battle Ox does not');
 assert.deepEqual(sealed.seen[2].field,[RA],"Ra survives the opponent's turn");
 assert.deepEqual(sealed.seen[3].field,[],'the seal ends with your next Standby Phase');
 const bare=play('No Seal of the Sun',{main:wreck,turns:1});
 assert.deepEqual(bare.seen[1].field,[],'without the relic Ra is destroyed');
 // A Divine-Beast already on the field when the Duel starts was never Summoned: no seal.
 const moved=play('Seal of the Sun without a Summon',{artifacts:['seal_of_the_sun'],parts:[field(OBELISK)],main:'Duel.Destroy(Duel.GetFieldGroup(0,LOCATION_MZONE,0),REASON_EFFECT)',turns:1});
 assert.deepEqual(moved.seen[1].field,[],'only Summoned Divine-Beasts are sealed');
 // Sun God's Ascension (Desert Sunlight + Seal of the Sun + Divine Might): +1,500 ATK, 1,000 LP per face-up god at your
 // Standby Phase, and no destruction by card effects at any time, Summoned or not. Battle Ox gets none of it.
 const atk=(code)=>meta.cards.find(c=>c.id===code).atk;
 const ascend=play("Sun God's Ascension",{artifacts:['sun_gods_ascension'],parts:[field(OBELISK),field(OX)],main:'Duel.Destroy(Duel.GetFieldGroup(0,LOCATION_MZONE,0),REASON_EFFECT)',turns:3,
  pick:(m)=>{if(m.type===M.SELECT_IDLECMD&&m.player===0&&engine.turn===1)ascend_atk=engine.query(0,L.MZONE).filter(Boolean).map(c=>[c.code,c.attack])}});
 assert.deepEqual(ascend.seen[1].lp[0],9000,'1,000 LP for the one face-up god');
 assert.deepEqual(ascend.seen[3].field,[OBELISK],'Obelisk is never destroyed by card effects; Battle Ox is');
 assert.deepEqual(ascend_atk,[[OBELISK,atk(OBELISK)+1500]],'Divine-Beasts gain 1,500 ATK');
 // Solar Covenant (Sun's Judgment + This Life Is Mine): half of each payment hurts the opponent. The first payment each Duel
 // comes back in full, later ones half (rounded down): 1000 (all back), 1001 (500 back), 1 (nothing back, no damage).
 const covenant=play('Solar Covenant',{artifacts:['solar_covenant'],main:'if t==1 then Duel.PayLPCost(0,1000) Duel.PayLPCost(0,1001) Duel.PayLPCost(0,1) end',turns:2});
 assert.deepEqual(covenant.seen[1].lp,[8000-2002+1000+500,7000],'first payment all back, then half; the opponent takes 500 + 500');
 // The recipes fuse (and Sun's Judgment is not part of Sun God's Ascension).
 const fused=spawnSync(fileURLToPath(new URL('../python/python.exe',import.meta.url)),['-B','-c',`import relic_fusions as f
a={'artifacts':['desert_sunlight','seal_of_the_sun','divine_might','sun_judgment']};f.fuse(a)
b={'artifacts':['sun_judgment','this_life_mine']};f.fuse(b)
print(sorted(a['artifacts']),b['artifacts'])`],{cwd:fileURLToPath(new URL('../',import.meta.url)),encoding:'utf8',env:{...process.env,PYTHONIOENCODING:'utf-8'}});
 assert.equal(fused.status,0,fused.stderr);
 assert.equal(fused.stdout.trim().replace(/\s+/g,' '),"['sun_gods_ascension', 'sun_judgment'] ['solar_covenant']",'both recipes fuse');
 console.log("PASS Ra relics: Sun's Judgment (any LP payment, Ra's included), Desert Sunlight, Seal of the Sun, Sun God's Ascension, Solar Covenant");
}finally{try{engine.destroy()}catch{}}
