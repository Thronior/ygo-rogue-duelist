import fs from 'node:fs';import assert from 'node:assert/strict';import {MobileDuel,M,L} from './web/duel.js';import {smartContext} from './web/smart_policy.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('./web/'+n+'.json',import.meta.url))),meta=read('content'),data=read('engine-data');
const id=n=>{const c=meta.cards.find(c=>c.name===n);assert(c,'missing card '+n);return c.id;};
const C={Reinf:id('Reinforcements'),Stop:id('Stop Defense'),Ox:id('Battle Ox'),Cave:id('The Dragon Dwelling in the Cave'),Elf:id('Gemini Elf'),MElf:id('Mystical Elf'),Gob:id('Goblin Attack Force'),Orc:id('Giant Orc'),Fang:id('Silver Fang')};
const mon=(code,controller,position,attack,defense,sequence=0)=>({code,controller,location:L.MZONE,sequence,position,attack,defense});
function ctx(p,own,enemy,extra={}){
 const e=new MobileDuel(meta.cards);
 Object.assign(e,{data,lp:[8000,8000],player:p,activeChain:[],events:[],visuals:[],peak:{},phase:0,attacker:null,effect:null,battleProtected:[false,false],...extra});
 e.query=(side,loc)=>loc===L.MZONE?(side===p?own:enemy):[];
 return e;
}
// Tweak 1: no Reinforcements into an already-doomed defense monster.
{
 const p=1,own=[mon(C.Cave,p,1,900,800),mon(C.Elf,p,1,1900,900)];
 let e=ctx(p,own,[mon(C.Fang,1-p,4,1200,300)],{phase:8,attacker:{code:C.Cave,player:p,attack:900}});
 assert(smartContext(e,p,L).activation({code:C.Reinf},true)<0,'reinfo wasted on already-doomed 300 DEF');
 e=ctx(p,own,[mon(C.Fang,1-p,4,1200,1200)],{phase:8,attacker:{code:C.Cave,player:p,attack:900}});
 assert(smartContext(e,p,L).activation({code:C.Reinf},true)>=0,'reinfo still fires when the boost flips the outcome');
 e=ctx(p,own,[mon(C.Fang,1-p,8)],{phase:8,attacker:{code:C.Cave,player:p,attack:900}});
 assert(smartContext(e,p,L).activation({code:C.Reinf},true)>=0,'reinfo still fires into face-down unknowns');
}
// Tweak 2: no Stop Defense on high-ATK defenders the AI cannot run over.
{
 const p=1,own=[mon(C.Ox,p,1,1700,1000),mon(C.MElf,p,4,800,2000)];
 let e=ctx(p,own,[mon(C.Orc,1-p,4,2000,500)]);
 assert(smartContext(e,p,L).activation({code:C.Stop},false)<0,'stop defense withheld without a stronger striker');
 e=ctx(p,[mon(C.Ox,p,1,2600,1000)],[mon(C.Orc,1-p,4,2000,500)]);
 assert(smartContext(e,p,L).activation({code:C.Stop},false)>=0,'stop defense fires with a stronger striker');
 e=ctx(p,own,[mon(C.Fang,1-p,4,1200,1500)]);
 assert(smartContext(e,p,L).activation({code:C.Stop},false)>=0,'stop defense still fires on high-DEF low-ATK defenders');
 e=ctx(p,[mon(C.Ox,p,1,2600,1000)],[mon(C.Fang,1-p,8)]);
 assert(smartContext(e,p,L).activation({code:C.Stop},false)>=0,'stop defense keeps legacy face-down behavior');
}
// Tweak 3: battle targets prefer killable-now defense monsters, highest ATK first.
{
 const p=1;
 const e=new MobileDuel(meta.cards);
 Object.assign(e,{data,lp:[8000,8000],player:p,activeChain:[],events:[],visuals:[],peak:{},effect:null});
 const atk=mon(C.Ox,p,1,1800,1000);
 const gob=mon(C.Gob,1-p,4,2300,0,0),orc=mon(C.Orc,1-p,4,2200,0,1),silver=mon(C.Fang,1-p,1,1200,800,2);
 e.query=(side,loc)=>loc===L.MZONE?(side===p?[atk]:[gob,orc,silver]):[];
 e.attacker={code:C.Ox,player:p,attack:1800};
 e.selectionHint=549;
 const r=e.auto({type:M.SELECT_CARD,player:p,selects:[{...gob},{...orc},{...silver}],min:1});
 assert.deepEqual(r.indicies,[0],'AI targets the 2300-ATK defense monster before 2200-ATK and attack-position options');
}
console.log('PASS reinforcements waste-guard, stop-defense striker rule and defense-target priority');
