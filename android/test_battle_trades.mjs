import fs from 'node:fs';import assert from 'node:assert/strict';import {MobileDuel,M,L,B,R} from './web/duel.js';
const meta=JSON.parse(fs.readFileSync(new URL('./web/content.json',import.meta.url))),data=JSON.parse(fs.readFileSync(new URL('./web/engine-data.json',import.meta.url))),id=n=>meta.cards.find(c=>c.name===n).id;
let checks=0;
for(const p of [0,1]){
 const e=new MobileDuel(meta.cards);Object.assign(e,{data,lp:[8000,8000],turn:3,player:p,phase:8,events:[],visuals:[],peak:{},pendingSummons:[],activeChain:[],battleProtected:[false,false]});
 const mon=(attack,defense,position,controller,sequence=0,name='Battle Ox')=>({code:id(name),attack,defense,position,controller,sequence,location:L.MZONE});
 let own=[mon(1100,1200,1,p)],enemy=[mon(1100,700,1,1-p)];e.query=(s,l)=>l===L.MZONE?(s===p?own:enemy):[];
 const battle=()=>e.auto({type:M.SELECT_BATTLECMD,player:p,chains:[],attacks:own,to_m2:true,to_ep:true});
 assert.equal(battle().action,B.SELECT_BATTLE);checks++;
 own.push(mon(1700,1000,1,p,1));assert.equal(battle().index,1);checks++;own.pop();
 enemy=[mon(1100,1100,4,1-p),mon(1100,700,1,1-p,1)];
 e.attacker={...own[0],player:p};e.selectionHint=549;
 const target=()=>e.auto({type:M.SELECT_CARD,player:p,min:1,max:1,selects:enemy});
 assert.deepEqual(target().indicies,[1]);checks++;
 enemy.push(mon(2000,700,4,1-p,2));assert.deepEqual(target().indicies,[2]);checks++;
 enemy=[mon(1100,1100,4,1-p)];assert.equal(battle().action,B.TO_M2);checks++;
 enemy=[mon(1100,700,1,1-p)];e.battleProtected[1-p]=true;assert.equal(battle().action,B.TO_M2);checks++;e.battleProtected[1-p]=false;
 own=[mon(0,1200,1,p)];enemy=[mon(0,0,1,1-p)];assert.equal(battle().action,B.TO_M2);checks++;
 own=[mon(300,1200,1,p)];enemy=[mon(300,200,1,1-p,0,'Spirit Reaper')];assert.equal(battle().action,B.TO_M2);checks++;
 own=[mon(1100,1200,1,p)];enemy=[mon(1200,700,1,1-p)];assert.equal(battle().action,B.TO_M2);checks++;
}
console.log('PASS',checks,'equal-ATK trade preferences, winning attack priority, target selection, equal-DEF/zero-ATK/protection exclusions');
