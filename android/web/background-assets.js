// One compressed video is downloaded at startup and shared by all duel views.
// Blob playback supports seeking without further server range requests.
const path='assets/duel-tunnel-1080.webm';
let duelURL=null,pending=null;
export const duelBackgroundURL=()=>duelURL||path;
export function preloadDuelBackground(){
 if(duelURL)return Promise.resolve();
 if(pending)return pending;
 pending=(async()=>{
  const response=await fetch(path);
  if(!response.ok)throw Error('Duel background could not load. Please retry.');
  const blob=await response.blob();
  const signature=new Uint8Array(await blob.slice(0,4).arrayBuffer());
  if(signature.join()!=='26,69,223,163')throw Error('Duel background file is invalid. Please retry.');
  duelURL=URL.createObjectURL(new Blob([blob],{type:'video/webm'}));
 })().catch(error=>{pending=null;throw error});
 return pending;
}
