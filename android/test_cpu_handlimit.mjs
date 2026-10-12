import fs from 'node:fs';import assert from 'node:assert/strict';import {MobileDuel,L} from './web/duel.js';import {smartContext} from './web/smart_policy.js';import {parse} from './web/replays.js';
const read=p=>parse(fs.readFileSync(new URL(p,import.meta.url),'utf8')),meta=read('./web/content.json'),data=read('./web/engine-data.json'),scripts=read('./web/scripts.json'),id=n=>meta.cards.find(c=>c.name===n).id;
for(const p of [0,1]){const e=new MobileDuel(meta.cards);Object.assign(e,{data,lp:[8000,8000],player:p,turn:3,phase:512});let zones={};e.query=(s,l)=>zones[s+':'+l]||[];const card=(n,l=L.HAND,sequence=0)=>({code:id(n),controller:p,location:l,sequence,position:1});const score=c=>smartContext(e,p,L).handLimitScore(c);
assert(score(card('Launcher Spider'))>0);assert(score(card('Yamata Dragon'))>0);assert(score(card('Blue-Eyes Toon Dragon'))>0);assert.equal(score(card('Marauding Captain')),null);assert.equal(score(card('Relinquished')),null);assert.equal(score(card('Black Luster Soldier - Envoy of the Beginning')),null);
zones[p+':'+L.MZONE]=[card('Battle Ox',L.MZONE),card('Mystical Elf',L.MZONE,1)];assert.equal(score(card('Launcher Spider')),null);
zones[p+':'+L.MZONE]=[card('Kaiser Sea Horse',L.MZONE)];assert.equal(score(card('Blue-Eyes White Dragon')),null);
zones[p+':'+L.MZONE]=[];zones[p+':'+L.HAND]=[card('Soul Exchange')];assert.equal(score(card('Launcher Spider')),null);
}
console.log('PASS hand-limit tribute priorities and alternate-route exclusions for both players');
