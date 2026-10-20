import fs from 'node:fs';
import assert from 'node:assert/strict';
import {MobileDuel,L,M,R,I} from '../../android/web/duel.js';

const read=name=>JSON.parse(fs.readFileSync(new URL(`../../android/web/${name}.json`,import.meta.url)));
const content=read('content');
const id=name=>content.cards.find(card=>card.name===name)?.id;
const polymerization=id('Polymerization');
const flameManipulator=id('Flame Manipulator');
const masaki=id('Masaki the Legendary Swordsman');
const flameSwordsman=id('Flame Swordsman');
assert.ok([polymerization,flameManipulator,masaki,flameSwordsman].every(Boolean));

const duel=await new MobileDuel(content.cards).init([read('engine-data'),read('scripts')]);
try{
 duel.start([
  ...Array(12).fill(id('Axe of Despair')),
  ...Array(8).fill(flameManipulator),
  ...Array(8).fill(masaki),
  ...Array(8).fill(polymerization),
  ...Array(4).fill(id('Vorse Raider'))
 ],Array(40).fill(id('Vorse Raider')),8000,8000,25,42,[flameSwordsman]);

 let fusionCue;
 for(let step=0;step<9&&!duel.finished;step++){
  const prompt=duel.pending;
  let response=duel.auto(prompt);
  if(prompt.type===M.SELECT_IDLECMD){
   const index=prompt.activates.findIndex(card=>card.code===polymerization);
   if(index>=0)response={type:R.SELECT_IDLECMD,action:I.SELECT_ACTIVATE,index};
  }else if(prompt.type===M.SELECT_CARD){
   const index=prompt.selects.findIndex(card=>card.location===L.EXTRA);
   if(index>=0)response={type:R.SELECT_CARD,indicies:[index]};
  }else if(prompt.type===M.SELECT_UNSELECT_CARD){
   const index=prompt.select_cards.findIndex(card=>card.code===flameManipulator||card.code===masaki);
   if(index>=0)response={type:R.SELECT_UNSELECT_CARD,index};
  }
  duel.respond(response);
  fusionCue=duel.visuals.find(cue=>cue.kind==='fusion-summon');
  if(fusionCue)break;
 }

 assert.ok(fusionCue,'real OCG fusion summon should emit an animation cue');
 assert.equal(fusionCue.code,flameSwordsman);
 assert.deepEqual(new Set(fusionCue.materials),new Set([flameManipulator,masaki]));
 assert.ok(fusionCue.materialCards.every(card=>[flameManipulator,masaki].includes(card.code)));
 assert.ok(!fusionCue.materials.includes(polymerization),'a spell must never be animated as a material');
 assert.deepEqual(duel.errors,[]);
 console.log('PASS real OCG Fusion cue includes exactly the two monster materials and excludes Polymerization.');
}finally{
 duel.destroy();
}
