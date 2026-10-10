import {replayVersion} from './replay-version.js';
const OPT_IN='ygo-cloud-saves-enabled';
export function hasEarnedUnlock(profile){return (profile.unlocked||[]).some(id=>Number(id)!==0&&Number(id)!==1)||Object.values(profile.character_levels||{}).some(level=>Number(level)>=0)||['gallery_unlocked','relicless_unlocked','cpu_viewer_unlocked'].some(k=>profile[k]===true);}
const ID='ygo-device-backup-v1',EXTRAS=['ygo-global-stats-v1','cpu-deck-suggestions-v1'];
const hex=n=>[...crypto.getRandomValues(new Uint8Array(n))].map(b=>b.toString(16).padStart(2,'0')).join('');
export function validateRecovery(value){
 if(value?.format!=='ygo-device-recovery-v1'||value.backup?.schema!==1)throw Error('Choose a device recovery file supplied by the admin.');
 const {files,extras}=value.backup;if(!files||typeof files!=='object'||Array.isArray(files)||!files['profile.json']||Object.keys(files).length>100)throw Error('Missing progress in recovery file.');
 for(const [name,text] of Object.entries(files)){if(!/^[\w-]+\.(json|bak)$/.test(name)||typeof text!=='string')throw Error('Invalid save file.');const v=JSON.parse(text);if(!v||typeof v!=='object')throw Error('Invalid saved progress.');}
 if(!extras||typeof extras!=='object'||Array.isArray(extras))throw Error('Invalid recovery extras.');
 for(const [key,text] of Object.entries(extras)){if(!EXTRAS.includes(key)||typeof text!=='string')throw Error('Invalid recovery extras.');JSON.parse(text)}
 return {files,extras};
}
export function createBackupClient({storage=localStorage,online=()=>navigator.onLine,visible=()=>!document.hidden,request=fetch,version=replayVersion,platform=()=>window.ShadowNative?'Android':navigator.standalone?'Home Screen':navigator.platform,enabled=!/^(localhost|127\.0\.0\.1)$/.test(location.hostname),now=Date.now,setTimer=setTimeout,clearTimer=clearTimeout}={}){
 let uploadGuard=()=>true;const optedIn=()=>storage.getItem(OPT_IN)==='true';
 let latest=null,timer=null,busy=false,closed=false,last=0,failures=0,lastContent='',endpoint,identity;
 function identify(){if(identity)return identity;try{identity=JSON.parse(storage.getItem(ID)||'null')}catch{}if(!/^SB-[A-F0-9]{24}$/.test(identity?.code||'')||! /^[a-f0-9]{64}$/.test(identity?.token||'')){identity={code:'SB-'+hex(12).toUpperCase(),token:hex(32)};storage.setItem(ID,JSON.stringify(identity))}return identity}
 function schedule(delay=30000){if(!enabled||!optedIn()||closed||!latest||timer!==null)return;timer=setTimer(()=>{timer=null;void flush()},delay)}
 function collect(){const extras={};for(const k of EXTRAS){const v=storage.getItem(k);if(v!==null){JSON.parse(v);extras[k]=v}}return {schema:1,files:JSON.parse(latest),extras,version,platform:platform()}}
 async function flush(){if(!enabled||!optedIn()||closed||busy||!latest)return;if(!online()||!visible()||!uploadGuard()){schedule(30000);return;}const elapsed=now()-last;if(last&&elapsed<30000){schedule(30000-elapsed);return}busy=true;const queued=latest;try{
  const backup=collect();if(!backup.files['profile.json']||!hasEarnedUnlock(JSON.parse(backup.files['profile.json'])))return;const text=JSON.stringify(backup);if(text===lastContent){if(latest===queued)latest=null;return;}if(new TextEncoder().encode(text).length>15*1024*1024)throw Error('Backup too large');
  const id=identify();if(!endpoint){const config=await request('multiplayer-config.json',{signal:AbortSignal.timeout(10000)}).then(r=>{if(!r.ok)throw Error('Unavailable');return r.json()});endpoint=config.signalingUrl.replace(/\/$/,'')+'/backup/put'}
  if(!optedIn()||closed||!uploadGuard())return;last=now();const r=await request(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:id.code,token:id.token,backup}),signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('Backup unavailable');const result=await r.json();if(result.code!==id.code)throw Error('Invalid backup response');
  lastContent=text;if(latest===queued)latest=null;failures=0;id.updatedAt=result.updatedAt;storage.setItem(ID,JSON.stringify(id));
 }catch{failures++;}finally{busy=false;if(!closed)schedule(failures?Math.min(300000,30000*2**Math.min(failures,4)):60000)}}
 return {isEnabled:optedIn,setEnabled(value){storage.setItem(OPT_IN,value?'true':'false');if(!value){latest=null;clearTimer(timer);timer=null;}},setUploadGuard(fn){uploadGuard=fn;},queue(text){if(!optedIn())return;const files=JSON.parse(text);if(!hasEarnedUnlock(JSON.parse(files['profile.json']||'{}')))return;latest=text;schedule(last?30000:2000)},wake(){clearTimer(timer);timer=null;schedule(1000)},flush,status(){try{const {code,updatedAt}=identify();return {code,updatedAt}}catch{return {}}},resume(){closed=false;schedule(2000)},destroy(){closed=true;clearTimer(timer);timer=null}};
}
export const deviceBackup=createBackupClient();
window.addEventListener('online',()=>deviceBackup.wake());
document.addEventListener('visibilitychange',()=>{if(!document.hidden)deviceBackup.wake()});

export async function restoreRecovery(value,{loadSave,storeSave,storage=localStorage}){
 const {files,extras}=validateRecovery(value),before=await loadSave(),previous=Object.fromEntries(EXTRAS.map(k=>[k,storage.getItem(k)]));
 try{for(const key of EXTRAS){if(key in extras)storage.setItem(key,extras[key]);else storage.removeItem(key)}await storeSave(JSON.stringify(files));}
 catch(error){for(const [key,text] of Object.entries(previous)){try{if(text===null)storage.removeItem(key);else storage.setItem(key,text)}catch{}}try{await storeSave(before)}catch{}throw error}
}
