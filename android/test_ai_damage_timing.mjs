import assert from 'node:assert/strict';
import fs from 'node:fs';
import {smartContext,damageStepModifiers} from './web/smart_policy.js';
import {MobileDuel,M,L} from './web/duel.js';
const {cards}=JSON.parse(fs.readFileSync(new URL('./web/content.json',import.meta.url)));
const data=JSON.parse(fs.readFileSync(new URL('./web/engine-data.json',import.meta.url)));
const scripts=JSON.parse(fs.readFileSync(new URL('./web/scripts.json',import.meta.url)));
const defender={code:89631139,controller:1,location:L.MZONE,sequence:0,position:4,attack:3000,defense:2500};
const attacker={...defender,controller:0,position:1,attack:2900};
const e={cards:new Map(cards.map(c=>[c.id,c])),data,lp:[8000,1000],player:0,phase:8,inDamageStep:false,activeChain:[],attackCard:attacker,attackTarget:defender,name:id=>cards.find(c=>c.id===id)?.name,query:(p,l)=>l===L.MZONE?[p===1?defender:attacker]:[]};
let checks=0;
for(const name of damageStepModifiers){
 const card=cards.find(c=>c.name===name);assert.ok(card,name);
 assert.ok(scripts[`c${card.id}.lua`].includes('EFFECT_FLAG_DAMAGE_STEP'),name+' script supports damage step');
 const c={code:card.id,controller:1,location:L.SZONE,sequence:0};
 for(const phase of [1,2,4,8,16,128,256,512]){
  e.player=0;e.phase=phase;e.inDamageStep=false;
  assert.equal(smartContext(e,1,L).activation(c,true),-1,name+' withheld before damage');checks++;
 }
 // Holding the card must not alter any of its own-turn policy scores.
 e.player=1;e.phase=8;e.inDamageStep=false;const own=smartContext(e,1,L).activation(c,true);
 e.inDamageStep=true;assert.equal(smartContext(e,1,L).activation(c,true),own,name+' own turn unchanged');checks++;
}
const castle={code:44209392,controller:1,location:L.SZONE,sequence:0};
e.player=0;e.phase=8;e.inDamageStep=false;assert.equal(smartContext(e,1,L).activation(castle,true),-1);
e.inDamageStep=true;assert.ok(smartContext(e,1,L).activation(castle,true)>0);
e.inDamageStep=false;e.phase=32;assert.ok(smartContext(e,1,L).activation(castle,true)>0);
e.phase=64;assert.ok(smartContext(e,1,L).activation(castle,true)>0);checks+=4;
// Unrelated effects and declaration-only stat modifiers keep their original timing.
e.phase=8;assert.ok(smartContext(e,1,L).activation({code:62279055},true)>0);checks++;
const blast={code:98239899,location:L.GRAVE};
const outside=smartContext(e,1,L).activation(blast,true);e.inDamageStep=true;
assert.equal(smartContext(e,1,L).activation(blast,true),outside);checks++;
assert.ok(!damageStepModifiers.has('Amazoness Archers'));assert.ok(!damageStepModifiers.has('Adhesion Trap Hole'));checks+=2;
const duel=new MobileDuel([]);Object.assign(duel,{events:[],visuals:[],activeChain:[],player:0,peak:{turns:0}});
duel.onMessage({type:M.DAMAGE_STEP_START});assert.equal(duel.inDamageStep,true);
duel.onMessage({type:M.DAMAGE_STEP_END});assert.equal(duel.inDamageStep,false);
duel.onMessage({type:M.DAMAGE_STEP_START});duel.onMessage({type:M.NEW_TURN,player:1});assert.equal(duel.inDamageStep,false);checks+=3;
console.log(`Damage-step timing: ${checks} checks passed across ${damageStepModifiers.size} modifiers`);
