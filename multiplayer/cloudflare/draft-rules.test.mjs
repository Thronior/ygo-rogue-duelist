import test from 'node:test';
import assert from 'node:assert/strict';
import {draftPool} from './draft-pool.mjs';
import catalog from './draft-catalog.json' with {type:'json'};
import cards from './collector-cards.json' with {type:'json'};
import {validateDraftDeck,validateDeck} from '../../android/web/collector-rules.js';
test('every character gets double boosters plus every signature copy and a buildable pool',()=>{
 for(const c of catalog.characters){
  const result=draftPool(c.id);assert.equal(result.packs.length,2*(c.starting_packs?.length||4));
  assert.deepEqual(result.pool.slice(0,c.signatures.length),c.signatures,c.name);
  assert(result.packs.every(p=>p.length===9));
  const counts=new Map(),main=[];
  for(const id of result.pool){const card=cards.find(c=>c.id===id);if(card.data.type&64)continue;const count=counts.get(card.name)||0;if(count<3){counts.set(card.name,count+1);main.push(id);}}
  assert(main.length>=40,c.name);assert.deepEqual(validateDraftDeck({main:main.slice(0,40),side:[],extra:[]},result.pool,cards),[],c.name);
 }
});
test('Draft ignores restricted list but enforces three copies, 40 cards and no side deck',()=>{
 const filler=cards.filter(c=>c.data.type===17).slice(0,40).map(c=>c.id),pot=cards.find(c=>c.name==='Pot of Greed').id;
 const deck={main:[pot,pot,pot,...filler.slice(0,37)],side:[],extra:[]},pool=[pot,pot,pot,pot,...filler];
 assert.deepEqual(validateDraftDeck(deck,pool,cards),[]);assert(validateDeck(deck,pool,cards).some(e=>e.includes('copy limit')));
 assert(validateDraftDeck({...deck,main:[pot,...deck.main]},pool,cards).some(e=>e.includes('three-copy')));
 assert(validateDraftDeck({...deck,main:deck.main.slice(1)},pool,cards).some(e=>e.includes('40')));
 assert(validateDraftDeck({...deck,side:[filler[39]]},pool,cards).some(e=>e.includes('no Side')));
});
