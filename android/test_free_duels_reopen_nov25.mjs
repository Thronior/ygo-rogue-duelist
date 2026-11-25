// Free Duels reopen (2026-11-25): the setup remembers which seat was being edited. Seat 0 was never restored (only seat 1
// was), so the seat stayed undefined and every second visit to Free Duels threw "reading 'ultimate_collector'" and never
// opened. Restoring either seat must leave a usable seat and category.
import assert from 'node:assert/strict';
const el=()=>({style:{},classList:{add(){},remove(){},toggle(){},contains:()=>false},setAttribute(){},addEventListener(){},removeEventListener(){},appendChild(){},querySelector:()=>null,querySelectorAll:()=>[],dataset:{}});
globalThis.window??=globalThis;globalThis.addEventListener??=()=>{};globalThis.removeEventListener??=()=>{};
globalThis.document??={createElement:el,getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){},body:el(),documentElement:el()};
globalThis.Audio??=class{play(){return Promise.resolve()}pause(){}};globalThis.Image??=class{};globalThis.navigator??={};globalThis.matchMedia??=()=>({matches:false,addEventListener(){}});
const store={};globalThis.localStorage??={getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]}};
const {SandboxSetup}=await import('./web/sandbox-setup.js');
const content={characters:{3:{name:'A'},7:{name:'B',ultimate_collector:true}},cpuDecks:{3:[{label:'Tier 1',main:[1],extra:[]}],7:[{label:'Tier 1',main:[1],extra:[]}]},sandboxRelics:[],artifacts:{}};
for(const side of [0,1,undefined]){
 const s=Object.create(SandboxSetup.prototype);Object.assign(s,{content,ids:[3,7],characters:[3,7],tiers:[0,0],relics:[[],[]],ownDecks:[null,null]});s.ownDeckList=()=>[];
 assert.doesNotThrow(()=>s.restore({characters:[3,7],tiers:[0,0],own:[null,null],relics:[[],[]],side}),`remembered seat ${side}`);
 assert.equal(s.editSide,side===1?1:0);assert.equal(s.category,side===1?'uc':'regular');
}
console.log('PASS Free Duels reopens with either remembered seat');
