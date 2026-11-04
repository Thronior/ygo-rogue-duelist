import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runCardData,runCardName,tagPartner} from './web/run-card.js';

const content=JSON.parse(fs.readFileSync(new URL('./web/content.json',import.meta.url),'utf8'));
const cards=new Map(content.cards.map(c=>[c.id,c]));
const card=id=>cards.get(Number(id));
const byName=n=>{const c=content.cards.find(c=>c.name===n);assert.ok(c,`missing card ${n}`);return c.id};
const deps={content,card,cardImage:id=>`assets/cards/${id}.jpg`,relicImage:art=>`assets/relics/${art}`,finalChallengeName:()=>'2004 World Champion'};
const duel=(n,opponent,won,lp)=>({duel:n,loop:1,opponent,won,lp_before_healing:lp,lp_after_healing:lp,coins:0,turns:5});
const [joey,mai,kaiba,yugi]=[2,3,1,13].map(i=>content.characters[i]);
// Run history opens a row the way mobile.js showRunCard does.
const fromRow=row=>{const deck=row.deck||[];return {...row,stage:row.result==='complete'?'complete':'gameover',pool:deck,selected:deck.map((_,i)=>i)}};

// A won Tag row: both duelists, team duel stats, and this player's own shopping and deck.
const deck=[byName('Kuriboh'),byName('Pot of Greed'),byName('Mirror Force')];
const won=runCardData(fromRow({mode:'tag',partner:3,result:'complete',character:2,challenge_level:0,round:9,gold:830,lp:2280,deck,
 stats:{damage_dealt:68075,attacks_declared:62,monsters_summoned:38,cards_activated:17,bosses_defeated:3,damage_taken:3720,coins_earned:1665,coins_spent:595,packs_bought:2},
 timeline:Array.from({length:9},(_,i)=>duel(i+1,9,true,2000))}),{...deps,character:joey});
assert.equal(won.eyebrow,'TAG RUN');
assert.equal(won.title,'CHALLENGE LEVEL 0 CLEARED');
assert.equal(won.tag.name,mai.name);
assert.equal(won.tag.portrait,`assets/${mai.sprite}`);
assert.deepEqual(won.stats.map(s=>s[0]),['DAMAGE DEALT','ATTACKS','SUMMONS','ACTIVATIONS','BOSSES','COINS LEFT'],'coins earned differs per teammate, so Tag leaves it out');
assert.deepEqual(won.stats.at(-1),['COINS LEFT','830']);
assert.deepEqual(won.tag.own,[['PACKS BOUGHT','2'],['COINS SPENT','595'],['DECK','3 cards']]);
assert.equal(won.recordTitle,`DUEL RECORD · ${joey.name.toUpperCase()}’S OPPONENTS`);
assert.match(won.label,new RegExp(`^${joey.name} and ${mai.name} won the Tag run at Challenge Level 0 with 9 of 9 victories`));
assert.equal(won.deck.main.length,3,'the final deck is still shown');

// The live run on Tag's end screen uses history_mode/history_partner; a loss names the duel and the level.
const lost=runCardData({history_mode:'tag',history_partner:13,stage:'gameover',character:1,challenge_level:2,round:3,gold:190,pool:[...deck,byName('Dark Magician')],selected:[0,1,3],
 stats:{damage_dealt:17750,coins_spent:235},timeline:[duel(1,18,true,7300),duel(2,22,true,4800),duel(3,11,true,2100),duel(4,12,false,0)],
 loss:{text:'Attacked by Warrior Dai Grepher — 1,700 damage',card:byName('Warrior Dai Grepher'),damage:1700,reason:1}},{...deps,character:kaiba});
assert.equal(lost.eyebrow,'TAG RUN LOST · DUEL 4 OF 9');
assert.equal(lost.subtitle,'Tag · Challenge LVL 2');
assert.equal(lost.tag.name,yugi.name);
assert.deepEqual(lost.tag.own,[['PACKS BOUGHT','0'],['COINS SPENT','235'],['DECK','3 cards']]);
assert.equal(lost.outcome.cardName,'Warrior Dai Grepher');
assert.match(lost.label,new RegExp(`^${kaiba.name} and ${yugi.name} lost the Tag run on duel 4 of 9`));

// Older Tag rows have no deck; an unknown teammate still draws.
const old=runCardData(fromRow({mode:'tag',partner:99999,result:'lost',character:2,round:1,timeline:[duel(1,9,true,8000),duel(2,9,false,0)],loss:{text:'x',card:null}}),{...deps,character:joey});
assert.deepEqual(old.tag.own.at(-1),['DECK','—']);
assert.deepEqual([old.tag.name,old.tag.portrait],['Teammate',null]);
// A team that took no damage is a flawless Tag run.
assert.equal(runCardData(fromRow({mode:'tag',partner:3,result:'complete',character:2,round:9,stats:{damage_taken:0},timeline:[]}),{...deps,character:joey}).eyebrow,'FLAWLESS TAG RUN · NO DAMAGE TAKEN');

// Solo cards are unchanged.
const solo=runCardData({stage:'gameover',character:1,round:2,history_mode:'solo',stats:{coins_earned:5},loss:{text:'x',card:null}},{...deps,character:kaiba});
assert.equal(solo.tag,undefined);
assert.equal(solo.stats.length,9);
assert.equal(solo.eyebrow,'RUN LOST · DUEL 3 OF 9');
assert.equal(solo.recordTitle,'DUEL RECORD');
assert.equal(tagPartner({mode:'solo',partner:3}),null);

// File names for Copy and Download; the save helper drops symbols such as "&", so the names use "and".
assert.equal(runCardName({character:1,stage:'gameover'},content),`YGO Rogue Duelist - ${kaiba.name} - Loss`);
assert.equal(runCardName({mode:'tag',partner:3,character:2,result:'complete'},content),`YGO Rogue Duelist - ${joey.name} and ${mai.name} - Tag Win`);
assert.equal(runCardName({history_mode:'tag',history_partner:13,character:1,stage:'gameover'},content),`YGO Rogue Duelist - ${kaiba.name} and ${yugi.name} - Tag Loss`);
console.log('tag run card data ok');
