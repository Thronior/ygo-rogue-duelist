import assert from 'node:assert/strict';
import fs from 'node:fs';
import {MobileDuel,L} from './web/duel.js';
import {smartContext} from './web/smart_policy.js';

const read=n=>JSON.parse(fs.readFileSync(new URL(`./web/${n}.json`,import.meta.url),'utf8'));
const meta=read('content'),data=read('engine-data');
const id=n=>{const c=meta.cards.find(x=>x.name===n);assert(c,n);return c.id;};
const make=()=>{
 const e=new MobileDuel(meta.cards);Object.assign(e,{data,lp:[8000,8000],player:1,turn:4,phase:4,activeChain:[],battleProtected:[false,false],aiModifiers:{activeRelics:[[],[]],statRelics:[[],[]],spellTrapZones:5}});
 const zones={};e.query=(side,loc)=>zones[`${side}:${loc}`]||[];
 const card=(n,side=1,loc=L.MZONE,pos=1,sequence=0,attack=null,defense=null,extra={})=>({code:id(n),controller:side,location:loc,sequence,position:pos,attack:attack??data[id(n)].attack,defense:defense??data[id(n)].defense,...extra});
 const put=(side,loc,...cards)=>zones[`${side}:${loc}`]=cards;
 return {e,card,put};
};

// The CPU must account for an equip it can legally activate before deciding
// whether a low-ATK monster belongs face-down in Defense Position.
{
 const {e,card,put}=make(),monster=card('Petit Dragon',1,L.HAND,0),axe=card('Axe of Despair',1,L.HAND,0),enemy=card('Battle Ox',0,L.MZONE,1,0,1200,1000);
 put(1,L.HAND,monster,axe);put(1,L.MZONE);put(0,L.MZONE,enemy);
 let policy=smartContext(e,1,L,{to_bp:false});
 assert.equal(policy.projectedAttack(monster),1600,'Axe of Despair is included in the hand monster forecast');
 assert.equal(policy.preferSet(monster),false,'the equipped summon beats the opponent instead of being set');
 put(1,L.SZONE,...Array.from({length:5},(_,i)=>card('Waboku',1,L.SZONE,8,i)));
 policy=smartContext(e,1,L,{to_bp:false});
 assert.equal(policy.projectedAttack(monster),600,'do not forecast an equip when all Spell/Trap zones are occupied');
 assert.equal(policy.preferSet(monster),true,'set the same monster when its equip cannot be used');
}

// Mask of the Accursed is a post-combat play; it must never be spent in MP1.
{
 const {e,card,put}=make(),mask=card('Mask of the Accursed',1,L.HAND,0),target=card('Blue-Eyes White Dragon',0,L.MZONE,1,0,3000,2500);
 put(0,L.MZONE,target);
 const smart=()=>smartContext(e,1,L,{to_bp:true});
 assert.equal(smart().activation(mask),-1,'hold Mask during Main Phase 1');
 e.phase=256;
 assert(smart().activation(mask)>0,'use Mask in Main Phase 2');
}

