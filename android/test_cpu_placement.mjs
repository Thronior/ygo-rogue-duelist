import assert from 'node:assert/strict';
import fs from 'node:fs';
import {MobileDuel,M,R,L} from './web/duel.js';
import {DuelEngine} from './web/engine.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('./web/'+n+'.json',import.meta.url)));
const meta=read('content'),data=read('engine-data');
const e=new MobileDuel(meta.cards);e.data=data;e.lp=[8000,8000];e.query=()=>[];
const order=[2,3,1,4,0];
let cases=0;
for(const player of [0,1])for(const side of [0,1])for(const location of [L.MZONE,L.SZONE])for(let available=1;available<32;available++){
 let field_mask=0xffffffff;
 for(let s=0;s<5;s++)if(available&(1<<s))field_mask&=~(1<<(side*16+(location===L.SZONE?8:0)+s));
 const prompt={type:M.SELECT_PLACE,player,field_mask:field_mask>>>0,count:1};
 const legal=order.filter(s=>available&(1<<s));
 assert.deepEqual(e.auto(prompt),{type:R.SELECT_PLACE,places:[{player:side?1-player:player,location,sequence:legal[0]}]});
 assert.deepEqual(e.auto({...prompt,count:legal.length}).places.map(p=>p.sequence),legal);
 const blocked={...prompt,type:M.SELECT_DISFIELD};
 assert.deepEqual(e.auto(blocked),DuelEngine.prototype.auto.call(e,blocked),'Zone disabling retains existing behavior');
 cases++;
}
for(const player of [0,1])for(const sequence of [5,6,7]){
 const prompt={type:M.SELECT_PLACE,player,count:1,field_mask:(~(1<<(8+sequence)))>>>0};
 assert.deepEqual(e.auto(prompt).places,[{player,location:L.SZONE,sequence}]);
}
console.log(`PASS ${cases} legal-mask cases across both rows and players, multi-place and special zones`);
const id=name=>meta.cards.find(c=>c.name===name).id;
const deck=Array.from({length:30},(_,i)=>id(['Battle Ox','Mystical Elf','Trap Hole'][i%3]));
let placements=0;const rows=new Set(),seats=new Set();
for(const seed of [17,31]){
 const duel=await new MobileDuel(meta.cards).init([data,read('scripts')]);
 try{
  let state=duel.start(deck,deck,8000,8000,5,seed);
  for(let step=0;step<3000&&!state.finished;step++){
   const prompt=duel.pending,response=duel.auto();
   if(prompt.type===M.SELECT_PLACE){
    const legal=duel.choices(prompt).map(c=>c.response.places[0]);
    for(const p of response.places){
     assert(legal.some(c=>JSON.stringify(c)===JSON.stringify(p)),'Core placement must be legal');
     if(p.sequence<5)assert.equal(p.sequence,order.find(s=>legal.some(c=>c.player===p.player&&c.location===p.location&&c.sequence===s)));
     rows.add(p.location);seats.add(p.player);placements++;
    }
   }
   state=duel.respond(response);
  }
  assert(state.finished,'Actual duel must complete');assert.deepEqual(duel.errors,[]);
 }finally{duel.destroy()}
}
assert(rows.has(L.MZONE)&&rows.has(L.SZONE));assert.equal(seats.size,2);
console.log(`PASS two complete core duels, ${placements} legal placements, both players and rows`);
