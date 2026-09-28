import fs from 'node:fs';import assert from 'node:assert/strict';import {MobileDuel,M,L,I} from './web/duel.js';import {smartContext} from './web/smart_policy.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('./web/'+n+'.json',import.meta.url))),meta=read('content'),data=read('engine-data'),id=n=>meta.cards.find(c=>c.name===n).id;let count=0;
for(const p of [0,1]){
 const e=new MobileDuel(meta.cards);Object.assign(e,{data,lp:[8000,8000],player:p,phase:4,turn:1,activeChain:[],battleProtected:[false,false]});let zones={};e.query=(s,l)=>zones[s+':'+l]||[];
 const card=(name,side=p,loc=L.MZONE,position=1)=>({code:id(name),controller:side,location:loc,sequence:0,position});const reaper=card('Spirit Reaper',p,L.HAND),set={...reaper,location:L.MZONE,position:8};
 const put=(s,l,...c)=>zones[s+':'+l]=c;const check=(v,msg)=>{assert(v,msg);count++};
 const idle={type:M.SELECT_IDLECMD,player:p,activates:[],summons:[reaper],special_summons:[],pos_changes:[],monster_sets:[reaper],spell_sets:[],to_bp:false,to_ep:true};
 put(p,L.HAND,reaper);put(p,L.MZONE,card('Blue-Eyes White Dragon'));check(e.auto(idle).action===I.SELECT_MONSTER_SET,'Turn-one Reaper sets even with another friendly monster');
 put(p,L.MZONE,set);const flip={...idle,summons:[],monster_sets:[],pos_changes:[set],to_bp:true};
 e.turn=3;check(e.auto(flip).action===I.SELECT_POS_CHANGE,'Open direct attack allows flipping');
 for(const name of ['Kuriboh','Blue-Eyes White Dragon']){put(1-p,L.MZONE,card(name,1-p));check(e.auto(flip).action!==I.SELECT_POS_CHANGE,'No flipping against any enemy monster')}
 put(1-p,L.MZONE);put(1-p,L.SZONE,card('Mirror Force',1-p,L.SZONE,8));check(e.auto(flip).action!==I.SELECT_POS_CHANGE,'Unknown back row prevents treating direct attack as safe');
 put(1-p,L.SZONE,card('Swords of Revealing Light',1-p,L.SZONE));check(e.auto(flip).action!==I.SELECT_POS_CHANGE,'Visible attack restriction keeps Reaper defensive');put(1-p,L.SZONE);
 e.battleProtected[1-p]=true;check(e.auto(flip).action!==I.SELECT_POS_CHANGE,'Resolved battle protection prevents a meaningful direct attack');e.battleProtected[1-p]=false;
 e.phase=256;check(e.auto({...flip,to_bp:false}).action!==I.SELECT_POS_CHANGE,'Never flip to attack in main phase 2');e.phase=4;
 put(p,L.MZONE,{...set,attack_disabled:true});check(e.auto(flip).action!==I.SELECT_POS_CHANGE,'Attack-disabled Reaper stays defensive');
 put(p,L.MZONE,{...set,position:1});put(1-p,L.MZONE,card('Kuriboh',1-p));check(e.auto(flip).action===I.SELECT_POS_CHANGE,'Attack-position Reaper switches to defense without direct attack');
 e.turn=1;check(smartContext(e,p,L).position('Spirit Reaper',reaper)===false,'Special-summoned Reaper chooses defense on turn one');
 e.turn=3;put(1-p,L.MZONE);check(smartContext(e,p,L).position('Spirit Reaper',reaper)===true,'Special summon may choose attack only for a clear direct attack');
}
console.log('PASS',count,'Spirit Reaper position decisions across both seats');
