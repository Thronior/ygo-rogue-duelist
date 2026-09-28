import fs from 'node:fs';import assert from 'node:assert/strict';
import {MobileDuel,M,L} from './web/duel.js';import {smartContext} from './web/smart_policy.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('./web/'+n+'.json',import.meta.url)));
const meta=read('content'),data=read('engine-data'),id=n=>meta.cards.find(c=>c.name===n).id;
let checks=0;
for(const p of [0,1]){
 const e=new MobileDuel(meta.cards);e.data=data;e.lp=[8000,8000];e.player=1-p;e.activeChain=[];e.events=[];e.visuals=[];e.peak={};let back=[];
 e.query=(side,loc)=>loc===L.SZONE&&side===p?back:loc===L.DECK?Array(10).fill({code:id('Battle Ox')}):[];
 const jar={code:id('Jar of Greed'),controller:p,location:L.SZONE,sequence:0,position:8};
 const chain=code=>e.onMessage({type:M.CHAINING,code,controller:p,triggering_controller:p,chain_size:e.activeChain.length+1});
 assert(smartContext(e,p,L).activation(jar,true)>0);
 chain(jar.code);chain(id('Mystical Space Typhoon'));
 assert(smartContext(e,p,L).activation(jar,true)<0,'Check entire chain, not just latest link');
 e.onMessage({type:M.CHAIN_END});assert.equal(e.activeChain.length,0);
 assert(smartContext(e,p,L).activation(jar,true)>0,'A new chain may use the card again');
 e.activeChain=[{code:jar.code,player:1-p}];assert(smartContext(e,p,L).activation(jar,true)>0,'Opponent copy is not our own activation');e.activeChain=[];
 const wishes={code:id('Solemn Wishes'),controller:p,location:L.SZONE,sequence:1,position:1};back=[wishes];
 assert(smartContext(e,p,L).activation({...wishes,sequence:2},true)<0,'Reject redundant face-up continuous copy');
 assert(smartContext(e,p,L).activation(wishes,true)>0,'Do not suppress the source itself');
 back=[{...wishes,position:8}];assert(smartContext(e,p,L).activation({...wishes,sequence:2},true)>0,'Face-down copy does not provide an active effect');
 checks+=7;
}
console.log(`PASS ${checks} duplicate activation/chain cases for both sides`);
