// The builder substitutes the version and asset list. Each version is cached atomically.
const VERSION=__VERSION__,FILES=__FILES__,CACHE='ygo-rogue-'+VERSION;
const root=new URL('./',self.location.href);
const allowed=new Set(FILES.map(path=>new URL(path,root).href));
// A cached followed redirect is invalid for Safari navigation requests.
// Rebuild only redirected responses; body streams avoid buffering large assets.
function withoutRedirect(response){
 return response.redirected?new Response(response.body,{status:response.status,statusText:response.statusText,headers:response.headers}):response;
}
async function broadcast(data){for(const client of await self.clients.matchAll({includeUncontrolled:true}))client.postMessage(data);}
self.addEventListener('install',event=>event.waitUntil((async()=>{
 // Repair the old worker's homepage before the full offline download.
 // This changes only its cached response metadata, never save storage.
 for(const name of await caches.keys()){
  if(!name.startsWith('ygo-rogue-'))continue;
  const old=await caches.open(name),key=new URL('index.html',root).href;
  const page=await old.match(key);
  if(page?.redirected)await old.put(key,withoutRedirect(page));
 }
 const cache=await caches.open(CACHE);let next=0,done=0;
 try{
  const results=await Promise.allSettled(Array.from({length:6},async()=>{while(next<FILES.length){
   const path=FILES[next++],url=new URL(path,root);const response=await fetch(new Request(path==='index.html'?root:url,{cache:'reload'}));
   if(!response.ok)throw Error(`${url.pathname}: ${response.status}`);await cache.put(url,withoutRedirect(response));done++;
   if(done%40===0||done===FILES.length)await broadcast({type:'CACHE_PROGRESS',done,total:FILES.length});
  }}));
  const failure=results.find(result=>result.status==='rejected');if(failure)throw failure.reason;
  await broadcast({type:'CACHE_READY'});
 }catch(error){await caches.delete(CACHE);await broadcast({type:'CACHE_ERROR',message:error.message});throw error;}
 // No skipWaiting: never replace a running duel's assets with another version.
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const name of await caches.keys())if(name.startsWith('ygo-rogue-')&&name!==CACHE)await caches.delete(name);
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==root.origin)return;
 if(event.request.mode==='navigate'&&url.pathname===root.pathname)url.pathname+='index.html';
 url.search='';url.hash='';if(!allowed.has(url.href))return;
 event.respondWith((async()=>{const cache=await caches.open(CACHE);const cached=await cache.match(url.href);if(!cached)return fetch(event.request);
  // Also tolerate redirected entries made by older installations.
  const response=withoutRedirect(cached);
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
