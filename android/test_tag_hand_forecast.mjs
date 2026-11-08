// Mugen101 (Discord 2026-11-08): in Tag, a monster in hand showed its printed ATK, not what it will have on the field
// (Mother Grizzly with A Legendary Ocean out). The screen's stand-in engine now gets the team's relic and curse numbers
// from TagDuel.snapshotFor, and its forecast must match the real engine's. The stand-in below is built the way
// mobile.js showTagDuel builds it.
import fs from 'node:fs';import assert from 'node:assert/strict';
const {TagDuel}=await import('./web/tag-duel.js');const {MobileDuel,L}=await import('./web/duel.js');const {smartContext}=await import('./web/smart_policy.js');
const read=n=>JSON.parse(fs.readFileSync(new URL('./web/'+n+'.json',import.meta.url),'utf8').replace(/^﻿/,''));
const meta=read('content'),engineData=read('engine-data'),scripts=read('scripts'),id=n=>meta.cards.find(c=>c.name===n).id;
const GRIZZLY=id('Mother Grizzly'),OCEAN=id('A Legendary Ocean'),OX=id('Battle Ox');
let checks=0;

// IsOriginalCode below: A Legendary Ocean's name is treated as Umi, so IsCode misses it.
const ai={relicFeedback:['x'],statRelics:[[],[]],activeRelics:[[],[]],activeCurses:['hunger'],challengeLevel:0,enemyAttack:0,firstPlayer:0,spellTrapZones:5};
const setup=`-- SHADOW_RUN_AI ${JSON.stringify(ai)}
do local done=false local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START+PHASE_MAIN1)
e:SetCondition(function() return not done end)
e:SetOperation(function() done=true Duel.MoveToField(Duel.GetFirstMatchingCard(Card.IsOriginalCode,0,LOCATION_DECK+LOCATION_HAND,0,nil,${OCEAN}),0,0,LOCATION_FZONE,POS_FACEUP,true) end) Duel.RegisterEffect(e,0) end`;
const team=[{main:[OCEAN,...Array(39).fill(GRIZZLY)],extra:[]},{main:[OCEAN,...Array(39).fill(GRIZZLY)],extra:[]}],foes=[{main:Array(40).fill(OX),extra:[]},{main:Array(40).fill(OX),extra:[]}];
const e=await new TagDuel([...meta.cards,...meta.tokenCards]).init([engineData,scripts]);
try{
 e.startTag({teams:[team,foes],lp:8000,enemyLP:8000,seed:5,passives:setup});
 for(let i=0;i<50&&!(e.pending&&e.phase>=4&&e.player===0);i++)e.respond(e.auto(e.pending));
 const s=e.snapshotFor(0);
 assert.ok(s.players[0].spells[5]?.code===OCEAN,'A Legendary Ocean is on the field');checks++;
 assert.deepEqual(s.tag.ui.aiModifiers.activeCurses,['hunger'],'the team curses reach the screen');checks++;
 assert.equal(s.tag.ui.aiModifiers.relicFeedback,undefined,'the long relic list is left out');checks++;
 // The stand-in engine, as mobile.js showTagDuel makes it.
 const data=structuredClone(engineData);for(const c of Object.values(data))c.race=BigInt(c.race);
 const facade=Object.create(MobileDuel.prototype);facade.tagFacade=true;facade.cards=new Map([...meta.cards,...meta.tokenCards].map(c=>[c.id,c]));facade.data=data;
 facade.query=(p,loc)=>{const side=s.players[p];return loc===L.EXTRA?(side.extraCards||[]):side[{[L.HAND]:'hand',[L.MZONE]:'monsters',[L.SZONE]:'spells',[L.GRAVE]:'grave',[L.REMOVED]:'banished'}[loc]]||[]};
 facade.core={duelQueryCount:(_,p,loc)=>loc===L.DECK?s.players[p].deck:loc===L.EXTRA?s.players[p].extra:facade.query(p,loc).length};
 Object.assign(facade,s.tag.ui,{pending:s.pending,visuals:[],turn:s.turn,phase:s.phase,player:s.player,lp:s.lp});
 const seq=s.players[0].hand.findIndex(c=>c?.code===GRIZZLY),live=s.players[0].hand[seq],c={...live,controller:0,location:L.HAND,sequence:seq};
 const forecast=x=>{const smart=smartContext(x,0,L);return [smart.projectedAttack(c,{equips:false}),smart.projectedDefense(c,{equips:false})]};
 const real=forecast(e),shown=forecast(facade);
 console.log('Mother Grizzly in hand, printed 1400/1000; real engine',real,'Tag screen',shown);
 assert.deepEqual(real,[1600,900],'Ocean +200 ATK/DEF and the Hunger curse -300 DEF');checks++;
 assert.deepEqual(shown,real,'the Tag screen forecasts what the real engine does');checks++;
 // The inspection swaps activeCurses for a moment; the engine's own numbers stay untouched.
 const smart=smartContext(facade,0,L);smart.statSources(c,0);
 assert.deepEqual(e.aiModifiers.activeCurses,['hunger']);assert.equal(e.aiModifiers.relicFeedback.length,1);checks++;
 assert.deepEqual(e.errors.filter(x=>x.trim()),[]);checks++;
}finally{e.destroy()}
// PvP has only one side's numbers, so it sends none and the screen shows no forecast.
{const p=await new TagDuel([...meta.cards,...meta.tokenCards]).init([engineData,scripts]);
 try{p.startTag({teams:[[team[0]],[foes[0]]],lp:8000,enemyLP:8000,seed:5,passives:setup,mode:'pvp'});
  assert.equal(p.snapshotFor(0).tag.ui.aiModifiers,null);assert.equal(p.snapshotFor(1).tag.ui.aiModifiers,null);checks++;
 }finally{p.destroy()}}
console.log(`PASS Tag hand forecast matches the real engine (${checks} checks)`);
