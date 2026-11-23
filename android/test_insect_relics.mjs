// Insect relics (user, 2026-11-23): Chitin Carapace gives Insects 800 DEF (was 400). Moth Brood, once per turn during your
// Standby Phase while you control a face-up Insect, Special Summons a Moth Token with the Level and Type of your face-up
// Insect with the highest ATK (picked automatically, user) and half its ATK/DEF. Runs the relic Lua that passives.py writes.
import fs from 'node:fs';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';import {MobileDuel,M,L} from './web/duel.js';import {DuelEngine} from './web/engine.js';
const read=name=>JSON.parse(fs.readFileSync(new URL('./web/'+name+'.json',import.meta.url),'utf8'));
const repo=name=>JSON.parse(fs.readFileSync(new URL('../'+name,import.meta.url),'utf8'));
const meta=read('content'),data=read('engine-data'),scripts=read('scripts'),tokens=repo('data/custom-tokens.json');
for(const t of tokens)data[t.id]=t.data;
const cards=[...meta.cards,...meta.tokenCards.filter(c=>!tokens.some(t=>t.id===c.id)),...tokens.map(t=>({...t,type:'Token',race:'Token'}))];
const id=n=>meta.cards.find(c=>c.name===n).id,TOKEN=tokens[0].id;
const relics=artifacts=>{const r=spawnSync(fileURLToPath(new URL('../python/python.exe',import.meta.url)),['-B','-c',`import passives;print(passives.script({'character':9,'artifacts':${JSON.stringify(artifacts)},'curses':[]},telemetry=False))`],{cwd:fileURLToPath(new URL('../',import.meta.url)),encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout};
const GREAT=id('Great Moth'),PETIT=id('Petit Moth'),OX=id('Battle Ox'),FILLER=id('Blue-Eyes White Dragon');
const engine=await new MobileDuel(cards).init([data,scripts]);
const field=(code,pos='POS_FACEUP_ATTACK')=>`Duel.MoveToField(Duel.CreateToken(0,${code}),0,0,LOCATION_MZONE,${pos},true)`;
// Monsters arrive at the start of turn 1's Draw Phase, before its Standby Phase.
const setup=parts=>`local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START|PHASE_DRAW) e:SetOperation(function(e) e:Reset() ${parts.join(' ')} end) Duel.RegisterEffect(e,0)`;
function play(label,{artifacts,parts,turns}){
 engine.start(Array(40).fill(FILLER),Array(40).fill(FILLER),8000,8000,2,777,[],[],setup(parts)+'\n'+relics(artifacts),2);
 const seen={};
 for(let n=0;n<600&&!engine.finished&&engine.pending&&engine.turn<=turns;n++){
  const m=engine.pending,choices=engine.choices(m);let response;
  if(m.type===M.SELECT_IDLECMD&&m.player===0)seen[engine.turn]??=engine.query(0,L.MZONE).filter(Boolean).map(({code,attack,defense,level,race,position})=>({code,attack,defense,level,race,position}));
  if(m.type===M.SELECT_IDLECMD)response=(choices.find(c=>/End turn/.test(c.label))||choices.find(c=>/battle phase/i.test(c.label))).response;
  else if(m.type===M.SELECT_BATTLECMD)response=choices.find(c=>/End turn/.test(c.label)).response;
  else if(m.type===M.SELECT_PLACE&&choices.length)response=choices[0].response;
  else response=DuelEngine.prototype.auto.call(engine,m);
  engine.respond(response);
 }
 assert.deepEqual(engine.errors.filter(x=>x.trim()),[],label);engine.destroy();return seen;
}
try{
 const chitin=play('Chitin Carapace',{artifacts:['chitin_carapace'],parts:[field(PETIT),field(OX)],turns:1});
 assert.deepEqual(chitin[1].map(c=>[c.code,c.defense]),[[PETIT,1000],[OX,1000]],'Petit Moth 200+800 DEF; Battle Ox (Beast) unchanged');
 // Great Moth 2600/2500 Level 8 beats Petit Moth 300/200: a Level 8 Insect token with 1300/1250.
 const brood=play('Moth Brood',{artifacts:['moth_brood'],parts:[field(PETIT),field(GREAT)],turns:3});
 const tokensOn=t=>brood[t].filter(c=>c.code===TOKEN);
 assert.equal(tokensOn(1).length,1,'one token at the first Standby Phase');
 assert.deepEqual([tokensOn(1)[0].attack,tokensOn(1)[0].defense,tokensOn(1)[0].level,Number(tokensOn(1)[0].race)],[1300,1250,8,0x800],'copies the highest-ATK Insect: Level 8, Insect, half of 2600/2500');
 assert.equal(tokensOn(3).length,2,'once per turn: one more at the next Standby Phase of yours, none at the opponent\'s');
 const none=play('Moth Brood without an Insect',{artifacts:['moth_brood'],parts:[field(OX)],turns:3});
 assert.deepEqual(none[3].map(c=>c.code),[OX],'no face-up Insect, no token');
 const facedown=play('Moth Brood with a face-down Insect',{artifacts:['moth_brood'],parts:[field(GREAT,'POS_FACEDOWN_DEFENSE')],turns:1});
 assert.deepEqual(facedown[1].map(c=>c.code),[GREAT],'a face-down Insect does not count');
 // Insect Swarm (fused): Great Moth 3400/3300 and Petit Moth 1100/1000 with the +800, so the token is 4500/4300 at the
 // Standby Phase and shows 5300/5100 with its own +800. Battle Ox (Beast) gets nothing and adds nothing.
 const swarm=play('Insect Swarm',{artifacts:['insect_swarm'],parts:[field(GREAT),field(PETIT),field(OX)],turns:1});
 const stats=code=>swarm[1].filter(c=>c.code===code).map(c=>[c.attack,c.defense]);
 assert.deepEqual([stats(GREAT),stats(PETIT),stats(OX)],[[[3400,3300]],[[1100,1000]],[[1700,1000]]],'+800 ATK/DEF on Insects only');
 assert.deepEqual(stats(TOKEN),[[5300,5100]],'the token has the combined ATK/DEF of the face-up Insects, then its own +800');
 console.log('PASS Insect relics: Chitin Carapace +800 DEF to Insects only; Moth Brood copies the highest-ATK face-up Insect (Level, Type, half ATK/DEF) once per Standby Phase of yours; Insect Swarm +800 ATK/DEF and a token with the combined ATK/DEF');
}finally{try{engine.destroy()}catch{}}
