// Hand "On the field" forecast gaps found by replaying 704 uploaded duels (2026-10-30): equip Spells still in hand,
// monsters' own stat effects, Necrovalley, Eclipse DEF and Graveyard counts after a Tribute Summon.
import fs from 'node:fs';import assert from 'node:assert/strict';import {MobileDuel,L} from './web/duel.js';import {smartContext} from './web/smart_policy.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('./web/'+n+'.json',import.meta.url))),meta=read('content'),data=read('engine-data');
const e=new MobileDuel(meta.cards);let z={};e.query=(s,l)=>z[s+':'+l]||[];
const id=n=>{const c=meta.cards.find(c=>c.name===n);assert(c,n);return c.id};
const c=(n,loc,side=0,extra={})=>({code:id(n),controller:side,location:loc,sequence:0,position:1,attack:data[id(n)].attack,defense:data[id(n)].defense,...extra});
const put=(side,loc,...cards)=>z[side+':'+loc]=cards.map((t,i)=>({...t,controller:side,location:loc,sequence:i}));
const reset=(statRelics=[])=>{z={};Object.assign(e,{data,lp:[8000,8000],player:0,phase:4,turn:3,effect:null,activeChain:[],battleProtected:[false,false],aiModifiers:{statRelics:[statRelics,[]],activeCurses:[],challengeLevel:0}})};
const forecast=n=>{const hand=e.query(0,L.HAND),card=hand.find(x=>x.code===id(n)),s=smartContext(e,0,L);return [s.projectedAttack(card,{equips:false}),s.projectedDefense(card,{equips:false})]};
let checks=0;const is=(n,expected,why)=>{assert.deepEqual(forecast(n),expected,n+': '+why);checks++};
// Equip Spells still in hand are not on the monster yet (the CPU's own planning still counts them).
reset();put(0,L.HAND,c('Axe Raider',L.HAND),c('Axe of Despair',L.HAND));is('Axe Raider',[1700,1150],'no hand equip');
assert.equal(smartContext(e,0,L).projectedAttack(e.query(0,L.HAND)[0]),2700,'CPU planning keeps the equip');checks++;
// Own effects.
reset();put(0,L.HAND,c('Mudora',L.HAND));put(0,L.GRAVE,c('Shining Angel',L.GRAVE),c('Shining Angel',L.GRAVE));is('Mudora',[1900,1800],'200 per Fairy in your GY');
reset();put(0,L.HAND,c('Star Boy',L.HAND));is('Star Boy',[1050,500],'its own WATER aura');
reset();put(0,L.HAND,c('Muka Muka',L.HAND),c('Battle Ox',L.HAND),c('Battle Ox',L.HAND));is('Muka Muka',[1200,900],'300 per card left in hand');
reset();put(0,L.HAND,c('Chaos Necromancer',L.HAND));put(0,L.GRAVE,c('Battle Ox',L.GRAVE),c('Battle Ox',L.GRAVE));is('Chaos Necromancer',[600,0],'300 per monster in your GY');
reset();put(0,L.HAND,c('Amazoness Tiger',L.HAND));put(0,L.MZONE,c('Amazoness Swords Woman',L.MZONE));is('Amazoness Tiger',[1900,1500],'400 per Amazoness, itself included');
// Field Spells and relics.
reset();put(0,L.HAND,c("Gravekeeper's Spy",L.HAND));put(0,L.SZONE,{...c('Necrovalley',L.SZONE),sequence:5});is("Gravekeeper's Spy",[1700,2500],'Necrovalley +500/+500');
reset([{effect:'eclipse',amount:350}]);put(0,L.HAND,c('Battle Ox',L.HAND));put(0,L.GRAVE,c('Shining Angel',L.GRAVE),c('Ryu-Kishin',L.GRAVE));is('Battle Ox',[2050,1350],'Eclipse ATK and DEF');
// A Tribute Summon's tribute is in the GY when it lands.
reset([{effect:'approved_crowded_crypt'}]);put(0,L.HAND,c('Summoned Skull',L.HAND));put(0,L.MZONE,c('Battle Ox',L.MZONE));is('Summoned Skull',[2575,1200],'75 per GY monster, tribute included');
console.log(`PASS hand forecast own effects, Field Spells, Eclipse and tribute counts: ${checks} checks`);
