import fs from 'node:fs';import assert from 'node:assert/strict';import {TagDuel,flipPerspective} from './web/tag-duel.js';import {L} from './web/duel.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('./web/'+n+'.json',import.meta.url))),meta=read('content'),data=read('engine-data'),scripts=read('scripts'),config=JSON.parse(fs.readFileSync('temp/pvp-finale.json','utf8'));
const e=await new TagDuel(meta.cards).init([data,scripts]);const journal=[],seats=new Set(),boosted=new Set();let final;
try{
 e.startTag(config);assert(e.pvp);assert.deepEqual(e.lp,[config.lp,config.lp]);
 for(let i=0;i<2000&&!e.finished;i++){
  const seat=e.respondingSeat;assert([0,1].includes(seat));seats.add(seat);
  for(const local of [0,1]){const s=e.snapshotFor(local);assert.equal(s.tag.canRespond,local===seat);assert.equal(s.player,e.player^local);assert.equal(s.lp[0],e.lp[local]);assert(!s.native);assert.deepEqual(s.players[0].hand.map(c=>c.code),e.query(local,L.HAND).map(c=>c.code));assert.equal(s.tag.names[0][0],config.names[local][0]);if(s.pending){assert.equal(s.pending.player,0);assert(!s.pending.wire)}else assert.notEqual(local,seat);for(const c of s.players[1].hand)assert(!c.code||c.isPublic||c.is_public||e.handRevealed(local,{...c,controller:1-local}));}
  assert.throws(()=>e.respondFor(1-seat,e.responseNumber,{}),/teammate/);
  const original=e.auto(),response=seat===1?flipPerspective(original):original,number=e.responseNumber;
  journal.push({seat,number,response:structuredClone(response)});e.respondFor(seat,number,response);
  for(const p of [0,1])for(const c of e.query(p,L.MZONE))if(c&&(c.position&5)&&c.attack===data[c.code].attack+100)boosted.add(p);
 }
 assert(e.finished,'Human-v-human simulation completes');assert.deepEqual([...seats].sort(),[0,1]);assert.deepEqual([...boosted].sort(),[0,1],'Royal Sword applies to both humans');assert.deepEqual(e.errors,[]);
 final={lp:e.lp,finished:e.finished,turn:e.turn};const guest=e.snapshotFor(1);assert.equal(guest.finished.player,e.finished.player<2?1-e.finished.player:e.finished.player);
 e.destroy();e.startTag(config);for(const entry of journal)e.respondFor(entry.seat,entry.number,structuredClone(entry.response));assert.deepEqual({lp:e.lp,finished:e.finished,turn:e.turn},final);assert.deepEqual(e.errors,[]);
 const masked=e.cuesFor(1,[{kind:'move',code:123,from:{controller:0},to:{controller:0}},{kind:'lp',player:0,amount:200}]);assert.equal(masked[0].code,0);assert.equal(masked[0].to.controller,1);assert.equal(masked[1].player,1);
 console.log('PASS full human-v-human duel, both perspectives, private cards, turn authorization, shared ATK relic and exact checkpoint replay:',journal.length,'responses');
}finally{e.destroy()}
