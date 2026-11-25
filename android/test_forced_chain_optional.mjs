// A forced chain window lists plain card activations beside the mandatory trigger (behaviour flag 2026-10-29:
// "Forcing an activation of Mirror Wall on SP phase even though its set"). The mandatory one is picked for the
// player, so the set Trap is only ever offered as an optional response.
import assert from 'node:assert/strict';
import {automaticChainResponse,mandatoryChainResponse,chainWindowAllowed} from './web/duel-presentation.js';
import {OcgHintTiming as Timing} from './web/vendor/package/dist/index.js';
import {M,R} from './web/duel.js';
const mermaid={code:85802526,controller:0,location:4,sequence:2,position:1,description:'89970469502976'};
const wall={code:22359980,controller:0,location:8,sequence:2,position:10,description:'0'};
const forced={type:M.SELECT_CHAIN,player:0,spe_count:0,forced:true,hint_timing:2,selects:[mermaid,wall]};
assert.deepEqual(automaticChainResponse(forced,false,M,R),{type:R.SELECT_CHAIN,index:0},'Cure Mermaid resolves on its own');
assert.deepEqual(automaticChainResponse({...forced,selects:[wall,mermaid]},false,M,R),{type:R.SELECT_CHAIN,index:1},'wherever it is listed');
assert.deepEqual(mandatoryChainResponse({...forced,selects:[wall,mermaid]}),{type:R.SELECT_CHAIN,index:1},'and the decline button picks it too');
// Two mandatory triggers still leave the order to the player; an unforced window is unchanged.
const second={...mermaid,sequence:3};
assert.equal(automaticChainResponse({...forced,selects:[mermaid,second,wall]},false,M,R),null);
assert.equal(automaticChainResponse({...forced,forced:false},false,M,R),null);
// A face-up Trap's own effect (with a description) is not treated as a plain activation.
assert.equal(automaticChainResponse({...forced,selects:[mermaid,{...wall,position:1,description:'359757680640'}]},false,M,R),null);
// Kunai with Chain under "Chain sometimes": only an attack, a summon or an activation opens a window (Discord 2026-10-29).
const kunai={code:1,controller:0,location:8,sequence:0,position:10,description:'0'},card=()=>({name:'Kunai with Chain',data:{type:4},desc:'Activate 1 of these effects: When an opponent’s monster declares an attack: Target the attacking monster; change it to Defense Position.'});
const window=(timing,chain=[])=>chainWindowAllowed({type:M.SELECT_CHAIN,player:0,selects:[kunai],hint_timing:timing,hint_timing_other:0},'sometimes',chain,{card});
assert.equal(window(Timing.MAIN_END||0),false,'no window when nothing happened');
assert.equal(window(Timing.ATTACK),true,'attack declared');assert.equal(window(Timing.SUMMON),true,'monster summoned');assert.equal(window(0,[{code:5}]),true,'card activated');
// Threatening Roar under "Chain sometimes": a window as the opponent ends Main Phase 1, if they have an attacker.
const roarCard=()=>({name:'Threatening Roar',data:{type:4},desc:'Your opponent cannot declare an attack this turn.'});
const roar=(timing,context={})=>chainWindowAllowed({type:M.SELECT_CHAIN,player:0,selects:[{code:2}],hint_timing:0,hint_timing_other:timing},'sometimes',[],{turnPlayer:1,phase:4,attackers:1,card:roarCard,...context});
assert.equal(roar(Timing.MAIN_END),true,'the opponent ends their Main Phase');
assert.equal(roar(Timing.MAIN_END,{attackers:0}),false,'nothing can attack');
assert.equal(roar(Timing.MAIN_END,{turnPlayer:0}),false,'your own turn');
assert.equal(roar(Timing.MAIN_END,{phase:256}),false,'Main Phase 2 has no attacks left');
assert.equal(roar(Timing.STANDBY_PHASE||0,{phase:2}),false,'no window in other phases');
// Shadow Spell gets the same window, so it can stop an attack before it is declared (user, 2026-11-25).
const shadowCard=()=>({name:'Shadow Spell',data:{type:0x20004},desc:'Activate this card by targeting 1 face-up monster your opponent controls; it loses 700 ATK, also it cannot attack or change its battle position.'});
assert.equal(roar(Timing.MAIN_END,{card:shadowCard}),true,'Shadow Spell asks as the opponent ends Main Phase 1');
assert.equal(roar(Timing.MAIN_END,{card:shadowCard,attackers:0}),false,'Shadow Spell waits while nothing can attack');
assert.equal(roar(Timing.MAIN_END,{card:shadowCard,turnPlayer:0}),false,'not on your own turn');
console.log('PASS forced chain windows pick the sole mandatory trigger; set-card activations stay optional');
// Relic triggers (user, 2026-11-17): a run effect (code 0, location 0) always activates first, forced or not.
{const relic={code:0,controller:2,location:0,sequence:0,position:0,description:'0'},unity={code:14731897,controller:0,location:2,sequence:2,position:10,description:'0'};
 const standby={type:M.SELECT_CHAIN,player:0,forced:true,spe_count:0,hint_timing:2,selects:[relic,unity]};
 assert.deepEqual(automaticChainResponse(standby,false,M,R),{type:R.SELECT_CHAIN,index:0},'the Standby relic trigger activates instead of forcing Unity');
 assert.deepEqual(automaticChainResponse({...standby,selects:[unity,relic]},false,M,R),{type:R.SELECT_CHAIN,index:1});
 assert.deepEqual(automaticChainResponse({...standby,forced:false},false,M,R),{type:R.SELECT_CHAIN,index:0});
 assert.deepEqual(mandatoryChainResponse({...standby,selects:[unity,relic]}),{type:R.SELECT_CHAIN,index:1});
 assert.equal(automaticChainResponse({...standby,forced:false,selects:[unity]},false,M,R),null,'Unity alone stays the player\'s choice');}
