import {downloadBlob} from './asset-download.js';
// Retain compressed audio and relic artwork; never allocate a player for every song.
const assetURLs=new Map(),originalPaths=new Map();
export const assetURL=path=>assetURLs.get(decodeURIComponent(path))||path;
export const originalAssetPath=url=>originalPaths.get(url)||url;
export async function preloadStartupAssets(onProgress=()=>{},options={}){
 const request=options.fetchAsset||fetch,makeURL=options.makeURL||(b=>URL.createObjectURL(b));
 const response=await request('startup-assets.json');if(!response.ok)throw Error('Could not read startup assets. Retry loading.');
 // Files already on this device (options.local) play straight from it, so only sound effects,
 // which are decoded up front, are loaded; music and artwork are not copied into memory.
 const manifest=await response.json(),audio=manifest.audio.filter(path=>(options.music!==false&&!options.local)||!path.startsWith('assets/music/')),paths=[...new Set([...audio,...(options.images===false||options.local?[]:manifest.images)])];
 let next=0,loaded=0,bytes=0,last=0;const failures=[];
 const report=()=>{const now=Date.now();if(loaded===paths.length||now-last>100){last=now;onProgress({loaded,total:paths.length,bytes});}};report();
 await Promise.all(Array.from({length:4},async()=>{while(next<paths.length){const path=paths[next++];
  try{if(!assetURLs.has(path)){
   const blob=await downloadBlob(path,{request,...options.downloadOptions});bytes+=blob.size;
   if(manifest.audio.includes(path)||path.startsWith('assets/relics/')){const url=makeURL(blob);assetURLs.set(path,url);originalPaths.set(url,path);}
  }}catch(error){failures.push(path);console.warn(String(error));}loaded++;report();
 }}));
 const soundFailures=failures.filter(path=>manifest.audio.includes(path));
 if(soundFailures.length)throw Error(soundFailures.length+' sound files could not load: '+soundFailures.join(', ')+'. Check your connection and retry.');
 // Optional artwork can retry naturally when its screen opens.
 options.onFailures?.(failures);
 return manifest.audio.filter(path=>!path.startsWith('assets/music/'));
}
