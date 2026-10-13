import fs from 'node:fs';import assert from 'node:assert/strict';
import {MobileDuel,M,R,I,L} from './web/duel.js';import {smartContext} from './web/smart_policy.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('./web/'+n+'.json',import.meta.url))),meta=read('content'),data=read('engine-data');
const id=n=>{const c=meta.cards.find(c=>c.name===n);assert(c,n);return c.id};
for(const p of [0,1]){
 const e=new MobileDuel(meta.cards);Object.assign(e,{data,lp:[8000,8000],player:p,turn:3,phase:4,activeChain:[],battleProtected:[false,false]});let zones={};e.query=(s,l)=>zones[s+':'+l]||[];
 const c=(n,l=L.MZONE,side=p,pos=1)=>({code:id(n),controller:side,location:l,sequence:0,position:pos,attack:data[id(n)].attack,defense:data[id(n)].defense});const put=(s,l,...cards)=>zones[s+':'+l]=cards;const policy=()=>smartContext(e,p,L);
 const sangan=c('Sangan');put(p,L.MZONE,sangan);put(p,L.DECK,...Array(20).fill(c('Battle Ox',L.DECK)));
 const elf=c('Mystical Elf',L.MZONE,1-p,4);put(1-p,L.MZONE,elf);assert.equal(policy().suicideScore(sangan),0);
 const ox=c('Battle Ox',L.MZONE,1-p);put(1-p,L.MZONE,ox);assert(policy().suicideScore(sangan)>0);assert.equal(policy().suicideScore(sangan,elf),0);
 zones={};const serket=c('Mystical Beast of Serket',L.GRAVE);put(p,L.GRAVE,serket);assert.equal(policy().specialOk(serket),false);assert(policy().activation(c('Monster Reborn',L.HAND))<0);
 put(p,L.SZONE,c('Temple of the Kings',L.SZONE));assert(policy().specialOk(serket));
 zones={};put(p,L.MZONE,c('Gearfried the Iron Knight'));assert(policy().activation(c('Malevolent Nuzzler',L.HAND))<0);put(p,L.MZONE,c('Battle Ox'));assert(policy().activation(c('Malevolent Nuzzler',L.HAND))>=0);
 zones={};e.player=1-p;e.phase=8;const down=c('Dark King of the Abyss',L.MZONE,1-p,8);put(1-p,L.MZONE,down);e.attackCard=down;assert(policy().activation(c('Book of Moon',L.SZONE),true)<0);
 // Spirit summons leave an empty field; setting the same card preserves a blocker.
 zones={};e.player=p;e.phase=4;e.lp[p]=1500;put(1-p,L.MZONE,c('Battle Ox',L.MZONE,1-p));const rabbit=c('Inaba White Rabbit',L.HAND);assert(policy().incomingDamage(rabbit,true)>=1500);assert(policy().incomingDamage(rabbit,false)<1500);
 zones={};put(p,L.DECK,c('Destiny Board',L.DECK));
 for(let mask=1;mask<32;mask++){let blocked=0xffffffff;for(let seq=0;seq<5;seq++)if(mask&(1<<seq))blocked&=~(1<<(8+seq));const result=e.auto({type:M.SELECT_PLACE,player:p,field_mask:blocked>>>0,count:1});assert.equal(result.places[0].sequence,(p===1?[0,1,2,3,4]:[4,3,2,1,0]).find(s=>mask&(1<<s)));}
 e.placementCode=id('Destiny Board');assert.equal(e.auto({type:M.SELECT_PLACE,player:p,field_mask:(~(31<<8))>>>0,count:1}).places[0].sequence,p===1?4:0);
}
console.log('PASS both seats: searcher attacks, Serket revival, Gearfried equips, spent attacks, Spirit defense and Destiny Board placements');

for(const p of [0,1]){
 const e=await new MobileDuel(meta.cards).init([data,read('scripts')]);
 const letters=['Destiny Board','Spirit Message "I"','Spirit Message "N"','Spirit Message "A"','Spirit Message "L"'];
 const setup=`local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_ADJUST) e:SetOperation(function(e) e:Reset() ${letters.map(n=>`Duel.SendtoHand(Duel.CreateToken(${p},${id(n)}),${p},REASON_EFFECT)`).join(' ')} end) Duel.RegisterEffect(e,0)`;
 try{let state=e.start(Array(30).fill(id('Battle Ox')),Array(30).fill(id('Battle Ox')),8000,8000,0,73,[],[],setup,0);let placed=false,complete=false;
 for(let step=0;step<1000&&!state.finished;step++){
 const m=e.pending;let response;
 if(m.type===M.SELECT_IDLECMD){const index=m.spell_sets.findIndex(c=>c.code===id('Destiny Board'));response=m.player===p&&!placed&&index>=0?{type:R.SELECT_IDLECMD,action:I.SELECT_SPELL_SET,index}:{type:R.SELECT_IDLECMD,action:I.TO_EP};if(response.action===I.SELECT_SPELL_SET)placed=true;}
 else if(m.type===M.SELECT_CHAIN&&!m.forced){const index=m.selects.findIndex(c=>c.code===id('Destiny Board'));response={type:R.SELECT_CHAIN,index:index>=0?index:null};}
 else response=e.auto();
 state=e.respond(response);
 const row=e.query(p,L.SZONE).filter(Boolean).sort((a,b)=>p===1?b.sequence-a.sequence:a.sequence-b.sequence).map(c=>e.name(c.code));
 if(row.length===5){assert.deepEqual(row,letters);complete=true;}
 }
 if(!complete)console.log('Destiny incomplete',p,e.turn,state.finished,e.query(p,L.SZONE).filter(Boolean).map(c=>[e.name(c.code),c.sequence]),e.query(p,L.HAND).filter(Boolean).map(c=>e.name(c.code)));assert(complete,'All Destiny Board messages placed in display order');assert.deepEqual(e.errors,[]);
 }finally{e.destroy()}
}
console.log('PASS real core: Destiny Board completes in display order for both seats');

import {chainWindowAllowed} from './web/duel-presentation.js';
assert(chainWindowAllowed({spe_count:127,selects:[{code:id('Sangan')}]},'sometimes'));
assert(!chainWindowAllowed({spe_count:127,selects:[{code:id('Sangan')}]},'never'));
assert(!chainWindowAllowed({spe_count:0,selects:[]},'sometimes'));
console.log('PASS optional trigger prompts preserve player chain preferences');