console.log('PASS relic triggers activate first');
// Optional triggers on Chain sometimes (Discord 2026-11-25: "Butterfly Dagger - Elma doesn't trigger on Chain sometimes").
// A trigger window (spe_count 0x7f) is a decision that is gone once passed, so it asks before any card's own Sometimes
// rule: Blast with Chain's "if destroyed while equipped" trigger fell under its battle-only rule and was passed.
{const fs=await import('node:fs');const {MobileDuel,L,I}=await import('./web/duel.js');
 const json=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8').replace(/^\uFEFF/,''));
 const meta=json('./web/content.json'),byId=new Map(meta.cards.map(c=>[c.id,c])),id=n=>meta.cards.find(c=>c.name===n).id,card=c=>byId.get(c);
 const trigger=(names,spe=0x7f)=>({type:M.SELECT_CHAIN,player:0,forced:false,spe_count:spe,hint_timing:0,hint_timing_other:0,selects:names.map(n=>({code:id(n),location:0x10}))});
 for(const names of [['Blast with Chain'],['Blast with Chain','Blast with Chain'],['Juragedo'],['Butterfly Dagger - Elma'],['Butterfly Dagger - Elma','Butterfly Dagger - Elma']])
  assert.equal(chainWindowAllowed(trigger(names),'sometimes',[],{turnPlayer:1,phase:4,attackers:1,card}),true,names.join(' + ')+': its trigger asks on Chain sometimes');
 assert.equal(chainWindowAllowed({...trigger(['Blast with Chain'],4),selects:[{code:id('Blast with Chain'),location:0x08,position:10}]},'sometimes',[],{turnPlayer:1,phase:4,attackers:1,card}),false,'a Set Blast with Chain still waits for a battle');
 assert.equal(chainWindowAllowed(trigger(['Butterfly Dagger - Elma']),'never',[],{card}),false,'No chain still passes');
 // The real core: Elma equipped, then destroyed by the opponent's Mystical Space Typhoon (one trigger: a yes/no prompt)
 // and Harpie's Feather Duster (several Elmas: a trigger window). Every Elma prompt reaches the player on Chain sometimes,
 // and taking it returns Elma to the hand.
 const data=json('./web/engine-data.json'),scripts=json('./web/scripts.json'),ELMA=id('Butterfly Dagger - Elma'),ELF=id('Gemini Elf');
 const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,scripts]);
 for(const removal of ['Mystical Space Typhoon',"Harpie's Feather Duster"]){
  const fill=(...c)=>Array.from({length:40},(_,n)=>c[n%c.length]);
  let s=e.start(fill(ELMA,ELF),fill(id(removal),id('Giant Soldier of Stone')),8000,8000,5,7,[],[],''),asked=0,offered=0,returned=0;
  for(let i=0;i<4000&&!s.finished&&e.turn<=6;i++){const m=e.pending;if(!m)break;let r=null;
   if(m.player===0&&m.type===M.SELECT_IDLECMD){const mon=e.query(0,L.MZONE).some(c=>c),act=m.activates.findIndex(c=>c.code===ELMA);
    r=!mon&&m.summons.length?{type:R.SELECT_IDLECMD,action:I.SELECT_SUMMON,index:0}:mon&&act>=0&&e.query(0,L.SZONE).filter(c=>c?.code===ELMA).length<2?{type:R.SELECT_IDLECMD,action:I.SELECT_ACTIVATE,index:act}:{type:R.SELECT_IDLECMD,action:I.TO_EP,index:null}}
   else if(m.player===0&&m.type===M.SELECT_BATTLECMD)r={type:R.SELECT_BATTLECMD,action:3,index:null};
   else if(m.player===0&&m.type===M.SELECT_EFFECTYN&&m.code===ELMA){asked++;offered++;const before=e.query(0,L.HAND).filter(c=>c?.code===ELMA).length;s=e.respond({type:R.SELECT_EFFECTYN,yes:true});
    for(let j=0;j<20&&e.pending&&e.pending.player===0&&e.pending.type!==M.SELECT_IDLECMD;j++)s=e.respond(e.auto());if(e.query(0,L.HAND).filter(c=>c?.code===ELMA).length>before)returned++;continue}
   else if(m.player===0&&m.type===M.SELECT_CHAIN&&m.selects.some(c=>c.code===ELMA&&c.location===0x10)){asked++;
    if(chainWindowAllowed(m,'sometimes',e.activeChain,{turnPlayer:e.player,phase:e.phase,attackers:e.query(1,L.MZONE).filter(c=>c&&c.position&1).length,card,script:c=>scripts[`c${c}.lua`]}))offered++;
    r={type:R.SELECT_CHAIN,index:m.selects.findIndex(c=>c.code===ELMA&&c.location===0x10)}}
   s=e.respond(r||e.auto())}
  assert(asked>0,removal+': destroying an equipped Elma asks for its trigger');
  assert.equal(offered,asked,removal+': every Elma trigger reaches the player on Chain sometimes');
  assert.deepEqual(e.errors||[],[],'no script errors');
  if(asked>offered||offered===0)assert.fail(removal);if(removal==='Mystical Space Typhoon')assert(returned>0,'taking the trigger returns Elma to the hand');
  console.log(`  ${removal}: ${asked} Elma trigger prompt(s), all offered on Chain sometimes; ${returned} returned by a yes`);
 }
 e.destroy?.();}
console.log('PASS optional triggers ask on Chain sometimes before any card rule (Elma, Blast with Chain, Juragedo)');
