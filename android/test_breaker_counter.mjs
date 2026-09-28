import fs from 'node:fs';import assert from 'node:assert/strict';import {MobileDuel,M,L,I} from './web/duel.js';import {smartContext} from './web/smart_policy.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('./web/'+n+'.json',import.meta.url))),meta=read('content'),data=read('engine-data'),id=n=>meta.cards.find(c=>c.name===n).id;let checks=0;
for(const p of [0,1]){
 const e=new MobileDuel(meta.cards);Object.assign(e,{data,lp:[8000,8000],player:p,phase:4,activeChain:[],battleProtected:[false,false]});let z={};e.query=(s,l)=>z[s+':'+l]||[];
 const c=(n,s,l,seq=0,extra={})=>({code:id(n),controller:s,location:l,sequence:seq,position:1,...extra});
 const breaker=c('Breaker the Magical Warrior',p,L.MZONE,0,{attack:1900}),wall=c('Battle Ox',1-p,L.MZONE,0,{position:4,defense:1800}),back=c('Axe of Despair',1-p,L.SZONE);
 const put=(s,l,...cards)=>z[s+':'+l]=cards;
 const reset=()=>{z={};e.phase=4;e.activeChain=[];e.battleProtected=[false,false];put(p,L.MZONE,breaker);put(1-p,L.MZONE,wall);put(1-p,L.SZONE,back)};
 const idle={type:M.SELECT_IDLECMD,player:p,activates:[{...breaker,attack:undefined}],summons:[],special_summons:[],pos_changes:[],monster_sets:[],spell_sets:[],to_bp:true,to_ep:true};
 const check=(yes,label)=>{assert(yes,label);checks++};const score=()=>smartContext(e,p,L,idle).activation(idle.activates[0]);
 reset();check(score()<0,'Preserve counter against 1800 DEF using live ATK');check(e.auto(idle).action===I.TO_BP,'Actually proceed to battle instead of spending counter');
 for(const defense of [1600,1700,1899]){put(1-p,L.MZONE,{...wall,defense});check(score()<0,'Counter required against '+defense)}
 for(const defense of [1500,1900,2000]){put(1-p,L.MZONE,{...wall,defense});check(score()>=0,'No lost winning battle against '+defense)}
 reset();put(p,L.MZONE,breaker,c('Blue-Eyes White Dragon',p,L.MZONE,1,{attack:3000}));check(score()>=0,'Available ally clears wall');
 for(const extra of [{position:4},{attack_disabled:true},{attack_count:1}]){put(p,L.MZONE,breaker,c('Blue-Eyes White Dragon',p,L.MZONE,1,{attack:3000,...extra}));check(score()<0,'Unavailable ally does not justify spending counter')}
 reset();put(1-p,L.MZONE,{...wall,position:1,attack:1800});check(score()<0,'Also preserves advantage against attack position');
 reset();put(1-p,L.MZONE,{...wall,position:8});check(score()>=0,'Does not read hidden DEF');
 reset();put(1-p,L.SZONE,c('Gravity Bind',1-p,L.SZONE));check(score()>=0,'Remove battle lock before combat');
 reset();e.phase=256;check(score()>=0,'Use removal in main phase 2');
 reset();put(1-p,L.MZONE);check(score()>=0,'Use removal after wall is destroyed');
 reset();put(1-p,L.MZONE,wall,{...wall,sequence:1});put(p,L.MZONE,breaker,c('Blue-Eyes White Dragon',p,L.MZONE,1,{attack:3000}));check(score()<0,'One ally cannot clear two walls');
 reset();put(1-p,L.MZONE,c('Cannon Soldier',1-p,L.MZONE,0,{position:4,defense:1800}));put(p,L.HAND,c('Smashing Ground',p,L.HAND));const removal=e.query(p,L.HAND)[0];const choice=e.auto({...idle,activates:[idle.activates[0],removal]});check(choice.action===I.SELECT_ACTIVATE&&choice.index===1,'Resolve usable monster removal before spending counter');
}
console.log('PASS',checks,'Breaker counter battle-planning checks across both seats');
