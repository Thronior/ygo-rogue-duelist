import assert from 'node:assert/strict';
import fs from 'node:fs';
import {L} from '../../android/web/engine.js';
import {smartContext} from '../../android/web/smart_policy.js';

const content=JSON.parse(fs.readFileSync(new URL('../../android/web/content.json',import.meta.url),'utf8'));
const byName=n=>content.cards.find(c=>c.name===n);
const cards=new Map(content.cards.map(c=>[c.id,c]));
const locations=[L.HAND,L.MZONE,L.SZONE,L.GRAVE,L.DECK,L.REMOVED,L.EXTRA];
const zones=[0,1].map(()=>Object.fromEntries(locations.map(loc=>[loc,[]])));
const card=(n,controller,location,sequence=0,position=1)=>{const c=byName(n);assert.ok(c,`missing card data: ${n}`);return {code:c.id,controller,location,sequence,position,attack:c.atk,defense:c.defense,level:c.level,type:c.data.type};};
const engine={cards,data:Object.fromEntries(content.cards.map(c=>[c.id,{...c.data,attack:c.atk,defense:c.defense}])),turn:3,player:0,phase:4,lp:[8000,8000],aiModifiers:{},activeChain:[],name:id=>cards.get(id)?.name,query:(p,loc)=>zones[p][loc]||[],unknownDefense:()=>1000};
const policy=()=>smartContext(engine,0,L,{to_bp:true});
const clear=()=>{for(const side of zones)for(const loc of locations)side[loc]=[];engine.aiModifiers={};engine.lp=[8000,8000];engine.player=0;engine.phase=4;engine.turn=3;};

// Kaibaman's summon effect is more valuable than hiding it when Blue-Eyes is ready.
clear();const kaibaman=card('Kaibaman',0,L.HAND),blueEyes=card('Blue-Eyes White Dragon',0,L.HAND,1);zones[0][L.HAND]=[kaibaman,blueEyes];
let smart=policy();assert.equal(smart.summonScore(kaibaman),180,'prioritize Kaibaman when its Blue-Eyes effect is live');assert.equal(smart.preferSet(kaibaman),false,'do not set Kaibaman face-down when its effect can summon Blue-Eyes');

// Do not spend Exiled Force as a vanilla 1000 ATK opening summon with no target.
clear();const exiled=card('Exiled Force',0,L.HAND);zones[0][L.HAND]=[exiled];smart=policy();assert.equal(smart.summonScore(exiled),-1,'hold Exiled Force until a worthwhile opposing monster is available');
zones[1][L.MZONE]=[card('Blue-Eyes White Dragon',1,L.MZONE)];assert.ok(policy().summonScore(exiled)>=100,'allow Exiled Force when it can remove a valuable opposing monster');

// Keep one of each Ojama name through discard effects when Delta Hurricane is live.
clear();const black0=card('Ojama Black',0,L.HAND,0),black1=card('Ojama Black',0,L.HAND,1),yellow=card('Ojama Yellow',0,L.HAND,2),green=card('Ojama Green',0,L.HAND,3),delta=card('Ojama Delta Hurricane!!',0,L.HAND,4);
zones[0][L.HAND]=[black0,black1,yellow,green,delta];smart=policy();assert.equal(smart.handLoss(black0),0,'leave one duplicate Ojama Black expendable');assert.ok(smart.handLoss(black1)>=5000,'reserve one Ojama Black for the Delta Hurricane combination');

// Complete the trio face-up and use the wipe when it can remove opposing cards.
clear();const greenField=card('Ojama Green',0,L.MZONE,0,8),yellowField=card('Ojama Yellow',0,L.MZONE,1,8),blackHand=card('Ojama Black',0,L.HAND),hurricane=card('Ojama Delta Hurricane!!',0,L.HAND,1),foe=card('Vorse Raider',1,L.MZONE);
zones[0][L.MZONE]=[greenField,yellowField];zones[0][L.HAND]=[blackHand,hurricane];zones[1][L.MZONE]=[foe];smart=policy();
assert.equal(smart.summonUtility(blackHand),true,'treat the missing third Ojama as a combo summon');assert.equal(smart.summonScore(blackHand),170,'prioritize completing Delta Hurricane');assert.equal(smart.preferSet(blackHand),false,'summon the third Ojama face-up to complete the combo');
clear();const blackField=card('Ojama Black',0,L.MZONE,2,1);zones[0][L.HAND]=[hurricane];zones[0][L.MZONE]=[{...greenField,position:1},{...yellowField,position:1},blackField];zones[1][L.MZONE]=[foe];smart=policy();
assert.equal(smart.flipUseful('Ojama Green',greenField),true,'flip a set Ojama when doing so completes the Delta Hurricane line');assert.equal(smart.flipUseful('Ojama Yellow',yellowField),true,'flip each remaining set Ojama for the combo');
assert.equal(smart.activation(hurricane),150,'activate Delta Hurricane after all three Ojamas are face-up');
zones[0][L.MZONE][1]={...yellowField,position:8};smart=policy();assert.equal(smart.activation(hurricane),-1,'do not activate Delta Hurricane until the full face-up trio is present');

console.log('PASS CPU Kaibaman priority, Exiled Force target gating, Ojama combo retention and Delta Hurricane line');
