import fs from 'node:fs';import assert from 'node:assert/strict';import {MobileDuel,M,L} from './web/duel.js';import {smartContext,exodiaPieces} from './web/smart_policy.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('./web/'+n+'.json',import.meta.url))),meta=read('content'),data=read('engine-data');let checks=0;
for(const p of [0,1]){const e=new MobileDuel(meta.cards);Object.assign(e,{data,lp:[8000,8000],player:p,phase:4,activeChain:[]});let zones={};e.query=(s,l)=>zones[s+':'+l]||[];const id=n=>meta.cards.find(c=>c.name===n).id;const card=(code,i=0)=>({code,controller:p,location:L.HAND,sequence:i,position:8});const check=(b)=>{assert(b);checks++};
for(const piece of exodiaPieces){const c=card(piece),fodder=card(id('Blue-Eyes White Dragon'),1);zones[p+':'+L.HAND]=[c,fodder];
 for(const effect of [null,id('Graceful Charity'),id('Raigeki Break')]){e.effect=effect?{code:effect,player:p}:null;const r=e.auto({type:M.SELECT_CARD,player:p,min:1,max:1,selects:[c,fodder]});check(r.indicies[0]===1)}
 const must=e.auto({type:M.SELECT_CARD,player:p,min:1,max:1,selects:[c]});check(must.indicies[0]===0);
 for(const name of ['Card Destruction','Morphing Jar','Magic Jammer','Graceful Charity']){const a=card(id(name),1);zones[p+':'+L.HAND]=[c,a];check(smartContext(e,p,L).activation(a)<0)}
}
// Send-to-GY is not technically discarding: protect Hand Destruction too.
e.cards.set(74519184,{id:74519184,name:'Hand Destruction',desc:'Each player sends 2 cards from their hand to the GY, then draws 2 cards.'});const a=card(74519184,1),piece=card([...exodiaPieces][0]);zones[p+':'+L.HAND]=[piece,a];check(smartContext(e,p,L).activation(a)<0);
const safe=[card(id('Blue-Eyes White Dragon'),2),card(id('Battle Ox'),3)];zones[p+':'+L.HAND]=[piece,a,...safe];e.effect={code:a.code,player:p};const r=e.auto({type:M.SELECT_CARD,player:p,min:2,max:2,selects:[piece,...safe]});check(r.indicies.length===2&&!r.indicies.includes(0));
}
console.log('PASS',checks,'Exodia discard/activation checks across both seats');
