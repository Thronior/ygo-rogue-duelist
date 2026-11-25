// Four later real cards from the 10K-players survey card asks (user, 2026-11-25; tools/add_nov25_survey_cards.py):
// The Seal of Orichalcos (Dartz's pack), Raiza the Storm Monarch and Caius the Shadow Monarch (Paradox Brothers' and
// Yami Marik's packs) and Red-Eyes Wyvern (Joey Wheeler's pack). Checks they are in the pool and packs, then plays each
// card's effect in the engine.
import fs from 'node:fs';import assert from 'node:assert/strict';import {MobileDuel,M,L} from './web/duel.js';import {DuelEngine} from './web/engine.js';
const read=name=>JSON.parse(fs.readFileSync(new URL('./web/'+name+'.json',import.meta.url),'utf8'));
const repo=name=>JSON.parse(fs.readFileSync(new URL('../'+name,import.meta.url),'utf8'));
const meta=read('content'),data=read('engine-data'),scripts=read('scripts'),tokens=repo('data/custom-tokens.json');
for(const t of tokens)data[t.id]=t.data;
const cards=[...meta.cards,...meta.tokenCards.filter(c=>!tokens.some(t=>t.id===c.id)),...tokens.map(t=>({...t,type:'Token',race:'Token'}))];
const id=n=>{const c=meta.cards.find(c=>c.name===n);assert.ok(c,n+' is in the card pool');return c.id};
const SEAL=id('The Seal of Orichalcos'),RAIZA=id('Raiza the Storm Monarch'),CAIUS=id('Caius the Shadow Monarch'),WYVERN=id('Red-Eyes Wyvern');
const OX=id('Battle Ox'),REBD=id('Red-Eyes Black Dragon'),DARK=id('Summoned Skull'),FILLER=id('Blue-Eyes White Dragon');
// Pack placement and rarity.
const packs=Object.fromEntries(repo('data/packs.json').map(p=>[p.id,p]));
for(const [pack,cid,rarity] of [['DRAFT-DARTZ',SEAL,'Rare'],['DRAFT-PARADOX-BROTHERS',RAIZA,'Rare'],['DRAFT-PARADOX-BROTHERS',CAIUS,'Rare'],
 ['DRAFT-YAMI-MARIK',RAIZA,'Super Rare'],['DRAFT-YAMI-MARIK',CAIUS,'Super Rare'],['DRAFT-JOEY-WHEELER',WYVERN,'Rare'],
 ['CUSTOM-NIGHTMARE-LEGION',SEAL,'Rare'],['CUSTOM-NIGHTMARE-LEGION',CAIUS,'Rare'],['CUSTOM-HEAVENS-WRATH',RAIZA,'Rare'],['CUSTOM-HEAVENS-WRATH',WYVERN,'Rare']]){
 const p=packs[pack];assert.ok(p.rare.includes(cid)&&p.rare_display.includes(cid),`${cid} is in ${pack}'s rare slot`);
 assert.deepEqual(p.rarities[String(cid)],[rarity],`${cid} is ${rarity} in ${pack}`);
}
const holders=cid=>Object.values(packs).filter(p=>String(cid) in p.rarities).map(p=>p.id).sort();
// Character packs are draft-only, so each card also has a themed custom shop pack (user, 2026-11-25).
assert.deepEqual(holders(SEAL),['CUSTOM-NIGHTMARE-LEGION','DRAFT-DARTZ']);assert.deepEqual(holders(WYVERN),['CUSTOM-HEAVENS-WRATH','DRAFT-JOEY-WHEELER']);
assert.deepEqual(holders(RAIZA),['CUSTOM-HEAVENS-WRATH','DRAFT-PARADOX-BROTHERS','DRAFT-YAMI-MARIK']);assert.deepEqual(holders(CAIUS),['CUSTOM-NIGHTMARE-LEGION','DRAFT-PARADOX-BROTHERS','DRAFT-YAMI-MARIK']);

