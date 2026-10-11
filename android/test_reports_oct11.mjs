import fs from 'node:fs';
import assert from 'node:assert/strict';
import {MobileDuel,L,M,I} from './web/duel.js';
import {smartContext} from './web/smart_policy.js';
import {displayCardText} from './web/card-inspection.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('./web/'+n+'.json',import.meta.url),'utf8'));
const meta=read('content'),data=read('engine-data'),id=n=>{const c=meta.cards.find(c=>c.name===n);assert(c,n);return c.id};
for(const p of [0,1]){
 const e=new MobileDuel(meta.cards);Object.assign(e,{data,lp:[8000,8000],player:p,turn:4,phase:4,activeChain:[],battleProtected:[false,false]});
 let zones={};e.query=(s,l)=>zones[s+':'+l]||[];
 const c=(n,s=p,l=L.MZONE,extra={})=>({code:id(n),controller:s,location:l,sequence:0,position:1,attack:data[id(n)].attack,defense:data[id(n)].defense,...extra});
 const put=(s,l,...cards)=>zones[s+':'+l]=cards;
 const bls=c('Black Luster Soldier - Envoy of the Beginning'),banish={...bls,description:(BigInt(bls.code)<<20n)|1n},again={...bls,description:(BigInt(bls.code)<<20n)|2n};
 put(p,L.MZONE,bls);
 assert(smartContext(e,p,L).activation(banish)<0,'Never self-banish on empty opposing board');
 assert(smartContext(e,p,L).activation(again)>0,'Second attack still usable');
 const enemy=c('Blue-Eyes White Dragon',1-p,L.MZONE,{attack:3500});put(1-p,L.MZONE,enemy);
 let policy=smartContext(e,p,L);assert(policy.activation(banish)>0,'Remove a stronger threat');assert(policy.targetScore('Black Luster Soldier - Envoy of the Beginning',enemy,{})>policy.targetScore('Black Luster Soldier - Envoy of the Beginning',bls,{}));
 zones={};const vortex=c('Lightning Vortex',p,L.HAND),raigeki=c('Raigeki',p,L.HAND,{sequence:1});put(p,L.HAND,vortex,raigeki,c('Battle Ox',p,L.HAND,{sequence:2}));put(1-p,L.MZONE,enemy,c('Summoned Skull',1-p,L.MZONE,{sequence:1}));
 const prompt={type:M.SELECT_IDLECMD,player:p,activates:[vortex,raigeki],summons:[],special_summons:[],pos_changes:[],monster_sets:[],spell_sets:[],to_bp:true,to_ep:true};
 policy=smartContext(e,p,L,prompt);assert(policy.activation(vortex)<0);assert(policy.activation(raigeki)>0);assert.deepEqual(e.auto(prompt),{type:1,action:I.SELECT_ACTIVATE,index:1});
 prompt.activates=[vortex];assert(smartContext(e,p,L,prompt).activation(vortex)>0,'Vortex remains usable without offered Raigeki');
 zones={};const doron=c('Doron',p,L.HAND);put(p,L.HAND,doron);put(1-p,L.MZONE,c('Mechanicalchaser',1-p,L.MZONE,{attack:2550}),c('Marshmallon',1-p,L.MZONE,{sequence:1,position:4}));
 const summon={...prompt,activates:[],summons:[doron],monster_sets:[doron]};assert.equal(e.auto(summon).action,I.SELECT_MONSTER_SET,'Do not attack-summon just to hit invulnerable defender');
 put(1-p,L.MZONE,c('Kuriboh',1-p,L.MZONE,{position:4}));assert.equal(e.auto(summon).action,I.SELECT_SUMMON,'Can still summon to defeat a vulnerable defender');
}
const text='Flip a coin.\n\n* The above text is unofficial and describes the card\'s functionality in the OCG.';assert.equal(displayCardText(text),'Flip a coin.');assert.equal(displayCardText('An unofficial tournament story.'),'An unofficial tournament story.');
console.log('PASS October 11 report regressions for both seats and display-only card footnote cleanup');
