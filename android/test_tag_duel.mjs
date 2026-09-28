import fs from 'node:fs';import assert from 'node:assert/strict';import {TagDuel} from './web/tag-duel.js';import {M,R,I,L} from './web/duel.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('./web/'+n+'.json',import.meta.url))),meta=read('content'),id=n=>meta.cards.find(c=>c.name===n).id;
const codes=['Battle Ox','Mystical Elf','Petit Dragon','Giant Soldier of Stone'].map(id),teams=[[0,1],[2,3]].map(t=>t.map(i=>({main:Array(40).fill(codes[i]),extra:[]})));
const e=await new TagDuel(meta.cards).init([read('engine-data'),read('scripts')]);
const config={teams,lp:8000,enemyLP:8000,seed:17},journal=[];
try{let s=e.startTag(config);let turns=new Set(),checked=0;
 for(let i=0;i<150&&e.turn<9;i++){
  const m=e.pending;assert(m);const team=m.player,seat=e.activeSeats[team];
  assert(e.query(team,L.HAND).filter(Boolean).every(c=>c.code===codes[team*2+seat]),'each seat uses its own hand');
  turns.add(team+':'+seat);const response=m.type===M.SELECT_IDLECMD?{type:R.SELECT_IDLECMD,action:I.TO_EP,index:null}:e.auto(m);
  journal.push({seat:team===0?seat:null,number:e.responseNumber,response});
  if(team===0){assert.throws(()=>e.respondFor(1-seat,e.responseNumber,response),/teammate/);assert.throws(()=>e.respondFor(seat,e.responseNumber+1,response),/stale/);s=e.respondFor(seat,e.responseNumber,response);checked++}else s=e.respond(response);
  assert(e.snapshotFor(0).players[1].hand.every(c=>c.code===0));
 }
 assert.equal(turns.size,4,'all four seats take turns');assert(e.turn>=9);assert.deepEqual(e.errors,[]);assert(checked>3);
 const restored=await new TagDuel(meta.cards).init([read('engine-data'),read('scripts')]);
 try{
  restored.startTag(config);
  for(const entry of journal)if(entry.seat===null)restored.respond(entry.response);else restored.respondFor(entry.seat,entry.number,entry.response);
  assert.deepEqual(restored.snapshot(),e.snapshot(),'reloading the host restores exact hands, fields, LP, turn, active teammate and prompt');
 }finally{restored.destroy()}
 console.log('PASS native-core tag semantics: four separate hands/decks, alternating teammates, shared LP, hidden AI hands, response ownership, stale-response rejection and exact host-reload replay');
}finally{e.destroy()}
