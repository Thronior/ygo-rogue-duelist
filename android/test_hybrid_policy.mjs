import fs from 'node:fs';
import assert from 'node:assert/strict';
import {MobileDuel,M,R,I,L} from './web/duel.js';
import {smartContext} from './web/smart_policy.js';
import {rankedDecision} from './web/cpu-ranking.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('./web/'+n+'.json',import.meta.url)));
const meta=read('content'),data=read('engine-data'),id=n=>{const c=meta.cards.find(c=>c.name===n);assert(c,n);return c.id};
for(const p of [0,1]){
 const e=new MobileDuel(meta.cards);Object.assign(e,{data,lp:[8000,8000],player:p,turn:3,phase:2,activeChain:[],battleProtected:[false,false],reasoningSeed:71});
 let zones={};e.query=(s,l)=>zones[s+':'+l]||[];
 const card=(n,s=p,l=L.SZONE,sequence=0,position=1)=>({code:id(n),controller:s,location:l,sequence,position});
 const put=(s,l,...a)=>zones[s+':'+l]=a;
 const mirage=card('Mirage of Nightmare'),mst=card('Mystical Space Typhoon',p,L.SZONE,1,8),enemy=card('Mirror Force',1-p,L.SZONE,0,8);
 put(p,L.SZONE,mirage,mst);put(p,L.HAND,card('Battle Ox',p,L.HAND));
 const trigger={code:mirage.code,player:p,controller:p,location:L.SZONE,sequence:0,targets:[]};
 e.activeChain=[trigger];e.effect={code:mirage.code,player:p};
 assert(smartContext(e,p,L).activation(mst,true)>0,'Escape the confirmed discard trigger');
 put(1-p,L.SZONE,enemy);
 let policy=smartContext(e,p,L);
 assert(policy.targetScore('Mystical Space Typhoon',mirage,{})>policy.targetScore('Mystical Space Typhoon',enemy,{}),'Activation and target agree');
 e.effect={code:mst.code,player:p};
 assert.deepEqual(e.auto({type:M.SELECT_CARD,player:p,min:1,max:1,selects:[enemy,mirage]}).indicies,[1]);
 put(1-p,L.SZONE);
 for(const change of [{player:1-p},{phase:4},{activeChain:[]},{activeChain:[{...trigger,inactive:true}]},{activeChain:[{...trigger,sequence:2}]}]){
  const old={player:e.player,phase:e.phase,activeChain:e.activeChain};Object.assign(e,change);
  assert(smartContext(e,p,L).activation(mst,true)<0,'Do not destroy Mirage without confirmed drawback');Object.assign(e,old);
 }
 put(p,L.HAND);assert(smartContext(e,p,L).activation(mst,true)<0,'No cards to save');put(p,L.HAND,card('Battle Ox',p,L.HAND));
 e.activeChain=[trigger,{code:mst.code,player:p,targets:[mirage]}];assert(smartContext(e,p,L).activation(mst,true)<0,'No duplicate removal');
 // A lethal burn response must beat an earlier, merely useful healing response.
 zones={};e.activeChain=[];e.player=1-p;e.phase=8;e.lp[1-p]=400;
 put(1-p,L.MZONE,card('Battle Ox',1-p,L.MZONE));
 const weak=card('Red Medicine',p,L.HAND),strong=card('Just Desserts',p,L.SZONE,1,8);e.lp[p]=7000;
 const prompt={type:M.SELECT_CHAIN,player:p,selects:[weak,strong],forced:false};
 assert.equal(e.auto(prompt).index,1,'Higher-scoring chain response wins');
 assert.equal(e.auto({...prompt,selects:[strong,weak]}).index,0,'Candidate order does not beat score');
 const choices=[0,1,2].map(sequence=>({c:{controller:1-p,location:L.SZONE,sequence,code:sequence+1},score:10}));
 const selected=new Set();
 for(let seed=0;seed<32;seed++){
  e.reasoningSeed=seed;const rank=rankedDecision(e,prompt),chosen=[...choices].sort(rank)[0].c.sequence;selected.add(chosen);
  assert.equal([...choices].reverse().sort(rank)[0].c.sequence,chosen);
  assert.equal(choices.map(x=>({...x,c:{...x.c,code:999}})).sort(rank)[0].c.sequence,chosen,'Hidden identities cannot affect ties');
  assert.equal([...choices,{c:{sequence:5},score:11}].sort(rank)[0].score,11);
 }
 assert(selected.size>1,'Different seeds vary equivalent choices');
}
console.log('PASS hybrid ranking and Mirage policy across both seats');
// Execute actual continuous-spell draw/discard timing in the bundled duel core.
for(const p of [0,1]){
 const e=await new MobileDuel(meta.cards).init([data,read('scripts')]);
 const setup=`local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_ADJUST) e:SetOperation(function(e) e:Reset() Duel.SendtoGrave(Duel.GetFieldGroup(${p},LOCATION_HAND,0),REASON_EFFECT) local c=Duel.CreateToken(${p},41482598) Duel.MoveToField(c,${p},${p},LOCATION_SZONE,POS_FACEUP,true) local t=Duel.CreateToken(${p},5318639) Duel.MoveToField(t,${p},${p},LOCATION_SZONE,POS_FACEDOWN,true) end) Duel.RegisterEffect(e,0)`;
 try{
  let state=e.start(Array(30).fill(id('Battle Ox')),Array(30).fill(id('Battle Ox')),8000,8000,5,71,[],[],setup),escaped=false,saved=0;
  for(let step=0;step<400&&!state.finished;step++){
   const m=e.pending;let response;
   if(m.type===M.SELECT_IDLECMD)response={type:R.SELECT_IDLECMD,action:I.TO_EP};
   else if(m.type===M.SELECT_CHAIN&&!m.forced){
    const discard=e.player===p&&e.phase===2&&e.activeChain.some(x=>x.code===41482598&&x.player===p);
    response=discard?e.auto():{type:R.SELECT_CHAIN,index:null};
    if(discard&&response.index!==null){assert.equal(m.selects[response.index].code,5318639);escaped=true;saved=e.query(p,L.HAND).length;}
   }else response=e.auto();
   state=e.respond(response);
   if(escaped&&!e.activeChain.length){assert.equal(e.query(p,L.HAND).length,saved,'Mirage discard actually avoided');assert(e.query(p,L.GRAVE).some(c=>c.code===41482598));break;}
  }
  assert(escaped,'Real core must exercise the escape plan');assert.deepEqual(e.errors,[]);
 }finally{e.destroy()}
}
console.log('PASS real-core Mirage escape preserves hand for both players');
