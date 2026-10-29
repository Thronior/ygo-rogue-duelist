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

// Mask of the Accursed should wait until Main Phase 2, after attacks are spent.
{
 const {e,card,put}=make(),mask=card('Mask of the Accursed',1,L.HAND,0),attacker=card('Battle Ox',1,L.MZONE,1,0,1700,1000),target=card('Sangan',0,L.MZONE,1,0,1000,600);
 put(1,L.MZONE,attacker);put(0,L.MZONE,target);
 let smart=smartContext(e,1,L,{to_bp:true,attacks:[attacker]});
 assert.equal(smart.activation(mask),-1,'never activate Mask in Main Phase 1');
 put(1,L.MZONE,{...attacker,attack_count:1});
 smart=smartContext(e,1,L,{to_bp:true,attacks:[]});
 assert.equal(smart.activation(mask),-1,'keep Mask held until Main Phase 2 even if no attack remains');
 e.phase=256;smart=smartContext(e,1,L,{to_bp:true,attacks:[]});
 assert(smart.activation(mask)>0,'activate Mask in Main Phase 2');
}

// Account for active Mirror Wall before approving a battle that becomes a losing trade.
{
 const {e,card,put}=make(),attacker=card('Battle Ox',1,L.MZONE,1,0,1700,1000),target=card('Sangan',0,L.MZONE,1,0,1000,600),wall=card('Mirror Wall',0,L.SZONE,5);
 put(1,L.MZONE,attacker);put(0,L.MZONE,target);put(0,L.SZONE,wall);
 let smart=smartContext(e,1,L,{to_bp:true,attacks:[attacker]});
 assert(smart.attackScore(attacker,target,{dmg:700})<=-99999,'decline battle after Mirror Wall cuts the attacker below the target');
 put(0,L.SZONE);smart=smartContext(e,1,L,{to_bp:true,attacks:[attacker]});
 assert(smart.attackScore(attacker,target,{dmg:700})>-99999,'allow the same favorable battle without Mirror Wall');
 const stronger={...attacker,attack:3000};put(1,L.MZONE,stronger);put(0,L.SZONE,wall);smart=smartContext(e,1,L,{to_bp:true,attacks:[stronger]});
 assert(smart.attackScore(stronger,target,{dmg:2000})>-99999,'allow an attack that still wins after Mirror Wall halves ATK');
 put(0,L.MZONE,target,card('Jinzo',0,L.MZONE,1,1));smart=smartContext(e,1,L,{to_bp:true,attacks:[attacker]});
 assert(smart.attackScore(attacker,target,{dmg:700})>-99999,'ignore Mirror Wall when the opponent has Jinzo negating traps');
}

// Metalmorph is only spent on an attacked face-up DEF monster when +300 DEF
// crosses the exact survival threshold.
{
 const {e,card,put}=make(),metal=card('Metalmorph',1,L.SZONE,8),attacker=card('Battle Ox',0,L.MZONE,1,0,1000,1000),defender=card('Sangan',1,L.MZONE,4,0,1000,700);
 put(1,L.MZONE,defender);put(0,L.MZONE,attacker);put(1,L.SZONE,metal);e.player=0;e.phase=32;e.inDamageStep=true;e.attackCard=attacker;e.attackTarget=defender;
 const prompt={chains:[metal]};
 assert(smartContext(e,1,L,prompt).activation(metal,true)>0,'use Metalmorph when 700 DEF becomes 1000 and saves the attacked monster');
 put(1,L.MZONE,{...defender,defense:600});e.attackTarget={...defender,defense:600};
 assert.equal(smartContext(e,1,L,prompt).activation(metal,true),-1,'do not spend Metalmorph when +300 DEF still leaves the monster destroyed');
 put(1,L.MZONE,{...defender,position:1});e.attackTarget={...defender,position:1};
 assert.equal(smartContext(e,1,L,prompt).activation(metal,true),-1,'do not use the defense-survival rule on an Attack Position target'); const protectedDefender={...defender,defense:600};put(1,L.MZONE,protectedDefender);e.attackTarget=protectedDefender;e.cards.get(protectedDefender.code).desc+=' This card cannot be destroyed by battle.';
 assert.equal(smartContext(e,1,L,prompt).activation(metal,true),-1,'do not spend Metalmorph when battle protection already guarantees survival');
}

console.log('PASS Oct 18 behavior-report regressions: Mask efficiency, Mirror Wall risk, and Metalmorph survival threshold');
