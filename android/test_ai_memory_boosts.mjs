import fs from 'node:fs';import assert from 'node:assert/strict';import {MobileDuel,M,L,B} from './web/duel.js';import {smartContext} from './web/smart_policy.js';
const meta=JSON.parse(fs.readFileSync(new URL('./web/content.json',import.meta.url))),data=JSON.parse(fs.readFileSync(new URL('./web/engine-data.json',import.meta.url))),id=n=>meta.cards.find(c=>c.name===n).id;let checks=0;
for(const p of [0,1]){
 const e=new MobileDuel(meta.cards);Object.assign(e,{data,lp:[8000,8000],turn:3,player:p,phase:8,events:[],visuals:[],peak:{turns:0},pendingSummons:[],activeChain:[],battleProtected:[false,false]});
 const mon=(name,controller,position=1,sequence=0)=>({code:id(name),controller,location:L.MZONE,sequence,position,attack:data[id(name)].attack,defense:data[id(name)].defense});
 let own=[mon('Mechanicalchaser',p)],enemy=[mon('Mystical Elf',1-p,8)],back=[];
 e.query=(s,l)=>l===L.MZONE?(s===p?own:enemy):l===L.SZONE?(s===p?[]:back):[];
 const battle=()=>e.auto({type:M.SELECT_BATTLECMD,player:p,chains:[],attacks:own,to_m2:true,to_ep:true});
 assert.equal(e.knownFieldCard(p,enemy[0]),0);assert.equal(battle().action,B.SELECT_BATTLE);checks+=2;
 e.onMessage({type:M.POS_CHANGE,...enemy[0],prev_position:4,position:8});assert.equal(e.knownFieldCard(p,enemy[0]),id('Mystical Elf'));assert.equal(battle().action,B.TO_M2);checks+=2;
 e.onMessage({type:M.NEW_TURN,player:p});e.onMessage({type:M.CHAIN_END});assert.equal(e.knownFieldCard(p,enemy[0]),id('Mystical Elf'));checks++;
 e.onMessage({type:M.MOVE,card:enemy[0].code,from:enemy[0],to:{controller:1-p,location:L.HAND,sequence:0,position:0}});e.onMessage({type:M.SET,...enemy[0]});assert.equal(e.knownFieldCard(p,enemy[0]),0);checks++;
 e.onMessage({type:M.CONFIRM_CARDS,player:p,cards:enemy});assert.equal(e.knownFieldCard(p,enemy[0]),id('Mystical Elf'));assert.equal(e.knownFieldCard(1-p,enemy[0]),0);checks+=2;
 e.onMessage({type:M.SHUFFLE_SET_CARD,location:L.MZONE,cards:[{from:enemy[0],to:enemy[0]}]});assert.equal(e.knownFieldCard(p,enemy[0]),0);checks++;
 const trap={code:id('Gravity Bind'),controller:1-p,location:L.SZONE,sequence:0,position:8};back=[trap];e.onMessage({type:M.CONFIRM_CARDS,player:p,cards:back});assert.equal(smartContext(e,p,L).attackBlocked(own[0],p),false);checks++;back=[];
 const names=['Limiter Removal','Rush Recklessly','Reinforcements','Castle Walls','The Reliable Guardian','Graceful Dice','Pyramid Energy','Energy Drain','Deal of Phantom','Riryoku','Unity','Shield & Sword'];
 for(const name of names){
  const c={code:id(name),controller:p,location:L.HAND,sequence:0};
  for(const reason of ['first','waboku','mp2','no-phase','no-attacks','disabled','defense','gravity']){
   e.player=p;e.turn=3;e.phase=8;e.battleProtected=[false,false];own[0].attack_disabled=false;own[0].position=1;back=[];
   const prompt={};if(reason==='first')e.turn=1;if(reason==='waboku')e.battleProtected[1-p]=true;if(reason==='mp2')e.phase=256;if(reason==='no-phase'){e.phase=4;prompt.to_bp=false}if(reason==='no-attacks')prompt.attacks=[];if(reason==='disabled')own[0].attack_disabled=true;if(reason==='defense')own[0].position=4;if(reason==='gravity')back=[{...trap,position:1}];
   assert.equal(smartContext(e,p,L,prompt).activation(c,true),-1,`${name}: ${reason}, player ${p}`);checks++;
  }
 }
 e.player=p;e.turn=3;e.phase=8;e.battleProtected=[false,false];own[0].position=1;own[0].attack_disabled=false;back=[];
 assert(smartContext(e,p,L).activation({code:id('Limiter Removal'),controller:p,location:L.HAND},true)>0);checks++;
 e.player=1-p;e.lp[p]=100;enemy=[mon('Blue-Eyes White Dragon',1-p)];
 const waboku={code:id('Waboku'),controller:p,location:L.SZONE,sequence:0};
 for(const phase of [1,2,4,8,16,32,64,128,256,512]){
  e.phase=phase;e.attackCard=enemy[0];e.attackTarget=own[0];e.activeChain=[];e.battleProtected=[false,false];
  const battlePhase=[8,16,32,64,128].includes(phase);
  const decision=e.auto({type:M.SELECT_CHAIN,player:p,selects:[waboku],forced:false});
  assert.equal(decision.index,battlePhase?0:null,`Waboku phase ${phase}, seat ${p}`);checks++;
 }
 e.phase=16;e.battleProtected[p]=true;
 assert.equal(e.auto({type:M.SELECT_CHAIN,player:p,selects:[waboku],forced:false}).index,null);checks++;
 e.battleProtected=[false,false];
 e.player=1-p;e.phase=32;e.inDamageStep=true;own[0].position=4;own[0].defense=1600;enemy=[mon('Battle Ox',1-p)];enemy[0].attack=1800;e.attackCard=enemy[0];e.attackTarget=own[0];assert(smartContext(e,p,L).activation({code:id('Castle Walls'),controller:p,location:L.SZONE},true)>0);checks++;
}
console.log('PASS',checks,'temporary-boost gating, useful activations, revealed-card memory, hidden information and shuffle invalidation');