const engine=await new MobileDuel(cards).init([data,scripts]);
const field=(code,player=0,pos='POS_FACEUP_ATTACK')=>`Duel.MoveToField(Duel.CreateToken(${player},${code}),${player},${player},LOCATION_MZONE,${pos},true)`;
const hand=code=>`Duel.SendtoHand(Duel.CreateToken(0,${code}),nil,REASON_RULE)`;
const grave=code=>`Duel.SendtoGrave(Duel.CreateToken(0,${code}),REASON_RULE)`;
const setup=parts=>`local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START|PHASE_DRAW) e:SetOperation(function(e) e:Reset() ${parts.join(' ')} end) Duel.RegisterEffect(e,0)`;
const codes=(p,loc)=>engine.query(p,loc).filter(Boolean).map(c=>c.code);
function play(label,{parts,turns=1,pick,after}){
 engine.start(Array(40).fill(FILLER),Array(40).fill(FILLER),8000,8000,2,777,[],[],setup(parts),2);
 const seen=[];let out;
 for(let n=0;n<600&&!engine.finished&&engine.pending&&engine.turn<=turns;n++){
  const m=engine.pending,choices=engine.choices(m);
  let response=pick?.(m,choices,seen);
  if(response===undefined){
   if(m.type===M.SELECT_IDLECMD)response=(choices.find(c=>/End turn/.test(c.label))||choices.find(c=>/battle phase/i.test(c.label))).response;
   else if(m.type===M.SELECT_BATTLECMD)response=choices.find(c=>/End turn/.test(c.label)).response;
   else if(m.type===M.SELECT_PLACE&&choices.length)response=choices[0].response;
   else response=DuelEngine.prototype.auto.call(engine,m);
  }
  engine.respond(response);
  if(after)out=after(out);
 }
 assert.deepEqual(engine.errors.filter(x=>x.trim()),[],label);
 const result={out,lp:[...engine.lp],field0:codes(0,L.MZONE),field1:codes(1,L.MZONE),grave0:codes(0,L.GRAVE),deck1:codes(1,L.DECK),hand1:codes(1,L.HAND),
  removed1:codes(1,L.REMOVED),atk0:engine.query(0,L.MZONE).filter(Boolean).map(c=>c.attack)};
 engine.destroy();return result;
}
const choose=(choices,re)=>choices.find(c=>re.test(c.label));
try{
 // The Seal of Orichalcos: activate it from the hand; Battle Ox 1700 -> 2200.
 let activated=false;
 const seal=play('The Seal of Orichalcos',{parts:[field(OX),hand(SEAL)],pick:(m,choices)=>{
  if(m.type===M.SELECT_IDLECMD&&m.player===0&&!activated){const c=choose(choices,/^Activate · The Seal of Orichalcos/);if(c){activated=true;return c.response}}
 }});
 assert.ok(activated,'the Seal can be activated from the hand');
 assert.deepEqual(seal.atk0,[2200],'monsters you control gain 500 ATK');
 // Raiza: Tribute Battle Ox, target the opponent's monster: it goes on top of their Deck.
 const tribute=(code,name)=>{let summoned=false;return (m,choices)=>{
  if(m.type===M.SELECT_IDLECMD&&m.player===0&&!summoned){const c=choose(choices,new RegExp('^Summon · '+name));if(c){summoned=true;return c.response}}
  if(m.type===M.SELECT_CARD&&m.player===0){const i=m.selects.findIndex(c=>c.controller===1);if(i>=0)return {...DuelEngine.prototype.auto.call(engine,m),indicies:[i]}}
 }};
 const raiza=play('Raiza the Storm Monarch',{parts:[field(OX),hand(RAIZA),field(DARK,1)],pick:tribute(RAIZA,'Raiza the Storm Monarch')});
 assert.deepEqual(raiza.field0,[RAIZA],'Raiza was Tribute Summoned');
 assert.deepEqual(raiza.field1,[],'the targeted monster left the field');
 // The opponent's Deck is all Blue-Eyes, so Summoned Skull can only be in their hand if their turn-2 draw took it off the top.
 assert.ok(raiza.deck1.includes(DARK)||raiza.hand1.includes(DARK),'it went back to the Deck');
 assert.ok(raiza.hand1.includes(DARK)||[raiza.deck1[0],raiza.deck1.at(-1)].includes(DARK),'on top of it');
 // Caius: banish the opponent's DARK Summoned Skull and inflict 1000 damage.
 const caius=play('Caius the Shadow Monarch',{parts:[field(OX),hand(CAIUS),field(DARK,1)],pick:tribute(CAIUS,'Caius the Shadow Monarch')});
 assert.deepEqual(caius.field0,[CAIUS],'Caius was Tribute Summoned');
 assert.ok(caius.removed1.includes(DARK),'the targeted monster was banished');
 assert.equal(caius.lp[1],7000,'1000 damage for a DARK monster');
 // Red-Eyes Wyvern: at your End Phase, banish it from the GY to Special Summon Red-Eyes Black Dragon from the GY.
 let used=false;
 const wyvern=play('Red-Eyes Wyvern',{parts:[grave(WYVERN),grave(REBD)],pick:(m,choices)=>{
  if(m.player!==0||used)return;
  const c=choose(choices,/Red-Eyes Wyvern/);if(c&&m.type!==M.SELECT_IDLECMD){used=true;return c.response}
  if(m.type===M.SELECT_EFFECTYN||m.type===M.SELECT_YESNO){used=true;return choose(choices,/^Yes/i)?.response}
 }});
 assert.ok(used,'Wyvern offered its End Phase effect');
 assert.deepEqual(wyvern.field0,[REBD],'Red-Eyes Black Dragon came back from the GY');
 assert.ok(!wyvern.grave0.includes(WYVERN),'Wyvern was banished');
 console.log('PASS survey cards: Seal of Orichalcos (+500 ATK), Raiza (top of Deck), Caius (banish + 1000), Red-Eyes Wyvern (End Phase revive); packs and rarities');
}finally{try{engine.destroy()}catch{}}
