import fs from 'node:fs';import assert from 'node:assert/strict';import {MobileDuel,M,L,I,R} from './web/duel.js';import {smartContext} from './web/smart_policy.js';
const meta=JSON.parse(fs.readFileSync(new URL('./web/content.json',import.meta.url))),data=JSON.parse(fs.readFileSync(new URL('./web/engine-data.json',import.meta.url))),id=n=>meta.cards.find(c=>c.name===n).id;let checks=0;
for(const p of [0,1]){
 const e=new MobileDuel(meta.cards);Object.assign(e,{data,lp:[8000,8000],turn:3,player:p,phase:256,events:[],visuals:[],peak:{},pendingSummons:[],activeChain:[],battleProtected:[false,false]});
 const c=(name,location,sequence=0,controller=p,position=1)=>({code:id(name),controller,location,sequence,position});
 let back=Array.from({length:4},(_,i)=>c('Reinforcements',L.SZONE,i,p,8));
 const own=[{...c('Battle Ox',L.MZONE),attack:1700,defense:1000}];
 e.query=(s,l)=>l===L.SZONE?s===p?back:[c('Axe of Despair',L.SZONE,0,1-p)]:l===L.MZONE?s===p?own:[]:l===L.DECK?Array.from({length:12},()=>c('Battle Ox',l)):l===L.HAND?Array.from({length:7},(_,i)=>c('Poison of the Old Man',l,i)):[];
 const idle=(activates=[],spell_sets=[])=>e.auto({type:M.SELECT_IDLECMD,player:p,activates,spell_sets,summons:[],special_summons:[],pos_changes:[],monster_sets:[],to_bp:false,to_ep:true});
 for(const name of ['Poison of the Old Man','Pot of Greed','Mystical Space Typhoon']){
  assert.equal(idle([c(name,L.HAND)]).action,I.SELECT_ACTIVATE,name);checks++;
 }
 for(const name of ['Axe of Despair','Swords of Revealing Light','Royal Decree']){
  assert.equal(smartContext(e,p,L).activation(c(name,L.HAND)),-1,name);checks++;
 }
 assert.equal(idle([], [c('Reinforcements',L.HAND)]).action,I.TO_EP);checks++;
 // Already-set cards can activate even with four or five occupied slots.
 for(const size of [4,5]){
  back=Array.from({length:size},(_,i)=>c('Reinforcements',L.SZONE,i,p,8));back[0]=c('Poison of the Old Man',L.SZONE,0,p,8);
  assert.equal(idle([back[0]]).action,I.SELECT_ACTIVATE);checks++;
 }
 back=Array.from({length:3},(_,i)=>c('Reinforcements',L.SZONE,i,p,8));
 assert.equal(idle([], [c('Reinforcements',L.HAND)]).action,I.SELECT_SPELL_SET);checks++;
 e.effect={code:id('Poison of the Old Man'),player:p};
 const option=()=>e.auto({type:M.SELECT_OPTION,player:p,options:[8842266*16,8842266*16+1]}).index;
 e.lp[p]=8000;e.lp[1-p]=8000;assert.equal(option(),1);checks++;
 e.lp[p]=1000;assert.equal(option(),0);checks++;
 e.lp[1-p]=800;assert.equal(option(),1);checks++;
}
console.log('PASS',checks,'fifth-zone temporary activations, permanent/set limits, existing set activations and Poison choices');
