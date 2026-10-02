const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=require('node:path').resolve(__dirname,'..');
(async()=>{
 let intervals=0,destroyed=0,created=0,release;
 const removed=[];
 class TagDuel{async init(){await new Promise(r=>release=r)}destroy(){destroyed++}startTag(){created++}}
 const env={TagDuel,document:{getElementById:id=>({remove(){removed.push(id)}}),removeEventListener(){}},setInterval(){intervals++;return 1},clearInterval(){},clearTimeout(){}};
 const source=fs.readFileSync(root+'/android/web/collector-ui.js','utf8').replace(/^import .*\r?\n/gm,'').replace('export class CollectorUI','class CollectorUI');
 vm.createContext(env);vm.runInContext(source+'\nglobalThis.CollectorUI=CollectorUI;',env);
 const C=env.CollectorUI;
 for(let n=0;n<100;n++){
  const ui=Object.create(C.prototype);Object.assign(ui,{alive:true,content:{cards:[],tokenCards:[]},seat:0});
  const pending=ui.updateDuel({code:'TEST',game:1,first:0});ui.destroy();release();await pending;
  assert.equal(ui.alive,false);
  await ui.accept({});ui.updateReconnectTimer();
 }
 assert.equal(created,0);assert.equal(intervals,0);assert.equal(destroyed,200);
 assert.equal(removed.filter(x=>x==='collector-turn-timer').length,100);
 const ui=Object.create(C.prototype);let syncRelease;
 Object.assign(ui,{alive:true,sync:()=>new Promise(r=>syncRelease=r),updateReconnectTimer(){throw Error('Timer restarted after exit')}});
 const pending=ui.accept({});ui.destroy();syncRelease();await pending;
 console.log('PASS 100 exits during engine initialization and delayed poll: no restarted duel/timer; both timer overlays removed');
})().catch(e=>{console.error(e);process.exitCode=1});
