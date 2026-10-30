// Little-Winguard's optional End Phase position change (player report, 2026-10-29): the CPU switched it
// to Defense against an 1800-ATK monster, then used the effect to flip it back into Attack Position.
import fs from 'node:fs';import assert from 'node:assert/strict';import {MobileDuel,M,I,L} from './web/duel.js';
const meta=JSON.parse(fs.readFileSync(new URL('./web/content.json',import.meta.url))),data=JSON.parse(fs.readFileSync(new URL('./web/engine-data.json',import.meta.url))),id=n=>meta.cards.find(c=>c.name===n).id;
const card=(name,location,controller,sequence,position=1,extra={})=>({code:id(name),attack:data[id(name)]?.attack??0,defense:data[id(name)]?.defense??0,position,controller,location,sequence,type:data[id(name)]?.type||0,...extra});
const mon=(name,controller,sequence,position=1,extra)=>card(name,L.MZONE,controller,sequence,position,extra);
const filler=(controller,n=20)=>Array.from({length:n},(_,i)=>card('Battle Ox',L.DECK,controller,i,10));
// The CPU (seat 1) in its own End Phase, zones given as {[player]:{[location]:cards}}.
function duel(zones,state={}){
 const e=new MobileDuel(meta.cards);
 Object.assign(e,{data,lp:[8000,8000],turn:5,player:1,phase:512,events:[],visuals:[],peak:{},pendingSummons:[],activeChain:[],battleProtected:[false,false],aiModifiers:{}},state);
 const slots=list=>{const out=Array(5).fill(null);for(const c of list)out[c.sequence]=c;return out};
 for(const p of [0,1]){zones[p]={[L.DECK]:filler(p),...zones[p]};for(const loc of [L.MZONE,L.SZONE])zones[p][loc]=slots(zones[p][loc]||[]);}
 e.query=(side,loc)=>zones[side]?.[loc]||[];
 e.core={duelQueryCount:(_,side,loc)=>(zones[side]?.[loc]||[]).length};
 return e;
}
const description=BigInt(id('Little-Winguard'))<<20n;
// The core offers the optional trigger either as a yes/no prompt or in a chain window; both must agree.
function activates(winguard,enemy,label){
 const zones=()=>({1:{[L.MZONE]:[winguard]},0:{[L.MZONE]:enemy}});
 const yes=duel(zones()).auto({type:M.SELECT_EFFECTYN,player:1,code:winguard.code,controller:1,location:L.MZONE,sequence:winguard.sequence,position:winguard.position,description}).yes;
 const index=duel(zones()).auto({type:M.SELECT_CHAIN,player:1,forced:false,selects:[{...winguard,description}]}).index;
 assert.equal(index!==null,yes,`${label}: the yes/no prompt and the chain window disagree`);
 return yes;
}
const jinn=()=>mon('La Jinn the Mystical Genie of the Lamp',0,1,1);

// The reported case: Defense Position Winguard (1800 DEF) survives the 1800-ATK attacker; Attack Position (1400) would not.
assert.equal(activates(mon('Little-Winguard',1,2,4),[jinn()],'reported'),false,'Winguard stays in Defense against an 1800-ATK monster');
// The same against a face-up Defense Position monster, which can switch to Attack on its turn.
assert.equal(activates(mon('Little-Winguard',1,2,4),[mon('La Jinn the Mystical Genie of the Lamp',0,1,4)],'defending threat'),false,'a face-up Defense Position threat still counts');
// Both positions lose to a piercing 1900-ATK attacker; Defense still takes less damage.
assert.equal(activates(mon('Little-Winguard',1,2,4),[mon('Spear Dragon',0,1,1)],'piercing'),false,'Winguard stays in Defense against Spear Dragon');
// No opposing monsters: nothing to gain from switching.
assert.equal(activates(mon('Little-Winguard',1,2,4),[],'empty field'),false,'no switch without a reason');

// The effect is still used when the new position is better.
assert.equal(activates(mon('Little-Winguard',1,2,1),[jinn()],'attack to defense'),true,'an Attack Position Winguard switches to Defense against an 1800-ATK monster');
assert.equal(activates(mon('Little-Winguard',1,2,4,{attack:2400}),[mon('Vorse Raider',0,1,1)],'boosted'),true,'a 2400-ATK Winguard switches to Attack: 1900 ATK beats its 1800 DEF but not its ATK');
assert.equal(activates(mon('Little-Winguard',1,2,1),[mon('Kuriboh',0,1,1)],'weak opponent'),false,'an Attack Position Winguard stays put when nothing beats it');

// The manual switch and the effect agree: Main Phase moves Winguard to Defense, the End Phase keeps it there.
{
 const winguard=mon('Little-Winguard',1,2,1),zones={1:{[L.MZONE]:[winguard]},0:{[L.MZONE]:[jinn()]}};
 const main=duel(zones,{phase:256}).auto({type:M.SELECT_IDLECMD,player:1,summons:[],special_summons:[],monster_sets:[],spell_sets:[],activates:[],pos_changes:[winguard],to_bp:false,to_ep:true});
 assert.deepEqual([main.action,main.index],[I.SELECT_POS_CHANGE,0],'Main Phase 2 switches Winguard to Defense');
 assert.equal(activates({...winguard,position:4},[jinn()],'after manual switch'),false,'the End Phase effect does not undo the manual switch');
}

// The real core, from both seats: the CPU's turn with Winguard (in either position) facing La Jinn.
const engine=await new MobileDuel(meta.cards).init([data,JSON.parse(fs.readFileSync(new URL('./web/scripts.json',import.meta.url)))]);
try{for(const p of [0,1])for(const position of ['POS_FACEUP_ATTACK','POS_FACEUP_DEFENSE']){
 const setup=`local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START|PHASE_DRAW) e:SetOperation(function(e) e:Reset()
 Duel.MoveToField(Duel.CreateToken(${p},${id('Little-Winguard')}),${p},${p},LOCATION_MZONE,${position},true)
 Duel.MoveToField(Duel.CreateToken(${1-p},${id('La Jinn the Mystical Genie of the Lamp')}),${1-p},${1-p},LOCATION_MZONE,POS_FACEUP_ATTACK,true)
 end) Duel.RegisterEffect(e,0)`;
 // Unsummonable Blue-Eyes decks keep the field to these two monsters.
 engine.start(Array(40).fill(id('Blue-Eyes White Dragon')),Array(40).fill(id('Blue-Eyes White Dragon')),8000,8000,5,123,[],[],setup);
 const label=`seat ${p}, ${position}`,winguard=()=>engine.query(p,L.MZONE).find(c=>c?.code===id('Little-Winguard'));let offered=null;
 for(let n=0;n<400&&!engine.finished&&engine.pending;n++){
  const m=engine.pending,r=engine.auto();
  if(m.type===M.SELECT_EFFECTYN&&m.player===p&&m.code===id('Little-Winguard')){offered=r;assert.equal(engine.phase,512,`${label}: offered in the End Phase`);}
  engine.respond(r);
  if(offered&&engine.player!==p)break;
 }
 assert.ok(offered,`${label}: the core offers the End Phase effect`);
 assert.equal(offered.yes,false,`${label}: the CPU declines the effect`);
 assert.equal(winguard()?.position,4,`${label}: Winguard ends the turn in Defense Position`);
 assert.deepEqual(engine.errors,[]);engine.destroy();
}}finally{engine.destroy()}
console.log('PASS Little-Winguard End Phase position change: keeps a safe Defense Position, still switches when the new position is better, agrees with the manual switch in the real core');
