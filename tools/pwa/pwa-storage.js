const KEY='shadow-run-mobile';
let database;
function open(){return database ||= new Promise((resolve,reject)=>{
 const request=indexedDB.open('ygo-rogue-saves',1);
 request.onupgradeneeded=()=>request.result.createObjectStore('saves');
 request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
});}
async function transaction(mode,operation){const db=await open();return new Promise((resolve,reject)=>{
 const tx=db.transaction('saves',mode),request=operation(tx.objectStore('saves'));
 tx.oncomplete=()=>resolve(request.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Save interrupted'));
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
 async store(text){await transaction('readwrite',s=>s.put(text,KEY));return true;}
};
