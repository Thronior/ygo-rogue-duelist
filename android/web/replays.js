// Local, lossless duel journals. Uploads are initiated by players in Settings or Flag behaviour.
export const REPLAY_ENDPOINT='https://ygo-rogue-replays.hadow--un--esktop.workers.dev/v1/replays';
export const stringify=value=>JSON.stringify(value,(_,v)=>typeof v==='bigint'?{$bigint:String(v)}:v);
export const parse=text=>JSON.parse(text,(_,v)=>v&&typeof v==='object'&&Object.keys(v).length===1&&'$bigint'in v?BigInt(v.$bigint):v);
const clone=value=>parse(stringify(value));
let database,saveQueue=Promise.resolve(),uploadBusy=false;
export async function hash(bytes){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('')}
export async function packReplay(record){return new Uint8Array(await new Response(new Blob([stringify(record)]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer())}
export async function unpackReplay(bytes){return parse(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text())}
function db(){return database??=new Promise((resolve,reject)=>{const r=indexedDB.open('ygo-duel-replays',1);r.onupgradeneeded=()=>r.result.createObjectStore('duels',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>{database=null;reject(r.error)}})}
export async function replayRows(){const d=await db();return new Promise((resolve,reject)=>{const r=d.transaction('duels').objectStore('duels').getAll();r.onsuccess=()=>resolve(r.result.sort((a,b)=>b.at-a.at));r.onerror=()=>reject(r.error)})}
export function storeReplay(record){if(!globalThis.indexedDB)return Promise.resolve();const copy=clone(record);const task=saveQueue.then(async()=>{const bytes=await packReplay(copy),id=await hash(new TextEncoder().encode(stringify(copy.start))),d=await db();await new Promise((resolve,reject)=>{const tx=d.transaction('duels','readwrite'),s=tx.objectStore('duels'),q=s.get(id);q.onsuccess=()=>{const old=q.result;if(old?.steps>copy.responses.length)return;s.put({id,at:old?.at||copy.at,bytes,steps:copy.responses.length,uploaded:old?.steps===copy.responses.length&&old?.ended===copy.ended?old.uploaded:false,ended:copy.ended});const all=s.getAll();all.onsuccess=()=>{for(const row of all.result.sort((a,b)=>b.at-a.at).slice(100))s.delete(row.id)}};tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});});saveQueue=task.catch(e=>console.warn('Replay storage:',e.message));return task}
export function startRecording(engine,args){engine.replayRecord={format:'ygo-replay',version:1,core:'ocgcore-wasm-0.1.2',build:'0.1.28',at:Date.now(),start:clone(args),responses:[],ended:false};}
export function recordResponse(engine,response){if(!engine.replayRecord)return;engine.replayRecord.responses.push(clone(response));if(engine.finished)engine.replayRecord.ended=true;clearTimeout(engine.replaySaveTimer);engine.replaySaveTimer=setTimeout(()=>{void saveRecording(engine)},500)}
export function saveRecording(engine){clearTimeout(engine.replaySaveTimer);if(!engine.replayRecord)return Promise.resolve();return storeReplay(engine.replayRecord).catch(e=>console.warn('Replay storage:',e.message))}
export async function uploadReplays(progress=()=>{}){if(uploadBusy)return;uploadBusy=true;try{await saveQueue;const all=await replayRows(),rows=all.filter(r=>!r.uploaded);if(!rows.length){progress(all.length?'All saved replays are already uploaded.':'No recorded duels yet. Play a duel first.');return {uploaded:0}}let sent=0;for(const row of rows){progress(`Uploading ${sent+1} / ${rows.length}…`);const response=await fetch(REPLAY_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:row.bytes,signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error(`Upload failed (${response.status}). Tap again to retry; your replays are safe.`);const d=await db();await new Promise((resolve,reject)=>{const tx=d.transaction('duels','readwrite'),s=tx.objectStore('duels'),q=s.get(row.id);q.onsuccess=()=>{if(q.result?.steps===row.steps&&q.result?.ended===row.ended)s.put({...q.result,uploaded:true})};tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});sent++}progress(`Uploaded ${sent} replay${sent===1?'':'s'}. Thank you!`);return {uploaded:sent}}finally{uploadBusy=false}}

export function captureBehaviour(record,context={}){
 if(!record)throw Error('No replay is available for this duel yet.');
 return {record:clone(record),context:clone(context),at:Date.now()};
}
export async function uploadBehaviour(capture,description){
 const text=String(description||'').trim();
 if(!text||text.length>2000)throw Error('Describe the behaviour in 1–2,000 characters.');
 const record=clone(capture.record);
 record.behaviourReport={version:1,description:text,at:capture.at,step:record.responses.length,...capture.context};
 const bytes=await packReplay(record);
 if(bytes.byteLength>=20000)throw Error('This replay exceeds the 20 kB upload limit. Your report has not been sent.');
 const response=await fetch(REPLAY_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:bytes,signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw Error(`Report upload failed (${response.status}). Please retry.`);
 const result=await response.json();if(!result.ok||!result.id)throw Error('The service did not confirm the upload. Please retry.');
 return result;
}
