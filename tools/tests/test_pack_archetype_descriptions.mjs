import assert from 'node:assert/strict';
import {packSummary} from '../../android/web/experience-ui.js';

const content={
 packs:[{id:'spirit-toon-test',name:'Test pack',common:[1,2],rare:[]}],
 cards:[
  {id:1,name:'Vorse Raider',desc:'A plain monster.',race:'Warrior',attribute:'DARK',data:{type:1|0x200,setcodes:[]}},
  {id:2,name:'Mystic Tomato',desc:'A plain monster.',race:'Plant',attribute:'DARK',data:{type:1|0x400000,setcodes:[]}}
 ]
};

assert.match(packSummary(content,'spirit-toon-test'),/Archetypes: Spirit, Toon\./,
 'Spirit and Toon monster flags should be reported as pack archetypes');
console.log('PASS pack summaries recognize Spirit and Toon monster flags');
