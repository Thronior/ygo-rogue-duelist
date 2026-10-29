// Imported opponent cards that used to have no CPU rule: the CPU never chained them and skipped most
// of them in its Main Phase. Each now activates when it helps and waits when it does not.
import fs from 'node:fs';import assert from 'node:assert/strict';import {MobileDuel,L} from './web/duel.js';import {smartContext} from './web/smart_policy.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('./web/'+n+'.json',import.meta.url))),meta=read('content'),data=read('engine-data');let checks=0;
const p=1,o=0,e=new MobileDuel(meta.cards);let z={};e.query=(s,l)=>z[s+':'+l]||[];
const id=n=>{const c=meta.cards.find(c=>c.name===n);assert(c,n);return c.id};
const c=(n,loc=L.HAND,side=p,extra={})=>({code:id(n),controller:side,location:loc,sequence:0,position:1,...extra});
const put=(side,loc,...cards)=>z[side+':'+loc]=cards.map((t,i)=>({...t,controller:side,location:loc,sequence:i}));
const reset=()=>{z={};Object.assign(e,{data,lp:[8000,8000],player:p,phase:4,turn:3,effect:null,attackCard:null,attackTarget:null,activeChain:[],battleProtected:[false,false],fusionSupport:{}});put(p,L.DECK,...Array(12).fill(c('Battle Ox',L.DECK)));put(o,L.DECK,...Array(12).fill(c('Battle Ox',L.DECK,o)));};
const source=n=>[...e.query(p,L.HAND),...e.query(p,L.MZONE),...e.query(p,L.SZONE)].find(t=>t.code===id(n))||c(n,(data[id(n)].type&1)?L.MZONE:(data[id(n)].type&4)?L.SZONE:L.HAND);
const score=(n,chain)=>smartContext(e,p,L).activation(source(n),chain);
const yes=(n,chain=false)=>{assert(score(n,chain)>=80,n+' should activate');checks++};
const no=(n,chain=false)=>{assert(score(n,chain)<0,n+' should wait');checks++};
const attack=(attacker,target=null)=>{put(o,L.MZONE,attacker);e.player=o;e.phase=8;e.attackCard=e.query(o,L.MZONE)[0];e.attackTarget=target;};

