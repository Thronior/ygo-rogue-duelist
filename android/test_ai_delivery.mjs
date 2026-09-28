import {fileURLToPath} from 'node:url';
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {once} from 'node:events';
import {publishNativeResponse} from './web/native-response.js';
import {MobileDuel,M,L,B} from './web/duel.js';
import {encodeNativeResponse} from './web/vendor/package/dist/index.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('./web/'+n+'.json',import.meta.url))),meta=read('content'),data=read('engine-data');
const id=n=>meta.cards.find(c=>c.name===n).id;
for(const player of [0,1])for(const position of [1,4])for(const to_m2 of [true,false]){
 const e=new MobileDuel(meta.cards),own=[{code:id('Battle Ox'),controller:player,location:L.MZONE,sequence:0,position:1,attack:1100,defense:1200}];
 const enemy=[{code:id('Silver Fang'),controller:1-player,location:L.MZONE,sequence:0,position,attack:1100,defense:position===4?1100:700}];
 Object.assign(e,{data,lp:[8000,3000],turn:3,player,phase:8,events:[],visuals:[],peak:{},pendingSummons:[],activeChain:[],battleProtected:[false,false]});
 e.query=(p,l)=>l===L.MZONE?(p===player?own:enemy):[];
 const choice=e.auto({type:M.SELECT_BATTLECMD,player,chains:[],attacks:own,to_m2,to_ep:true});
 assert.equal(choice.action,position===1?B.SELECT_BATTLE:to_m2?B.TO_M2:B.TO_EP);
 assert.equal(encodeNativeResponse(choice).length,4);
}
const folder=fs.mkdtempSync(path.join(os.tmpdir(),'rogue-ai-delivery-')),file=path.join(folder,'response.json');
try{
 let writes=0,renames=0;fs.writeFileSync(file,'{"id":1}');
 const io={writeFileSync(...a){writes++;fs.writeFileSync(...a)},renameSync(...a){if(renames++<3){assert.equal(JSON.parse(fs.readFileSync(file)).id,1);throw Object.assign(Error('locked'),{code:'EPERM'})}fs.renameSync(...a)}};
 const result={id:2,response:[2,0,0,0]};assert.equal(await publishNativeResponse(io,file,result,{wait:async()=>{}}),3);assert.equal(writes,1);assert.deepEqual(JSON.parse(fs.readFileSync(file)),result);
 await assert.rejects(publishNativeResponse({writeFileSync(){throw Object.assign(Error('disk full'),{code:'ENOSPC'})}},file,result),/disk full/);
 if(process.platform==='win32'){
  const script=`import ctypes,time,sys\nk=ctypes.windll.kernel32\nk.CreateFileW.restype=ctypes.c_void_p\nh=k.CreateFileW(sys.argv[1],0x80000000,1,None,3,0,None)\nassert h != ctypes.c_void_p(-1).value\nprint('READY',flush=True)\ntime.sleep(.35)\nk.CloseHandle(ctypes.c_void_p(h))`;
  const child=spawn(fileURLToPath(new URL('../python/python.exe',import.meta.url)),['-c',script,file],{windowsHide:true,stdio:['ignore','pipe','pipe']});
  const exited=once(child,'exit');await once(child.stdout,'data');
  const retries=await publishNativeResponse(fs,file,{id:3,response:[3,0,0,0]});assert(retries>0,'must exercise a real Windows sharing violation');assert.equal((await exited)[0],0);assert.equal(JSON.parse(fs.readFileSync(file)).id,3);
 }
 console.log('PASS 8 equal-stat battle decisions, retry without duplicate writes, permanent-error handling, and real Windows file-lock recovery');
}finally{assert.equal(path.dirname(path.resolve(folder)),path.resolve(os.tmpdir()));assert(path.basename(folder).startsWith('rogue-ai-delivery-'));fs.rmSync(folder,{recursive:true,force:true})}
