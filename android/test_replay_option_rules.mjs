import fs from 'node:fs';
import assert from 'node:assert/strict';
import {MobileDuel,L,M,R} from './web/duel.js';
import {smartContext} from './web/smart_policy.js';

const read=n=>JSON.parse(fs.readFileSync(new URL('./web/'+n+'.json',import.meta.url),'utf8'));
const cards=read('content').cards,data=read('engine-data'),scripts=read('scripts');
const id=n=>cards.find(c=>c.name===n).id;
const e=await new MobileDuel(cards).init([data,scripts]);
try{
 e.lp=[8000,8000];e.player=0;e.turn=6;e.phase=4;e.effect={code:id('Dark Scorpion - Cliff the Trap Remover'),player:0};
 const zones={};e.query=(p,l)=>zones[`${p}:${l}`]||[];
 const modeOptions=[(6967870n<<20n)+1n,(6967870n<<20n)+2n];
 assert.equal(smartContext(e,0,L).resourceOption(modeOptions),1,'Cliff mills when opponent has no back row');
 zones[`1:${L.SZONE}`]=[{code:id('Castle Walls'),controller:1,location:L.SZONE,sequence:0,position:8}];
 assert.equal(smartContext(e,0,L).resourceOption(modeOptions),0,'Cliff removes back row when one is present');

 e.effect={code:id('Ominous Fortunetelling'),player:0};e.ominousGuesses=0;
 const publicSpell={code:id('De-Spell'),controller:1,location:L.HAND,sequence:0,isPublic:true};
 const publicSpell2={code:id('Black Illusion Ritual'),controller:1,location:L.HAND,sequence:1,isPublic:true};
 const publicMonster={code:id('Sonic Bird'),controller:1,location:L.HAND,sequence:2,isPublic:true};
 const hiddenMonster={code:id('Blue-Eyes White Dragon'),controller:1,location:L.HAND,sequence:3};
 zones[`1:${L.HAND}`]=[publicSpell,publicSpell2,publicMonster,hiddenMonster];
 const prompt={type:M.SELECT_OPTION,player:0,options:[70,71,72]};
 assert.deepEqual(e.auto(prompt),{type:R.SELECT_OPTION,index:1},'Ominous uses only the two revealed Spells, not a hidden Monster');
 zones[`1:${L.HAND}`]=[hiddenMonster];
 const blind=e.auto(prompt);assert.equal(blind.type,R.SELECT_OPTION);assert([0,1,2].includes(blind.index),'Blind guess stays within legal options');
 console.log('PASS replay-driven Cliff and Ominous Fortunetelling option rules');
}finally{e.destroy();}
