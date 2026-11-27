import {quotaExhausted,pauseForQuota,clearQuotaPause} from './quota-pause.js';
const STATUS_KEY='ygo-device-sync-status';
export function syncStatus(){try{return JSON.parse(localStorage.getItem(STATUS_KEY)||'null')}catch{return null}}
function saveStatus(value){try{localStorage.setItem(STATUS_KEY,JSON.stringify(value))}catch{}}
export class DeviceSync{
 constructor(backend){this.backend=backend;this.queue=Promise.resolve()}
 // The last sync and its error stay on this device, shown in Settings › Link devices (Sir Renity, 2026-11-26: two linked PCs
 // never synced and nothing said why).
 run(op,code){const job=this.queue.then(()=>this.request(op,code));this.queue=job.catch(()=>{});if(op!=='status')job.then(()=>saveStatus({at:Date.now(),error:''}),e=>saveStatus({at:Date.now(),error:String(e?.message||e)}));return job}
 async request(op,code){
  const local=await this.backend('device-sync-read');this.linked=!!local.link.group;
  if(op==='unlink'){await this.backend('device-sync-unlink');this.linked=false;return {linked:false}}
  if(op==='status')return {linked:!!local.link.group,group:local.link.group||'',last:syncStatus()};
  if(op==='sync'&&!local.link.group)return {linked:false};
  // Joining while linked moves this device to the other link; progress only ever merges, so nothing is lost. A device
  // that generated its own code before joining used to stay alone on its own link (Sir Renity, 2026-11-26).
  const config=await fetch('multiplayer-config.json').then(r=>r.json());
  // text/plain: a simple CORS request with no OPTIONS preflight; the Worker reads the raw body.
  const response=await fetch(config.signalingUrl.replace(/\/$/,'')+'/progress/'+op,{method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify({...local.link,code:code?.toUpperCase().replace(/[\s-]/g,''),progress:local.progress}),signal:AbortSignal.timeout(15000)});
  const result=await response.json().catch(()=>({}));if(!response.ok){if(quotaExhausted(response.status,result.error,result))pauseForQuota('progress');throw Error(result.error||'Could not sync. Try again.')}clearQuotaPause('progress');
  if(result.group)await this.backend('device-sync-link',{group:result.group,token:result.token});
  if(JSON.stringify(local.progress)!==JSON.stringify(result.progress))await this.backend('device-sync-merge',result.progress);
  this.linked=true;
  return {...result,linked:true};
 }
}
