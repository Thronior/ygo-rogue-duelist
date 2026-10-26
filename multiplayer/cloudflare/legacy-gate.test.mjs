import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './worker.mjs';

// Stub namespaces record which Durable Object a request reached.
function env(mode){
 const reached=[];const ns=name=>({idFromName:id=>id,get:()=>({fetch:async request=>{reached.push(name+' '+new URL(request.url).pathname);return new Response('{}')}})});
 return {reached,env:{ROOMS:ns('ROOMS'),RELAY:ns('RELAY'),COLLECTOR:ns('COLLECTOR'),PROGRESS:ns('PROGRESS'),DRAFT:ns('DRAFT'),BACKUP:ns('BACKUP'),...(mode?{LEGACY_MULTIPLAYER:mode}:{})}};
}
const post=path=>new Request('https://rooms.test'+path,{method:'POST',body:'{}'});
const upgrade=path=>new Request('https://rooms.test'+path,{headers:{Upgrade:'websocket'}});

for(const mode of [undefined,'block']){
 test(`legacy clients are refused online play (LEGACY_MULTIPLAYER=${mode??'unset'})`,async()=>{
  const {reached,env:e}=env(mode);
  for(const request of [post('/v1/create'),post('/v1/poll'),post('/draft/poll'),post('/collector/leaderboard'),upgrade('/v1/relay')]){
   const response=await worker.fetch(request,e);
   assert.equal(response.status,426,request.url);assert.equal(response.headers.get('Access-Control-Allow-Origin'),'*');
   assert.match((await response.json()).error,/latest version/);
  }
  assert.deepEqual(reached,[],'refused requests never reach a Durable Object');
  // Their preflight still succeeds, so browsers can read the 426 message.
  assert.equal((await worker.fetch(new Request('https://rooms.test/v1/poll',{method:'OPTIONS'}),e)).status,204);
  assert.equal((await (await worker.fetch(new Request('https://rooms.test/health'),e)).json()).legacyClients,'blocked');
  // Device sync and backups stay available to every version; current clients use /v2.
  for(const request of [post('/progress/sync'),post('/backup/save'),post('/v2/poll'),post('/v2/draft/poll'),post('/v2/collector/poll'),upgrade('/v2/relay')])await worker.fetch(request,e);
  assert.deepEqual(reached,['PROGRESS /progress/sync','BACKUP /backup/save','ROOMS /v2/poll','DRAFT /v2/draft/poll','COLLECTOR /v2/collector/poll','ROOMS /v2/relay']);
 });
}

test('allow keeps legacy paths working during the release window',async()=>{
 const {reached,env:e}=env('allow');
 for(const request of [post('/v1/poll'),post('/draft/poll'),post('/collector/fallen'),upgrade('/v1/relay')])assert.equal((await worker.fetch(request,e)).status,200);
 assert.deepEqual(reached,['ROOMS /v1/poll','DRAFT /draft/poll','COLLECTOR /collector/fallen','ROOMS /v1/relay']);
 assert.equal((await (await worker.fetch(new Request('https://rooms.test/health'),e)).json()).legacyClients,'allowed');
 assert.equal((await worker.fetch(post('/v1/unknown'),e)).status,404);assert.equal((await worker.fetch(post('/v2/unknown'),e)).status,404);
});
