import {replayVersion} from './replay-version.js';
const OPT_IN='ygo-cloud-saves-enabled';
export function hasEarnedUnlock(profile){return (profile.unlocked||[]).some(id=>Number(id)!==0&&Number(id)!==1)||Object.values(profile.character_levels||{}).some(level=>Number(level)>=0)||['gallery_unlocked','relicless_unlocked','cpu_viewer_unlocked'].some(k=>profile[k]===true);}
// LEGACY is the pre-v0.2.10 unencrypted backup identity; it is only read to delete that backup after migrating.
const LEGACY='ygo-device-backup-v1',EXTRAS=['ygo-global-stats-v1','cpu-deck-suggestions-v1'];
const CODE='ygo-cloud-save-code-v1',STATE='ygo-cloud-save-state-v1',NOTICE='ygo-cloud-save-code-notice';

// Cloud save code (2026-10-29): 10 characters without look-alikes (no 0/O, 1/I/L), shown as K7QXM-4TB9R.
// PBKDF2 turns it into an AES-GCM key, a lookup id and a write password. The save is encrypted on the device,
// so the server only ever holds the id, a hash of the password and ciphertext.
const ALPHABET='ABCDEFGHJKMNPQRSTUVWXYZ23456789',SALT='ygo-rogue-cloud-save-v1',ROUNDS=200000;
export function newCloudCode(random=n=>crypto.getRandomValues(new Uint8Array(n))){let out='';while(out.length<10)for(const b of random(16))if(b<248&&out.length<10)out+=ALPHABET[b%31];return out.slice(0,5)+'-'+out.slice(5)}
export function normalizeCloudCode(text){const raw=String(text??'').toUpperCase().replace(/[^A-Z0-9]/g,'');return raw.length===10&&[...raw].every(c=>ALPHABET.includes(c))?raw.slice(0,5)+'-'+raw.slice(5):null}
const hexOf=bytes=>[...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');
const toBase64=bytes=>{let s='';for(let i=0;i<bytes.length;i+=0x8000)s+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(s)};
const fromBase64=text=>Uint8Array.from(atob(text),c=>c.charCodeAt(0));
const pipe=async(bytes,stream)=>new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());
// Key stretching runs once per code per session (about a tenth of a second on a phone).
const keyCache=new Map();
export function cloudKeys(code){
 const normal=normalizeCloudCode(code);if(!normal)return Promise.reject(Error('Enter your 10-character cloud save code, like K7QXM-4TB9R.'));
 if(!keyCache.has(normal))keyCache.set(normal,(async()=>{
  const base=await crypto.subtle.importKey('raw',new TextEncoder().encode(normal.replace('-','')),'PBKDF2',false,['deriveBits']);
  const bits=new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:new TextEncoder().encode(SALT),iterations:ROUNDS},base,768));
  return {key:await crypto.subtle.importKey('raw',bits.slice(0,32),'AES-GCM',false,['encrypt','decrypt']),id:hexOf(bits.slice(32,64)),auth:hexOf(bits.slice(64,96))};
 })().catch(error=>{keyCache.delete(normal);throw error}));
 return keyCache.get(normal);
}
export async function sealSave(code,backup){
 const {key}=await cloudKeys(code);let data=new TextEncoder().encode(JSON.stringify(backup)),flag='n';
 if(typeof CompressionStream==='function'){data=await pipe(data,new CompressionStream('gzip'));flag='g'}
 const iv=crypto.getRandomValues(new Uint8Array(12)),sealed=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,data));
 return `ygo1${flag}.${toBase64(iv)}.${toBase64(sealed)}`;
}
export async function openSave(code,blob){
 const m=/^ygo1([gn])\.([A-Za-z0-9+/]+=*)\.([A-Za-z0-9+/]+=*)$/.exec(blob||'');if(!m)throw Error('This cloud save could not be read.');
 const {key}=await cloudKeys(code);let data;
 try{data=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:fromBase64(m[2])},key,fromBase64(m[3])))}catch{throw Error('This code does not open that cloud save.')}
 if(m[1]==='g'){if(typeof DecompressionStream!=='function')throw Error('This browser is too old to open this cloud save. Try another browser.');data=await pipe(data,new DecompressionStream('gzip'))}
 return JSON.parse(new TextDecoder().decode(data));
}
const unwrap=text=>{try{const v=JSON.parse(text||'{}');return v?.payload||v||{}}catch{return {}}};
// What the restore window shows before replacing this device's progress.
export function saveSummary(backup){const p=unwrap(backup?.files?.['profile.json']);return {wins:Number(p.wins)||0,runs:Number(p.runs)||0,characters:(p.unlocked||[]).length,inRun:'run.json' in (backup?.files||{})}}
// Anything a player would miss: an unlock, a finished run or a run in progress.
const worthSaving=files=>!!files['profile.json']&&('run.json' in files||hasEarnedUnlock(unwrap(files['profile.json']))||Number(unwrap(files['profile.json']).runs)>0);

