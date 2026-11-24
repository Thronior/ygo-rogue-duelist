// Every Fusion Monster carries the Fusion support tag and every Equip Spell the Equip cards tag (user, 2026-11-24), from
// their type bits, so the card search finds all of them: listed cards, custom cards and randomized or translated ones.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const {genres,searches,matchesSearch}=await import('./web/card-search.js');
const {cards}=JSON.parse(fs.readFileSync(new URL('./web/content.json',import.meta.url),'utf8'));
const has=(c,id)=>genres(c).some(g=>g.id===id),type=c=>c.data?.type|0;
const fusions=cards.filter(c=>(type(c)&0x41)===0x41),equips=cards.filter(c=>(type(c)&0x40002)===0x40002);
assert.ok(fusions.length>70&&equips.length>80,'the card list has its fusions and equips');
assert.deepEqual(fusions.filter(c=>!has(c,'fusion-material')).map(c=>c.name),[],'every Fusion Monster is tagged Fusion support');
assert.deepEqual(equips.filter(c=>!has(c,'equip')).map(c=>c.name),[],'every Equip Spell is tagged Equip cards');
for(const name of ['Master of Oz','Sanwitch','King Dragun','Gate Guardian-F'])assert.ok(has(cards.find(c=>c.name===name),'fusion-material'),name+' was missing the tag');
// Cards outside the hand list and with text the patterns can't read (a randomized id, French text) still get them.
const fusion={id:191000001,name:'Fusion',desc:'Matériau A + Matériau B',data:{type:0x41}},equip={id:191000002,name:'Équipement',desc:'Le monstre gagne 500 ATK.',data:{type:0x40002}};
assert.ok(has(fusion,'fusion-material')&&has(equip,'equip'));
searches.tags={effects:['fusion-material']};assert.equal(cards.filter(c=>(type(c)&0x41)===0x41&&!matchesSearch(c,'tags')).length,0,'the Fusion support filter keeps every fusion');
searches.tags={effects:['equip']};assert.equal(equips.filter(c=>!matchesSearch(c,'tags')).length,0,'the Equip cards filter keeps every equip');
// Normal Monsters still carry no tags, and the tags keep the GENRES order.
assert.deepEqual(genres({id:1,desc:'equip',data:{type:17}}),[]);
console.log(`PASS ${fusions.length} fusions tagged Fusion support, ${equips.length} equips tagged Equip cards`);
