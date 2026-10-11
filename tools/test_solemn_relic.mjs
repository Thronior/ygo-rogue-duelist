import fs from 'node:fs';import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {MobileDuel,M,R,I,L} from '../android/web/duel.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('../android/web/'+n+'.json',import.meta.url),'utf8'));
const meta=read('content'),id=n=>meta.cards.find(c=>c.name===n).id,normal=id('Giant Soldier of Stone');
const root=fileURLToPath(new URL('../',import.meta.url));
const generated=spawnSync(fileURLToPath(new URL('../python/python.exe',import.meta.url)),['-c',"import passives;print(passives.script({'character':0,'artifacts':['solemn_relic'],'round':0,'curses':[]}))"],{cwd:root,encoding:'utf8'});
assert.equal(generated.status,0,generated.stderr);const relic=generated.stdout;
const e=await new MobileDuel(meta.cards).init([read('engine-data'),read('scripts')]);
let messages=[];const base=e.onMessage.bind(e);e.onMessage=m=>{messages.push(m);base(m)};
function settle(side){for(let i=0;i<200;i++){if(e.pending?.type===M.SELECT_IDLECMD&&e.pending.player===side)return;const m=e.pending;let response=m.type===M.SELECT_CHAIN&&!m.forced?{type:R.SELECT_CHAIN,index:null}:e.auto();if(m.type===M.SELECT_CARD&&m.min===1&&m.selects.some(c=>c.code===normal))response={type:R.SELECT_CARD,indicies:[m.selects.findIndex(c=>c.code===normal)]};e.respond(response);}throw Error('No idle prompt')}
function activate(code){let i=e.pending.activates.findIndex(c=>c.code===code);assert.ok(i>=0,'Legal activation '+e.name(code));e.respond({type:R.SELECT_IDLECMD,action:I.SELECT_ACTIVATE,index:i});settle(e.player)}
const results=[];
try{for(const name of ['Pot of Greed','Jar of Greed','Cannon Soldier']){
 e.destroy();messages=[];const code=id(name),monster=name==='Cannon Soldier',trap=name==='Jar of Greed';
 const setup=`local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START+PHASE_DRAW) e:SetOperation(function(e) e:Reset()
 Duel.SendtoHand(Duel.CreateToken(0,190000050),0,REASON_RULE)
 ${monster?`for i=1,2 do Duel.MoveToField(Duel.CreateToken(1,${code}),1,1,LOCATION_MZONE,POS_FACEUP_ATTACK,true) end for i=1,2 do Duel.MoveToField(Duel.CreateToken(1,${normal}),1,1,LOCATION_MZONE,POS_FACEUP_DEFENSE,true) end`:trap?`for i=1,2 do Duel.MoveToField(Duel.CreateToken(1,${code}),1,1,LOCATION_SZONE,POS_FACEDOWN_DEFENSE,true) end`:`for i=1,2 do Duel.SendtoHand(Duel.CreateToken(1,${code}),1,REASON_RULE) end`}
 end) Duel.RegisterEffect(e,0)`;
 e.start(Array(40).fill(normal),Array(40).fill(normal),10000,10000,5,185,[],[],relic+'\n'+setup);settle(0);
 activate(190000050);assert.equal(e.summary().filter(x=>x.kind==='ancient_treasure').length,1,'Own effect does not consume relic');
 e.respond({type:R.SELECT_IDLECMD,action:I.TO_EP,index:null});settle(1);
 const before=e.lp[0];activate(code);assert.equal(messages.filter(m=>m.type===M.CHAIN_NEGATED).length,1,'First opponent activation negated');
 if(monster)assert.equal(e.lp[0],before,'First burn prevented');
 activate(code);assert.equal(messages.filter(m=>m.type===M.CHAIN_NEGATED).length,1,'No second negation');
 if(monster)assert.equal(e.lp[0],before-500,'Second monster effect resolves');
 assert.deepEqual(e.errors,[]);results.push(name+': own activation unaffected, first opposing activation negated, second resolves, new duel resets.');
}for(const r of results)console.log('PASS '+r);}finally{e.destroy()}
