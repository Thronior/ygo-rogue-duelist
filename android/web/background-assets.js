import {downloadBlob} from './asset-download.js';
// Fixed set of compressed background files, preloaded once at startup.
// Only the visible scene creates a video decoder; no hidden players are retained.
const loaded=new Map(),pending=new Map();let activeKey=null;
export function backgroundSpec(scene,portrait=false){
 if(scene==='duel'||scene==='spiral')return {key:'spiral',path:'assets/duel-spiral.mp4',poster:'assets/duel-spiral-still.png',type:'video/mp4',loopStart:0};
 if(scene==='tunnel')return {key:'tunnel',path:'assets/duel-tunnel.mp4',poster:'assets/duel-tunnel-poster.png',type:'video/mp4',loopStart:0};
 if(!['hex','rings','crystals','gold','jade','embers','vortex-victory','vortex-defeat'].includes(scene))return null;
 const key=scene+'-'+(portrait?'portrait':'landscape');return {key,path:'assets/backgrounds/'+key+'.mp4',poster:'assets/backgrounds/'+key+'.png',type:'video/mp4',loopStart:0};
}
function trim(){while(loaded.size>18){const key=[...loaded.keys()].find(k=>k!==activeKey);if(!key)break;URL.revokeObjectURL(loaded.get(key));loaded.delete(key)}}
export function setActiveBackground(key){activeKey=key;trim()}
export function preloadBackground(spec){
 if(!spec)return Promise.resolve(null);
 if(loaded.has(spec.key)){const url=loaded.get(spec.key);loaded.delete(spec.key);loaded.set(spec.key,url);return Promise.resolve(url)}
 if(pending.has(spec.key))return pending.get(spec.key);
 const task=(async()=>{
  const blob=await downloadBlob(spec.path),signature=new Uint8Array(await blob.slice(0,12).arrayBuffer());
  const valid=spec.type==='video/webm'?signature.slice(0,4).join()==='26,69,223,163':String.fromCharCode(...signature.slice(4,8))==='ftyp';
  if(!valid)throw Error('Invalid background video');
  const url=URL.createObjectURL(new Blob([blob],{type:spec.type}));loaded.set(spec.key,url);trim();return url;
 })().finally(()=>pending.delete(spec.key));pending.set(spec.key,task);return task;
}
export const duelBackgroundURL=kind=>{const spec=backgroundSpec(kind==='tunnel'?'tunnel':'duel');return loaded.get(spec.key)||spec.path};
export const preloadDuelBackground=kind=>preloadBackground(backgroundSpec(kind==='tunnel'?'tunnel':'duel'));

export async function preloadAllBackgrounds(onProgress=()=>{}){
 const scenes=['hex','rings','crystals','gold','jade','embers','vortex-victory','vortex-defeat'];
 const queue=[backgroundSpec('duel'),backgroundSpec('tunnel'),...scenes.flatMap(scene=>[backgroundSpec(scene,true),backgroundSpec(scene,false)])];
 let loadedCount=0;const total=queue.length;onProgress({loaded:0,total});
 // Three reads at a time avoid competing with the rest of startup on mobile.
 await Promise.all(Array.from({length:3},async()=>{while(queue.length){const spec=queue.shift();await preloadBackground(spec).catch(()=>{});onProgress({loaded:++loadedCount,total});}}));
}
