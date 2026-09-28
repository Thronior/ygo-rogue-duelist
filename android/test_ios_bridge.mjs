import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('./web/mobile.js',import.meta.url),'utf8');
const persistence=source.slice(source.indexOf('async function persist()'),source.indexOf('function command('));
const execute=source.slice(source.indexOf('async function executeCommand('),source.indexOf('async function notices('));
for(const asynchronous of [false,true]){
 let writes=0,completed=false;
 const ctx={window:{},ShadowNative:{store:()=>asynchronous?new Promise(r=>setTimeout(()=>{writes++;r(true)},15)):(writes++,true)},py:{FS:{readdir:()=>['run.json'],readFile:()=>'{"gold":40}'},globals:{set(){}},runPythonAsync:async()=>'{"result":"ok"}'},state:null,JSON};ctx.window.ShadowNative=ctx.ShadowNative;
 vm.createContext(ctx);vm.runInContext(persistence+execute,ctx);
 const pending=ctx.executeCommand('{}').then(x=>{completed=true;return x});
 if(asynchronous){await new Promise(r=>setTimeout(r,1));assert.equal(completed,false,'must await native disk write')}
 assert.equal(await pending,'ok');assert.equal(writes,1);
 ctx.ShadowNative.store=()=>asynchronous?Promise.resolve(false):false;
 await assert.rejects(()=>ctx.executeCommand('{}'),/Could not save/);
 ctx.ShadowNative.store=()=>Promise.reject(Error('disk full'));
 await assert.rejects(()=>ctx.executeCommand('{}'),/disk full/);
}
console.log('PASS: synchronous Android and async iOS saves await durable completion and propagate failures.');
