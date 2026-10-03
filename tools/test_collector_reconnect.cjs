const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('android/web/collector-ui.js','utf8').replace(/^import .*\r?\n/gm,'').replace('export class CollectorUI','class CollectorUI');
class TagDuel{
 async init(){} destroy(){} startTag(){this.visuals=[{id:'opening'}];this.respondingSeat=0;this.turn=1;this.n=0}
 respondFor(seat,n){assert.equal(n,this.n++);this.visuals.push({id:n})}
 cuesFor(seat,cues){return cues} snapshotFor(){return {number:this.n}}
}
const env={TagDuel,structuredClone,decode:x=>x};vm.createContext(env);vm.runInContext(source+'\nglobalThis.C=CollectorUI',env);
(async()=>{
 for(let reconnect=0;reconnect<4;reconnect++){
  const shown=[],ui=Object.create(env.C.prototype);
  Object.assign(ui,{alive:true,seat:0,content:{cards:[],tokenCards:[],characters:{0:{name:'A'},1:{name:'B'}}},api:async()=>{},onDuel:async(s,c)=>shown.push({n:s.number,ids:Array.from(c,x=>x.id)})});
  const room={code:'ROOM',game:1,first:0,players:[{character:0},{character:1}],decks:[{main:[1],extra:[]},{main:[2],extra:[]}],events:Array.from({length:20},()=>({seat:0,response:{}}))};
  await ui.updateDuel(room);assert.deepEqual(shown,[{n:20,ids:[]}]);
  await ui.updateDuel(room);assert.equal(shown.length,1);
  room.events.push({seat:0,response:{}});await ui.updateDuel(room);assert.deepEqual(shown[1],{n:21,ids:[20]});
  ui.api=async()=>{throw Error('offline clock')};room.events.push({seat:0,response:{}});await ui.updateDuel(room);assert.equal(shown.length,3);
  let fail=true;ui.onDuel=async(s,c)=>{if(fail){fail=false;throw Error('temporary render failure')}shown.push({n:s.number,ids:Array.from(c,x=>x.id)})};
  room.events.push({seat:0,response:{}});await assert.rejects(()=>ui.updateDuel(room));await ui.updateDuel(room);assert.deepEqual(shown.at(-1),{n:23,ids:[]});
 }
 // Initialization owns the same queue as clicks and polls.
 const ui=Object.create(env.C.prototype),order=[];let release;
 Object.assign(ui,{alive:true,queue:Promise.resolve(),initialize:async()=>{order.push('init');await new Promise(r=>release=r);order.push('ready')}});
 const opening=ui.init(),click=ui.enqueue(()=>order.push('click'));await Promise.resolve();assert.deepEqual(order,['init']);release();await Promise.all([opening,click]);assert.deepEqual(order,['init','ready','click']);
 console.log('PASS repeated reconnect: silent 20-event rebuild, one animation per new response, unchanged polls, clock failure recovery, failed render retry, serialized initialization');
})().catch(e=>{console.error(e);process.exitCode=1});

