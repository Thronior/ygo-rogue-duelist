import fs from 'node:fs';import assert from 'node:assert/strict';
import {MobileDuel,L} from './web/duel.js';import {smartContext} from './web/smart_policy.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('./web/'+n+'.json',import.meta.url))),meta=read('content'),data=read('engine-data');
for(const p of [0,1]){
 const e=new MobileDuel(meta.cards);Object.assign(e,{data,lp:[8000,8000],player:p,turn:3,phase:4,activeChain:[],battleProtected:[false,false]});let zones={};e.query=(side,loc)=>zones[side+':'+loc]||[];
 const card=(n,side=p,pos=1,sequence=0)=>{const code=meta.cards.find(c=>c.name===n).id;return {code,controller:side,location:L.MZONE,sequence,position:pos,attack:data[code].attack,defense:data[code].defense}};
 const put=(side,...cards)=>zones[side+':'+L.MZONE]=cards;
 const prompt={to_bp:true,summons:[],pos_changes:[]},policy=()=>smartContext(e,p,L,prompt),spell=n=>({...card(n),location:L.HAND});
 const lord=card('Lord of D.',1-p),horus=card('Horus the Black Flame Dragon LV6',1-p,1,1);put(1-p,lord,horus);
 assert(policy().activation(spell('Change of Heart'))<0,'Do not budget an immune/protected Horus as the useful stolen target');
 put(1-p,card('Battle Ox',1-p));assert(policy().activation(spell('Change of Heart'))>=0,'Keep useful direct-attack theft');assert(policy().activation(spell('Brain Control'))>=0);
 e.phase=256;prompt.to_bp=false;assert(policy().activation(spell('Brain Control'))<0,'No pointless MP2 theft');assert(policy().activation(spell('Change of Heart'))<0);
 put(p,card('Battle Ox'));prompt.summons=[{...card('Summoned Skull'),location:L.HAND}];assert(policy().activation(spell('Change of Heart'))>=0,'Preserve concrete tribute upgrade');prompt.summons=[];
 e.phase=4;prompt.to_bp=true;put(p);put(1-p,card('Horus the Black Flame Dragon LV6',1-p));assert(policy().activation(spell('Change of Heart'))<0,'Spell immunity without Lord of D');
 const rat=card('Prevent Rat',p,4);put(p,rat);put(1-p,card('Shining Abyss',1-p));prompt.pos_changes=[rat];assert(policy().activation(spell('Invigoration'))<0,'Do not weaken a wall for unusable ATK');
 const ox=card('Battle Ox',p,4);put(p,ox);prompt.pos_changes=[ox];assert(policy().activation(spell('Invigoration'))>=0,'Use equip when defender can turn and beat a target');
 put(p,rat);prompt.pos_changes=[rat];rat.attack=1600;put(1-p,card('Shining Abyss',1-p),card('Cure Mermaid',1-p,1,1));assert.equal(policy().attackOpportunity(rat),true,'Attack the weaker visible target even when another monster ties ATK');
 put(1-p,card('Blue-Eyes White Dragon',1-p),card('Cure Mermaid',1-p,1,1));assert.equal(policy().attackOpportunity(rat),false,'Do not expose a wall to a stronger remaining attacker');
 put(1-p,card('Cure Mermaid',1-p,8));assert.equal(policy().attackOpportunity(rat),false,'Do not inspect unknown facedown identity');
 e.phase=256;prompt.to_bp=false;put(1-p);assert.equal(policy().attackOpportunity(rat),false,'No attack-position switch after battle');
}
console.log('PASS Oct14 CPU reports: control value/immunity, defensive equips, favourable attacks and counterattack safety in both seats');
