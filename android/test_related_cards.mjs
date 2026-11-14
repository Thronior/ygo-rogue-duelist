import assert from 'node:assert/strict';
import fs from 'node:fs';
import {relatedIndex,relatedCards,relatedCount,relatedMarkup,mountRelated} from './web/related-cards.js';
// Related Cards tab (Discord 2026-11-14): cards naming this card, cards this card names, archetype mentions,
// and − / + buttons that edit the deck in the deck editors.
const content=JSON.parse(fs.readFileSync(new URL('./web/content.json',import.meta.url),'utf8'));
const byName=n=>content.cards.find(c=>c.name===n)?.id;
const index=relatedIndex(content.cards,content.archetypes);
assert.equal(relatedIndex(content.cards,content.archetypes),index,'built once');
const name=id=>content.cards.find(c=>c.id===id)?.name;

const dendle=relatedCards(index,byName('Des Dendle')),orchis=relatedCards(index,byName('Vampiric Orchis'));
assert.ok(dendle.mentionedByThis.includes(byName('Vampiric Orchis')),'Des Dendle names Vampiric Orchis');
assert.ok(orchis.mentionsThis.includes(byName('Des Dendle')),'Vampiric Orchis is named by Des Dendle');
assert.ok(!dendle.mentionedByThis.includes(byName('Des Dendle')),'never itself');
assert.ok(!dendle.mentionedByThis.some(id=>name(id)==='Wicked Plant Token'),'tokens are not deck cards');

// An archetype quote stands for the archetype's cards.
const pandemonium=relatedCards(index,byName('Pandemonium'));
assert.ok(pandemonium.mentionedByThis.length>5);
assert.ok(pandemonium.mentionedByThis.includes(byName('Darkbishop Archfiend')));

// A card nothing names and which names nothing.
const plain=content.cards.find(c=>c.data.type===17&&!relatedCount(relatedCards(index,c.id)));
assert.ok(plain,'some vanilla monster has no related cards');
assert.match(relatedMarkup(relatedCards(index,plain.id),{card:()=>null,image:()=>''}),/No other card names this card/);

// Deck editor: + adds a spare owned copy, − removes one, the panel redraws with the new counts.
const card=id=>content.cards.find(c=>c.id===Number(id)),orchisId=byName('Vampiric Orchis');
const run={pool:[byName('Des Dendle'),orchisId,orchisId],selected:[0,1]};
const html=relatedMarkup(dendle,{card,image:id=>`img/${id}.jpg`,deck:{run,editable:true}});
assert.match(html,new RegExp(`data-related-add="${orchisId}"`));assert.match(html,/1\/2/);
assert.match(relatedMarkup(dendle,{card,image:()=>'',deck:{run,editable:false}}),/2 owned · 1 in deck/,'read-only shows counts');

// Minimal DOM for mountRelated's click path.
class Panel{constructor(){this.isConnected=true;this.scrollTop=0;this.dataset={};this.handlers={}}set innerHTML(v){this.html=v}get innerHTML(){return this.html}addEventListener(t,f){this.handlers[t]=f}contains(){return true}}
const panel=new Panel(),toggled=[];
const deck=()=>({run,editable:true,toggle:async i=>{toggled.push(i);const at=run.selected.indexOf(i);if(at>=0)run.selected.splice(at,1);else run.selected.push(i)}});
mountRelated(panel,byName('Des Dendle'),{cards:content.cards,archetypes:content.archetypes,card,image:()=>'',inspect:()=>{},deck});
const click=async data=>{const el={dataset:data,disabled:false};await panel.handlers.click({target:{closest:()=>el},stopPropagation(){},preventDefault(){}})};
await click({relatedAdd:String(orchisId)});assert.deepEqual(toggled,[2]);assert.match(panel.innerHTML,/2\/2/);
await click({relatedRemove:String(orchisId)});assert.deepEqual(toggled,[2,2],'removes the last copy put in');assert.match(panel.innerHTML,/1\/2/);
let inspected=null;mountRelated(panel,byName('Des Dendle'),{cards:content.cards,archetypes:content.archetypes,card,image:()=>'',inspect:id=>inspected=id,deck});
await click({relatedInspect:String(orchisId)});assert.equal(inspected,orchisId,'tap the art to inspect it');

// The window keeps Where to Find and adds the tab after it.
const mobile=fs.readFileSync(new URL('./web/mobile.js',import.meta.url),'utf8');
assert.match(mobile,/setupInspectTabs\(id,screen==='collection'/);assert.match(mobile,/aria-controls="related-cards-panel">Related Cards/);
for(const lang of ['de','es','fr','it','ja','ko','pt','zh']){const ui=JSON.parse(fs.readFileSync(new URL(`../data/i18n/ui/${lang}.json`,import.meta.url),'utf8'));for(const k of ['Related Cards','Mentions this card','Mentioned by this card','{0} in deck'])assert.ok(ui[k],`${lang} ${k}`)}
console.log('related cards ok');
