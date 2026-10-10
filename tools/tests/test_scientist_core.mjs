import fs from 'node:fs';import assert from 'node:assert/strict';import {MobileDuel,L} from '../../android/web/duel.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('../../android/web/'+n+'.json',import.meta.url)));const meta=read('content'),id=n=>meta.cards.find(c=>c.name===n).id;
const e=await new MobileDuel(meta.cards).init([read('engine-data'),read('scripts')]);let removed=false,paid=false,chosen=false;
try{e.start(Array(40).fill(id('Magical Scientist')),Array(40).fill(id('Vorse Raider')),8000,8000,5,42,[id('Flame Swordsman'),id('Thousand-Eyes Restrict')]);
 for(let i=0;i<220&&!e.finished;i++){
  const response=e.auto();if(e.effect?.code===id('Magical Scientist')&&e.pending?.selects?.every(c=>c.location===L.EXTRA)){const choice=e.pending.selects[response.indicies?.[0]];assert.equal(choice?.code,id('Thousand-Eyes Restrict'));chosen=true;}
  e.respond(response);if(e.lp[0]===7000)paid=true;
  if(e.query(0,L.SZONE).some(c=>c?.code===id('Vorse Raider'))){removed=true;break;}
 }
 assert.ok(chosen,'Choose Thousand-Eyes Restrict with real engine options');assert.ok(paid,'Pay once');assert.ok(removed,'Activate absorption and remove enemy threat');assert.deepEqual(e.errors,[]);console.log('PASS real core: Scientist pays once, selects removal fusion and absorbs Vorse Raider');
}finally{e.destroy()}
