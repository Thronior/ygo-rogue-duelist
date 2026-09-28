import fs from 'node:fs';import assert from 'node:assert/strict';import {MobileDuel,M,L,I} from './web/duel.js';import {smartContext,exodiaPieces} from './web/smart_policy.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('./web/'+n+'.json',import.meta.url))),meta=read('content'),data=read('engine-data'),id=n=>meta.cards.find(c=>c.name===n).id;let checks=0;
for(const p of [0,1]){
 const e=new MobileDuel(meta.cards);Object.assign(e,{data,lp:[8000,8000],player:p,phase:4,turn:3,activeChain:[],battleProtected:[false,false]});let z={};e.query=(s,l)=>z[s+':'+l]||[];
 const c=(code,loc=L.HAND,seq=0,extra={})=>({code,controller:p,location:loc,sequence:seq,position:1,...extra});const put=(loc,...cards)=>z[p+':'+loc]=cards;const check=(v,msg)=>{assert(v,msg);checks++};
 const idle={type:M.SELECT_IDLECMD,player:p,activates:[],summons:[],special_summons:[],pos_changes:[],monster_sets:[],spell_sets:[],to_bp:false,to_ep:true};
 for(const code of exodiaPieces){
  z={};const piece=c(code);put(L.HAND,piece);let ctx=smartContext(e,p,L);check(ctx.summonScore(piece)<0&&ctx.specialOk(piece)===false,'All five pieces forbidden as summon candidates');
  for(const list of ['summons','special_summons','monster_sets'])check(e.auto({...idle,[list]:[{...piece,attack:9000,defense:9000}]}).action===I.TO_EP,'Never choose '+list+' even with enormous buffs');
  put(L.MZONE,c(code,L.MZONE,0,{position:8,attack:9000}));check(e.auto({...idle,pos_changes:[c(code,L.MZONE)]}).action===I.TO_EP,'Never flip summon a piece');put(L.MZONE);
  put(L.GRAVE,c(code,L.GRAVE));put(L.HAND,piece);
  for(const name of ['Monster Reborn','Premature Burial','Call of the Haunted','The Shallow Grave','Soul Charge']){
   const source=c(id(name));check(smartContext(e,p,L).activation(source)<0,'Do not activate '+name+' with only Exodia to revive');
   e.effect={code:source.code,player:p};const targets=[c(code,L.GRAVE),c(id('Kuriboh'),L.GRAVE,1)];const result=e.auto({type:M.SELECT_CARD,player:p,min:1,max:1,selects:targets});check(result.indicies[0]===1,'Do not target Exodia with '+name);
  }
 }
 z={};e.exodiaPlan=[false,false];const pieces=[...exodiaPieces];put(L.HAND,c(pieces[0]));put(L.DECK,c(pieces[0],L.DECK),c(pieces[1],L.DECK,1),c(id('Blue-Eyes White Dragon'),L.DECK,2));smartContext(e,p,L);check(e.exodiaPlan[p]&&!e.exodiaPlan[1-p],'Plan activates independently per seat');
 for(const name of ['Sangan','Witch of the Black Forest','Emissary of the Afterlife','Different Dimension Capsule']){e.effect={code:id(name),player:p};const r=e.auto({type:M.SELECT_CARD,player:p,min:1,max:1,selects:e.query(p,L.DECK)});check(r.indicies[0]===1,name+' prioritizes a missing piece over duplicates and beaters');}
 put(L.HAND);smartContext(e,p,L);check(e.exodiaPlan[p],'Plan persists after losing its first piece');put(L.HAND,c(pieces[0]));
 for(const name of ['Backup Soldier','Dark Factory of Mass Production']){put(L.GRAVE,c(pieces[1],L.GRAVE),c(id('Blue-Eyes White Dragon'),L.GRAVE,1),c(pieces[2],L.GRAVE,2));const source=c(id(name));check(smartContext(e,p,L).activation(source)>=130,'Recover missing pieces first');e.effect={code:source.code,player:p};const r=e.auto({type:M.SELECT_CARD,player:p,min:2,max:2,selects:e.query(p,L.GRAVE)});check(r.indicies.includes(0)&&r.indicies.includes(2),'Recover two missing limbs over a large monster');}
 e.effect={code:id('Backup Soldier'),player:p};const recovery=e.auto({type:M.SELECT_CARD,player:p,min:0,max:3,selects:e.query(p,L.GRAVE)});check(recovery.indicies.length===2&&recovery.indicies.includes(0)&&recovery.indicies.includes(2),'Optional recovery takes all missing pieces');
 put(L.DECK,c(pieces[1],L.DECK),c(pieces[2],L.DECK,1));check(smartContext(e,p,L).activation(c(id('Pot of Greed')))===125,'Draw priority also works near deck end');put(L.DECK,c(pieces[1],L.DECK));check(smartContext(e,p,L).activation(c(id('Pot of Greed')))<0,'Do not deck out');
 for(const name of ['Reload','Cyber Jar','Exchange','Dragged Down into the Grave'])check(smartContext(e,p,L).activation(c(id(name)))<0,'Do not disrupt assembled Exodia with '+name);
}
console.log('PASS',checks,'Exodia summon prevention and persistent collection-plan checks across both seats');
