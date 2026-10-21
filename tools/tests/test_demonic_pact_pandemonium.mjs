import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {MobileDuel,M,R,I} from '../../android/web/duel.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('../../android/web/'+n+'.json',import.meta.url),'utf8'));
const cards=read('content'), id=n=>cards.cards.find(c=>c.name===n).id;
const pandemoniumScript=read('scripts')['c94585852.lua'];
assert.match(pandemoniumScript,/e2:SetOperation\(s\.lrop\)/);
assert.match(pandemoniumScript,/EVENT_CUSTOM\+id,re,r,rp,ep,ev/);
const filler=id('Giant Soldier of Stone'), archfiend=id('Terrorking Archfiend'), pandemonium=id('Pandemonium');
const root=fileURLToPath(new URL('../../',import.meta.url));
const generated=spawnSync(fileURLToPath(new URL('../../python/python.exe',import.meta.url)),['-B','-c',"import passives;print(passives.script({'character':0,'artifacts':['demonic_pact'],'round':0,'curses':[]}))"],{cwd:root,encoding:'utf8'});
assert.equal(generated.status,0,generated.stderr);
const pact=generated.stdout;
function settle(side){for(let i=0;i<300;i++){if(engine.pending?.type===M.SELECT_IDLECMD&&engine.pending.player===side)return;const m=engine.pending;const response=m.type===M.SELECT_CHAIN&&!m.forced?{type:R.SELECT_CHAIN,index:null}:engine.auto();engine.respond(response);}throw Error('No idle prompt for player '+side)}
function setup(withPandemonium){
 let script=`local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START+PHASE_DRAW) e:SetOperation(function(e) e:Reset() Duel.MoveToField(Duel.CreateToken(0,${archfiend}),0,0,LOCATION_MZONE,POS_FACEUP_ATTACK,true) end) Duel.RegisterEffect(e,0)`;
 if(withPandemonium)script+=` local p=Effect.GlobalEffect() p:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS) p:SetCode(EFFECT_LPCOST_REPLACE) p:SetCondition(function(e,tp,eg,ep,ev,re) local c=re and re:GetHandler() return Duel.IsPhase(PHASE_STANDBY) and c and c:IsSetCard(SET_ARCHFIEND) and c:IsMonster() end) p:SetOperation(function(e,tp,eg,ep,ev,re,r,rp) Duel.RaiseEvent(Group.CreateGroup(),EVENT_CUSTOM+${pandemonium},re,r,rp,ep,ev) end) Duel.RegisterEffect(p,0)`;
 return script;
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
