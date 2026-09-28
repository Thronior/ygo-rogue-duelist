// Keep the computed move intact while the Windows game briefly holds the file open.
// Retrying publication must never replay duel messages or compute another move.
export async function publishNativeResponse(io,file,result,{wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),maxRetries=120}={}){
 const temporary=file+'.tmp',payload=JSON.stringify(result);
 let retries=0,written=false;
 for(;;){
  try{
   if(!written){io.writeFileSync(temporary,payload);written=true;}
   io.renameSync(temporary,file);
   return retries;
  }catch(error){
   if(!['EPERM','EACCES','EBUSY'].includes(error.code)||retries>=maxRetries)throw error;
   retries++;
   await wait(Math.min(100,10*retries));
  }
 }
}
