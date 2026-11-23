// Deck sort cache (Nori on Discord, 2026-11-21: in Draft, cards just added to the deck sat unsorted at the bottom under an
// ATK sort). deckOrder cached its order by filters and pool size only; a pool rebuilt at the same size, or a new relic that
// changes ATK, reused the old order. The cache now also keys the pool's contents and the relics.
import fs from 'node:fs';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
globalThis.localStorage??={getItem:()=>null,setItem(){},removeItem(){}};
const {deckOrder}=await import('./web/deck-editor-view.js');
const root=fileURLToPath(new URL('../',import.meta.url));
const meta=JSON.parse(fs.readFileSync(root+'android/web/content.json','utf8').replace(/^﻿/,''));
const byName=n=>{const c=meta.cards.find(c=>c.name===n);assert(c,n);return c},byId=new Map(meta.cards.map(c=>[c.id,c]));
let checks=0;const same=(a,b,m)=>{assert.deepEqual(a,b,m);checks++};
const ed={deckFilter:'All',deckSort:'ATK',deckStatus:'All',deckSplit:false};
const names=pool=>deckOrder(ed,{pool,selected:[],lookup:id=>byId.get(id),run:{pool,artifacts:[],curses:[]},info:meta.artifactInfo,searchKey:'test-order'}).map(i=>byId.get(pool[i]).name);
const a=['Kuriboh','Blue-Eyes White Dragon','Celtic Guardian'].map(n=>byName(n).id);
same(names(a),['Blue-Eyes White Dragon','Celtic Guardian','Kuriboh'],'sorted by ATK');
// Same size, different cards (Draft rebuilds its pool like this): sorted again, not the old indices.
const b=['Kuriboh','Celtic Guardian','Dark Magician'].map(n=>byName(n).id);
same(names(b),['Dark Magician','Celtic Guardian','Kuriboh'],'a pool rebuilt at the same size is sorted again');
// Same pool, same filters: the cached order is reused (no resort on every tap).
const before=ed.deckOrder;names(b);assert.equal(ed.deckOrder,before,'unchanged pool reuses the cached order');checks++;
console.log(`PASS deck sort cache follows the pool's contents (${checks} checks)`);
