import assert from 'node:assert/strict';
import fs from 'node:fs';
import {MobileDuel} from '../../android/web/duel.js';

const content=JSON.parse(fs.readFileSync(new URL('../../android/web/content.json',import.meta.url),'utf8'));
const id=name=>content.cards.find(card=>card.name===name)?.id;
const main=fs.readFileSync(new URL('../../data/decks/obelisk-the-tormenter-t4.ydk',import.meta.url),'utf8')
 .split(/\r?\n/).filter(line=>/^\d+$/.test(line)).map(Number);
assert.equal(main.length,52);
assert.ok(['Obelisk the Tormentor','Slifer the Sky Dragon','The Winged Dragon of Ra'].every(name=>id(name)));
assert.equal(id('Heavy Storm'),19613556);
assert.equal(id("Harpie's Feather Duster"),18144506);
assert.equal(main.filter(cardId=>cardId===19613556).length,1);
assert.equal(main.filter(cardId=>cardId===18144506).length,1);

const duel=await new MobileDuel(content.cards).init([
 JSON.parse(fs.readFileSync(new URL('../../android/web/engine-data.json',import.meta.url),'utf8')),
 JSON.parse(fs.readFileSync(new URL('../../android/web/scripts.json',import.meta.url),'utf8')),
]);
try{
 duel.start(Array(40).fill(id('Vorse Raider')),main,8000,10000,5,2137);
 assert.deepEqual(duel.errors,[],'the complete Obelisk T4 deck should load in the web duel engine');
 console.log('PASS Obelisk T4 deck loads all 52 cards in the web duel engine');
}finally{duel.destroy()}
