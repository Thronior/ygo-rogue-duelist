import fs from 'node:fs';import assert from 'node:assert/strict';
import {MobileDuel,M,R,I,L} from './web/duel.js';import {smartContext} from './web/smart_policy.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('./web/'+n+'.json',import.meta.url))),meta=read('content'),data=read('engine-data'),scripts=read('scripts');
const id=n=>{const c=meta.cards.find(c=>c.name===n);assert(c,n);return c.id;};
for(const p of [0,1]){
 const e=new MobileDuel(meta.cards);Object.assign(e,{data,lp:[8000,8000],player:p,turn:3,phase:4,activeChain:[],battleProtected:[false,false]});let zones={};e.query=(s,l)=>zones[s+':'+l]||[];
 const c=(n,l=L.HAND,sequence=0,controller=p)=>({code:id(n),controller,location:l,sequence,position:1});const put=(l,...cards)=>zones[p+':'+l]=cards;const policy=()=>smartContext(e,p,L);
 const night=c('Night Assailant'),serpent=c('Sinister Serpent',L.HAND,1),ox=c('Battle Ox',L.HAND,2);
 put(L.HAND,night,serpent,ox);assert.equal(policy().discardBenefit(night),0);put(L.GRAVE,c('Magician of Faith',L.GRAVE));assert(policy().handLoss(night)<0);
 e.effect={code:id('The Cheerful Coffin'),player:p};assert(policy().activation(c('The Cheerful Coffin'))>0);
 assert.deepEqual(e.auto({type:M.SELECT_CARD,player:p,min:1,max:3,selects:[ox,night,serpent]}).indicies.sort(),[1,2]);
 put(L.MZONE,c('Banisher of the Light',L.MZONE));assert.equal(policy().discardBenefit(night),0);assert(policy().activation(c('The Cheerful Coffin'))<0);put(L.MZONE);put(L.GRAVE);put(L.HAND,ox);assert(policy().activation(c('The Cheerful Coffin'))<0);
 assert.equal(policy().discardBenefit(c('Sangan')),0,'Field-only search is not a hand-discard benefit');
 put(L.HAND,serpent,c('The Cheerful Coffin'));zones[(1-p)+':'+L.MZONE]=[c('Battle Ox',L.MZONE,0,1-p)];
 assert(policy().activation(c('The Cheerful Coffin'))<0,'Do not discard the only blocker for delayed recovery');
 put(L.MZONE,c('Mystical Elf',L.MZONE));assert(policy().activation(c('The Cheerful Coffin'))>0,'Existing blocker makes the recovery plan available');put(L.MZONE);
 const rare=c('Raigeki'),cheap=c('Red Medicine');put(L.HAND,rare);e.effect={code:id('Magic Drain'),player:1-p};e.activeChain=[{code:cheap.code,player:p},{code:e.effect.code,player:1-p}];
 assert.equal(policy().resourceOption([1213,1214]),1,'Do not sacrifice Raigeki for healing');
 put(L.HAND,cheap);zones[(1-p)+':'+L.MZONE]=[c('Blue-Eyes White Dragon',L.MZONE,0,1-p)];e.activeChain[0]={code:rare.code,player:p};assert.equal(policy().resourceOption([1213,1214]),0);assert.equal(policy().resourceOption([1214,1213]),1);
 e.effect={code:id('Dark Coffin'),player:1-p};const opts=[(BigInt(id('Dark Coffin'))<<20n)+1n,(BigInt(id('Dark Coffin'))<<20n)+2n];
 put(L.HAND,c('Exodia the Forbidden One'));put(L.MZONE,c('Sangan',L.MZONE));assert.equal(policy().resourceOption(opts),1);assert.equal(policy().resourceOption([...opts].reverse()),0);
 put(L.HAND,cheap);put(L.MZONE,c('Blue-Eyes White Dragon',L.MZONE));assert.equal(policy().resourceOption(opts),0);
}
console.log('PASS resource decisions, both seats, suppression, protected pieces and option ordering');
// Real-core interactions: use the policy for the payment/penalty/selection itself.
for(const p of [0,1])for(const scenario of ['drain-decline','drain-pay','cheerful','dark']){
 const e=await new MobileDuel(meta.cards).init([data,scripts]);
 const hand=n=>`Duel.SendtoHand(Duel.CreateToken(${p},${id(n)}),${p},REASON_EFFECT)`;
 const grave=n=>`Duel.SendtoGrave(Duel.CreateToken(${p},${id(n)}),REASON_EFFECT)`;
 const field=(n,s,l,pos)=>`Duel.MoveToField(Duel.CreateToken(${s},${id(n)}),${s},${s},${l},${pos},true)`;
 let body=`Duel.SendtoDeck(Duel.GetFieldGroup(0,LOCATION_HAND,LOCATION_HAND),nil,SEQ_DECKBOTTOM,REASON_RULE) `;
 let spell;
 if(scenario.startsWith('drain')){spell=scenario==='drain-pay'?'Raigeki':'Red Medicine';body+=hand(spell)+' '+hand(scenario==='drain-pay'?'Red Medicine':'Raigeki')+' '+field('Magic Drain',1-p,'LOCATION_SZONE','POS_FACEDOWN')+' '+field('Blue-Eyes White Dragon',1-p,'LOCATION_MZONE','POS_FACEUP_ATTACK');}
 if(scenario==='cheerful'){spell='The Cheerful Coffin';body+=[hand(spell),hand('Night Assailant'),hand('Battle Ox'),grave('Magician of Faith')].join(' ');}
 if(scenario==='dark'){spell='Mystical Space Typhoon';body+=[hand(spell),hand('Exodia the Forbidden One'),field('Sangan',p,'LOCATION_MZONE','POS_FACEUP_ATTACK'),field('Dark Coffin',1-p,'LOCATION_SZONE','POS_FACEDOWN')].join(' ');}
 const setup=`local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_ADJUST) e:SetOperation(function(e) e:Reset() ${body} end) Duel.RegisterEffect(e,0)`;
 let activated=false,decision=false,resolved=false;
 try{let state=e.start(Array(30).fill(id('Battle Ox')),Array(30).fill(id('Battle Ox')),8000,8000,5,71,[],[],setup);
 for(let step=0;step<300&&!state.finished;step++){
  const m=e.pending;let r;
  if(m.type===M.SELECT_IDLECMD){const index=m.activates.findIndex(c=>c.code===id(spell));if(m.player===p&&!activated&&index>=0){r={type:R.SELECT_IDLECMD,action:I.SELECT_ACTIVATE,index};activated=true;}else r={type:R.SELECT_IDLECMD,action:I.TO_EP};}
  else if(m.type===M.SELECT_CHAIN&&!m.forced){const index=scenario.startsWith('drain')?m.selects.findIndex(c=>c.code===id('Magic Drain')):-1;r={type:R.SELECT_CHAIN,index:index<0?null:index};}
  else {r=e.auto();if(m.type===M.SELECT_OPTION&&['Magic Drain','Dark Coffin'].includes(e.name(e.effect?.code))){decision=true;assert.equal(r.index,scenario==='drain-pay'?0:1);}
   if(scenario==='cheerful'&&m.type===M.SELECT_CARD&&m.selects.every(c=>c.location===L.HAND)){decision=true;assert.deepEqual(r.indicies.map(i=>m.selects[i].code),[id('Night Assailant')]);}}
  state=e.respond(r);
  if(activated&&decision&&!e.activeChain.length&&e.pending?.type===M.SELECT_IDLECMD){resolved=true;break;}
 }
 assert(decision&&resolved,scenario+' exercised and resolved');assert.deepEqual(e.errors,[]);
 if(scenario==='cheerful'){assert(e.query(p,L.HAND).some(c=>c.code===id('Magician of Faith')));assert(e.query(p,L.HAND).some(c=>c.code===id('Battle Ox')));}
 if(scenario==='dark')assert(e.query(p,L.HAND).some(c=>c.code===id('Exodia the Forbidden One')));
 if(scenario==='drain-pay')assert.equal(e.query(1-p,L.MZONE).filter(Boolean).length,0);
 if(scenario==='drain-decline')assert(e.query(p,L.HAND).some(c=>c.code===id('Raigeki')));
 }finally{e.destroy()}
 console.log('PASS real core',p,scenario);
}
