// Moth LV line (user design, 2026-11-23): Moth LV1 -> LV2 -> LV6 -> LV8 climb one stage per Standby Phase of yours, never
// several in one (the user: "make sure it doesn't just immediately summon all of them"); LV1 and LV2 must climb, LV6 may.
// LV6 makes a 1000/1000 Moth Token when it destroys a monster by battle; LV8's token copies the ATK/DEF the destroyed
// monster had on the field. Cocoon of Evolution - S Tributes any monster with "Moth" in its name for an Insect from the hand,
// ignoring its Summoning conditions. "Level Up!" climbs the line too. Runs on the repo's custom card files, so it needs no
// rebuild; android/web supplies the rest of the card pool.
import fs from 'node:fs';import assert from 'node:assert/strict';import {MobileDuel,M,L} from './web/duel.js';import {DuelEngine} from './web/engine.js';import {automaticChainResponse} from './web/duel-presentation.js';
const R=M&&(await import('./web/duel.js')).R;
const read=name=>JSON.parse(fs.readFileSync(new URL('./web/'+name+'.json',import.meta.url),'utf8'));
const repo=name=>JSON.parse(fs.readFileSync(new URL('../'+name,import.meta.url),'utf8'));
const meta=read('content'),data=read('engine-data'),scripts=read('scripts'),custom=repo('data/custom-cards.json'),tokens=repo('data/custom-tokens.json');
for(const c of [...custom,...tokens]){data[c.id]=c.data;const lua=new URL(`../runtime/script/custom/c${c.id}.lua`,import.meta.url);if(fs.existsSync(lua))scripts[`c${c.id}.lua`]=fs.readFileSync(lua,'utf8')}
const pool=[...meta.cards.filter(c=>!custom.some(x=>x.id===c.id)),...custom],cards=[...pool,...meta.tokenCards.filter(c=>!tokens.some(x=>x.id===c.id)),...tokens.map(t=>({...t,type:'Token',race:'Token'}))];
const id=n=>pool.find(c=>c.name===n).id;
const LV1=id('Moth LV1'),LV2=id('Moth LV2'),LV6=id('Moth LV6'),LV8=id('Moth LV8'),COCOON=id('Cocoon of Evolution - S'),TOKEN=tokens[0].id;
const FILLER=id('Blue-Eyes White Dragon'),SKULL=id('Summoned Skull'),SAND=id('Sand Moth'),OX=id('Battle Ox'),LEVEL_UP=id('Level Up!');
const engine=await new MobileDuel(cards).init([data,scripts]);
const field=(code,p=0,extra='')=>`local c=Duel.CreateToken(${p},${code}) Duel.MoveToField(c,${p},${p},LOCATION_MZONE,POS_FACEUP_ATTACK,true) ${extra}`;
const hand=code=>`Duel.SendtoHand(Duel.CreateToken(0,${code}),0,REASON_RULE)`;
const weaken=n=>`local e1=Effect.CreateEffect(c) e1:SetType(EFFECT_TYPE_SINGLE) e1:SetCode(EFFECT_UPDATE_ATTACK) e1:SetValue(${n}) e1:SetReset(RESET_EVENT|RESETS_STANDARD) c:RegisterEffect(e1)`;
// Everything is put out at the start of turn 1's Draw Phase, so it counts as arriving on turn 1.
const setup=parts=>`local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START|PHASE_DRAW) e:SetOperation(function(e) e:Reset() ${parts.join(' ')} end) Duel.RegisterEffect(e,0)`;
const mine=()=>engine.query(0,L.MZONE).filter(Boolean);
const names=list=>list.map(c=>cards.find(x=>x.id===c.code)?.name??c.code);
// Plays like the client. Player 0 answers optional windows with `climb` (LV6's choice) and its turn with `act`.
function play(label,{deck,parts,turns,climb=true,act=null}){
 engine.start([...deck,...Array(30).fill(FILLER)],Array(40).fill(FILLER),8000,8000,2,4242,[],[],setup(parts),2);
 const seen={},windows=[];let acted=new Set();
 for(let n=0;n<900&&!engine.finished&&engine.pending&&engine.turn<=turns;n++){
  const m=engine.pending,choices=engine.choices(m);let response;
  if(m.type===M.SELECT_IDLECMD&&m.player===0)seen[engine.turn]??=names(mine());
  if(process.env.MOTH_DEBUG&&m.player===0&&![M.SELECT_IDLECMD,M.SELECT_BATTLECMD].includes(m.type))console.log(engine.turn,engine.phase,m.type,m.code,JSON.stringify(m.selects?.map(s=>s.code)),m.forced,JSON.stringify(choices.slice(0,4).map(c=>[c.label,c.response])));
  // A lone optional trigger (Moth LV6's climb) is asked as a yes/no.
  if(m.type===M.SELECT_EFFECTYN&&m.player===0&&m.code===LV6){
   windows.push({turn:engine.turn,phase:engine.phase,forced:false,codes:[m.code]});
   response=choices.find(c=>c.response.yes===climb).response;
  }
  else if(m.type===M.SELECT_CHAIN&&m.player===0&&m.selects.length){
   windows.push({turn:engine.turn,phase:engine.phase,forced:!!m.forced,codes:m.selects.map(s=>s.code)});
   response=automaticChainResponse(m,true,M,R);
   if(!response){const own=choices.filter(c=>Number.isInteger(c.response?.index));response=(climb&&own[0]||choices.find(c=>!Number.isInteger(c.response?.index)))?.response}
  }
  else if(m.player===0&&act&&(m.type===M.SELECT_IDLECMD||m.type===M.SELECT_BATTLECMD)){
   const step=act(engine.turn,m.type,choices,acted);if(step){acted.add(step.key);response=step.response}
  }
  if(!response){
   if(m.type===M.SELECT_IDLECMD)response=(choices.find(c=>/End turn/.test(c.label))||choices.find(c=>/battle phase/i.test(c.label))).response;
   else if(m.type===M.SELECT_BATTLECMD)response=choices.find(c=>/End turn/.test(c.label)).response;
   else if(m.type===M.SELECT_PLACE&&choices.length)response=choices[0].response;
   else response=DuelEngine.prototype.auto.call(engine,m);
  }
  engine.respond(response);
 }
 assert.deepEqual(engine.errors.filter(x=>x.trim()),[],label);
 const result={seen,windows,monsters:mine(),grave:engine.query(0,L.GRAVE).map(c=>c.code),lp:engine.lp?.slice?.()};
 engine.destroy();return result;
}
const once=(turn,type,pattern,key=pattern.source)=>(t,ty,choices,acted)=>{
 if(t!==turn||ty!==type||acted.has(key))return null;const c=choices.find(x=>pattern.test(x.label));
 if(!c)throw Error(`no choice ${pattern} on turn ${t}: ${choices.map(x=>x.label).join(' | ')}`);if(process.env.MOTH_DEBUG)console.log("ACT",c.label,"|",choices.map(x=>x.label).join(" | "));return {key,response:c.response};
};
try{
 // 1. The climb: one stage per Standby Phase of yours (turns 1, 3, 5, 7 are player 0's).
 const climb=play('climb',{deck:[LV2,LV6,LV8],parts:[field(LV1)],turns:7});
 assert.deepEqual([1,3,5,7].map(t=>climb.seen[t]),[['Moth LV1'],['Moth LV2'],['Moth LV6'],['Moth LV8']],'one stage per Standby Phase, LV1 not on the turn it arrived');
 assert.ok(climb.grave.includes(LV1)&&climb.grave.includes(LV2)&&climb.grave.includes(LV6),'each stage was Tributed');
 const forced=climb.windows.filter(w=>w.codes.includes(LV1)||w.codes.includes(LV2)),optional=climb.windows.filter(w=>w.codes.includes(LV6));
 assert.ok(forced.length===2&&forced.every(w=>w.forced),'LV1 and LV2 climb is mandatory');
 assert.ok(optional.length>=1&&optional.every(w=>!w.forced),'LV6 climb is optional');
 // 2. LV6 may stay.
 const stay=play('LV6 stays',{deck:[LV2,LV6,LV8],parts:[field(LV6)],turns:5,climb:false});
 assert.deepEqual([1,3,5].map(t=>stay.seen[t]),[['Moth LV6'],['Moth LV6'],['Moth LV6']],'declining keeps Moth LV6');
 // 3. No next stage left: LV1 stays put instead of being Tributed for nothing.
 const stuck=play('no LV2 left',{deck:[],parts:[field(LV1)],turns:3});
 assert.deepEqual(stuck.seen[3],['Moth LV1'],'LV1 is not Tributed when no Moth LV2 can be Summoned');
 // 4. LV6 destroys a monster by battle: a 1000/1000 Moth Token; LV6 survives its own battles.
 const attack=(turn)=>once(turn,M.SELECT_BATTLECMD,/Attack|attack/);
 const toBattle=(turn)=>once(turn,M.SELECT_IDLECMD,/battle phase/i,'bp'+turn);
 const both=(...fs)=>(...a)=>{for(const f of fs){const r=f(...a);if(r)return r}return null};
 const six=play('LV6 token',{deck:[],parts:[field(LV6),field(OX,1)],turns:3,climb:false,act:both(toBattle(3),attack(3))});
 const sixToken=six.monsters.find(c=>c.code===TOKEN);
 assert.ok(six.monsters.some(c=>c.code===LV6),'LV6 still on the field');
 assert.deepEqual(sixToken&&[sixToken.attack,sixToken.defense,sixToken.level],[1000,1000,3],'a 1000/1000 Level 3 Moth Token');
 // 5. LV8's token copies the destroyed monster's ATK/DEF on the field: Summoned Skull at 2500-500 = 2000 ATK, 1200 DEF.
 const eight=play('LV8 token',{deck:[],parts:[field(LV8),field(SKULL,1,weaken(-500))],turns:3,act:both(toBattle(3),attack(3))});
 const eightToken=eight.monsters.find(c=>c.code===TOKEN);
 assert.deepEqual(eightToken&&[eightToken.attack,eightToken.defense],[2000,1200],'the token has the ATK/DEF it had on the field, not the printed 2500');
 // 6. Cocoon of Evolution - S: Tribute a "Moth" monster, Special Summon an Insect from the hand ignoring its conditions.
 const cocoon=play('Cocoon',{deck:[],parts:[field(LV1),hand(COCOON),hand(LV8)],turns:1,act:once(1,M.SELECT_IDLECMD,/Activate · Cocoon of Evolution - S/)});
 assert.deepEqual(names(cocoon.monsters),['Moth LV8'],'Moth LV1 Tributed, Moth LV8 Summoned from the hand on turn 1');
 const sand=play('Cocoon with Sand Moth',{deck:[],parts:[field(SAND),hand(COCOON),hand(LV6)],turns:1,act:once(1,M.SELECT_IDLECMD,/Activate · Cocoon of Evolution - S/)});
 assert.deepEqual(names(sand.monsters),['Moth LV6'],'any monster with Moth in its name can be Tributed');
 const none=play('Cocoon without a Moth',{deck:[],parts:[field(OX),hand(COCOON),hand(LV8)],turns:1,act:(t,ty,choices)=>{assert.ok(!choices.some(c=>/Activate · Cocoon of Evolution - S/.test(c.label)),'no Moth monster, no activation');return null}});
 assert.deepEqual(names(none.monsters),['Battle Ox']);
 // 7. "Level Up!" sends Moth LV1 and Summons Moth LV2 from the Deck.
 const up=play('Level Up!',{deck:[LV2],parts:[field(LV1),hand(LEVEL_UP)],turns:1,act:once(1,M.SELECT_IDLECMD,/Activate · Level Up!/)});
 assert.deepEqual(names(up.monsters),['Moth LV2'],'Level Up! climbs the Moth line');
 console.log('PASS Moth LV line: one stage per Standby Phase (LV1/LV2 forced, LV6 optional, nothing without a next stage), LV6 1000/1000 token, LV8 token with on-field ATK/DEF, Cocoon of Evolution - S on any Moth, Level Up!');
}finally{try{engine.destroy()}catch{}}
