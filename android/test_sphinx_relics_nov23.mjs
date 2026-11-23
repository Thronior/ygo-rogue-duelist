// Sphinx relics (user, 2026-11-23): Pyramid of Lightning places a "Pyramid of Light" from outside the Duel; Shadow of Anubis
// makes "Sphinx" monsters in the hand Level 4 while you control Andro Sphinx or Sphinx Teleia; Bond of Egypt searches a
// Sphinx card on a Normal Summon of a Sphinx; Chimera Sphinx (all three fused) keeps the Pyramid from card effects, makes
// hand Sphinxes Level 4 always and Special Summons a Sphinx from the Deck, ignoring its Summoning conditions.
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const {MobileDuel,M,L,R,I}=await import('./web/duel.js');
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json'),scripts=json('android/web/scripts.json'),id=n=>meta.cards.find(c=>c.name===n).id;
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const relic=a=>execFileSync(python,['-B','-c',"import sys,json;sys.path.insert(0,'.');import passives;print(passives.multiplayer_script(json.loads(sys.argv[1]),0))",JSON.stringify({curses:[],artifacts:a,challenge_level:0})],{cwd:root,encoding:'utf8',env:{...process.env,PYTHONUTF8:'1'}}).trim();
const PYRAMID=id('Pyramid of Light'),ANDRO=id('Andro Sphinx'),TELEIA=id('Sphinx Teleia'),THEINEN=id('Theinen the Great Sphinx'),W=id('Waboku');let checks=0;
// Turn 1 (player 0 goes first with this seed): `hand` is added to the hand and `deck` shuffled into the Deck.
const setup=(hand,deck=[])=>`do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START|PHASE_DRAW) e:SetOperation(function(e) e:Reset()
 ${hand.map(c=>`Duel.SendtoHand(Duel.CreateToken(0,${c}),0,REASON_RULE)`).join(' ')} ${deck.map(c=>`Duel.SendtoDeck(Duel.CreateToken(0,${c}),0,SEQ_DECKSHUFFLE,REASON_RULE)`).join(' ')} end) Duel.RegisterEffect(e,0) end`;
const own=(e,l,code)=>e.query(0,l).filter(c=>c&&c.code===code);
// Plays player 0's first turn: `plan` gets each idle prompt and returns a response, or null to stop and report.
async function duel(artifacts,hand,deck,plan,extra=''){
 const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,scripts]);
 let s=e.start(Array(40).fill(W),Array(40).fill(W),8000,8000,5,13,[],[],[artifacts.length?relic(artifacts):'',setup(hand,deck),extra].join('\n')),out=null;
 for(let i=0;i<300&&!s.finished&&e.turn<=1;i++){const m=e.pending;if(!m)break;
  if(m.player===0&&m.type===M.SELECT_IDLECMD){const r=plan(e,m);if(!r){out=e;break}s=e.respond(r);continue}
  s=e.respond(e.auto())}
 assert(out,'reached an idle prompt');return out;
}
const summon=(m,code)=>{const at=m.summons.findIndex(c=>c.code===code);return at>=0&&{type:R.SELECT_IDLECMD,action:I.SELECT_SUMMON,index:at}};
const special=(m,code)=>{const at=m.special_summons.findIndex(c=>c.code===code);return at>=0&&{type:R.SELECT_IDLECMD,action:I.SELECT_SPECIAL_SUMMON,index:at}};

// Pyramid of Lightning: a new Pyramid face-up from the start, none taken from the Deck, so Andro Sphinx can come out.
let e=await duel(['pyramid_of_lightning'],[ANDRO],[PYRAMID],()=>null);
assert.equal(own(e,L.SZONE,PYRAMID).filter(c=>c.position&5).length,1,'Pyramid of Light starts face-up');
assert.equal(own(e,L.DECK,PYRAMID).length,1,'the Deck\'s Pyramid stays in the Deck');
assert(e.pending.special_summons.some(c=>c.code===ANDRO),'Andro Sphinx can be Special Summoned');checks+=3;e.destroy();
e=await duel([],[ANDRO],[],()=>null);
assert.equal(own(e,L.SZONE,PYRAMID).length,0,'no relic, no Pyramid');assert(!e.pending.special_summons.some(c=>c.code===ANDRO));checks+=2;e.destroy();

