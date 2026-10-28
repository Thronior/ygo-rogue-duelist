import fs from 'node:fs';import assert from 'node:assert/strict';import {MobileDuel,M,L,B} from './web/duel.js';import {smartContext} from './web/smart_policy.js';
// Stat relics and Field Spells skip face-down monsters, so a flipped-down monster gets them
// back when it is flipped for battle. Report: the CPU kept attacking flipped-down Anubis walls.
const read=n=>JSON.parse(fs.readFileSync(new URL('./web/'+n+'.json',import.meta.url))),meta=read('content'),data=read('engine-data'),id=n=>meta.cards.find(c=>c.name===n).id;
const p=1,nocturnal=[[{effect:'approved_nocturnal_guard',amount:0,filter:''}],[]];
const e=new MobileDuel(meta.cards);Object.assign(e,{data,lp:[8000,8000],turn:6,player:p,phase:8,events:[],visuals:[],peak:{},pendingSummons:[],activeChain:[],battleProtected:[false,false],aiModifiers:{activeRelics:[['cursed_nocturnal_guard'],[]],statRelics:nocturnal}});
const mon=(name,position,controller,attack,defense)=>({code:id(name),attack,defense,position,controller,sequence:0,location:L.MZONE});
const keeper=mon('Royal Keeper',8,0,1600,1700),koumori=mon('Koumori Dragon',1,p,1800,1500);
e.query=(s,l)=>l===L.MZONE?(s===p?[koumori]:[keeper]):[];
const remember=()=>e.fieldKnowledge.seats[p].set(e.fieldKnowledge.key(keeper),keeper.code);
const hidden=()=>smartContext(e,p,L,{to_bp:true}).hiddenDefense(keeper);
remember();
assert.equal(hidden(),2300,'remembered Royal Keeper gains Nocturnal Guard DEF on the CPU turn');
e.player=0;assert.equal(hidden(),1700,'Nocturnal Guard adds no DEF during its owner turn');e.player=p;
e.aiModifiers.statRelics=[[],[]];assert.equal(hidden(),1700,'no relic, printed DEF');e.aiModifiers.statRelics=nocturnal;
e.fieldKnowledge.seats[p].clear();assert.equal(hidden(),1600,'an unseen set card keeps its anonymous estimate plus the relic');
remember();
const battle=()=>e.auto({type:M.SELECT_BATTLECMD,player:p,chains:[],attacks:[koumori],to_m2:true,to_ep:true});
assert.equal(battle().action,B.TO_M2,'1800 ATK does not attack a remembered 2300 DEF wall');
e.aiModifiers.statRelics=[[],[]];assert.equal(battle().action,B.SELECT_BATTLE,'without the relic 1800 ATK beats 1700 DEF');
console.log('PASS hidden DEF includes face-up-only relics');
