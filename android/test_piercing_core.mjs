import fs from 'node:fs';import {fileURLToPath} from 'node:url';import assert from 'node:assert/strict';import {MobileDuel,L} from './web/duel.js';import {smartContext} from './web/smart_policy.js';
const root=fileURLToPath(new URL('./web/',import.meta.url)),read=n=>JSON.parse(fs.readFileSync(root+n+'.json')),meta=read('content'),id=n=>meta.cards.find(c=>c.name===n).id,e=await new MobileDuel(meta.cards).init([read('engine-data'),read('scripts')]);
for(const spell of ['Fairy Meteor Crush','Big Bang Shot']){
const setup=`Debug.ReloadFieldBegin(DUEL_MODE_MR1,0) Debug.SetPlayerInfo(0,8000,0,1) Debug.SetPlayerInfo(1,8000,0,1) for p=0,1 do for i=1,10 do Debug.AddCard(${id('Battle Ox')},p,p,LOCATION_DECK,0,POS_FACEDOWN_DEFENSE) end end local m=Debug.AddCard(${id('Uraby')},1,1,LOCATION_MZONE,0,POS_FACEUP_ATTACK) local s=Debug.AddCard(${id(spell)},1,1,LOCATION_SZONE,0,POS_FACEUP_ATTACK) Debug.PreEquip(s,m) Debug.ReloadFieldEnd()`;
e.start(Array(25).fill(id('Battle Ox')),Array(25).fill(id('Battle Ox')),8000,8000,0,34,[],[],setup);e.core.startDuel(e.h);e.advance();const monster=e.query(1,L.MZONE)[0],equip=e.query(1,L.SZONE)[0];assert.equal(equip.equipCard.controller,1);assert.equal(equip.equipCard.location,L.MZONE);assert.equal(smartContext(e,0,L).pierce(monster,1),true);assert.deepEqual(e.errors,[]);e.destroy();console.log('PASS core equip query and piercing:',spell);
}

