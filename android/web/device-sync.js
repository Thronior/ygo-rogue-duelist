export class DeviceSync{
 constructor(backend){this.backend=backend;this.queue=Promise.resolve()}
 run(op,code){const job=this.queue.then(()=>this.request(op,code));this.queue=job.catch(()=>{});return job}
 async request(op,code){
  const local=await this.backend('device-sync-read');this.linked=!!local.link.group;
  if(op==='unlink'){await this.backend('device-sync-unlink');this.linked=false;return {linked:false}}
  if(op==='status')return {linked:!!local.link.group};
  if(op==='sync'&&!local.link.group)return {linked:false};
  if(op==='join'&&local.link.group)throw Error('Disconnect this device before joining a different link. Existing unlocks will be kept.');
  const config=await fetch('multiplayer-config.json').then(r=>r.json());
  const response=await fetch(config.signalingUrl.replace(/\/$/,'')+'/progress/'+op,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...local.link,code:code?.toUpperCase().replace(/[\s-]/g,''),progress:local.progress}),signal:AbortSignal.timeout(15000)});
  const result=await response.json();if(!response.ok)throw Error(result.error||'Could not sync. Try again.');
  if(result.group)await this.backend('device-sync-link',{group:result.group,token:result.token});
  if(JSON.stringify(local.progress)!==JSON.stringify(result.progress))await this.backend('device-sync-merge',result.progress);
  this.linked=true;
  return {...result,linked:true};
 }
}
