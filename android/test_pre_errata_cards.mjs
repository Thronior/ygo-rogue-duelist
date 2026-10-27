// Pre-errata cards keep their passcode: the bundle runs the original print's script and the UI shows its text.
import fs from 'node:fs';import assert from 'node:assert/strict';import {MobileDuel,M,R,I} from './web/duel.js';
const read=name=>JSON.parse(fs.readFileSync(new URL('./web/'+name+'.json',import.meta.url),'utf8'));
const meta=read('content'),data=read('engine-data'),scripts=read('scripts'),fixture=read('test-fixture');
const cards=JSON.parse(fs.readFileSync(new URL('../data/pre-errata.json',import.meta.url),'utf8')).cards;
const id=name=>meta.cards.find(c=>c.name===name).id;
const KURIBOH=id('Kuriboh'),BLUE_EYES=id('Blue-Eyes White Dragon'),BATTLE_OX=id('Battle Ox'),RING=id('Ring of Destruction'),SANGAN=id('Sangan');

for(const [code,row] of Object.entries(cards)){
 assert.equal(scripts[`c${code}.lua`],fs.readFileSync(new URL('../runtime/script/'+row.script,import.meta.url),'utf8'),`${row.name}: bundled script`);
 assert.equal(meta.cards.find(c=>c.id===Number(code))?.desc,row.desc,`${row.name}: shown text`);
}

const engine=await new MobileDuel(meta.cards).init([data,scripts]);
const untilIdle=state=>{for(let i=0;i<300&&!(state.pending?.type===M.SELECT_IDLECMD&&state.pending.player===0);i++)state=engine.respond(engine.auto());return state};
const errors=()=>engine.errors.filter(x=>x.trim());
try{
 // Two Sangans tributed together both search: no once-per-turn.
 const tributes=`local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START+PHASE_MAIN1) e:SetCountLimit(1)
 e:SetOperation(function() for tc in aux.Next(Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_DECK,0,nil,${SANGAN})) do Duel.MoveToField(tc,0,0,LOCATION_MZONE,POS_FACEUP_ATTACK,true) end
 Duel.SendtoHand(Duel.GetFirstMatchingCard(Card.IsCode,0,LOCATION_DECK,0,nil,${BLUE_EYES}),nil,REASON_EFFECT) end) Duel.RegisterEffect(e,0)`;
 let state=untilIdle(engine.start([SANGAN,SANGAN,BLUE_EYES,...Array(27).fill(KURIBOH)],fixture.enemy,8000,8000,5,11,[],[],tributes));
 const before=state.players[0].hand.filter(c=>c?.code===KURIBOH).length;
 state=untilIdle(engine.respond({type:R.SELECT_IDLECMD,action:I.SELECT_SUMMON,index:state.pending.summons.findIndex(c=>c.code===BLUE_EYES)}));
 assert.equal(state.players[0].hand.filter(c=>c?.code===KURIBOH).length-before,2,'each Sangan searches');
 assert.deepEqual(errors(),[]);engine.destroy();

 // Ring of Destruction works on your own monster during your turn and hits both players.
 const ring=`local e0=Effect.GlobalEffect() e0:SetType(EFFECT_TYPE_FIELD) e0:SetCode(EFFECT_TRAP_ACT_IN_SET_TURN) e0:SetProperty(EFFECT_FLAG_SET_AVAILABLE) e0:SetTargetRange(LOCATION_SZONE,LOCATION_SZONE) Duel.RegisterEffect(e0,0)
 local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START+PHASE_MAIN1) e:SetCountLimit(1)
 e:SetOperation(function() Duel.MoveToField(Duel.GetFirstMatchingCard(Card.IsCode,0,LOCATION_DECK,0,nil,${BATTLE_OX}),0,0,LOCATION_MZONE,POS_FACEUP_ATTACK,true)
 Duel.SSet(0,Duel.GetFirstMatchingCard(Card.IsCode,0,LOCATION_DECK,0,nil,${RING})) end) Duel.RegisterEffect(e,0)`;
 state=untilIdle(engine.start([RING,BATTLE_OX,...Array(28).fill(KURIBOH)],fixture.enemy,8000,8000,5,11,[],[],ring));
 const index=(state.pending.activates||[]).findIndex(c=>c.code===RING);
 assert.ok(index>=0,'Ring can be activated on your own monster during your turn');
 state=untilIdle(engine.respond({type:R.SELECT_IDLECMD,action:I.SELECT_ACTIVATE,index}));
 assert.deepEqual(state.lp,[6300,6300],'Ring deals the 1700 ATK to both players');
 assert.deepEqual(errors(),[]);engine.destroy();

 // Every pre-errata script loads and survives auto-played duels.
 for(const code of Object.keys(cards).map(Number)){
  const extra=(data[code]?.type||0)&0x40?[code,code]:[];
  const main=extra.length?fixture.strong:[...Array(12).fill(code),...fixture.strong.slice(0,18)];
  state=engine.start(main,fixture.enemy,8000,8000,5,3,extra,[],'');
  for(let step=0;step<600&&!state.finished;step++)state=engine.respond(engine.auto());
  assert.deepEqual(errors(),[],cards[code].name);engine.destroy();
 }
 console.log(`PASS pre-errata cards: ${Object.keys(cards).length} scripts and texts bundled; two Sangans both search; Ring hits both players on your own monster; every script survives auto-played duels`);
}finally{try{engine.destroy()}catch{}}
