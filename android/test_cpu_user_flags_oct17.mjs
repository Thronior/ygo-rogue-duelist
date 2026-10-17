import assert from 'node:assert/strict';
import fs from 'node:fs';
import {MobileDuel,L,M,R,B} from './web/duel.js';
import {smartContext} from './web/smart_policy.js';

const read=n=>JSON.parse(fs.readFileSync(new URL(`./web/${n}.json`,import.meta.url),'utf8'));
const meta=read('content'),data=read('engine-data');
const id=n=>{const c=meta.cards.find(x=>x.name===n);assert(c,n);return c.id;};
const make=(p=1)=>{
 const e=new MobileDuel(meta.cards);Object.assign(e,{data,lp:[8000,8000],player:p,turn:4,phase:8,activeChain:[],battleProtected:[false,false],aiModifiers:{activeRelics:[[],[]],statRelics:[[],[]],spellTrapZones:5}});
 let zones={};e.query=(side,loc)=>zones[`${side}:${loc}`]||[];
 const card=(n,side=p,loc=L.MZONE,pos=1,sequence=0,attack=null,defense=null,extra={})=>({code:id(n),controller:side,location:loc,sequence,position:pos,attack:attack??data[id(n)].attack,defense:defense??data[id(n)].defense,...extra});
 const put=(side,loc,...cards)=>zones[`${side}:${loc}`]=cards;
 return {e,card,put};
};

// A futile forced attack into higher DEF must be declined; a stronger attacker
// can still choose the same face-up Defender.
{
 const {e,card,put}=make(1),attacker=card('Sangan',1,L.MZONE,1,0,1000,600),defender=card('4-Starred Ladybug of Doom',0,L.MZONE,4,0,500,1200);
 put(1,L.MZONE,attacker);put(0,L.MZONE,defender);
 let response=e.auto({type:M.SELECT_BATTLECMD,player:1,attacks:[attacker],to_m2:true,to_ep:true});
 assert.equal(response.action,B.TO_M2,'skip attack when the only visible target has higher DEF and there is no piercing');
 let smart=smartContext(e,1,L,{to_bp:true,activates:[],attacks:[attacker]});
 assert(smart.attackScore(attacker,defender,{dmg:0})<=-99999);
 const bigger={...attacker,attack:1300};put(1,L.MZONE,bigger);smart=smartContext(e,1,L,{to_bp:true,attacks:[bigger]});assert(smart.attackScore(bigger,defender,{dmg:100})>-99999,'allow a winning attack into the same defender');
 const hidden={...defender,position:8};put(1,L.MZONE,attacker);put(0,L.MZONE,hidden);e.attacker={...attacker,player:1,canStop:true,attack:1000};e.selectionHint=549;
 response=e.auto({type:M.SELECT_CARD,player:1,selects:[hidden],min:1,max:1,can_cancel:true});
 assert.equal(response.indicies,null,'cancel the attack on an unknown set monster rather than assuming its DEF is below 1000');
}

// Avoid spending removal into Horus LV6 when it is the only visible target.
{
 const {e,card,put}=make(1),vortex=card('Lightning Vortex',1,L.HAND,0),horus=card('Horus the Black Flame Dragon LV6',0,L.MZONE,1);
 put(1,L.HAND,vortex);put(0,L.MZONE,horus);
 assert.equal(smartContext(e,1,L,{activates:[]}).activation(vortex),-1,'hold Lightning Vortex against an all-Horus board');
 put(1,L.HAND,card('Smashing Ground',1,L.HAND,0),card('Battle Ox',1,L.HAND,0,1));
 put(0,L.MZONE,horus,card('Battle Ox',0,L.MZONE,1,1));
 assert.notEqual(smartContext(e,1,L,{activates:[]}).activation(card('Smashing Ground',1,L.HAND,0)),-1,'keep targeted removal live when another affected monster is present');
}

// Preserve Cylinder for a meaningful hit when Negate Attack can cover a small
// direct attack; spend it on the stronger attack if needed.
{
 const {e,card,put}=make(1),cylinder=card('Magic Cylinder',1,L.SZONE,8),negate=card('Negate Attack',1,L.SZONE,8,1),small=card('Needle Worm',0,L.MZONE,1,0,750,700);
 put(1,L.SZONE,cylinder,negate);put(0,L.MZONE,small);e.player=0;e.attackCard=small;
 let prompt={selects:[cylinder,negate],chains:[]};
 assert.equal(smartContext(e,1,L,prompt).activation(cylinder,true),-1,'decline Cylinder for a weak hit when Negate Attack is available');
 const strong={...small,attack:1500};put(0,L.MZONE,strong);e.attackCard=strong;
 assert(smartContext(e,1,L,prompt).activation(cylinder,true)>0,'use Cylinder against a stronger hit');
}

// Prioritize destroying unequipped Relinquished, but preserve normal target
// scoring when it already has an equip attached.
{
 const {e,card,put}=make(1),attacker=card('Battle Ox',1,L.MZONE,1,0,1700,1000),relinquished=card('Relinquished',0,L.MZONE,1,0,0,0),other=card('Sangan',0,L.MZONE,1,1,1000,600);
 put(1,L.MZONE,attacker);put(0,L.MZONE,relinquished,other);
 let smart=smartContext(e,1,L,{attacks:[attacker]});const urgent=smart.attackScore(attacker,relinquished,{dmg:1700}),ordinary=smart.attackScore(attacker,other,{dmg:700});
 assert(urgent>ordinary+5000,'attack the un-equipped Relinquished before a low-value monster');
 const equipped={...relinquished,equip_cards:[card('Axe of Despair',0,L.SZONE,8)]};put(0,L.MZONE,equipped,other);
 smart=smartContext(e,1,L,{attacks:[attacker]});assert(smart.attackScore(attacker,equipped,{dmg:1700})<urgent,'do not apply the special priority after Relinquished is equipped');
 put(0,L.MZONE,{...relinquished,attack:0,defense:0},other);e.attacker={...attacker,player:1,canStop:true,attack:1700};e.selectionHint=549;
 const response=e.auto({type:M.SELECT_CARD,player:1,selects:[other,{...relinquished,attack:0,defense:0}],min:1,max:1});
 assert.deepEqual(response.indicies,[1],'use the second attack to remove the now-unequipped Relinquished before Manju');
}
console.log('PASS Oct 17 behavior-flag regressions: higher DEF, Horus Spell immunity, Magic Cylinder preservation, and unequipped Relinquished priority');
