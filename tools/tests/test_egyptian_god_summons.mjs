import assert from 'node:assert/strict';
import fs from 'node:fs';
import {I,L,M,MobileDuel} from '../../android/web/duel.js';

const read=name=>JSON.parse(fs.readFileSync(new URL(`../../android/web/${name}.json`,import.meta.url),'utf8'));
const content=read('content');
const id=name=>content.cards.find(card=>card.name===name).id;
const gods=['Slifer the Sky Dragon','Obelisk the Tormentor','The Winged Dragon of Ra'];
const duel=await new MobileDuel(content.cards).init([read('engine-data'),read('scripts')]);

try{
 duel.start(Array(40).fill(id('Vorse Raider')),Array(40).fill(id('Vorse Raider')),8000,8000,5,217);
 for(const god of gods){
  const card={code:id(god),controller:1,location:L.HAND,sequence:0,position:8};
  const prompt={type:M.SELECT_IDLECMD,player:1,to_bp:false,activates:[],summons:[card],special_summons:[],spell_sets:[],monster_sets:[],pos_changes:[]};
  const response=duel.auto(prompt);
  assert.equal(response.action,I.SELECT_SUMMON,`${god} should be selected whenever the engine offers a legal Normal Summon`);
  assert.equal(response.index,0);
 }
 for(const god of gods.slice(0,2)){
  const card={code:id(god),controller:1,location:L.GRAVE,sequence:0,position:8};
  const prompt={type:M.SELECT_IDLECMD,player:1,to_bp:false,activates:[],summons:[],special_summons:[card],spell_sets:[],monster_sets:[],pos_changes:[]};
  const response=duel.auto(prompt);
  assert.equal(response.action,I.SELECT_SPECIAL_SUMMON,`${god} should be selected when the engine offers a legal Special Summon`);
  assert.equal(response.index,0);
 }
 const illegalRaSpecial={code:id('The Winged Dragon of Ra'),controller:1,location:L.GRAVE,sequence:0,position:8};
 const response=duel.auto({type:M.SELECT_IDLECMD,player:1,to_bp:false,activates:[],summons:[],special_summons:[illegalRaSpecial],spell_sets:[],monster_sets:[],pos_changes:[]});
 assert.notEqual(response.action,I.SELECT_SPECIAL_SUMMON,'Ra must remain barred from Special Summoning');
 assert.deepEqual(duel.errors,[]);
 console.log('PASS CPU selects legal Egyptian God summons and preserves Ra Special Summon restriction');
}finally{duel.destroy()}
