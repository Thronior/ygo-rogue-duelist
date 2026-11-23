// Bug report 2026-11-23 ("Tag rooms full"): a lost join answer, a stale seat token and an Exit while offline used to
// leave player 2 without a seat token while the room kept the seat.
import assert from 'node:assert/strict';
const stored=new Map();globalThis.localStorage={getItem:k=>stored.get(k)??null,setItem:(k,v)=>stored.set(k,String(v)),removeItem:k=>stored.delete(k)};
const {TagPeer}=await import('./web/tag-peer.js');
const E='https://rooms.example',sent=[];let answer;
globalThis.fetch=async(url,init)=>{const body=JSON.parse(init.body);sent.push({action:url.split('/').pop(),body});return answer(url.split('/').pop(),body)};
const ok=data=>({ok:true,status:200,json:async()=>data}),fail=(status,error)=>({ok:false,status,json:async()=>({error})});
const peer=()=>{const p=new TagPeer(E);p.open=async s=>{p.token=s.token;p.code=s.code;localStorage.setItem(E+':tag:'+s.code,s.token);return s};return p};

// 1. The answer is lost: the retry sends the same join id, and a completed join forgets it.
answer=()=>{throw new TypeError('Failed to fetch')};
await assert.rejects(peer().join('ABCDE'));
const id=sent.at(-1).body.joinId;assert(id&&stored.get(E+':tag-join:ABCDE')===id,'join id kept after a network failure');
answer=()=>ok({code:'ABCDE',token:'t1',seat:1});
await peer().join('ABCDE');
assert.equal(sent.at(-1).body.joinId,id,'retry reuses the join id');assert(!stored.has(E+':tag-join:ABCDE'),'forgotten once joined');

// 2. A refused join forgets the id (the next try is a new player).
sent.length=0;stored.clear();answer=()=>fail(400,'Room already has two players.');
await assert.rejects(peer().join('FGHJK'),/two players/);assert(!stored.has(E+':tag-join:FGHJK'));

// 3. A saved token the room no longer knows is dropped and the join is tried as a new player.
sent.length=0;stored.clear();stored.set(E+':tag:LMNPQ','old');
answer=(action,body)=>body.resumeToken?fail(400,'This device cannot resume that seat.'):ok({code:'LMNPQ',token:'new',seat:1});
const joined=await peer().join('LMNPQ');
assert.equal(joined.token,'new');assert.deepEqual(sent.map(x=>!!x.body.resumeToken),[true,false]);assert.equal(stored.get(E+':tag:LMNPQ'),'new');
// Any other refusal of a saved token is not retried.
sent.length=0;stored.set(E+':tag:RSTUV','old');answer=()=>fail(400,'Room not found or expired.');
await assert.rejects(peer().join('RSTUV'),/not found/);assert.equal(sent.length,1);

// 4. Exit while offline keeps the token, so joining again resumes; a room that answered releases it.
const leaving=peer();leaving.token='keep';leaving.code='WXYZ2';stored.set(E+':tag:WXYZ2','keep');
answer=()=>{throw new TypeError('Failed to fetch')};await leaving.close();assert.equal(stored.get(E+':tag:WXYZ2'),'keep');
const answered=peer();answered.token='keep';answered.code='WXYZ2';answer=()=>fail(400,'Invalid room session.');await answered.close();
assert(!stored.has(E+':tag:WXYZ2'));
console.log('PASS Tag join: lost answers retry the same seat, stale tokens rejoin as new, Exit offline keeps the seat token');
