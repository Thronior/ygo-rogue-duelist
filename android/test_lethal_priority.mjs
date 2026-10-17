import fs from 'node:fs';import assert from 'node:assert/strict';import {MobileDuel,M,L,B} from './web/duel.js';
const meta=JSON.parse(fs.readFileSync(new URL('./web/content.json',import.meta.url))),data=JSON.parse(fs.readFileSync(new URL('./web/engine-data.json',import.meta.url))),id=n=>meta.cards.find(c=>c.name===n).id;
for(const p of [0,1]){
 const e=new MobileDuel(meta.cards);Object.assign(e,{data,lp:[2000,2000],turn:3,player:p,phase:8,events:[],visuals:[],peak:{},pendingSummons:[],activeChain:[],battleProtected:[false,false]});
 const mon=(name,attack,defense,position,controller,sequence)=>({code:id(name),attack,defense,position,controller,sequence,location:L.MZONE});
 let own=[mon('Battle Ox',3000,1000,1,p,0)],enemy=[mon('Blue-Eyes White Dragon',3000,1000,4,1-p,0),mon('Battle Ox',1000,1000,1,1-p,1)];
 e.query=(side,loc)=>loc===L.MZONE?(side===p?own:enemy):[];
 const battle=()=>e.auto({type:M.SELECT_BATTLECMD,player:p,chains:[],attacks:own,to_m2:true,to_ep:true});
 assert.equal(battle().action,B.SELECT_BATTLE);
 e.attacker={...own[0],player:p};e.selectionHint=549;
 const target=()=>e.auto({type:M.SELECT_CARD,player:p,min:1,max:1,selects:enemy});
 assert.deepEqual(target().indicies,[1],'Choose lethal over high-ATK defensive Dragon');
 e.expertTarget={turn:3,attacker:0,target:0};assert.deepEqual(target().indicies,[1],'Recheck lethal instead of stale planned removal');e.expertTarget=null;
 enemy[0].position=1;enemy[0].attack=1100;
 assert.deepEqual(target().indicies,[1],'Avoid leaving 100 LP to remove the stronger monster');
 own=[mon('Battle Ox',3500,1000,1,p,0),mon('Battle Ox',3000,1000,1,p,1)];enemy=[mon('Battle Ox',1000,1000,1,1-p,0)];e.lp[1-p]=2400;
 assert.equal(battle().index,0,'Choose the attacker that can deal lethal');
 e.battleProtected[1-p]=true;assert.equal(battle().action,B.TO_M2,'Respect Waboku');
}
console.log('PASS lethal target and attacker priority for both players, stale plans, and battle protection');