// Shadow of Anubis: with Andro Sphinx out, Sphinx Teleia in the hand is Level 4 and Normal Summons without Tributes.
const level=artifacts=>duel(artifacts,[ANDRO,TELEIA],[],(e,m)=>own(e,L.MZONE,ANDRO).length?null:special(m,ANDRO));
e=await level(['pyramid_of_lightning']);
assert.equal(own(e,L.HAND,TELEIA)[0].level,10,'Teleia is Level 10 without Shadow of Anubis');assert(!e.pending.summons.some(c=>c.code===TELEIA));checks+=2;e.destroy();
e=await level(['pyramid_of_lightning','shadow_of_anubis']);
assert.equal(own(e,L.HAND,TELEIA)[0].level,4,'Teleia is Level 4 in the hand');assert(e.pending.summons.some(c=>c.code===TELEIA),'Teleia can be Normal Summoned');checks+=2;e.destroy();
e=await duel(['shadow_of_anubis'],[TELEIA],[],()=>null);
assert.equal(own(e,L.HAND,TELEIA)[0].level,10,'no Andro Sphinx or Sphinx Teleia on the field: Level 10');checks++;e.destroy();

// Bond of Egypt: Normal Summoning Teleia adds a Sphinx card (Theinen, the only one in the Deck) to the hand.
let done=false;
e=await duel(['pyramid_of_lightning','shadow_of_anubis','bond_of_egypt'],[ANDRO,TELEIA],[THEINEN],(e,m)=>{
 if(!own(e,L.MZONE,ANDRO).length)return special(m,ANDRO);if(!done){done=true;return summon(m,TELEIA)}return null});
assert.equal(own(e,L.MZONE,TELEIA).length,1,'Teleia was Normal Summoned');assert.equal(own(e,L.HAND,THEINEN).length,1,'Theinen was added from the Deck');assert.equal(own(e,L.DECK,THEINEN).length,0);checks+=3;e.destroy();

// Chimera Sphinx: Teleia is Level 4 with nothing on the field; its Normal Summon brings Theinen out of the Deck.
done=false;
e=await duel(['chimera_sphinx'],[TELEIA],[THEINEN],(e,m)=>{if(!done){done=true;return summon(m,TELEIA)}return null});
assert.equal(own(e,L.SZONE,PYRAMID).filter(c=>c.position&5).length,1,'Chimera Sphinx places the Pyramid');
assert.equal(own(e,L.MZONE,TELEIA).length,1,'Teleia was Normal Summoned without Tributes');
assert.equal(own(e,L.MZONE,THEINEN).length,1,'Theinen was Special Summoned from the Deck, ignoring its Summoning conditions');checks+=3;e.destroy();
// The Pyramid cannot be destroyed by card effects.
const kill=`do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START|PHASE_STANDBY) e:SetOperation(function(e) e:Reset() Duel.Destroy(Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_SZONE,0,nil,${PYRAMID}),REASON_EFFECT) end) Duel.RegisterEffect(e,0) end`;
e=await duel(['chimera_sphinx'],[],[],()=>null,kill);assert.equal(own(e,L.SZONE,PYRAMID).length,1,'Chimera Sphinx keeps the Pyramid');checks++;e.destroy();
e=await duel(['pyramid_of_lightning'],[],[],()=>null,kill);assert.equal(own(e,L.SZONE,PYRAMID).length,0,'Pyramid of Lightning alone does not protect it');checks++;e.destroy();
console.log(`PASS Sphinx relics: Pyramid of Lightning, Shadow of Anubis, Bond of Egypt and Chimera Sphinx (${checks} checks)`);
