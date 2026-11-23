// Tag prompts the waiting partner must never be able to answer (Discord, Tasfariel, 2026-11-22: with DNA Rewrite both
// partners were asked for a Type, one answered and the other was stuck on the window until a reload).
import assert from 'node:assert/strict';
import {typeChoicePending,closeStaleTypeChoice} from './web/type-choice.js';
import {TagDuel} from './web/tag-duel.js';
import {M} from './web/duel.js';

// DNA Rewrite: one Type for the team. The window closes by itself once the run has a Type (the teammate chose it).
const run={challenge_level:0,artifacts:['dna_rewrite']};
assert.equal(typeChoicePending(run),true);
assert.equal(typeChoicePending({...run,monster_type:'Dragon'}),false);
assert.equal(typeChoicePending({...run,challenge_level:-1}),false,'Ultimate Collector runs never ask');
assert.equal(typeChoicePending({challenge_level:0,artifacts:[]}),false);
const modal=(buttons=true)=>({open:true,closed:0,querySelector:s=>buttons&&s==='[data-do="choose-monster-type"]'?{}:null,close(){this.open=false;this.closed++}});
let m=modal();
assert.equal(closeStaleTypeChoice(m,run),false,'still choosing: the window stays');assert.equal(m.open,true);
assert.equal(closeStaleTypeChoice(m,{...run,monster_type:'Dragon'}),true,'the teammate chose: the window closes');assert.equal(m.closed,1);
assert.equal(closeStaleTypeChoice(m,{...run,monster_type:'Dragon'}),false,'a closed window is left alone');
m=modal(false);assert.equal(closeStaleTypeChoice(m,{...run,monster_type:'Dragon'}),false,'any other window stays open');assert.equal(m.open,true);

// Duel prompts: only the active partner answers a team prompt (a relic's Type or Attribute announce included). The
// waiting partner's snapshot carries no prompt, so nothing answerable is drawn, and a stale answer is refused.
const duel=Object.create(TagDuel.prototype);
const side=()=>({hand:[],monsters:[],spells:[],banished:[],grave:[]});
Object.assign(duel,{pvp:false,finished:null,activeSeats:[1,0],responseNumber:4,chainDepth:0,activeChain:[],logs:[],revealedHands:[{},{}],aiModifiers:{},
 snapshot(){return {players:[side(),side()],pending:this.pending,tag:{}}},summary:()=>[],query:()=>[],
 handRevealed:()=>false,knownFieldCard:()=>0});
for(const type of [M.ANNOUNCE_RACE,M.ANNOUNCE_ATTRIB,M.SELECT_CARD,M.SELECT_YESNO]){
 duel.pending={type,player:0,count:1,relic:'unstable_dna'};
 assert.equal(duel.respondingSeat,1,'the active partner answers');
 const waiting=duel.snapshotFor(0),active=duel.snapshotFor(1);
 assert.equal(waiting.pending,null,`type ${type}: the waiting partner gets no prompt`);
 assert.equal(waiting.tag.canRespond,false);assert.equal(waiting.tag.waitingForPartner,true,'it shows "Waiting for teammate"');
 assert.equal(active.pending?.type,type);assert.equal(active.tag.canRespond,true);
 assert.throws(()=>duel.respondFor(0,4,{}),/teammate/,'an answer from the waiting partner is refused');
}
// The prompt moves on (answered, or the opponent's turn): neither partner keeps a prompt or the waiting banner.
duel.pending={type:M.SELECT_IDLECMD,player:1};
for(const seat of [0,1]){const s=duel.snapshotFor(seat);assert.equal(s.pending,null);assert.equal(s.tag.waitingForPartner,false)}
// After a Tag swap the other partner answers.
duel.activeSeats=[0,0];duel.pending={type:M.ANNOUNCE_RACE,player:0,count:1};
assert.equal(duel.snapshotFor(1).pending,null);assert.equal(duel.snapshotFor(0).pending.type,M.ANNOUNCE_RACE);
console.log('Tag waiting-partner prompts OK');
