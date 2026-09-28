import fs from 'node:fs';import assert from 'node:assert/strict';import {MobileDuel,M,R,I,L} from './web/duel.js';import {smartContext} from './web/smart_policy.js';
const meta=JSON.parse(fs.readFileSync(new URL('./web/content.json',import.meta.url))),data=JSON.parse(fs.readFileSync(new URL('./web/engine-data.json',import.meta.url))),id=n=>{const c=meta.cards.find(c=>c.name===n);assert(c,n);return c.id};let count=0;
for(const p of [0,1]){
 const e=new MobileDuel(meta.cards);Object.assign(e,{data,lp:[8000,8000],player:p,phase:4,activeChain:[],battleProtected:[false,false]});let zones={};e.query=(s,l)=>zones[s+':'+l]||[];
 const c=(n,s=p,l=L.MZONE,x={})=>({code:id(n),controller:s,location:l,sequence:0,position:1,attack:data[id(n)].attack,defense:data[id(n)].defense,...x});
 const put=(s,l,...a)=>zones[s+':'+l]=a,check=(v,msg)=>{assert(v,msg);count++};const ctx=()=>smartContext(e,p,L);const reset=()=>{zones={};e.lp=[8000,8000];e.player=p;e.attackCard=null};
 for(const lock of ['Level Limit - Area B','Gravity Bind'])for(const owner of [p,1-p]){
  reset();put(owner,L.SZONE,c(lock,owner,L.SZONE));let high=c('Battle Ox'),low=c('Sangan');put(p,L.MZONE,high,low);
  check(ctx().attackBlocked(high),'level 4 blocked');check(!ctx().attackBlocked(low),'level 3 can battle');check(ctx().position('Battle Ox',high)===false,'choose defense');
  const prompt={type:M.SELECT_IDLECMD,player:p,activates:[],summons:[],special_summons:[],pos_changes:[{...high,position:4}],monster_sets:[],spell_sets:[],to_bp:true,to_ep:true};put(p,L.MZONE,{...high,position:4});check(e.auto(prompt).action!==I.SELECT_POS_CHANGE,'no repeated attack-position change');
  put(p,L.MZONE,c('Sangan'),c('Petit Dragon',p,L.MZONE,{sequence:1}));check(ctx().tributeWorth(c('Blue-Eyes White Dragon',p,L.HAND))===false,'keep useful low-level bodies');
  put(owner,L.SZONE,c(lock,owner,L.SZONE,{is_disabled:true}));check(!ctx().attackBlocked(high),'negated lock ignored');
  put(owner,L.SZONE,c(lock,owner,L.SZONE,{position:8}));check(!ctx().attackBlocked(high),'hidden identity ignored');
 }
 reset();put(1-p,L.SZONE,c('Messenger of Peace',1-p,L.SZONE));check(ctx().attackBlocked(c('Battle Ox')),'messenger 1700');check(!ctx().attackBlocked(c('Sangan')),'messenger 1000');check(ctx().attackBlocked(c('Sangan',p,L.MZONE,{attack:1500})),'live boosted threshold');check(!ctx().attackBlocked(c('Battle Ox',p,L.MZONE,{attack:1499})),'live weakened threshold');
 reset();put(p,L.SZONE,c('Swords of Revealing Light',p,L.SZONE));check(!ctx().attackBlocked(c('Battle Ox')),'own swords permits own attack');check(ctx().attackBlocked(c('Battle Ox',1-p),1-p),'swords restricts opponent');
 reset();put(1-p,L.SZONE,c('Gravity Bind',1-p,L.SZONE));put(p,L.MZONE,c('Jinzo'));check(!ctx().attackBlocked(c('Battle Ox')),'Jinzo negates bind');
 put(p,L.MZONE);check(!ctx().attackBlocked(c('Jinzo',p,L.HAND),p,true),'summon Jinzo to disable bind');
 reset();put(p,L.SZONE,c('Umi',p,L.SZONE));put(1-p,L.SZONE,c('Level Limit - Area B',1-p,L.SZONE));check(!ctx().attackBlocked(c('The Legendary Fisherman')),'Fisherman spell immunity');check(ctx().attackBlocked(c('Battle Ox')),'immunity not universal');
 reset();put(1-p,L.SZONE,c('Stumbling',1-p,L.SZONE));check(ctx().attackBlocked(c('Battle Ox',p,L.HAND),p,true),'Stumbling affects new summons');check(!ctx().attackBlocked(c('Battle Ox')),'existing attacker unaffected');
 reset();put(1-p,L.SZONE,c('Gravity Bind',1-p,L.SZONE));put(p,L.MZONE,c('Battle Ox',p,L.MZONE,{level:3}));check(!ctx().attackBlocked(e.query(p,L.MZONE)[0]),'live reduced level');
 reset();put(p,L.MZONE,c('Sangan'));put(1-p,L.MZONE,c('Blue-Eyes White Dragon'));check(ctx().activation(c('Gravity Bind',p,L.HAND))>=0,'activate favorable lock');put(p,L.MZONE,c('Blue-Eyes White Dragon'));put(1-p,L.MZONE,c('Sangan',1-p));check(ctx().activation(c('Gravity Bind',p,L.HAND))<0,'do not lock ourselves while enemy bypasses');
 reset();const bind=c('Gravity Bind',1-p,L.SZONE),mst=c('Mystical Space Typhoon',p,L.HAND);put(1-p,L.SZONE,bind);put(p,L.MZONE,c('Blue-Eyes White Dragon'));check(ctx().activation(mst)>=0,'prioritize lock removal');check(ctx().activation(c('Limiter Removal',p,L.HAND),true)<0,'no wasted combat boost under lock');
 reset();const ownBind=c('Gravity Bind',p,L.SZONE);put(p,L.SZONE,ownBind);put(p,L.MZONE,c('Blue-Eyes White Dragon'));e.lp[1-p]=2000;check(ctx().activation(mst)>=0,'remove own obsolete lock for lethal');check(ctx().targetScore('Mystical Space Typhoon',ownBind,{})>20000,'own lock valid priority target');put(1-p,L.MZONE,c('Blue-Eyes White Dragon',1-p,L.MZONE,{attack:5000}));check(ctx().activation(mst)<0,'keep own protective lock');
}
console.log('PASS '+count+' restriction-specific AI decisions for both seats');
const scripts=JSON.parse(fs.readFileSync(new URL('./web/scripts.json',import.meta.url)));
for(const lock of ['Level Limit - Area B','Gravity Bind','Messenger of Peace',"Nightmare's Steelcage",'Stumbling']){
 const e=await new MobileDuel(meta.cards).init([data,scripts]);let active=false,stale=0,lastTurn=-1;
 try{let state=e.start([...Array(12).fill(id(lock)),...Array(10).fill(id('Battle Ox')),...Array(8).fill(id('Sangan'))],[...Array(20).fill(id('Battle Ox')),...Array(10).fill(id('Sangan'))],8000,8000,5,29);
 for(let i=0;i<600&&!state.finished;i++){
  const m=e.pending;let r=e.auto();
  if(!active&&m.player===0&&m.type===M.SELECT_IDLECMD){const index=m.activates.findIndex(c=>c.code===id(lock));if(index>=0)r={type:R.SELECT_IDLECMD,action:I.SELECT_ACTIVATE,index};}
  state=e.respond(r);if(e.query(0,L.SZONE).some(c=>c&&c.code===id(lock)&&(c.position&5)))active=true;
  if(e.turn===lastTurn)stale++;else{lastTurn=e.turn;stale=0}assert(stale<65,lock+' must not loop within a turn');
 }
 assert(active,lock+' was activated in real core');assert(!e.errors.length,e.errors.join('\n'));assert(state.finished,lock+' duel should finish');console.log('PASS real core restriction duel without position loops:',lock);
 }finally{e.destroy()}
}
