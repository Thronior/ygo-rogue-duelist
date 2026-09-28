export const cardImages=new Map();
// Keep compressed image blobs alive; decoded full-size images can be released after validation.
export async function preloadCards(cards,onProgress,{fetchImage=fetch,validateImage=async url=>{
 const image=new Image();image.src=url;try{await image.decode()}finally{image.removeAttribute('src')}
},makeURL=blob=>URL.createObjectURL(blob),revokeURL=url=>URL.revokeObjectURL(url),workers=4}={}){
 const ids=[...new Set(cards.map(c=>Number(c.id)))];let loaded=ids.filter(id=>cardImages.has(id)).length,processed=loaded,next=0,bytes=0;const failed=[];
 const pending=ids.filter(id=>!cardImages.has(id));
 const report=()=>onProgress({loaded,total:ids.length,processed,failed:failed.length,bytes});report();
 async function worker(){while(next<pending.length){const id=pending[next++];let url;try{
  const response=await fetchImage(`assets/cards/${id}.jpg`);if(!response.ok)throw Error(`Card ${id}: ${response.status}`);
  const blob=await response.blob();bytes+=blob.size;url=makeURL(blob);await validateImage(url);cardImages.set(id,url);loaded++;
 }catch(error){if(url)revokeURL(url);failed.push({id,error:String(error)})}finally{processed++;report()}
 // Let the browser paint the counter while processing its local asset cache.
 await new Promise(resolve=>setTimeout(resolve,0));
 }}
 await Promise.all(Array.from({length:Math.min(workers,pending.length)},worker));
 if(failed.length)throw Error(`${failed.length} card images could not load (${loaded} / ${ids.length} loaded). Please retry.`);
 return {loaded,total:ids.length};
}