// Beneficial triggers are taken, including when offered as a chain.
for(const n of ['Howling Insect','Warrior Lady of the Wasteland','Peten the Dark Clown','Dark Blade the Dragon Knight','Amazoness Sage']){reset();yes(n,true)}
// Phoenix Wing Wind Blast: spin a real threat, paying with a spare card.
reset();put(p,L.HAND,c('Phoenix Wing Wind Blast'));put(o,L.MZONE,c('Summoned Skull',L.MZONE,o));no('Phoenix Wing Wind Blast',true);
put(p,L.HAND,c('Phoenix Wing Wind Blast'),c('Battle Ox'));yes('Phoenix Wing Wind Blast',true);
reset();put(p,L.HAND,c('Phoenix Wing Wind Blast'),c('Battle Ox'));put(o,L.MZONE,c('Kuriboh',L.MZONE,o));no('Phoenix Wing Wind Blast',true);
// Roulette Spider is a gamble: only against an attack that would be lethal.
reset();put(p,L.SZONE,c('Roulette Spider',L.SZONE));attack(c('Summoned Skull',L.MZONE,o));no('Roulette Spider',true);
e.lp[p]=2000;yes('Roulette Spider',true);
// Gandora: wipe only when the opponent loses far more.
reset();put(p,L.MZONE,c('Gandora the Dragon of Destruction',L.MZONE));put(o,L.MZONE,c('Summoned Skull',L.MZONE,o),c('Blue-Eyes White Dragon',L.MZONE,o));yes('Gandora the Dragon of Destruction');
e.lp[p]=1500;no('Gandora the Dragon of Destruction');
reset();put(p,L.MZONE,c('Gandora the Dragon of Destruction',L.MZONE),c('Blue-Eyes White Dragon',L.MZONE),c('Summoned Skull',L.MZONE));put(o,L.MZONE,c('Kuriboh',L.MZONE,o),c('Battle Ox',L.MZONE,o));no('Gandora the Dragon of Destruction');
// Electric Virus steals Machines and Dragons only.
reset();put(p,L.HAND,c('Electric Virus'));put(o,L.MZONE,c('Blue-Eyes White Dragon',L.MZONE,o));yes('Electric Virus');
put(o,L.MZONE,c('Summoned Skull',L.MZONE,o));no('Electric Virus');
// Deck Devastation Virus needs weak targets worth the 2000+ DARK tribute.
reset();put(p,L.SZONE,c('Deck Devastation Virus',L.SZONE));put(o,L.MZONE,c('Kuriboh',L.MZONE,o));no('Deck Devastation Virus',true);
put(p,L.MZONE,c('Summoned Skull',L.MZONE));put(o,L.MZONE,c('Mystical Elf',L.MZONE,o),c('Kuriboh',L.MZONE,o),c('Celtic Guardian',L.MZONE,o));put(o,L.HAND,c('Kuriboh',L.HAND,o),c('Kuriboh',L.HAND,o),c('Kuriboh',L.HAND,o));yes('Deck Devastation Virus',true);
// Card of Demise only from a near-empty hand, and never when an attack this turn would win.
reset();put(p,L.HAND,c('Card of Demise'));yes('Card of Demise');
put(p,L.HAND,c('Card of Demise'),c('Battle Ox'),c('Battle Ox'));no('Card of Demise');
reset();put(p,L.HAND,c('Card of Demise'));put(p,L.MZONE,c('Blue-Eyes White Dragon',L.MZONE));e.lp[o]=2000;no('Card of Demise');
// Attack Guidance Armor and Stronghold answer real attacks.
reset();put(p,L.SZONE,c('Attack Guidance Armor',L.SZONE));attack(c('Summoned Skull',L.MZONE,o));yes('Attack Guidance Armor',true);
reset();put(p,L.SZONE,c('Stronghold the Moving Fortress',L.SZONE));attack(c('Battle Ox',L.MZONE,o));yes('Stronghold the Moving Fortress',true);
// Xing Zhen Hu needs two face-down Spells/Traps to lock.
reset();put(p,L.SZONE,c('Xing Zhen Hu',L.SZONE));put(o,L.SZONE,c('Mirror Force',L.SZONE,o,{position:8}));no('Xing Zhen Hu',true);
put(o,L.SZONE,c('Mirror Force',L.SZONE,o,{position:8}),c('Trap Hole',L.SZONE,o,{position:8}));yes('Xing Zhen Hu',true);
// Meteor of Destruction: only above 3000 LP.
reset();yes('Meteor of Destruction');e.lp[o]=3000;no('Meteor of Destruction');
// Battery Charger needs a Batteryman in the Graveyard.
reset();no('Battery Charger');put(p,L.GRAVE,c('Batteryman C',L.GRAVE));yes('Battery Charger');
// Medusa Worm flips itself down in Main Phase 2 to reuse its removal; Moai never loops.
reset();put(p,L.MZONE,c('Medusa Worm',L.MZONE));put(o,L.MZONE,c('Battle Ox',L.MZONE,o));e.phase=256;yes('Medusa Worm');e.phase=4;no('Medusa Worm');
reset();put(p,L.MZONE,c('Moai Interceptor Cannons',L.MZONE));e.phase=256;no('Moai Interceptor Cannons');
// Blue-Eyes Shining Dragon negates only the opponent's effects.
reset();put(p,L.MZONE,c('Blue-Eyes Shining Dragon',L.MZONE));e.effect={code:id('Mirror Force'),player:o};yes('Blue-Eyes Shining Dragon',true);e.effect={code:id('Mirror Force'),player:p};no('Blue-Eyes Shining Dragon',true);
console.log(`PASS imported card rules: ${checks} checks`);
