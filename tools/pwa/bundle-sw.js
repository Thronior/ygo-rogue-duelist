// Content-addressed artwork bundles; original image URLs and dimensions stay intact.
const VERSION=__VERSION__,FILES=__FILES__,ARTWORK=__ARTWORK__,PACKS=__PACKS__;
const root=new URL('./',self.location.href),CACHE='ygo-bundled-'+VERSION,ART_CACHE='ygo-artwork-bundles-v1';
const allowed=new Set(FILES.map(p=>new URL(p,root).href));
const resident=new Map(),inflight=new Map(),waiters=[];let running=0,offlineJob;
async function slot(){if(running<2){running++;return;}await new Promise(resolve=>waiters.push(resolve));}
function release(){const next=waiters.shift();if(next)next();else running--;}
function clean(response){return response.redirected?new Response(response.body,{status:response.status,statusText:response.statusText,headers:response.headers}):response;}
async function broadcast(data){for(const client of await self.clients.matchAll())client.postMessage(data);}
async function getBundle(name){
 if(resident.has(name)){const blob=resident.get(name);resident.delete(name);resident.set(name,blob);return blob;}
 if(inflight.has(name))return inflight.get(name);
 const job=(async()=>{await slot();try{
  const cache=await caches.open(ART_CACHE),url=new URL(name,root).href;
  let response=await cache.match(url),cached=!!response;
  if(!response)response=await fetch(url);
  if(!response.ok)throw Error('Artwork download failed: '+response.status);
  const blob=await response.blob();
  if(blob.size!==PACKS[name]){await cache.delete(url);throw Error('Incomplete artwork download; please retry.');}
  if(!cached)await cache.put(url,new Response(blob)).catch(()=>{});
  resident.set(name,blob);while(resident.size>2)resident.delete(resident.keys().next().value);
  return blob;
 }finally{release();}})();inflight.set(name,job);
 try{return await job;}finally{inflight.delete(name);}
}
async function ordinary(request,url){
 const cache=await caches.open(CACHE);let response=await cache.match(url);
 if(!response){response=clean(await fetch(request));if(response.ok&&!request.headers.has('range'))await cache.put(url,response.clone()).catch(()=>{});}
 const range=request.headers.get('range');if(!range||response.status!==200)return response;
 const m=/^bytes=(\d*)-(\d*)$/.exec(range);if(!m)return response;
 const blob=await response.blob(),length=blob.size,start=m[1]?Number(m[1]):Math.max(0,length-Number(m[2]));
 const end=m[1]?(m[2]?Math.min(Number(m[2]),length-1):length-1):length-1;
 if(start>=length||end<start)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${length}`}});
 const headers=new Headers(response.headers);headers.set('Content-Range',`bytes ${start}-${end}/${length}`);headers.set('Content-Length',String(end-start+1));headers.set('Accept-Ranges','bytes');
 return new Response(blob.slice(start,end+1),{status:206,headers});
}
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 for(const path of ['index.html','bundle-boot.js']){const url=new URL(path,root),r=await fetch(url);if(!r.ok)throw Error('Startup download failed');await cache.put(url,clean(r));}
 // Preserve open duels: subsequent versions wait until existing windows close.
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const name of await caches.keys())if((name.startsWith('ygo-bundled-')||name.startsWith('ygo-rogue-')||name==='ygo-card-art-v1')&&name!==CACHE)await caches.delete(name);
 const cache=await caches.open(ART_CACHE),packs=new Set(Object.keys(PACKS).map(p=>new URL(p,root).href));
 for(const request of await cache.keys())if(request.url.startsWith(root.href)&&!packs.has(request.url))await cache.delete(request);
 await self.clients.claim();
})()));
async function downloadOffline(){
 const cache=await caches.open(CACHE);let next=0,done=0;
 try{
  const results=await Promise.allSettled(Array.from({length:4},async()=>{while(next<FILES.length){const path=FILES[next++],url=new URL(path,root);
   if(PACKS[path])await getBundle(path);else if(!await cache.match(url)){const r=await fetch(url);if(!r.ok)throw Error(path+': '+r.status);await cache.put(url,clean(r));}
   done++;if(done%20===0||done===FILES.length)await broadcast({type:'CACHE_PROGRESS',done,total:FILES.length});
  }}));
  const failure=results.find(r=>r.status==='rejected');if(failure)throw failure.reason;
  await cache.put(new URL('__offline_ready__',root),new Response('ready'));await broadcast({type:'CACHE_READY'});
 }catch(error){await broadcast({type:'CACHE_ERROR',message:error.message});throw error;}
}
self.addEventListener('message',event=>{
 if(event.data?.type==='BUNDLE_STATUS')event.waitUntil((async()=>{const cache=await caches.open(CACHE);event.ports[0]?.postMessage({version:VERSION,offlineReady:!!await cache.match(new URL('__offline_ready__',root)),residentBundles:resident.size,residentBytes:[...resident.values()].reduce((n,b)=>n+b.size,0)});})());
 if(event.data?.type==='DOWNLOAD_OFFLINE'){offlineJob??=downloadOffline().finally(()=>offlineJob=null);event.waitUntil(offlineJob.catch(()=>{}));}
});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==root.origin||!url.pathname.startsWith(root.pathname))return;
 const entry=ARTWORK[decodeURIComponent(url.pathname.slice(root.pathname.length))];
 if(entry){event.respondWith((async()=>{try{const [name,start,length]=entry,blob=await getBundle(name);if(start+length>blob.size)throw Error('Invalid artwork index');return new Response(blob.slice(start,start+length,'image/jpeg'),{headers:{'Content-Type':'image/jpeg','Content-Length':String(length)}});}catch(error){return new Response(String(error),{status:503});}})());return;}
 if(event.request.mode==='navigate'&&url.pathname===root.pathname)url.pathname+='index.html';url.search='';url.hash='';
 if(allowed.has(url.href))event.respondWith(ordinary(event.request,url.href));
});
