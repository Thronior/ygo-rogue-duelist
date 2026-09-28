import fs from 'node:fs';import assert from 'node:assert/strict';
import {MobileDuel,M,R,I,L} from './web/duel.js';import {TagDuel} from './web/tag-duel.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('./web/'+n+'.json',import.meta.url))),meta=read('content'),id=n=>meta.cards.find(c=>c.name===n).id;
for(const name of ['Exchange','Confiscation','The Forceful Sentry']){
 const e=await new MobileDuel(meta.cards).init([read('engine-data'),read('scripts')]);let activated=false,checked=false;
 try{let s=e.start(Array(25).fill(id(name)),Array(25).fill(id('Battle Ox')),8000,8000,5,13);
 for(let i=0;i<80&&!s.finished;i++){
  const m=e.pending;
  if(activated&&m.player===0&&m.type===M.SELECT_CARD&&m.selects.some(c=>c.controller===1&&c.location===L.HAND)){
   assert(m.selects.every(c=>e.handRevealed(0,c)),name+' hand choices must be visible');assert(!e.handRevealed(1,m.selects[0]),'Only authorized viewer receives reveal');checked=true;break;
  }
  const index=m.type===M.SELECT_IDLECMD&&m.player===0?m.activates.findIndex(c=>c.code===id(name)):-1;
  if(index>=0){activated=true;s=e.respond({type:R.SELECT_IDLECMD,action:I.SELECT_ACTIVATE,index})}else s=e.respond(e.auto());
 }
 assert(checked,name+' must reach revealed selection');assert(e.visuals.some(x=>x.kind==='reveal'));
 const revealed=e.pending.selects[0];e.onMessage({type:M.SHUFFLE_HAND,player:1,cards:[]});assert(!e.handRevealed(0,revealed));assert.equal(e.errors.length,0);
 console.log('PASS real core hand reveal and shuffle invalidation:',name);
 }finally{e.destroy()}
}
const e=await new TagDuel(meta.cards).init([read('engine-data'),read('scripts')]);
try{const deck={main:Array(30).fill(id('Battle Ox')),extra:[]};e.startTag({teams:[[deck,deck],[deck,deck]],lp:8000,enemyLP:8000,seed:7});
 assert(e.snapshotFor(1).players[1].hand.every(c=>c.code===0));
 const hand=e.query(1,L.HAND).map((c,sequence)=>({...c,controller:1,location:L.HAND,sequence}));
 e.onMessage({type:M.CONFIRM_CARDS,player:0,cards:hand});assert(e.snapshotFor(1).players[1].hand.every(c=>c.code===id('Battle Ox')));
 e.onMessage({type:M.CHAIN_END});assert(e.snapshotFor(1).players[1].hand.every(c=>c.code===0));
 e.onMessage({type:M.CONFIRM_CARDS,player:1,cards:hand});assert(e.snapshotFor(1).players[1].hand.every(c=>c.code===0));
 console.log('PASS tag snapshot reveal authorization and cleanup; hidden hand remains hidden');
}finally{e.destroy()}
