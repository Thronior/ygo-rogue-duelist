export const cardImages=new Map();
// Keep stable URLs, not a second in-memory copy of every card's artwork.
// Installed web builds serve these URLs from the offline service-worker cache.
export async function preloadCards(cards,onProgress,{fetchImage=fetch,validateImage=async url=>{
 const image=new Image();image.src=url;try{await image.decode()}finally{image.removeAttribute('src')}
},makeURL=blob=>URL.createObjectURL(blob),revokeURL=url=>URL.revokeObjectURL(url),workers=4}={}){
 // Card IDs identify stable artwork. Keep this cache across game releases.
 // Native Android already serves these files from its installed APK.
 const cache=typeof window!=='undefined'&&!window.ShadowNative&&globalThis.caches?await caches.open('ygo-card-art-v1').catch(()=>null):null;
 if(cache)navigator.storage?.persist?.().catch(()=>{});
 const ids=[...new Set(cards.map(c=>Number(c.id)))];let loaded=ids.filter(id=>cardImages.has(id)).length,processed=loaded,next=0,bytes=0;const failed=[];
 const pending=ids.filter(id=>!cardImages.has(id));
 const report=()=>onProgress({loaded,total:ids.length,processed,failed:failed.length,bytes});report();
 async function worker(){while(next<pending.length){const id=pending[next++];let url;try{
  const path=`assets/cards/${id}.jpg`;
  let response=cache?await cache.match(path).catch(()=>null):null;
  const cached=!!response;
  if(!response)response=await fetchImage(path);
  if(!response.ok)throw Error(`Card ${id}: ${response.status}`);
  const retained=!cached&&cache?response.clone():null;
  const blob=await response.blob();bytes+=blob.size;
  // Only previously decoded, validated artwork enters the persistent cache.
  if(!cached){url=makeURL(blob);await validateImage(url);revokeURL(url);url=null;}
  if(retained)await cache.put(path,retained).catch(()=>{});
  cardImages.set(id,path);loaded++;
 }catch(error){if(url)revokeURL(url);failed.push({id,error:String(error)})}finally{processed++;report()}
 // Let the browser paint the counter while processing its local asset cache.
 await new Promise(resolve=>setTimeout(resolve,0));
 }}
 await Promise.all(Array.from({length:Math.min(workers,pending.length)},worker));
 if(failed.length)throw Error(`${failed.length} card images could not load (${loaded} / ${ids.length} loaded). Please retry.`);
 return {loaded,total:ids.length};
}
