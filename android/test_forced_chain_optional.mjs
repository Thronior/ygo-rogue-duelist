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
console.log('PASS forced chain windows pick the sole mandatory trigger; set-card activations stay optional');
