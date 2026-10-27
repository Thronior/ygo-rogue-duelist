import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runCardData} from './web/run-card.js';

const content=JSON.parse(fs.readFileSync(new URL('./web/content.json',import.meta.url),'utf8'));
const cards=new Map(content.cards.map(c=>[c.id,c]));
const card=id=>cards.get(Number(id));
const byName=n=>{const c=content.cards.find(c=>c.name===n);assert.ok(c,`missing card ${n}`);return c.id};
const deps={content,card,cardImage:id=>`assets/cards/${id}.jpg`,relicImage:art=>`assets/relics/${art}`,finalChallengeName:()=>'2004 World Champion'};
const relicIds=Object.keys(content.artifactInfo).filter(id=>content.artifacts[id]).slice(0,2);
const duel=(n,opponent,won,lp,loop=1)=>({duel:n,loop,opponent,won,lp_before_healing:lp,lp_after_healing:lp,coins:0,turns:5});

// A lost run: the defeat text splits around the card that ended it, and the losing duel is named.
const cylinder=byName('Magic Cylinder');
const lost=runCardData({stage:'gameover',character:35,challenge_level:2,round:7,gold:292,lp:0,started_at:1000,finished_at:1000+52*60,
 artifacts:[relicIds[0],relicIds[1],relicIds[1]],stats:{damage_dealt:49700,coins_earned:1384},
 timeline:[...Array.from({length:7},(_,i)=>duel(i+1,22,true,4000)),duel(8,41,false,0)],
 loss:{text:'Defeated by the effect of Magic Cylinder — 2,975 damage',card:cylinder,damage:2975,reason:1}},{...deps,character:content.characters[35]});
assert.equal(lost.won,false);
assert.equal(lost.eyebrow,'RUN LOST · DUEL 8 OF 9');
assert.equal(lost.subtitle,'Challenge LVL 2');
assert.deepEqual([lost.outcome.lead,lost.outcome.cardName,lost.outcome.amount],['Defeated by the effect of','Magic Cylinder','2,975']);
assert.equal(lost.outcome.detail,`Duel 8 · ${content.characters[41].name}`);
assert.deepEqual(lost.relics.map(r=>r.count),[1,2]);
assert.deepEqual(lost.stats[0],['DAMAGE DEALT','49,700']);
assert.deepEqual(lost.stats.at(-1),['COINS LEFT','292']);
assert.equal(lost.duels[8],null,'duel 9 was never reached');
assert.match(lost.footerLeft,/ · Run time 52 min$/);

// A loss with no card behind it keeps the engine's text whole.
const decked=runCardData({stage:'gameover',character:35,round:2,loss:{text:'Decked out: unable to draw during the Draw Phase',card:null,damage:0}},{...deps,character:content.characters[35]});
assert.deepEqual([decked.outcome.lead,decked.outcome.cardName,decked.outcome.amount],['Decked out: unable to draw during the Draw Phase','','']);
assert.deepEqual(decked.duels.slice(0,4),[{missing:true},{missing:true},{missing:true},null],'runs from before the timeline still mark the duels played');

// A won run shows only the latest loop and the final deck: monsters by ATK, then spells, traps, Extra Deck.
const pool=[byName('Pot of Greed'),byName('Kuriboh'),byName('Blue-Eyes White Dragon'),byName('Mirror Force'),byName('Blue-Eyes Ultimate Dragon'),byName('Dark Magician')];
const won=runCardData({stage:'complete',character:1,challenge_level:3,round:9,pool,selected:[0,1,2,3,4,5],
 timeline:[duel(1,10,true,8000,1),...Array.from({length:9},(_,i)=>duel(i+1,18,true,3000+i,2))]},{...deps,character:content.characters[1]});
assert.equal(won.title,'CHALLENGE LEVEL 3 CLEARED');
assert.equal(won.eyebrow,undefined);
assert.equal(won.subtitle,undefined);
assert.equal(won.recordTitle,'DUEL RECORD · LOOP 2');
assert.equal(won.duels[0].lp,3000);
assert.deepEqual(won.deck.main,[pool[2],pool[5],pool[1],pool[0],pool[3]].map(id=>`assets/cards/${id}.jpg`));
assert.deepEqual(won.deck.extra,[`assets/cards/${pool[4]}.jpg`]);
assert.match(won.label,/won the run at Challenge Level 3 with 9 of 9 victories/);
assert.equal(runCardData({stage:'complete',character:1,challenge_level:6,encore_won:true,round:9},{...deps,character:content.characters[1]}).title,'2004 WORLD CHAMPION DEFEATED');
console.log('run card data ok');
