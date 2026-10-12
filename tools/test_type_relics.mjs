import fs from 'node:fs';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {MobileDuel,M,L} from '../android/web/duel.js';
const root=fileURLToPath(new URL('../',import.meta.url)),read=n=>JSON.parse(fs.readFileSync(new URL('../android/web/'+n+'.json',import.meta.url),'utf8')),meta=read('content');
const groups={shell:['Aqua','Fish','Sea Serpent'],hive:['Insect','Plant'],fossil:['Dinosaur','Reptile'],storm_core:['Pyro','Thunder'],blade:['Warrior','Beast-Warrior'],fang:['Beast','Beast-Warrior']};
const generated=spawnSync(root+'python/python.exe',['-B','-c',"import json,content,passives;keys=['shell','hive','fossil','storm_core','blade','fang'];print(json.dumps({k:{'price':content.ARTIFACTS[k][1],'text':content.ARTIFACTS[k][2],'lua':passives.script({'character':0,'artifacts':[k],'round':0,'curses':[]})} for k in keys}))"],{cwd:root,encoding:'utf8'});assert.equal(generated.status,0,generated.stderr);const effects=JSON.parse(generated.stdout);
const normal=meta.cards.find(c=>c.name==='Giant Soldier of Stone'),samples=[...new Set(meta.cards.filter(c=>c.data.type&1).map(c=>c.race))].map(race=>meta.cards.find(c=>c.race===race&&(c.data.type&16)&&c.atk>=0)).filter(Boolean);
const e=await new MobileDuel(meta.cards).init([read('engine-data'),read('scripts')]);
try{for(const [key,types] of Object.entries(groups)){
 assert.equal(effects[key].price,70);assert.ok(types.every(t=>effects[key].text.includes(t)),key+' description lists every boosted Type');assert.ok(effects[key].text.includes('300 ATK'));
 for(let i=0;i<samples.length;i+=5){e.destroy();const batch=samples.slice(i,i+5),setup=`local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START|PHASE_DRAW) e:SetOperation(function(e) e:Reset() ${[0,1].map(p=>batch.map(c=>`Duel.MoveToField(Duel.CreateToken(${p},${c.id}),${p},${p},LOCATION_MZONE,POS_FACEUP_ATTACK,true)`).join('\n')).join('\n')} end) Duel.RegisterEffect(e,0)`;
 e.start(Array(40).fill(normal.id),Array(40).fill(normal.id),8000,8000,5,123,[],[],effects[key].lua+'\n'+setup);for(let n=0;n<100&&e.pending?.type!==M.SELECT_IDLECMD;n++)e.respond(e.auto());
 for(const p of [0,1])for(const c of batch){const live=e.query(p,L.MZONE).find(x=>x.code===c.id);assert.ok(live,c.name);assert.equal(live.attack,c.atk+(p===0&&types.includes(c.race)?300:0),key+' player '+p+' '+c.name)}assert.deepEqual(e.errors,[]);
 }console.log('PASS '+key+': correct +300 for allied Types, all other Types/opponent unaffected, description matches');
}}finally{e.destroy()}
