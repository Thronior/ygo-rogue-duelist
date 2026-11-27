import fs from 'node:fs';import assert from 'node:assert/strict';import {MobileDuel,M,R,I,L} from './web/duel.js';import {smartContext} from './web/smart_policy.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('./web/'+n+'.json',import.meta.url))),meta=read('content'),data=read('engine-data'),id=n=>meta.cards.find(c=>c.name===n).id;let checks=0;
for(const p of [0,1]){
 const e=new MobileDuel(meta.cards);Object.assign(e,{data,lp:[8000,8000],player:p,phase:4,activeChain:[],battleProtected:[false,false]});let zones={};e.query=(s,l)=>zones[s+':'+l]||[];
 const c=(n,s=p,loc=L.SZONE,sequence=0,position=8)=>({code:id(n),controller:s,location:loc,sequence,position});const put=(s,l,...a)=>zones[s+':'+l]=a;
 const check=(v,t)=>{assert(v,t);checks++};
 const mst=c('Mystical Space Typhoon',p,L.HAND),set=c('Mirror Force',1-p);put(1-p,L.SZONE,set);
 for(const phase of [4,8,512])for(const side of [p,1-p]){e.player=side;e.phase=phase;check(smartContext(e,p,L).activation(mst,true)>=0,'MST should be usable against a set card on either turn');}
 const score=smartContext(e,p,L).activation(mst);put(1-p,L.SZONE,c('Pot of Greed',1-p));check(smartContext(e,p,L).activation(mst)===score,'Unknown set identities receive equal scores');
 put(1-p,L.SZONE,c('Pot of Greed',1-p,L.SZONE,0,1));check(smartContext(e,p,L).activation(mst,true)<0,'Do not pretend MST negates a resolving normal spell');
 put(1-p,L.SZONE,c('Gravity Bind',1-p,L.SZONE,0,1),{...set,sequence:1});let policy=smartContext(e,p,L);check(policy.targetScore('Mystical Space Typhoon',e.query(1-p,L.SZONE)[0],{})>policy.targetScore('Mystical Space Typhoon',e.query(1-p,L.SZONE)[1],{}),'Known disruptive continuous card preferred over unknown set');
 put(1-p,L.SZONE,set);e.activeChain=[{code:mst.code,player:p,targets:[set]}];check(smartContext(e,p,L).activation(mst,true)<0,'No double removal');e.activeChain=[];
 put(1-p,L.SZONE);check(smartContext(e,p,L).activation(mst)<0,'No waste without opponent back row');
 e.player=p;e.phase=4;
 const idle={type:M.SELECT_IDLECMD,player:p,activates:[],summons:[],special_summons:[],pos_changes:[],monster_sets:[],spell_sets:[c('Waboku',p,L.HAND)],to_bp:false,to_ep:true};
 // The fifth zone is kept for a Spell in hand; with only Traps in hand it can be used too (flag d94caeeb, 2026-11-26: a
 // returned Negate Attack was never Set again).
 for(const spellInHand of [true,false])for(let occupied=0;occupied<=5;occupied++)for(const field of [false,true]){
  const row=Array(6).fill(null);for(let i=0;i<occupied;i++)row[i]=c('Waboku',p,L.SZONE,i);if(field)row[5]=c('Umi',p,L.SZONE,5,1);zones[p+':'+L.SZONE]=row;
  zones[p+':'+L.HAND]=spellInHand?[c('Pot of Greed',p,L.HAND,0,1)]:[c('Waboku',p,L.HAND,0,1)];
  const response=e.auto(idle);check((response.action===I.SELECT_SPELL_SET)===(occupied<(spellInHand?4:5)),spellInHand?'Stop setting at four while a Spell waits in hand; field spells do not consume a main slot':'With only Traps in hand, the fifth zone is used');
 }
 zones[p+':'+L.HAND]=[];
 put(p,L.SZONE,...Array.from({length:4},(_,i)=>c('Waboku',p,L.SZONE,i)));put(1-p,L.SZONE,set);
 const response=e.auto({...idle,activates:[mst]});check(response.action===I.SELECT_ACTIVATE,'A spell can still be activated from hand with four occupied zones');
}
console.log('PASS '+checks+' MST and reserved-back-row checks across both seats');
// Real core: both CPUs receive only settable traps. With no Spell to keep a zone for, all five may be used.
const e=await new MobileDuel(meta.cards).init([data,read('scripts')]);try{let state=e.start(Array(30).fill(id('Waboku')),Array(30).fill(id('Waboku')),8000,8000,5,31);let max=[0,0];for(let i=0;i<1800&&!state.finished;i++){state=e.respond(e.auto());for(const p of [0,1]){const n=e.query(p,L.SZONE).slice(0,5).filter(Boolean).length;max[p]=Math.max(max[p],n);assert(n<=5,'never more than five back-row cards');}}assert.deepEqual(max,[5,5]);assert(state.finished,JSON.stringify({turn:e.turn,pending:e.pending,errors:e.errors}));assert.deepEqual(e.errors,[]);console.log('PASS complete real-core duel: with only Traps, both AIs fill all five back-row zones')}finally{e.destroy()}
