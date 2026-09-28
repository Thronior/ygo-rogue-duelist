import fs from 'node:fs';
import assert from 'node:assert/strict';
import {MobileDuel,M,R,L} from './web/duel.js';
import {smartContext} from './web/smart_policy.js';
const meta=JSON.parse(fs.readFileSync(new URL('./web/content.json',import.meta.url)));
const ring=meta.cards.find(c=>c.name==='Ring of Destruction');
const ox=meta.cards.find(c=>c.name==='Battle Ox');
const dragon=meta.cards.find(c=>c.name==='Blue-Eyes White Dragon');
let checks=0;
for(const p of [0,1])for(const lp of [1000,1700,1701,2500,3000,3001]){
 const e=new MobileDuel(meta.cards);
 e.data=Object.fromEntries(meta.cards.map(c=>[c.id,{type:c.type.includes('Monster')?1:4,attack:c.atk,defense:c.defense}]));
 e.lp=[8000,8000];e.lp[p]=lp;e.player=1-p;
 e.effect={code:ring.id,player:p};
 // Two targets: activation can find Battle Ox safe, generic removal used to pick Blue-Eyes.
 const targets=[ox,dragon].map((c,sequence)=>({code:c.id,controller:1-p,location:L.MZONE,sequence,position:1,attack:c.atk}));
 e.query=(side,loc)=>loc===L.MZONE&&side===1-p?targets:[];
 const policy=smartContext(e,p,L);
 assert.equal(policy.activation({code:ring.id},true)>=0,lp>1700);
 if(lp>1700){
  const m={type:M.SELECT_CARD,player:p,min:1,max:1,selects:targets.map(({attack,position,...c})=>c)};
  const r=e.auto(m);assert.equal(r.type,R.SELECT_CARD);
  assert(targets[r.indicies[0]].attack<lp,`Unsafe Ring target at ${lp} LP`);
 }
 // Current attack, not the printed stat, must determine lethal damage.
 targets[0].attack=lp;
 targets[1].attack=lp+500;
 assert(policy.activation({code:ring.id},true)<0);
 for(const c of targets)assert(policy.targetScore(ring.name,c,{})<0);
 checks++;
}
console.log(`PASS Ring safety: ${checks} player/LP cases; activation, selected target, modified ATK and exact-lethal boundaries`);
