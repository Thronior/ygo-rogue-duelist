// Guest browser sessions cannot sign in or sync. Keep only game reconnect data
// in the desktop save directory so closing that session does not lose a room.
export async function installDesktopStorage(){
 const token=new URLSearchParams(location.search).get('desktop');if(!token)return;
 const rpc=async(action,value)=>{const r=await fetch('/desktop-rpc',{method:'POST',headers:{'Content-Type':'application/json','X-Shadow-Token':token},body:JSON.stringify({action,value})});const data=await r.json();if(!r.ok)throw Error(data.error||'Could not save reconnect data');return data.result};
 const allowed=k=>['tag-last-code','tag-endpoint'].includes(k)||k.startsWith('tag-draft:')||/^https?:/.test(k)&&(/:tag:|:tag-outbox:/.test(k));
 const set=Storage.prototype.setItem,remove=Storage.prototype.removeItem;
 const saved=await rpc('desktop-storage-load');for(const [key,value] of Object.entries(saved))if(allowed(key)&&typeof value==='string')set.call(localStorage,key,value);
 let queue=Promise.resolve();window.flushDesktopStorage=()=>queue;
 const persist=(key,value)=>{queue=queue.catch(()=>{}).then(()=>rpc('desktop-storage-write',{key,value}));queue.catch(error=>console.error('Reconnect data:',error.message))};
 Storage.prototype.setItem=function(key,value){set.call(this,key,value);if(this===localStorage&&allowed(String(key)))persist(String(key),String(value))};
 Storage.prototype.removeItem=function(key){remove.call(this,key);if(this===localStorage&&allowed(String(key)))persist(String(key),null)};
}