export function validateRecovery(value){
 if(value?.format!=='ygo-device-recovery-v1'||value.backup?.schema!==1)throw Error('Choose a device recovery file supplied by the admin.');
 const {files,extras}=value.backup;if(!files||typeof files!=='object'||Array.isArray(files)||!files['profile.json']||Object.keys(files).length>100)throw Error('Missing progress in recovery file.');
 for(const [name,text] of Object.entries(files)){if(!/^[\w-]+\.(json|bak)$/.test(name)||typeof text!=='string')throw Error('Invalid save file.');const v=JSON.parse(text);if(!v||typeof v!=='object')throw Error('Invalid saved progress.');}
 if(!extras||typeof extras!=='object'||Array.isArray(extras))throw Error('Invalid recovery extras.');
 for(const [key,text] of Object.entries(extras)){if(!EXTRAS.includes(key)||typeof text!=='string')throw Error('Invalid recovery extras.');JSON.parse(text)}
 return {files,extras};
}
export function createBackupClient({storage=localStorage,online=()=>navigator.onLine,visible=()=>!document.hidden,request=fetch,version=replayVersion,platform=()=>window.ShadowNative?'Android':navigator.standalone?'Home Screen':'Web',enabled=!/^(localhost|127\.0\.0\.1)$/.test(location.hostname),now=Date.now,setTimer=setTimeout,clearTimer=clearTimeout}={}){
 let uploadGuard=()=>true;const optedIn=()=>storage.getItem(OPT_IN)==='true';
 let latest=null,timer=null,busy=false,closed=false,last=0,failures=0,lastContent='',base,lastError='';
 const code=()=>normalizeCloudCode(storage.getItem(CODE));
 const legacy=()=>{try{const v=JSON.parse(storage.getItem(LEGACY)||'null');return /^SB-[A-F0-9]{24}$/.test(v?.code||'')&&/^[a-f0-9]{64}$/.test(v?.token||'')?v:null}catch{return null}};
 function assignCode(notice){const c=newCloudCode();storage.setItem(CODE,c);storage.removeItem(STATE);lastContent='';if(notice)storage.setItem(NOTICE,notice);return c}
 // Players who used the old backups get a code once, shown to them at the next start.
 function migrate(){if(optedIn()&&!code())assignCode('migrated');return code()}
 async function post(op,body){
  if(!base){const config=await request('multiplayer-config.json',{signal:AbortSignal.timeout(10000)}).then(r=>{if(!r.ok)throw Error('Cloud save is unavailable right now.');return r.json()});base=config.signalingUrl.replace(/\/$/,'')+'/backup/'}
  return request(base+op,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(op==='save'||op==='load'?30000:15000)});
 }
 async function forgetLegacy(){const old=legacy();if(!old)return;const r=await post('forget',{code:old.code,token:old.token});if(r.ok||r.status===404)storage.removeItem(LEGACY)}
 function schedule(delay=30000){if(!enabled||!optedIn()||closed||!latest||timer!==null)return;timer=setTimer(()=>{timer=null;void flush()},delay)}
 function collect(){const extras={};for(const k of EXTRAS){const v=storage.getItem(k);if(v!==null){JSON.parse(v);extras[k]=v}}return {schema:1,files:JSON.parse(latest),extras,version,platform:platform()}}
 async function flush(){if(!enabled||!optedIn()||closed||busy||!latest)return;if(!online()||!visible()||!uploadGuard()){schedule(30000);return;}const elapsed=now()-last;if(last&&elapsed<30000){schedule(30000-elapsed);return}busy=true;const queued=latest;try{
  const backup=collect();if(!worthSaving(backup.files))return;const text=JSON.stringify(backup);if(text===lastContent){if(latest===queued)latest=null;return;}if(new TextEncoder().encode(text).length>15*1024*1024)throw Error('Backup too large');
  const current=migrate(),{id,auth}=await cloudKeys(current),blob=await sealSave(current,backup);
  if(!optedIn()||closed||!uploadGuard()||code()!==current)return;last=now();const r=await post('save',{id,auth,blob});
  // Another save already uses this code (about a one-in-a-quadrillion chance): pick a new one and show it.
  if(r.status===409){assignCode('changed');throw Error('Code in use')}
  if(!r.ok)throw Error('Backup unavailable');const result=await r.json();
  lastContent=text;if(latest===queued)latest=null;failures=0;lastError='';storage.setItem(STATE,JSON.stringify({updatedAt:result.updatedAt}));
  await forgetLegacy().catch(()=>{});
 }catch(error){failures++;lastError=error.message}finally{busy=false;if(!closed)schedule(failures?Math.min(300000,30000*2**Math.min(failures,4)):60000)}}
 const state=()=>{try{return JSON.parse(storage.getItem(STATE)||'{}')}catch{return {}}};
 return {
  isEnabled:optedIn,
  // Turning cloud save on creates this device's code (kept if it is turned off and on again).
  setEnabled(value){storage.setItem(OPT_IN,value?'true':'false');if(value)return code()||assignCode('');latest=null;clearTimer(timer);timer=null;return code()},
  code,migrate,
  notice(){return optedIn()&&code()?storage.getItem(NOTICE)||'':''},clearNotice(){storage.removeItem(NOTICE)},
  setUploadGuard(fn){uploadGuard=fn;},
  queue(text){if(!optedIn())return;if(!worthSaving(JSON.parse(text)))return;latest=text;schedule(last?30000:2000)},
  wake(){clearTimer(timer);timer=null;schedule(1000)},flush,
  status(){return {code:optedIn()?code():null,updatedAt:state().updatedAt,error:lastError}},
  // Download and decrypt the save for a code; nothing on this device changes until the player confirms.
  async fetchSave(text){
   const normal=normalizeCloudCode(text);if(!normal)throw Error('Enter your 10-character cloud save code, like K7QXM-4TB9R.');
   const {id,auth}=await cloudKeys(normal);const r=await post('load',{id,auth});
   if(r.status===404)throw Error('No cloud save matches this code. Check it and try again.');if(!r.ok)throw Error('Cloud save is unavailable right now. Try again later.');
   const {savedAt,blob}=await r.json(),backup=await openSave(normal,blob),recovery={format:'ygo-device-recovery-v1',backup};validateRecovery(recovery);
   return {code:normal,savedAt,recovery,summary:saveSummary(backup)};
  },
  // After a restore this device keeps backing up to the same code.
  adopt(text){const normal=normalizeCloudCode(text);if(!normal)throw Error('Invalid cloud save code.');storage.setItem(CODE,normal);storage.setItem(OPT_IN,'true');storage.removeItem(NOTICE);storage.removeItem(STATE);lastContent=''},
  async deleteCloud(){
   const current=code();if(!current)return false;const {id,auth}=await cloudKeys(current),r=await post('delete',{id,auth});
   if(!r.ok&&r.status!==404)throw Error('Cloud save is unavailable right now. Try again later.');
   storage.setItem(OPT_IN,'false');storage.removeItem(CODE);storage.removeItem(STATE);storage.removeItem(NOTICE);latest=null;lastContent='';clearTimer(timer);timer=null;return true;
  },
  resume(){closed=false;schedule(2000)},destroy(){closed=true;clearTimer(timer);timer=null}
 };
}
export const deviceBackup=createBackupClient();
window.addEventListener('online',()=>deviceBackup.wake());
document.addEventListener('visibilitychange',()=>{if(!document.hidden)deviceBackup.wake()});

export async function restoreRecovery(value,{loadSave,storeSave,storage=localStorage}){
 const {files,extras}=validateRecovery(value),before=await loadSave(),previous=Object.fromEntries(EXTRAS.map(k=>[k,storage.getItem(k)]));
 try{for(const key of EXTRAS){if(key in extras)storage.setItem(key,extras[key]);else storage.removeItem(key)}await storeSave(JSON.stringify(files));}
 catch(error){for(const [key,text] of Object.entries(previous)){try{if(text===null)storage.removeItem(key);else storage.setItem(key,text)}catch{}}try{await storeSave(before)}catch{}throw error}
}
