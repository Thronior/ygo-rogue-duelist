import {replayVersion} from './replay-version.js';
// Local, lossless duel journals. Uploads are initiated by players in Settings or Flag behaviour.
export const REPLAY_ENDPOINT='https://ygo-rogue-replays.hadow--un--esktop.workers.dev/v1/replays';
export const stringify=value=>JSON.stringify(value,(_,v)=>typeof v==='bigint'?{$bigint:String(v)}:v);
export const parse=text=>JSON.parse(text,(_,v)=>v&&typeof v==='object'&&Object.keys(v).length===1&&'$bigint'in v?BigInt(v.$bigint):v);
const clone=value=>parse(stringify(value));
let database,saveQueue=Promise.resolve(),uploadBusy=false;
export async function hash(bytes){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('')}
export async function packReplay(record){return new Uint8Array(await new Response(new Blob([stringify(record)]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer())}
export async function unpackReplay(bytes){return parse(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text())}
function db(){return database??=new Promise((resolve,reject)=>{const r=indexedDB.open('ygo-duel-replays',3);r.onupgradeneeded=()=>{for(const name of ['duels','flags'])if(!r.result.objectStoreNames.contains(name))r.result.createObjectStore(name,{keyPath:'id'});const duels=r.transaction.objectStore('duels');if(!duels.indexNames.contains('at'))duels.createIndex('at','at')};r.onsuccess=()=>resolve(r.result);r.onerror=()=>{database=null;reject(r.error)}})}
export async function replayRows(){const d=await db();return new Promise((resolve,reject)=>{const r=d.transaction('duels').objectStore('duels').getAll();r.onsuccess=()=>resolve(r.result.sort((a,b)=>b.at-a.at));r.onerror=()=>reject(r.error)})}
export function storeReplay(record){if(!globalThis.indexedDB)return Promise.resolve();const copy=clone(record);const task=saveQueue.then(async()=>{const bytes=await packReplay(copy),id=await hash(new TextEncoder().encode(stringify(copy.start))),d=await db();await new Promise((resolve,reject)=>{const tx=d.transaction('duels','readwrite'),s=tx.objectStore('duels'),q=s.get(id);q.onsuccess=()=>{const old=q.result;if(old?.steps>copy.responses.length)return;s.put({id,at:old?.at||copy.at,bytes,steps:copy.responses.length,uploaded:old?.steps===copy.responses.length&&old?.ended===copy.ended?old.uploaded:false,ended:copy.ended});let count=0;const all=s.index('at').openKeyCursor(null,'prev');all.onsuccess=()=>{const cursor=all.result;if(!cursor)return;if(++count>100)s.delete(cursor.primaryKey);cursor.continue()}};tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});});saveQueue=task.catch(e=>console.warn('Replay storage:',e.message));return task}
export function startRecording(engine,args){engine.replayRecord={format:'ygo-replay',version:1,core:'ocgcore-wasm-0.1.2',build:replayVersion,at:Date.now(),start:clone(args),responses:[],ended:false};}
export function recordResponse(engine,response){if(!engine.replayRecord)return;engine.replayRecord.responses.push(clone(response));if(engine.finished)engine.replayRecord.ended=true;clearTimeout(engine.replaySaveTimer);engine.replaySaveTimer=setTimeout(()=>{void saveRecording(engine)},500)}
export function saveRecording(engine){clearTimeout(engine.replaySaveTimer);if(!engine.replayRecord)return Promise.resolve();return storeReplay(engine.replayRecord).catch(e=>console.warn('Replay storage:',e.message))}
export async function uploadReplays(progress=()=>{}){if(uploadBusy)return;uploadBusy=true;try{await saveQueue;const all=await replayRows(),rows=all.filter(r=>!r.uploaded);if(!rows.length){progress(all.length?'All saved replays are already uploaded.':'No recorded duels yet. Play a duel first.');return {uploaded:0}}let sent=0;for(const row of rows){progress(`Uploading ${sent+1} / ${rows.length}â€¦`);const response=await fetch(REPLAY_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:row.bytes,signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error(`Upload failed (${response.status}). Tap again to retry; your replays are safe.`);const d=await db();await new Promise((resolve,reject)=>{const tx=d.transaction('duels','readwrite'),s=tx.objectStore('duels'),q=s.get(row.id);q.onsuccess=()=>{if(q.result?.steps===row.steps&&q.result?.ended===row.ended)s.put({...q.result,uploaded:true})};tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});sent++}progress(`Uploaded ${sent} replay${sent===1?'':'s'}. Thank you!`);return {uploaded:sent}}finally{uploadBusy=false}}

export function captureBehaviour(record,context={}){
 if(!record)throw Error('No replay is available for this duel yet.');
 return {record:clone(record),context:clone(context),at:Date.now()};
}
// Flags have their own durable outbox; duel journal retention never evicts them.
async function flagTransaction(action){const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction('flags','readwrite');action(tx.objectStore('flags'));tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Flag storage aborted.'))})}
export async function pendingBehaviourFlags(){const d=await db();return new Promise((resolve,reject)=>{const q=d.transaction('flags').objectStore('flags').getAll();q.onsuccess=()=>resolve(q.result.sort((a,b)=>a.at-b.at));q.onerror=()=>reject(q.error)})}
let flagSendQueue=Promise.resolve();
export function sendUnsentFlags(){
 const task=flagSendQueue.then(async()=>{
  const rows=await pendingBehaviourFlags();let sent=0;const errors=[];
  for(const row of rows){try{
   if(row.bytes.byteLength>=20000)throw Error('Replay exceeds the 20 kB upload limit.');
   const response=await fetch(REPLAY_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:row.bytes,signal:AbortSignal.timeout(20000)});
   if(!response.ok){const detail=await response.json().catch(()=>null);const error=Error(detail?.error||`Report upload failed (${response.status}). Your flag remains saved for retry.`);error.serviceUnavailable=response.status===503||response.status===429;throw error;}
   const result=await response.json();if(!result.ok||result.id!==row.id)throw Error('The service did not confirm this report.');
   await flagTransaction(store=>store.delete(row.id));sent++;
  }catch(error){errors.push(error.message);if(error.serviceUnavailable)break}}
  return {ok:errors.length===0,sent,pending:rows.length-sent,error:errors[0]||null};
 });flagSendQueue=task.catch(()=>{});return task;
}
export async function uploadBehaviour(capture,description){
 const text=String(description||'').trim();
 if(!text||text.length>2000)throw Error('Describe the behaviour in 1â€“2,000 characters.');
 const record=clone(capture.record);
 record.behaviourReport={...capture.context,version:1,description:text,at:capture.at,step:record.responses.length};
 const bytes=await packReplay(record),id=await hash(bytes);
 try{await flagTransaction(store=>store.put({id,at:capture.at,bytes}))}catch{throw Error('Could not save this flag on your device. Keep this window open and retry.');}
 const result=await sendUnsentFlags();
 return {...result,id,saved:true};
}
