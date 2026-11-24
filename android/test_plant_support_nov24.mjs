// Plant support (user, 2026-11-24, Discord thread "Plant support"). Runs the relic Lua that passives.py writes:
// Photosynthesis (300 LP per face-up Plant at your Standby Phase), Spring Growth (+200 ATK to each face-up Plant at your
// Standby Phase, stacking), Pollinator (a Level 1 300/300 Moth Token in Defense Position at your End Phase while you
// control a face-up Plant) and the fused Eternal Garden (+800 ATK to Plants; each destroyed face-up Plant of yours, tokens
// too, gives LP equal to its ATK on the field and a 1000/1000 Dandelion Token). Also checks the new Gigaplant (the game's
// first Gemini monster) can be Normal Summoned again on the field and then use its effect.
import fs from 'node:fs';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';import {MobileDuel,M,L} from './web/duel.js';import {DuelEngine} from './web/engine.js';
const read=name=>JSON.parse(fs.readFileSync(new URL('./web/'+name+'.json',import.meta.url),'utf8'));
const repo=name=>JSON.parse(fs.readFileSync(new URL('../'+name,import.meta.url),'utf8'));
const meta=read('content'),data=read('engine-data'),scripts=read('scripts'),tokens=repo('data/custom-tokens.json');
for(const t of tokens)data[t.id]=t.data;
const cards=[...meta.cards,...meta.tokenCards.filter(c=>!tokens.some(t=>t.id===c.id)),...tokens.map(t=>({...t,type:'Token',race:'Token'}))];
const id=n=>{const c=meta.cards.find(c=>c.name===n);assert.ok(c,n+' is in the card pool');return c.id};
const MOTH=tokens.find(t=>t.name==='Moth Token').id,DANDELION=tokens.find(t=>t.name==='Dandelion Token').id;
const relics=artifacts=>{const r=spawnSync(fileURLToPath(new URL('../python/python.exe',import.meta.url)),['-B','-c',`import passives;print(passives.script({'character':9,'artifacts':${JSON.stringify(artifacts)},'curses':[]},telemetry=False))`],{cwd:fileURLToPath(new URL('../',import.meta.url)),encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout};
const LILY=id('Barrel Lily'),OX=id('Battle Ox'),FILLER=id('Blue-Eyes White Dragon'),GIGAPLANT=id('Gigaplant');
for(const n of ['Lonefire Blossom','Tytannial, Princess of Camellias','Botanical Lion','Gigantic Cephalotus','Dandylion','Rose Witch','Botanical Girl','The World Tree','Plant Food Chain'])id(n);
const engine=await new MobileDuel(cards).init([data,scripts]);
const field=(code,pos='POS_FACEUP_ATTACK')=>`Duel.MoveToField(Duel.CreateToken(0,${code}),0,0,LOCATION_MZONE,${pos},true)`;
// Monsters arrive at the start of turn 1's Draw Phase, before its Standby Phase. `main` runs at the start of each of
// your Main Phase 1s (turn number in `t`), before the first idle command is recorded.
const setup=(parts,main='')=>`local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START|PHASE_DRAW) e:SetOperation(function(e) e:Reset() ${parts.join(' ')} end) Duel.RegisterEffect(e,0)
local m=Effect.GlobalEffect() m:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) m:SetCode(EVENT_PHASE_START|PHASE_MAIN1) m:SetOperation(function(e) if Duel.GetTurnPlayer()~=0 then return end local t=Duel.GetTurnCount() ${main} end) Duel.RegisterEffect(m,0)`;
function play(label,{artifacts=[],parts,main,turns,pick}){
 engine.start(Array(40).fill(FILLER),Array(40).fill(FILLER),8000,8000,2,777,[],[],setup(parts,main)+'\n'+relics(artifacts),2);
 const seen={};
 for(let n=0;n<800&&!engine.finished&&engine.pending&&engine.turn<=turns;n++){
  const m=engine.pending,choices=engine.choices(m);let response;
  if(m.type===M.SELECT_IDLECMD&&m.player===0&&!(engine.turn in seen))seen[engine.turn]={lp:engine.lp[0],field:engine.query(0,L.MZONE).filter(Boolean).map(({code,attack,defense,level,race,position})=>({code,attack,defense,level,race,position}))};
  response=pick?.(m,choices);
  if(response);
  else if(m.type===M.SELECT_IDLECMD)response=(choices.find(c=>/End turn/.test(c.label))||choices.find(c=>/battle phase/i.test(c.label))).response;
  else if(m.type===M.SELECT_BATTLECMD)response=choices.find(c=>/End turn/.test(c.label)).response;
  else if(m.type===M.SELECT_PLACE&&choices.length)response=choices[0].response;
  else response=DuelEngine.prototype.auto.call(engine,m);
  engine.respond(response);
 }
 assert.deepEqual(engine.errors.filter(x=>x.trim()),[],label);
 const out={seen,grave:engine.query(0,L.GRAVE).filter(Boolean).map(c=>c.code),field:engine.query(0,L.MZONE).filter(Boolean).map(c=>c.code)};
 engine.destroy();return out;
}
try{
 // Two face-up Plants and a face-down one: 600 LP (the face-down Plant and Battle Ox don't count).
 const photo=play('Photosynthesis',{artifacts:['photosynthesis'],parts:[field(LILY),field(LILY),field(LILY,'POS_FACEDOWN_DEFENSE'),field(OX)],turns:3}).seen;
 assert.equal(photo[1].lp,8600,'300 LP for each face-up Plant at your Standby Phase');
 assert.equal(photo[3].lp,9200,'again at your next Standby Phase, not at the opponent\'s');
 const growth=play('Spring Growth',{artifacts:['spring_growth'],parts:[field(LILY),field(OX)],turns:5}).seen;
 const atk=(s,code)=>s.field.filter(c=>c.code===code).map(c=>c.attack);
 assert.deepEqual([atk(growth[1],LILY),atk(growth[3],LILY),atk(growth[5],LILY),atk(growth[5],OX)],[[1300],[1500],[1700],[1700]],'Barrel Lily 1100 grows by 200 each Standby Phase of yours; Battle Ox does not');
 const pollen=play('Pollinator',{artifacts:['pollinator'],parts:[field(LILY)],turns:5}).seen;
 const moths=s=>s.field.filter(c=>c.code===MOTH);
 assert.deepEqual([moths(pollen[1]).length,moths(pollen[3]).length,moths(pollen[5]).length],[0,1,2],'one Moth Token at each End Phase of yours');
 assert.deepEqual([moths(pollen[3])[0].attack,moths(pollen[3])[0].defense,moths(pollen[3])[0].level,Number(moths(pollen[3])[0].race),moths(pollen[3])[0].position],[300,300,1,0x800,4],'Level 1 300/300 Insect in face-up Defense Position');
 const bare=play('Pollinator without a Plant',{artifacts:['pollinator'],parts:[field(OX),field(LILY,'POS_FACEDOWN_DEFENSE')],turns:3}).seen;
 assert.equal(moths(bare[3]).length,0,'no face-up Plant, no token');
 // Eternal Garden: turn 1 destroys the face-up Barrel Lily (1100+800): 1900 LP and a Dandelion Token (1000+800).
 // Turn 3 destroys the token (1800 LP, a new token) and the face-down Barrel Lily (nothing).
 const garden=play('Eternal Garden',{artifacts:['eternal_garden'],parts:[field(LILY),field(LILY,'POS_FACEDOWN_DEFENSE'),field(OX)],turns:3,
  main:`if t==1 then Duel.Destroy(Duel.GetMatchingGroup(function(c) return c:IsFaceup() and c:IsCode(${LILY}) end,0,LOCATION_MZONE,0,nil),REASON_EFFECT)
   elseif t==3 then Duel.Destroy(Duel.GetMatchingGroup(function(c) return c:IsCode(${DANDELION},${LILY}) end,0,LOCATION_MZONE,0,nil),REASON_EFFECT) end`}).seen;
 const token=s=>s.field.filter(c=>c.code===DANDELION);
 assert.equal(garden[1].lp,9900,'LP equal to the destroyed Plant\'s ATK on the field, the +800 included');
 assert.deepEqual(token(garden[1]).map(c=>[c.attack,c.defense,c.level,Number(c.race)]),[[1800,1000,3,0x400]],'a Level 3 Plant Dandelion Token, 1000/1000 with the +800 ATK');
 assert.deepEqual(atk(garden[1],OX),[1700],'Battle Ox (Beast) gets nothing');
 assert.equal(garden[3].lp,11700,'the destroyed token heals 1800; the face-down Plant heals nothing');
 assert.equal(token(garden[3]).length,1,'the token replaces itself; the face-down Plant makes no token');
 // Gigaplant: Normal Summon it again on the field (Gemini), then Special Summon Barrel Lily from the GY with its effect.
 let summoned=false,used=false;
 const giga=play('Gigaplant',{parts:[field(GIGAPLANT),`Duel.SendtoGrave(Duel.CreateToken(0,${LILY}),REASON_RULE)`],turns:1,pick:(m,choices)=>{
  if(m.type!==M.SELECT_IDLECMD||m.player!==0)return;
  const summon=choices.find(c=>c.label==='Summon · Gigaplant'),act=choices.find(c=>c.label.startsWith('Activate · Gigaplant'));
  if(!summoned&&summon){summoned=true;return summon.response}
  if(summoned&&!used&&act){used=true;return act.response}
 }});
 assert.ok(summoned,'a face-up Gigaplant can be Normal Summoned again');
 assert.ok(used,'then its effect can be activated');
 assert.ok(giga.field.includes(LILY),'Barrel Lily came back from the GY');
 console.log('PASS Plant support: 10 new Plant cards in the pool; Photosynthesis, Spring Growth, Pollinator, Eternal Garden; Gigaplant Gemini summon and effect');
}finally{try{engine.destroy()}catch{}}
