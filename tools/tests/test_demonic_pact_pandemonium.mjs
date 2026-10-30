import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {MobileDuel,M,R,I} from '../../android/web/duel.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('../../android/web/'+n+'.json',import.meta.url),'utf8'));
const cards=read('content'), id=n=>cards.cards.find(c=>c.name===n).id;
const pandemoniumScript=read('scripts')['c94585852.lua'];
assert.match(pandemoniumScript,/e2:SetOperation\(s\.lrop\)/);
assert.match(pandemoniumScript,/EVENT_CUSTOM\+id\+1,re,r,rp,ep,ev/,'Pandemonium announces a waived cost on its own event, not its search trigger');
assert.match(pandemoniumScript,/c:IsReason\(REASON_DESTROY\) and not c:IsReason\(REASON_BATTLE\)/,'Pandemonium must only react to non-battle destruction');
assert.match(pandemoniumScript,/tc:IsPreviousControler\(0\)/,'Pandemonium must attribute destruction to the previous controller');
assert.doesNotMatch(pandemoniumScript,/tc:IsControler\(0\)/,'the Graveyard controller must not determine who gets the search');
const sourcePandemonium=fs.readFileSync(new URL('../../runtime/script/official/c94585852.lua',import.meta.url),'utf8');
assert.equal(pandemoniumScript.trimEnd(),sourcePandemonium.trimEnd(),'the runtime Pandemonium script must match its source');
const filler=id('Giant Soldier of Stone'), archfiend=id('Terrorking Archfiend'), pandemonium=id('Pandemonium');
const root=fileURLToPath(new URL('../../',import.meta.url));
const generated=spawnSync(fileURLToPath(new URL('../../python/python.exe',import.meta.url)),['-B','-c',"import passives;print(passives.script({'character':0,'artifacts':['demonic_pact'],'round':0,'curses':[]}))"],{cwd:root,encoding:'utf8'});
assert.equal(generated.status,0,generated.stderr);
const pact=generated.stdout;
// Accept Pandemonium's cost waiver (system string 218); any other Pandemonium prompt would be its search.
function settle(side){for(let i=0;i<300;i++){if(engine.pending?.type===M.SELECT_IDLECMD&&engine.pending.player===side)return;const m=engine.pending;if(m.type===M.SELECT_EFFECTYN&&m.code===pandemonium){assert.equal(Number(m.description),218,'Pandemonium only offers its cost waiver');engine.respond({type:R.SELECT_EFFECTYN,yes:true});continue}const response=m.type===M.SELECT_CHAIN&&!m.forced?{type:R.SELECT_CHAIN,index:null}:engine.auto();engine.respond(response);}throw Error('No idle prompt for player '+side)}
function setup(withPandemonium){
 const field=withPandemonium?` Duel.MoveToField(Duel.CreateToken(0,${pandemonium}),0,0,LOCATION_FZONE,POS_FACEUP,true)`:'';
 return `local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START+PHASE_DRAW) e:SetOperation(function(e) e:Reset()${field} Duel.MoveToField(Duel.CreateToken(0,${archfiend}),0,0,LOCATION_MZONE,POS_FACEUP_ATTACK,true) end) Duel.RegisterEffect(e,0)`;
}
let engine;
try{
 for(const withPandemonium of [false,true]){
  engine=await new MobileDuel(cards.cards).init([read('engine-data'),read('scripts')]);
  engine.start(Array(40).fill(filler),Array(40).fill(filler),10000,10000,5,185,[],[],pact+'\n'+setup(withPandemonium),5);
  settle(0);
  const expected=withPandemonium?10400:9600;
  assert.equal(engine.lp[0],expected,`Demonic Pact ${withPandemonium?'with':'without'} Pandemonium`);
  assert.deepEqual(engine.errors,[]);
  console.log(`PASS Demonic Pact ${withPandemonium?'with':'without'} Pandemonium: ${engine.lp[0]} LP`);
  engine.destroy();engine=null;
 }
}finally{engine?.destroy()}
