// The builder substitutes the version and each file's content hash. Files are stored once in a shared,
// content-addressed cache, so an update downloads only files whose contents changed.
const VERSION=__VERSION__,HASHES=__HASHES__,FILES=Object.keys(HASHES);
const STORE='ygo-offline-files',META='ygo-offline-meta',LEGACY='ygo-rogue-';
// Space always left free for saves; offline files give way to progress.
const HEADROOM=64*1024*1024;
const root=new URL('./',self.location.href);
const hashes=new Map(FILES.map(path=>[new URL(path,root).href,HASHES[path]]));
const entry=(href,hash)=>href+'?h='+hash,metaKey=name=>new URL('offline-meta/'+name,root).href;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
// A cached followed redirect is invalid for Safari navigation requests.
function withoutRedirect(response){
 return response.redirected?new Response(response.body,{status:response.status,statusText:response.statusText,headers:response.headers}):response;
}
async function broadcast(data){for(const client of await self.clients.matchAll({includeUncontrolled:true}))client.postMessage(data);}
async function readMeta(name){const response=await (await caches.open(META)).match(metaKey(name));return response?response.json().catch(()=>null):null;}
async function writeMeta(name,value){await (await caches.open(META)).put(metaKey(name),new Response(JSON.stringify(value)));}
const record=manifest=>writeMeta('manifest/'+VERSION,{...manifest,version:VERSION,hashes:HASHES});
async function updateState(changes){await writeMeta('state',{...(await readMeta('state')||{}),...changes});}
async function manifests(){
 const meta=await caches.open(META),list=[];
 for(const request of await meta.keys()){
  if(!request.url.startsWith(metaKey('manifest/')))continue;
  const response=await meta.match(request),manifest=response&&await response.json().catch(()=>null);
  if(manifest?.version)list.push(manifest);else await meta.delete(request);
 }
 return list;
}
// Keeps the files and records of the given versions and deletes everything else.
async function prune(keep){
 keep=keep.filter(Boolean);
 const meta=await caches.open(META),store=await caches.open(STORE),versions=new Set(keep.map(m=>m.version)),needed=new Set();
 for(const m of keep)for(const path in m.hashes)needed.add(entry(new URL(path,root).href,m.hashes[path]));
 for(const m of await manifests())if(!versions.has(m.version))await meta.delete(metaKey('manifest/'+m.version));
 for(const request of await store.keys())if(!needed.has(request.url))await store.delete(request);
}
// Only bytes matching this build's hash are stored, so files from another deployment never mix in.
async function verified(response,hash){
 if(!response?.ok)return null;
 const bytes=await response.arrayBuffer(),digest=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes),0,hash.length/2);
 if(Array.from(digest,b=>b.toString(16).padStart(2,'0')).join('')!==hash)return null;
 const headers=new Headers(response.headers);headers.delete('Content-Encoding');headers.set('Content-Length',String(bytes.byteLength));
 return new Response(bytes,{status:response.status,statusText:response.statusText,headers});
}
async function fetchFile(path,href,hash){
 let error;
 for(let attempt=0;attempt<3;attempt++){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),90000);
  try{
   const response=await fetch(new Request(path==='index.html'?root:href,{cache:'reload',signal:controller.signal}));
   if(!response.ok)throw Error(`${new URL(href).pathname}: ${response.status}`);
   return await verified(response,hash);
  }catch(e){error=e;if(attempt<2)await sleep(500*2**attempt);}finally{clearTimeout(timer);}
 }
 throw error;
}
const full=cause=>Object.assign(Error('Not enough browser storage for offline files'),{storage:true,cause});
const isFull=error=>!!(error?.storage||error?.name==='QuotaExceededError');
async function room(){try{const {quota,usage}=await navigator.storage.estimate();return Number.isFinite(quota-usage)?quota-usage:Infinity;}catch{return Infinity;}}
// Stores this version's missing files, reusing an old-style cache's copy when its bytes still match.
// Returns how many files the server no longer had in this version; those load from the network.
async function fill(source,added){
 const store=await caches.open(STORE),legacy=source&&await caches.open(source);
 // Count this download's own writes: estimate() can lag behind them.
 let left=await room(),next=0,done=0,skipped=0,unchecked=0,failure;
 if(left<HEADROOM)throw full();
 await Promise.all(Array.from({length:6},async()=>{while(!failure&&next<FILES.length){
  const path=FILES[next++],hash=HASHES[path],href=new URL(path,root).href,id=entry(href,hash);
  try{
   if(!await store.match(id)){
    const response=(legacy&&await verified(await legacy.match(href),hash))||await fetchFile(path,href,hash);
    if(!response)skipped++;
    else{
     const size=Number(response.headers.get('Content-Length'))||0;
     unchecked+=size;if(unchecked>8*1024*1024){unchecked=0;const now=await room();left=Math.min(left,now);}
     if(left-size<HEADROOM)throw full();left-=size;
     try{await store.put(id,response);}catch(e){throw full(e);}
     added.push(id);
    }
   }
   done++;if(done%40===0||done===FILES.length)await broadcast({type:'CACHE_PROGRESS',done,total:FILES.length});
  }catch(e){failure??=e;}
 }}));
 if(failure)throw failure;
 return skipped;
}
async function removeAdded(added){const store=await caches.open(STORE);for(const id of added)await store.delete(id);}
// Saves come first: if they still lack room after undoing a download, the whole offline copy gives way.
async function makeRoom(added){
 await removeAdded(added);if(await room()>=HEADROOM)return;
 for(const name of await caches.keys())if(name.startsWith(LEGACY))await drop(name);
 await prune([]);
}
// Emptying a cache first frees its space at once; a deleted cache keeps its space while any script still holds it.
async function drop(name){
 const cache=await caches.open(name),requests=await cache.keys();
 for(let i=0;i<requests.length;i+=50)await Promise.all(requests.slice(i,i+50).map(request=>cache.delete(request)));
 await caches.delete(name);
}
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const state=await readMeta('state')||{},updating=!!self.registration.active,added=[];
 // Older workers kept a full copy per version, including superseded and failed downloads. Remove those
 // before writing anything, so a player who ran out of space gets room back first. Only the copy an old
 // active worker still serves (the oldest cache) stays, as a source for unchanged files.
 const legacy=(await caches.keys()).filter(name=>name.startsWith(LEGACY));
 let source=updating&&!state.active?legacy[0]:null;
 for(const name of legacy)if(name!==source)await drop(name);
 if(source){
  const old=await caches.open(source),key=new URL('index.html',root).href,page=await old.match(key);
  if(page?.redirected)await old.put(key,withoutRedirect(page)).catch(()=>{});
 }
 const mine={createdAt:Date.now(),installed:false,complete:false};
 // Keep the active version and the newest finished download (a waiting update); drop other versions.
 const start=async()=>{
  await record(mine);
  const all=await manifests(),active=all.find(m=>m.version===state.active);
  const waiting=all.filter(m=>m.installed&&m.version!==state.active&&m.version!==VERSION).sort((a,b)=>b.createdAt-a.createdAt)[0];
  await prune([{version:VERSION,hashes:HASHES},active,waiting]);
 };
 try{
  let skipped;
  try{
   await start();
   // After running out of storage, updates stay online-only until the player downloads again.
   if(updating&&state.quota){await record({...mine,installed:true});return;}
   skipped=await fill(source,added);
  }catch(error){
   if(!isFull(error)||!source)throw error;
   // No room for two copies: drop the old one; its worker loads from the network until this update applies.
   await drop(source);source=null;await start();skipped=await fill(null,added);
  }
  await record({...mine,installed:true,complete:!skipped});await updateState({quota:false});
  await broadcast({type:'CACHE_READY',complete:!skipped});
 }catch(error){
  const storage=isFull(error);await broadcast({type:'CACHE_ERROR',storage,message:storage?'Not enough browser storage for offline files':error.message});
  // Network failures keep the verified files for the retry; storage failures undo this download.
  if(!storage)throw error;
  await makeRoom(added);
  if(!updating){await caches.delete(STORE);await caches.delete(META);throw error;}
  await updateState({quota:true});await record({...mine,installed:true});
 }
 // No automatic skipWaiting: never replace a running duel's assets with another version.
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 // Downloads that started after this one belong to newer versions and stay.
 const mine=(await manifests()).find(m=>m.version===VERSION)||{createdAt:0};
 await prune([{version:VERSION,hashes:HASHES},...(await manifests()).filter(m=>m.createdAt>mine.createdAt)]);
 for(const name of await caches.keys())if(name.startsWith(LEGACY))await caches.delete(name);
 await updateState({active:VERSION});
 await self.clients.claim();
})()));
let refill;
// Finishes the active version's offline files when the player asks again (e.g. after freeing space).
async function download(){
 if((await readMeta('state'))?.active!==VERSION)return;
 const added=[];
 try{
  const skipped=await fill(null,added),mine=(await manifests()).find(m=>m.version===VERSION)||{createdAt:Date.now()};
  await record({...mine,installed:true,complete:!skipped});await updateState({quota:false});
  await broadcast({type:'CACHE_READY',complete:!skipped});
 }catch(error){
  const storage=isFull(error);if(storage){await makeRoom(added);await updateState({quota:true});}
  await broadcast({type:'CACHE_ERROR',storage,message:storage?'Not enough browser storage for offline files':error.message});throw error;
 }
}
self.addEventListener('message',event=>{
 const type=event.data?.type;
 // Switch versions only for a lone window: another open window may be in a duel.
 if(type==='SKIP_WAITING')event.waitUntil((async()=>{
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  if(windows.length<=1)await self.skipWaiting();else event.source?.postMessage({type:'UPDATE_BLOCKED',windows:windows.length});
 })());
 if(type==='OFFLINE_STATUS')event.waitUntil((async()=>{
  const mine=(await manifests()).find(m=>m.version===VERSION),state=await readMeta('state')||{};
  event.ports[0]?.postMessage({version:VERSION,complete:!!mine?.complete,quota:!!state.quota});
 })());
 if(type==='DOWNLOAD_OFFLINE'){refill??=download().finally(()=>refill=null);event.waitUntil(refill.catch(()=>{}));}
});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==root.origin)return;
 if(event.request.mode==='navigate'&&url.pathname===root.pathname)url.pathname+='index.html';
 url.search='';url.hash='';const hash=hashes.get(url.href);if(!hash)return;
 event.respondWith((async()=>{const response=await (await caches.open(STORE)).match(entry(url.href,hash));if(!response)return fetch(event.request);
  // Safari uses byte ranges to seek/play cached audio, even while offline.
  const range=event.request.headers.get('range');if(!range)return response;
  const match=/^bytes=(\d*)-(\d*)$/.exec(range);if(!match)return response;
  const bytes=await response.arrayBuffer(),length=bytes.byteLength;
  const start=match[1]?Number(match[1]):Math.max(0,length-Number(match[2]));
  const end=match[1]?(match[2]?Math.min(Number(match[2]),length-1):length-1):length-1;
  if(start>=length||end<start)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${length}`}});
  const headers=new Headers(response.headers);headers.set('Content-Range',`bytes ${start}-${end}/${length}`);headers.set('Content-Length',String(end-start+1));headers.set('Accept-Ranges','bytes');
  return new Response(bytes.slice(start,end+1),{status:206,headers});
 })());
});
