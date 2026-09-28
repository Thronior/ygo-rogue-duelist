import fs from 'node:fs';import assert from 'node:assert/strict';import {MobileDuel,M,I,L} from './web/duel.js';import {smartContext} from './web/smart_policy.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('./web/'+n+'.json',import.meta.url))),meta=read('content'),data=read('engine-data'),id=n=>meta.cards.find(c=>c.name===n).id;
for(const p of [0,1]){
 const e=new MobileDuel(meta.cards);Object.assign(e,{data,lp:[8000,8000],player:1-p,activeChain:[],events:[],visuals:[],peak:{}});
 const attacker={code:id('Battle Ox'),controller:1-p,location:L.MZONE,sequence:0,position:1,attack:1700};
 const weak={code:id('Petit Dragon'),controller:p,location:L.MZONE,sequence:0,position:1,attack:600};
 // Make this attack lethal so conservation does not mask chain-negation behavior.
 e.lp[p]=1000;e.attackCard=attacker;e.attackTarget=weak;
 e.query=(side,loc)=>loc===L.MZONE?[side===p?weak:attacker]:[];
 for(const first of ['Magic Cylinder','Sakuretsu Armor','Negate Attack','Mirror Force'])for(const second of ['Magic Cylinder','Sakuretsu Armor','Negate Attack','Mirror Force']){
  e.activeChain=[{code:id(first),player:p,link:1}];assert(smartContext(e,p,L).activation({code:id(second)},true)<0);
  e.activeChain[0].inactive=true;assert(smartContext(e,p,L).activation({code:id(second)},true)>=0,'Negated protection permits a response');
 }
 e.activeChain=[];e.player=p;
 const response=e.auto({type:M.SELECT_IDLECMD,player:p,activates:[],summons:[],special_summons:[],pos_changes:[weak],monster_sets:[],spell_sets:[],to_bp:true,to_ep:true});
 assert.equal(response.action,I.SELECT_POS_CHANGE);assert.equal(response.index,0);
}
console.log('PASS overlapping attack-stop traps, negated traps and legal defensive switches for both players');
