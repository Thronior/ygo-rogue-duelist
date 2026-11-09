// Prunk44 (Discord 2026-11-09): Nutrient Z ignored relics and curses that raise the battle damage you take, because it
// checks the damage before they apply. It now scales its 2000 check by the run's battle damage changes.
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const {MobileDuel,M,R,I,L}=await import('./web/duel.js');
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json'),scripts=json('android/web/scripts.json'),id=n=>meta.cards.find(c=>c.name===n).id;
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const passives=run=>execFileSync(python,['-B','-c',"import sys,json;sys.path.insert(0,'.');import passives;print(passives.script(json.loads(sys.argv[1])))",JSON.stringify({artifacts:[],challenge_level:0,character:0,...run})],{cwd:root,encoding:'utf8'});
const NZ=id('Nutrient Z'),ATTACKER=id('Kojikocy'),FILLER=id('Pot of Greed');
assert.equal(data[ATTACKER].attack,1500);
let checks=0;

// Nutrient Z is Set and a 1500 ATK monster faces an empty field; the CPU attacks directly on turn 2.
async function offered(run){
 const setup=`do local done=false local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START+PHASE_MAIN1)
e:SetCondition(function() return not done end)
e:SetOperation(function() done=true local z=Duel.GetFirstMatchingCard(Card.IsCode,0,LOCATION_DECK+LOCATION_HAND,0,nil,${NZ}) Duel.MoveToField(z,0,0,LOCATION_SZONE,POS_FACEDOWN,true)
local m=Duel.GetFirstMatchingCard(Card.IsCode,1,LOCATION_DECK+LOCATION_HAND,0,nil,${ATTACKER}) Duel.MoveToField(m,1,1,LOCATION_MZONE,POS_FACEUP_ATTACK,true) end) Duel.RegisterEffect(e,0) end`;
 const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,scripts]);
 e.start([NZ,...Array(39).fill(FILLER)],[ATTACKER,...Array(39).fill(FILLER)],8000,8000,5,7,[],[],setup+'\n'+passives(run));
 let seen=false,taken=null;const lp=()=>e.lp[0];
 for(let i=0;i<400&&e.pending&&!e.finished&&e.turn<=2;i++){const m=e.pending;
  if(m.player===0&&m.type===M.SELECT_IDLECMD){e.respond({type:R.SELECT_IDLECMD,action:I.TO_EP,index:null});continue}
  if(m.player===0&&m.type===M.SELECT_CHAIN){const k=m.selects.findIndex(c=>c.code===NZ);if(k>=0)seen=true;e.respond({type:R.SELECT_CHAIN,index:null});continue}
  e.respond(e.auto(m));
 }
 taken=8000-lp();
 assert.deepEqual(e.errors.filter(x=>x.trim()),[]);checks++;e.destroy();
 return {seen,taken};
}
const plain=await offered({curses:[]});
console.log('no curse:',JSON.stringify(plain));
assert.equal(plain.taken,1500);assert.equal(plain.seen,false,'1500 damage does not offer Nutrient Z');checks+=2;
const exposed=await offered({curses:['exposed']});
console.log('Exposed:',JSON.stringify(exposed));
assert.equal(exposed.taken,2250);assert.equal(exposed.seen,true,'1500 x 1.5 = 2250 offers Nutrient Z');checks+=2;
const halved=await offered({curses:['exposed'],artifacts:['cursed_defense_proficiency']});
console.log('Exposed + Defense Proficiency:',JSON.stringify(halved));
assert.equal(halved.seen,false,'halved again (1125) does not offer it');checks++;
console.log(`PASS Nutrient Z counts battle damage changes from relics and curses (${checks} checks)`);
process.exit(0);
