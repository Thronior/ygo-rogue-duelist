import {replayRows,uploadReplays} from './replays.js';
const KEY='replay-upload-reminder-at-v1';
let checking=false,dialog=null,sessionAt=0;
// Ask after a full batch of 100 new local journals; never upload without a click.
export async function remindReplayUpload(isMenu){
 if(checking||dialog||!isMenu())return;checking=true;
 try{
  const rows=await replayRows();let at=sessionAt;try{at=Math.max(at,Number(localStorage.getItem(KEY))||0)}catch{}
  if(rows.filter(r=>!r.uploaded&&r.at>at).length<100||!isMenu()||document.querySelector('dialog[open]'))return;
  const latest=Math.max(...rows.map(r=>r.at));sessionAt=latest;try{localStorage.setItem(KEY,String(latest))}catch{}
  const d=dialog=document.createElement('dialog');d.className='replay-upload-reminder';d.innerHTML='<h2>Help improve the CPU</h2><p>You have 100 saved duel replays. Upload them to help improve CPU decisions?</p><p>Replays include decks, actions and results. No profile or account details.</p><p role="status" aria-live="polite"></p><div class="choices"><button data-later>Not now</button><button data-upload>Upload replays</button></div>';
  document.body.append(d);d.querySelector('[data-later]').onclick=()=>d.close();d.onclose=()=>{d.remove();dialog=null};
  d.querySelector('[data-upload]').onclick=async e=>{const b=e.currentTarget;b.disabled=true;try{await uploadReplays(s=>{if(d.isConnected)d.querySelector('[role=status]').textContent=s});b.textContent='Uploaded';d.querySelector('[data-later]').textContent='Close'}catch(err){if(d.isConnected){d.querySelector('[role=status]').textContent=err.message;b.disabled=false;b.textContent='Retry upload'}}};d.showModal();
 }catch(err){console.warn('Replay reminder:',err.message)}finally{checking=false}
}
