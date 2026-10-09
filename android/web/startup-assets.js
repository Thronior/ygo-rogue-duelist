// Retain compressed audio and relic artwork; never allocate a player for every song.
const assetURLs=new Map(),originalPaths=new Map();
export const assetURL=path=>assetURLs.get(decodeURIComponent(path))||path;
export const originalAssetPath=url=>originalPaths.get(url)||url;
export async function preloadStartupAssets(onProgress=()=>{},options={}){
 const request=options.fetchAsset||fetch,makeURL=options.makeURL||(b=>URL.createObjectURL(b));
 const response=await request('startup-assets.json');if(!response.ok)throw Error('Could not read startup assets. Retry loading.');
 const manifest=await response.json(),paths=[...new Set([...manifest.audio,...manifest.images])];
 let next=0,loaded=0,bytes=0,last=0;const failures=[];
 const report=()=>{const now=Date.now();if(loaded===paths.length||now-last>100){last=now;onProgress({loaded,total:paths.length,bytes});}};report();
 await Promise.all(Array.from({length:4},async()=>{while(next<paths.length){const path=paths[next++];
  try{if(!assetURLs.has(path)){
   let blob,error;for(let attempt=0;attempt<2;attempt++){try{const r=await request(path,{cache:'force-cache'});if(!r.ok)throw Error('HTTP '+r.status);blob=await r.blob();if(!blob.size)throw Error('Empty asset');break;}catch(e){blob=null;error=e;}}
   if(!blob)throw error;bytes+=blob.size;
   if(manifest.audio.includes(path)||path.startsWith('assets/relics/')){const url=makeURL(blob);assetURLs.set(path,url);originalPaths.set(url,path);}
  }}catch{failures.push(path);}loaded++;report();
 }}));
 if(failures.length)throw Error(failures.length+' assets could not load. Check your connection and retry.');
 return manifest.audio.filter(path=>!path.startsWith('assets/music/'));
}
