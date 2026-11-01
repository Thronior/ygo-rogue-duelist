// Two CPU misreadings found in the Enemy Controller replay review (2026-11-01): setting the hand away before a
// hand-powered monster attacks, and treating conditional battle immunity as total.
import fs from 'node:fs';import assert from 'node:assert/strict';import {MobileDuel,M,I,B,L} from './web/duel.js';import {smartContext} from './web/smart_policy.js';
const meta=JSON.parse(fs.readFileSync(new URL('./web/content.json',import.meta.url))),data=JSON.parse(fs.readFileSync(new URL('./web/engine-data.json',import.meta.url))),id=n=>meta.cards.find(c=>c.name===n).id;
const card=(name,location,controller,sequence,position=1,extra={})=>({code:id(name),attack:data[id(name)]?.attack??0,defense:data[id(name)]?.defense??0,position,controller,location,sequence,type:data[id(name)]?.type||0,...extra});
const mon=(name,controller,sequence,position=1,extra)=>card(name,L.MZONE,controller,sequence,position,extra);
const filler=(controller,n=20)=>Array.from({length:n},(_,i)=>card('Battle Ox',L.DECK,controller,i,10));
// A CPU (seat 1) duel whose zones are given as {[player]:{[location]:cards}}.
function duel(zones,state={}){
 const e=new MobileDuel(meta.cards);
 Object.assign(e,{data,lp:[8000,8000],turn:5,player:1,phase:4,events:[],visuals:[],peak:{},pendingSummons:[],activeChain:[],battleProtected:[false,false],aiModifiers:{}},state);
 const slots=list=>{const out=Array(5).fill(null);for(const c of list)out[c.sequence]=c;return out};
 for(const p of [0,1]){zones[p]={[L.DECK]:filler(p),...zones[p]};for(const loc of [L.MZONE,L.SZONE])zones[p][loc]=slots(zones[p][loc]||[]);}
 e.query=(side,loc)=>zones[side]?.[loc]||[];
 e.core={duelQueryCount:(_,side,loc)=>(zones[side]?.[loc]||[]).length};
 return e;
}
const idle=(o={})=>({type:M.SELECT_IDLECMD,player:1,summons:[],special_summons:[],monster_sets:[],spell_sets:[],activates:[],pos_changes:[],to_bp:true,to_ep:true,...o});

// Muka Muka: 76c0a4afc0 set three cards in Main Phase 1 and dropped from 2100 to 900 ATK, so it could not attack.
{
 const hand=()=>[card('Waboku',L.HAND,1,0),card('Waboku',L.HAND,1,1),card('Negate Attack',L.HAND,1,2)],muka=()=>mon('Muka Muka',1,1,1,{attack:1500});
 const board=(attacker=muka(),enemy=[mon('Marauding Captain',0,2)])=>({1:{[L.MZONE]:[attacker],[L.HAND]:hand()},0:{[L.MZONE]:enemy}});
 const sets=()=>hand().map((c,i)=>({...c,sequence:i}));
 let r=duel(board()).auto(idle({spell_sets:sets()}));
 assert.equal(r.action,I.TO_BP,'Muka Muka attacks before the hand is set');
 r=duel(board(),{phase:256}).auto(idle({spell_sets:sets(),to_bp:false}));
 assert.equal(r.action,I.SELECT_SPELL_SET,'Main Phase 2 sets them');
 r=duel(board()).auto(idle({monster_sets:[card('Mystical Elf',L.HAND,1,3)]}));
 assert.equal(r.action,I.TO_BP,'a monster to set waits for Main Phase 2 as well');
 r=duel(board(mon('Enraged Muka Muka',1,1,1,{attack:2400}))).auto(idle({spell_sets:sets()}));
 assert.equal(r.action,I.TO_BP,'Enraged Muka Muka too');
 r=duel(board(muka(),[])).auto(idle({spell_sets:sets()}));
 assert.equal(r.action,I.TO_BP,'a direct attack counts');
 r=duel(board(muka(),[mon('Blue-Eyes White Dragon',0,2)])).auto(idle({spell_sets:sets()}));
 assert.equal(r.action,I.SELECT_SPELL_SET,'nothing to attack: set as usual');
 r=duel(board(mon('Muka Muka',1,1,4,{attack:1500}))).auto(idle({spell_sets:sets()}));
 assert.equal(r.action,I.SELECT_SPELL_SET,'in Defense it is not attacking');
 r=duel(board(mon('Battle Ox',1,1))).auto(idle({spell_sets:sets()}));
 assert.equal(r.action,I.SELECT_SPELL_SET,'an ordinary monster does not care');
}

