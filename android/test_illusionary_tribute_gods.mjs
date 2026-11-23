// Illusionary Tribute with the Egyptian Gods (bug report 2026-11-22: "does not allow Spells and Traps for the summon of
// a God"). Their 3-Tribute procedure (aux.AddNormalSummonProcedure) reads the same Tribute group, so Set or face-up
// Spells/Traps, a Field Spell, and a mix with monsters all count. Not reproduced in 86 uploaded duels either: every
// God left out had no Normal Summon left or fewer than 3 cards to Tribute.
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const {MobileDuel,M,R,I,L}=await import('./web/duel.js');
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json'),scripts=json('android/web/scripts.json'),id=n=>meta.cards.find(c=>c.name===n).id;
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const relic=a=>execFileSync(python,['-B','-c',"import sys,json;sys.path.insert(0,'.');import passives;print(passives.multiplayer_script(json.loads(sys.argv[1]),0))",JSON.stringify({curses:[],artifacts:a,challenge_level:0})],{cwd:root,encoding:'utf8',env:{...process.env,PYTHONUTF8:'1'}}).trim();
const W=id('Waboku');let checks=0;
async function tryGod(god,place,artifacts=['illusionary_tribute']){
 const G=id(god);
 const setup=`do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START|PHASE_DRAW) e:SetOperation(function(e) e:Reset() ${place} Duel.SendtoHand(Duel.CreateToken(0,${G}),0,REASON_RULE) end) Duel.RegisterEffect(e,0) end`;
 const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,scripts]);
 let s=e.start(Array(40).fill(W),Array(40).fill(W),8000,8000,5,7,[],[],relic(artifacts)+'\n'+setup),offered=null;
 for(let i=0;i<200&&!s.finished&&e.turn<=1;i++){const m=e.pending;if(!m)break;
  if(m.player===0&&m.type===M.SELECT_IDLECMD){if(offered!==null)break;const at=m.summons.findIndex(c=>c.code===G);offered=at>=0;if(!offered)break;s=e.respond({type:R.SELECT_IDLECMD,action:I.SELECT_SUMMON,index:at});continue}
  if(m.player===0&&m.type===M.SELECT_TRIBUTE){s=e.respond({type:R.SELECT_TRIBUTE,indicies:m.selects.map((_,k)=>k).slice(0,m.max)});continue}
  s=e.respond(e.auto())}
 const out={offered,summoned:e.query(0,L.MZONE).some(c=>c&&c.code===G)};e.destroy();return out;
}
const sset=(n,name)=>`for i=1,${n} do Duel.SSet(0,Duel.CreateToken(0,${id(name)})) end`;
const faceup=(n,name,zone='LOCATION_SZONE')=>`for i=1,${n} do Duel.MoveToField(Duel.CreateToken(0,${id(name)}),0,0,${zone},POS_FACEUP,true) end`;
const cases=[
 ['Obelisk the Tormentor','3 Set Traps',sset(3,'Waboku')],
 ['Slifer the Sky Dragon','3 Set Spells',sset(3,'Pot of Greed')],
 ['The Winged Dragon of Ra','3 face-up Continuous Spells',faceup(3,'Spellbinding Circle')],
 ['Obelisk the Tormentor','2 Continuous Traps and a Field Spell',faceup(2,'Call of the Haunted')+' '+faceup(1,'Yami','LOCATION_FZONE')],
 ['Obelisk the Tormentor','1 monster and 2 Set Traps',sset(2,'Waboku')+` Duel.MoveToField(Duel.CreateToken(0,${id('Battle Ox')}),0,0,LOCATION_MZONE,POS_FACEUP_ATTACK,true)`],
];
for(const [god,label,place] of cases){const r=await tryGod(god,place);assert(r.offered&&r.summoned,`${god} with ${label}: ${JSON.stringify(r)}`);checks++}
const none=await tryGod('Obelisk the Tormentor',sset(3,'Waboku'),[]);assert(!none.offered,'without the relic Set cards cannot be Tributed');checks++;
console.log(`PASS Illusionary Tribute summons the Egyptian Gods with Spells and Traps (${checks} checks)`);
