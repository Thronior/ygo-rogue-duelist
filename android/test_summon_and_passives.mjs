import fs from 'node:fs';import assert from 'node:assert/strict';import {MobileDuel,M,R,I,L} from './web/duel.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('./web/'+n+'.json',import.meta.url))),meta=read('content'),data=read('engine-data'),id=n=>meta.cards.find(c=>c.name===n).id;
const ox=id('Battle Ox'),elf=id('Mystical Elf'),blue=id('Blue-Eyes White Dragon');
const card=(code,controller,location,sequence,attack,position=1)=>({code,controller,location,sequence,attack,position});
const candidate=card(ox,1,L.HAND,0,1700);
const e=new MobileDuel(meta.cards);Object.assign(e,{data,lp:[8000,8000],player:1,activeChain:[],events:[],visuals:[],peak:{},phase:4,battleProtected:[false,false]});
let own=[],enemy=[],back=[];e.query=(p,l)=>l===L.MZONE?(p===1?own:enemy):l===L.SZONE?back:[];
const prompt={type:M.SELECT_IDLECMD,player:1,summons:[candidate],special_summons:[],monster_sets:[candidate],spell_sets:[],activates:[],pos_changes:[],to_bp:true,to_ep:true};
const action=()=>e.auto(prompt).action;
enemy=[card(blue,0,L.MZONE,0,3000),card(elf,0,L.MZONE,1,800)];assert.equal(action(),I.SELECT_SUMMON,'clear weaker target despite strong monster');
enemy=[card(blue,0,L.MZONE,0,1800)];assert.equal(action(),I.SELECT_MONSTER_SET,'no winning combat without boost');
e.aiModifiers={enemyAttack:400};assert.equal(action(),I.SELECT_SUMMON,'curse/loop buff makes summon viable');
e.aiModifiers={};back=[card(id('Sogen'),0,L.SZONE,5,0)];assert.equal(action(),I.SELECT_SUMMON,'field spell bonus applies before summon');back=[];
candidate.code=id('Man-Eater Bug');candidate.attack=450;assert.equal(action(),I.SELECT_MONSTER_SET,'keep useful flip effect');candidate.code=ox;candidate.attack=1700;
own=[card(ox,1,L.MZONE,0,2100)];enemy=[card(blue,0,L.MZONE,0,3000),card(elf,0,L.MZONE,1,1800)];prompt.summons=[];prompt.monster_sets=[];prompt.pos_changes=[{code:ox,controller:1,location:L.MZONE,sequence:0}];assert.equal(action(),I.TO_BP,'do not hide a monster that can win another battle');enemy=[enemy[0]];assert.equal(action(),I.SELECT_POS_CHANGE,'defend when all attacks lose');
console.log('PASS 7 shared desktop/mobile summon and position scenarios');
const fixture=JSON.parse(fs.readFileSync(new URL('../temp/passive-auto-fixture.json',import.meta.url)));
const duel=await new MobileDuel(meta.cards).init([read('engine-data'),read('scripts')]);
try{
 let s=duel.start(Array(40).fill(ox),Array(40).fill(elf),8000,8000,5,37,[],[],fixture.script);let count=0;
 for(;duel.turn<6&&count<100;count++){
  const m=duel.pending;assert(m,'must reach a legal prompt');
  assert(![M.SELECT_CHAIN,M.SELECT_EFFECTYN].includes(m.type),'passive must not ask to activate');
  assert([M.SELECT_IDLECMD,M.SELECT_CARD].includes(m.type),'only phase progression and hand-limit discards');
  s=duel.respond(m.type===M.SELECT_IDLECMD?{type:R.SELECT_IDLECMD,action:I.TO_EP,index:null}:duel.auto(m));
 }
 assert(duel.turn>=6,'turns must progress');assert.deepEqual(duel.errors,[]);
 assert.equal(duel.events.filter(x=>x.kind==='recover').length,3,'heal once each player standby');
 assert.equal(s.lp[0],8000+3*fixture.heal-3*200,'level 5 burns only on player end');
 assert.equal(s.lp[1],8000-3*fixture.burn,'burn once each player end');
 assert.equal(duel.aiModifiers.enemyAttack,600,'shared run boosts reach AI');
 console.log('PASS real core: 6 turns, automatic healing/burn, once per player turn, no activation prompts');
}finally{duel.destroy()}
