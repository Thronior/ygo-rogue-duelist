// Ultimate Collector opened with no match in progress (user screenshot, 2026-11-25): the reconnect timer read
// this.hubInfo.pause while hubInfo was still unset, because undefined===undefined matched the missing room code,
// and showed "Cannot read properties of undefined (reading 'pause')". It must draw quietly with no room and no hub data.
import assert from 'node:assert/strict';
const el=()=>({style:{},classList:{add(){},remove(){},toggle(){},contains:()=>false},setAttribute(){},removeAttribute(){},addEventListener(){},removeEventListener(){},appendChild(){},querySelector:()=>null,querySelectorAll:()=>[],remove(){},dataset:{}});
globalThis.window??=globalThis;globalThis.addEventListener??=()=>{};globalThis.removeEventListener??=()=>{};globalThis.document??={createElement:el,getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){},body:el(),documentElement:el()};
globalThis.Audio??=class{play(){return Promise.resolve()}pause(){}};globalThis.Image??=class{};globalThis.navigator??={};globalThis.location??={href:'',search:'',hostname:'localhost'};globalThis.matchMedia??=()=>({matches:false,addEventListener(){}});globalThis.requestAnimationFrame??=()=>0;
globalThis.localStorage??={getItem:()=>null,setItem(){},removeItem(){}};
const {CollectorUI}=await import('./web/collector-ui.js');
const ui=Object.create(CollectorUI.prototype);
Object.assign(ui,{alive:true,seat:0,room:null,session:{connected:true},root:el(),hubSend(){},overlay(){},drawPause(){}});
const timers=[];const realSet=globalThis.setInterval;globalThis.setInterval=(f)=>{timers.push(f);return 1;};
try{
  for(const hubInfo of [undefined,{code:'ABCD',pause:{until:null}}]){ui.hubInfo=hubInfo;ui.room=null;assert.doesNotThrow(()=>ui.updateReconnectTimer(),'no room, hubInfo '+JSON.stringify(hubInfo));timers.forEach(f=>assert.doesNotThrow(f));}
  // A room with no hub data yet is fine too.
  ui.hubInfo=undefined;ui.room={code:'ABCD',players:[{},{}],phase:'deck',seen:[Date.now(),Date.now()]};assert.doesNotThrow(()=>ui.updateReconnectTimer());
}finally{globalThis.setInterval=realSet;}
console.log('uc no-match pause: ok');
