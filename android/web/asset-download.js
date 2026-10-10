export async function downloadBlob(path,{request=fetch,attempts=3,timeout=90000,delay=ms=>new Promise(r=>setTimeout(r,ms))}={}){
 let last;
 for(let i=0;i<attempts;i++){
  const controller=new AbortController();let timer;
  try{return await Promise.race([(async()=>{const r=await request(path,{cache:'force-cache',signal:controller.signal});if(!r.ok)throw Error('HTTP '+r.status);const blob=await r.blob();if(!blob.size)throw Error('Empty asset');return blob})(),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('Download timed out'))},timeout)})]);}
  catch(error){last=error;if(i+1<attempts)await delay(500*2**i)}finally{clearTimeout(timer)}
 }
 throw Error(path+': '+last.message);
}
