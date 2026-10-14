const KEY='shadow-run-mobile';
let database;
function open(){return database ||= new Promise((resolve,reject)=>{
 const request=indexedDB.open('ygo-rogue-saves',1);
 request.onupgradeneeded=()=>request.result.createObjectStore('saves');
 request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();database=undefined;};resolve(db);};request.onerror=()=>{database=undefined;reject(request.error);};
});}
async function transaction(mode,operation){const db=await open();return new Promise((resolve,reject)=>{
 const tx=db.transaction('saves',mode),request=operation(tx.objectStore('saves'));
 tx.oncomplete=()=>resolve(request.result);tx.onerror=()=>reject(tx.error||request.error||Error('Could not access game saves.'));tx.onabort=()=>reject(tx.error||Error('Save interrupted'));
});}
export function validateSave(text){
 const files=JSON.parse(text);if(!files||Array.isArray(files)||typeof files!=='object')throw Error('Not a game save backup.');
 for(const [name,value] of Object.entries(files)){
  if(!/^[\w-]+\.(json|bak)$/.test(name)||typeof value!=='string')throw Error('Invalid save file.');
  JSON.parse(value);
 }
 if(!Object.keys(files).length)throw Error('This backup is empty.');
 return text;
}
export const webStorage={
 async load(){const saved=await transaction('readonly',s=>s.get(KEY));if(saved!==undefined)return saved;
  const legacy=localStorage.getItem(KEY);if(legacy){validateSave(legacy);await this.store(legacy);return legacy;}return '{}';},
 async store(text){try{await transaction('readwrite',s=>s.put(text,KEY));return true;}catch(error){const pending=database;database=undefined;try{(await pending)?.close();}catch{}throw new Error(storageError(error),{cause:error});}},
 async saveGame(text){try{return await this.store(text);}catch(error){return recoverSave(text,error);}}
};

export function storageError(error){
 if(error?.name==='QuotaExceededError')return 'There is not enough browser storage to save your progress. Free some device space, then retry. Do not clear site data without exporting your save.';
 return error?.message?.trim()||'Browser storage is unavailable. Check your browser storage permissions, then retry.';
}
export function exportSave(text){
 validateSave(text);const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download='YGO-Rogue-save-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
function recoverSave(text,error){
 // Keep this exact command pending: retry the write, never repeat its game action.
 return new Promise(resolve=>{
  const box=document.createElement('dialog');box.id='web-save-recovery';
  box.innerHTML='<h2>Progress could not be saved</h2><p role="alert"></p><p>Your latest progress is still in this window. Export a backup before closing it. Your previous saved progress has not been replaced.</p><div class="web-actions"><button data-save-export>Export current progress</button><button data-save-retry>Retry saving</button></div>';
  const message=box.querySelector('[role="alert"]'),retry=box.querySelector('[data-save-retry]');message.textContent=storageError(error);
  box.addEventListener('cancel',event=>event.preventDefault());
  box.querySelector('[data-save-export]').onclick=()=>{try{exportSave(text);}catch(e){message.textContent=storageError(e);}};
  retry.onclick=async()=>{retry.disabled=true;try{await webStorage.store(text);box.close();box.remove();resolve(true);}catch(e){message.textContent=storageError(e);}finally{retry.disabled=false;}};
  document.body.append(box);box.showModal();
 });
}
