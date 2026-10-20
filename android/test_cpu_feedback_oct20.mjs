import assert from 'node:assert/strict';
import fs from 'node:fs';
import {MobileDuel,L,M} from './web/duel.js';
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

// Include the Mage relic's Spellcaster ATK bonus when predicting a hand
// summon, and therefore when selecting its battle position.
{
 const {e,card,put}=make(),darkMagician=card('Dark Magician',1,L.HAND,0),threat=card('Battle Ox',0,L.MZONE,1,0,2600,1000);
 e.aiModifiers.statRelics[1]=[{effect:'atk',amount:300,filter:'Spellcaster'}];
 put(1,L.HAND,darkMagician);put(0,L.MZONE,threat);
 const smart=smartContext(e,1,L,{});
 assert.equal(smart.projectedAttack(darkMagician),2800,'Dark Magician should include the Mage relic');
 const response=e.auto({type:M.SELECT_POSITION,player:1,code:darkMagician.code,positions:5});
 assert.equal(response.position,1,'the CPU should choose Attack when the relic-adjusted ATK beats the opposing monster');
}

// Do not attack a live Reflect Bounder when its effect damage would defeat the
// CPU, even when the CPU monster wins the battle.
{
 const {e,card,put}=make(),attacker=card('Battle Ox',1,L.MZONE,1,0,2000,1000),bounder=card('Reflect Bounder',0,L.MZONE,1,0,1700,1000);
 e.lp=[8000,1000];put(1,L.MZONE,attacker);put(0,L.MZONE,bounder);
 let smart=smartContext(e,1,L,{to_bp:true,attacks:[attacker]});
 assert(smart.attackScore(attacker,bounder,{dmg:300})<=-99999,'decline the attack when Bounder effect damage is lethal');
 e.lp[1]=3000;smart=smartContext(e,1,L,{to_bp:true,attacks:[attacker]});
 assert(smart.attackScore(attacker,bounder,{dmg:300})>-99999,'allow the same winning attack when Bounder cannot deal lethal damage');
}

console.log('PASS Oct 20 CPU regressions: Mage relic summon forecasting and lethal Reflect Bounder attacks.');