// Removal targeting considers active Spell immunity, Pole Position, and
// destruction protection while still allowing a different effect type.
{
 const {e,card,put}=make(),doomed=card('Tribute to the Doomed',1,L.HAND,0),spellImmune=card('Blue-Eyes White Dragon',0,L.MZONE,1,0,3000,2500),ordinary=card('Battle Ox',0,L.MZONE,1,1,1700,1000),pole=card('Pole Position',0,L.SZONE,1,4);
 put(1,L.HAND,doomed);put(0,L.MZONE,spellImmune,ordinary);put(0,L.SZONE,pole);e.effect={code:doomed.code,player:1};
 let policy=smartContext(e,1,L,{});
 assert(policy.targetScore('Tribute to the Doomed',spellImmune,{})<0,'Pole Position protects the highest-ATK monster from Spell removal');
 assert(policy.targetScore('Tribute to the Doomed',ordinary,{})>0,'select a different legal monster instead');

 const info=e.cards.get(ordinary.code),original=info.desc;
 try{
  info.desc=original+' This card is unaffected by Spell effects.';
  policy=smartContext(e,1,L,{});
  assert(policy.targetScore('Tribute to the Doomed',ordinary,{})<0,'respect printed Spell immunity');
  e.effect={code:id('Trap Hole'),player:1};
  assert(policy.targetScore('Trap Hole',ordinary,{})>0,'Spell immunity does not block a Trap effect');
  info.desc=original+' This card cannot be destroyed by card effects.';
  e.effect={code:doomed.code,player:1};
  policy=smartContext(e,1,L,{});
  assert(policy.targetScore('Tribute to the Doomed',ordinary,{})<0,'do not target a monster protected from destruction');
  e.effect={code:id('Compulsory Evacuation Device'),player:1};
  assert(policy.targetScore('Compulsory Evacuation Device',ordinary,{})>0,'destruction immunity does not block returning a monster to hand');
 } finally { info.desc=original; }

 const {e:e2,card:c2,put:put2}=make(),fissure=c2('Fissure',1,L.HAND,0),low=c2('Sangan',0,L.MZONE,1,0,1000,600),next=c2('Battle Ox',0,L.MZONE,1,1,1700,1000);
 put2(1,L.HAND,fissure);put2(0,L.MZONE,low,next);e2.cards.get(low.code).desc+=' This card is unaffected by Spell effects.';
 assert.equal(smartContext(e2,1,L,{}).activation(fissure),-1,'Fissure cannot skip its lowest-ATK protected monster to destroy the next one');
}

// A remembered set Kelbek is left alone while a safe face-up battle remains.
{
 const {e,card,put}=make(),attacker=card('Battle Ox',1,L.MZONE,1,0,1700,1000),kelbek=card('Kelbek',0,L.MZONE,8,0),other=card('Giant Germ',0,L.MZONE,1,1,1000,1000);
 put(1,L.MZONE,attacker);put(0,L.MZONE,kelbek,other);e.knownFieldCard=()=>id('Kelbek');
 const policy=smartContext(e,1,L,{to_bp:true,attacks:[attacker]});
 assert(policy.attackScore(attacker,kelbek,{dmg:200})<=-99999,'avoid a known set Kelbek while another profitable target exists');
 assert(policy.attackScore(attacker,other,{dmg:700})>-99999,'take the safe face-up battle first');
 put(0,L.MZONE,kelbek);
 assert(smartContext(e,1,L,{to_bp:true,attacks:[attacker]}).attackScore(attacker,kelbek,{dmg:200})>-99999,'do not lock the CPU out of attacking when there is no alternative');
}

// Enchanted Javelin heals on the current attack, unless a larger unused
// attacker can safely produce more LP and the current attack is not urgent.
{
 const {e,card,put}=make(),javelin=card('Enchanted Javelin',1,L.SZONE,8),current=card('Battle Ox',0,L.MZONE,1,0,1600,1000),future=card('Summoned Skull',0,L.MZONE,1,1,2500,1200),guard=card('Blue-Eyes White Dragon',1,L.MZONE,1,0,3000,2500),second=card('Dark Magician',1,L.MZONE,1,1,2500,2100);
 put(1,L.SZONE,javelin);put(1,L.MZONE,guard,second);put(0,L.MZONE,current,future);e.player=0;e.attackCard=current;e.attackTarget=guard;
 let policy=smartContext(e,1,L,{chains:[javelin]});
 assert.equal(policy.activation(javelin,true),-1,'hold Javelin while the stronger unused attacker can still attack');
 put(0,L.MZONE,current);policy=smartContext(e,1,L,{chains:[javelin]});
 assert(policy.activation(javelin,true)>0,'heal from a legal attack even when it is not otherwise dangerous');
}

console.log('PASS CPU safety regressions: equipped summon forecast, MP2 Mask, protected removals, Kelbek attack choice, and Enchanted Javelin timing');
