import fs from 'node:fs';
import assert from 'node:assert/strict';
import {MobileDuel,M,L} from './web/duel.js';
import {smartContext} from './web/smart_policy.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('./web/'+n+'.json',import.meta.url),'utf8'));
const meta=read('content'),data=read('engine-data'),id=n=>{const c=meta.cards.find(c=>c.name===n);assert(c,n);return c.id};
for(const p of [0,1]){
 const e=new MobileDuel(meta.cards);
 Object.assign(e,{data,lp:[8000,8000],player:1-p,activeChain:[],events:[],visuals:[],peak:{}});
 const card=(n,controller,location,sequence=0)=>({code:id(n),controller,location,sequence,position:8});
 const jammer=card('Magic Jammer',p,L.SZONE),mirror=card('Mirror Force',p,L.SZONE,1);
 let back=[jammer];
 e.query=(side,loc)=>side===p&&loc===L.SZONE?back:side===p&&loc===L.HAND?[card('Battle Ox',p,L.HAND)]:[];
 const score=(n,targets=[])=>{
  e.onMessage({type:M.CHAIN_END});
  e.onMessage({type:M.CHAINING,code:id(n),controller:1-p,triggering_controller:1-p,chain_size:1});
  if(targets.length)e.onMessage({type:M.BECOME_TARGET,cards:targets});
  return smartContext(e,p,L).activation(jammer,true);
 };
 assert(score('Mystical Space Typhoon',[jammer])<0,'Do not discard to save Jammer itself');
 back=[jammer,mirror];
 assert(score('Mystical Space Typhoon',[jammer])<0,'Unthreatened backrow does not justify negation');
 assert(score('Mystical Space Typhoon',[mirror])>0,'Protect another targeted trap');
 for(const n of ['Heavy Storm',"Harpie's Feather Duster",'Giant Trunade']){
  back=[jammer];assert(score(n)<0,n+': only Jammer is affected');
  back=[jammer,mirror];assert(score(n)>0,n+': protect additional backrow');
 }
 back=[jammer];
 assert(score('Pot of Greed')>0,'Still counter valuable unrelated spells');
 assert(score('Stamping Destruction',[jammer])>0,'Do not classify removal with extra damage as pure removal');
 assert(score('Mystical Space Typhoon')>0,'Missing target information must not fabricate self-targeting');
 assert(smartContext(e,p,L).activation(jammer,false)<0,'Only activate as a response');
}
console.log('PASS Magic Jammer resource guard for both CPU seats: self-target, other target, mass removal, extra effects and unknown targets');
