import fs from 'node:fs';import assert from 'node:assert/strict';
import {MobileDuel,L} from '../android/web/duel.js';
import {smartContext} from '../android/web/smart_policy.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('../android/web/'+n+'.json',import.meta.url)));
const meta=read('content'),e=await new MobileDuel(meta.cards).init([read('engine-data'),read('scripts')]);
try{
 e.player=0;e.turn=3;e.phase=4;e.lp=[8000,8000];
 const card=(name,sequence,attack)=>({code:meta.cards.find(c=>c.name===name).id,controller:0,location:L.MZONE,sequence,position:1,attack,attack_count:0});
 const mataza=card('Mataza the Zapper',0,1300),maha=card('Maha Vailo',1,1550);let back=[],enemy=[];
 e.query=(p,l)=>p===0?(l===L.MZONE?[mataza,maha]:l===L.SZONE?back:[]):l===L.MZONE?enemy:[];
 e.effect={code:meta.cards.find(c=>c.name==='Axe of Despair').id};e.selectionHint=0;
 const score=c=>smartContext(e,0,L).targetScore('Axe of Despair',c,{text:'Equip; tribute to recover this card'});
 assert(score(mataza)>score(maha),'First equip values two attacks');
 back=[{code:e.effect.code,controller:0,location:L.SZONE,sequence:0,position:1,equipCard:mataza}];mataza.attack=2300;
 assert(score(maha)>score(mataza),'Spread the next equip instead of piling onto one monster');
 mataza.attack_count=2;assert(score(maha)>score(mataza),'Spent attacks do not count as future damage');
 assert(score({...maha,controller:1})<-1000000,'Do not buff an opponent');
 enemy=[{...card('Blue-Eyes White Dragon',0,3000),controller:1,position:8}];const before=score(maha);
 enemy=[{...enemy[0],code:meta.cards.find(c=>c.name==='Kuriboh').id,attack:300,defense:200}];assert.equal(score(maha),before,'Unknown face-down identity does not alter equip score');
 console.log('PASS equip targets: multi-attacks, distribution, spent attacks, ownership and hidden-information independence');
}finally{e.destroy()}
