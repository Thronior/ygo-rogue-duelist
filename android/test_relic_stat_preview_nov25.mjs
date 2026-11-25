// Deck editor stats for fused relics whose text names their monsters (Discord, Kingstersam and CITYDRIVER, 2026-11-25:
// Insect Swarm's +800 ATK/DEF showed only on the field, so after the fusion Insects looked weaker than with Chitin Carapace).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {deckStats} from './web/feedback-ui.js';
const meta=JSON.parse(fs.readFileSync(new URL('./web/content.json',import.meta.url),'utf8'));
const card=n=>meta.cards.find(c=>c.name===n),stats=(n,relic)=>deckStats(card(n),{challenge_level:0,artifacts:[relic],card_mods:{}},0,meta.artifactInfo);
const plain=n=>[card(n).atk,card(n).defense];
const plus=(n,a,d)=>[card(n).atk+a,card(n).defense+d];
assert.deepEqual(stats('Great Moth','insect_swarm'),plus('Great Moth',800,800),'Insect Swarm: Insects +800 ATK/DEF');
assert.deepEqual(stats('Great Moth','chitin_carapace'),plus('Great Moth',0,800),'Chitin Carapace: Insects +800 DEF');
assert.deepEqual(stats('Battle Ox','insect_swarm'),plain('Battle Ox'),'Insect Swarm: a Beast gets nothing');
assert.deepEqual(stats('Woodland Sprite','eternal_garden'),plus('Woodland Sprite',800,0),'Eternal Garden: Plants +800 ATK');
assert.deepEqual(stats('Battle Ox','eternal_garden'),plain('Battle Ox'),'Eternal Garden: a Beast gets nothing');
console.log('PASS deck editor stats: Insect Swarm +800 ATK/DEF on Insects, Eternal Garden +800 ATK on Plants');
