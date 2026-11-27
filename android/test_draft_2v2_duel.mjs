// 2v2 Draft duels (2026-11-26): four TagDuel engines in team mode replay one shared answer log, as the four devices of a
// 2v2 room do. Checks that every duelist answers only their own prompts, partners take turns, the engines never split,
// and no view shows the other team's hand.  node android/test_draft_2v2_duel.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
globalThis.document??={hidden:false,addEventListener(){},removeEventListener(){}};globalThis.location??={href:'http://localhost/'};globalThis.window??={addEventListener(){}};
const {TagDuel,flipPerspective}=await import('./web/tag-duel.js');const {M,R}=await import('./web/duel.js');
const read=n=>JSON.parse(fs.readFileSync(new URL('./web/'+n+'.json',import.meta.url)));
const meta=read('content'),engineData=read('engine-data'),scripts=read('scripts'),known=new Set(meta.cards.map(c=>c.id));
const ydk=f=>{let z='main';const o={main:[],extra:[]};for(const l of fs.readFileSync(new URL('../data/decks/'+f+'.ydk',import.meta.url),'utf8').split(/\r?\n/)){if(l.startsWith('#extra'))z='extra';else if(l.startsWith('#main'))z='main';else if(l.startsWith('!side'))z='side';else if(/^\d+$/.test(l.trim())&&z!=='side'&&known.has(+l))o[z].push(+l)}return o};
const decks=['arcana-knights-siegfried-tier-3','archfiends-darkbishop-tier-3','tea-gardner-tier-3','rex-raptor-tier-3'].map(ydk);
const names=[['Siegfried','Dark Bishop'],['Tea','Rex']];

async function engine(){const e=new TagDuel(meta.cards);await e.init([engineData,scripts]);e.startTag({teams:[[decks[0],decks[1]],[decks[2],decks[3]]],lp:8000,enemyLP:8000,seed:4242,mode:'team',rules:2,names});return e;}
const engines=[];for(let i=0;i<4;i++)engines.push(await engine());

const answered=new Set(),swaps=[0,0];let steps=0;
for(;steps<1500&&!engines[0].finished;steps++){
 const slot=engines[0].respondingSeat;
 assert(slot!==null,'a pending prompt names a duelist');
 assert(engines.every(e=>e.respondingSeat===slot),'every device agrees who answers');
 // Every duelist's own view: only the answering duelist sees the prompt; the other team's hand stays hidden.
 for(let s=0;s<4;s++){
  const view=engines[s].snapshotFor(s);
  assert.equal(view.tag.canRespond,s===slot,'only the answering duelist sees the prompt');assert.equal(!!view.pending,s===slot);
  assert.equal(view.tag.team,true);assert.equal(view.tag.localSeat,s&1);
  if(s!==slot)assert(view.tag.waitingForPartner!==view.tag.waitingForOpponent,'a waiting duelist waits for a partner or an opponent');
  if(s!==slot)assert.equal(view.tag.waitingForPartner,slot>>1===s>>1);
  assert(view.players[1].hand.filter(c=>c?.code).length<=Object.keys(engines[s].revealedHands?.[s>>1]||{}).length,'only revealed enemy hand cards show');
 }
 const e=engines[slot],m=e.pending;
 let response=m.type===M.SELECT_CHAIN&&!m.forced?{type:R.SELECT_CHAIN,index:null}:e.auto(m);
 // The device answers from its own view, so team 1's answers travel flipped and the engine flips them back.
 if(slot>>1===1)response=flipPerspective(response);
 answered.add(slot);
 const before=engines[0].activeSeats.slice();
 for(const x of engines)x.respondFor(slot,steps,structuredClone(response));
 const sums=engines.map(x=>x.checksum());assert(sums.every(h=>h===sums[0]),'engines split at step '+steps);
 for(const t of [0,1])if(engines[0].activeSeats[t]!==before[t])swaps[t]++;
 for(const x of engines)x.visuals.splice(0);
}
console.log('steps',steps,'turn',engines[0].turn,'finished',JSON.stringify(engines[0].finished),'answered by',[...answered].sort(),'swaps',swaps);
assert.deepEqual([...answered].sort(),[0,1,2,3],'all four duelists answered');
assert(swaps[0]>0&&swaps[1]>0,'both teams changed their active duelist');
// Team 1 sees its own side first, with its own names.
const v=engines[2].snapshotFor(2);assert.deepEqual(v.tag.names[0],names[1]);
console.log('PASS test_draft_2v2_duel');
for(const x of engines)x.destroy?.();