const attacks=(attacker,target,state={})=>duel({1:{[L.MZONE]:[attacker]},0:{[L.MZONE]:[target]}},{phase:8,...state}).auto({type:M.SELECT_BATTLECMD,player:1,chains:[],attacks:[attacker],to_m2:true,to_ep:true}).action===B.SELECT_BATTLE;
// Rocket Warrior is only safe during its controller's Battle Phase.
{
 assert.equal(attacks(mon('Battle Ox',1,1),mon('Rocket Warrior',0,2,4)),true,'on our turn the opposing Rocket Warrior can be destroyed');
 // The forecast of the opponent's next turn, made on our own turn: it is their turn then, so Rocket Warrior is exposed.
 const rocket=mon('Rocket Warrior',1,1),raiders=[mon('Vorse Raider',0,2),mon('Vorse Raider',0,3)];
 const e=duel({1:{[L.MZONE]:[rocket]},0:{[L.MZONE]:raiders}});
 assert.equal(smartContext(e,1,L).incomingDamage(rocket,true),400+1900,'the first attack destroys it, the second goes direct');
}
// Immunity that depends on the attacker.
{
 const guard=()=>mon('Obnoxious Celtic Guard',0,2,4);
 assert.equal(attacks(mon('Battle Ox',1,1),guard()),true,'1700 ATK destroys Obnoxious Celtic Guard');
 assert.equal(attacks(mon('Vorse Raider',1,1,1,{attack:1900}),guard()),false,'1900 ATK does not');
 const dragon=()=>mon('Different Dimension Dragon',0,2,4);
 assert.equal(attacks(mon('Vorse Raider',1,1,1,{attack:2000}),dragon()),true,'2000 ATK destroys Different Dimension Dragon');
 assert.equal(attacks(mon('Battle Ox',1,1,1,{attack:1900}),dragon()),false,'1900 ATK does not');
 const glider=()=>mon('Kaiser Glider',0,2,4);
 assert.equal(attacks(mon('Blue-Eyes White Dragon',1,1,1,{attack:2500}),glider()),true,'Kaiser Glider only resists an equal ATK');
 assert.equal(attacks(mon('Blue-Eyes White Dragon',1,1,1,{attack:2400}),mon('Kaiser Glider',0,2,4,{attack:2400})),false,'equal ATK does nothing');
 assert.equal(attacks(mon('Blue-Eyes White Dragon',1,1),mon('Satellite Cannon',0,2,4)),true,'a Level 8 destroys Satellite Cannon');
 assert.equal(attacks(mon('Vorse Raider',1,1),mon('Satellite Cannon',0,2,4)),false,'a Level 4 does not');
 assert.equal(attacks(mon('Vorse Raider',1,1),mon('Marshmallon',0,2,4)),false,'unconditional immunity still holds');
}

// The real core: Muka Muka attacks at full strength, then the Trap is set.
const engine=await new MobileDuel(meta.cards).init([data,JSON.parse(fs.readFileSync(new URL('./web/scripts.json',import.meta.url)))]);
try{
 const place=(side,name)=>`Duel.MoveToField(Duel.CreateToken(${side},${id(name)}),${side},${side},LOCATION_MZONE,POS_FACEUP_ATTACK,true)`;
 const lua=`local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START|PHASE_DRAW) e:SetOperation(function(e) if Duel.GetTurnCount()<2 then return end e:Reset()
 ${place(1,'Muka Muka')}
 ${place(0,'Battle Ox')}
 Duel.SendtoHand(Duel.CreateToken(1,${id('Waboku')}),1,REASON_RULE)
 end) Duel.RegisterEffect(e,0)`;
 const deck=Array(40).fill(id('Blue-Eyes White Dragon'));
 engine.start(deck,deck,8000,8000,5,123,[],[],lua);
 let attacked=null;
 for(let n=0;n<400&&!engine.finished&&engine.pending&&engine.turn<=2;n++){
  const m=engine.pending,r=engine.auto();
  if(m.type===M.SELECT_BATTLECMD&&m.player===1&&r.action===B.SELECT_BATTLE)attacked={zone:engine.query(1,L.SZONE).filter(Boolean).length,attack:engine.query(1,L.MZONE).find(Boolean)?.attack};
  engine.respond(r);
 }
 assert.ok(attacked,'Muka Muka attacks');
 assert.equal(attacked.zone,0,'nothing was set before the attack');
 assert.equal(engine.query(0,L.MZONE).filter(Boolean).length,0,'Battle Ox is destroyed');
 assert.equal(engine.query(1,L.SZONE).filter(Boolean).length,1,'Waboku is set in Main Phase 2');
 assert.deepEqual(engine.errors,[]);
}finally{engine.destroy()}
console.log('PASS CPU hand and immunity: hand-powered monsters attack before cards are set; conditional battle immunity follows the turn and the attacker');
