// CPU rules from the Sid T3 coin-toss deck review (2026-11-12): Second Coin Toss redoes only a toss that went against
// the CPU, Cup of Ace waits for good odds, Gambler of Legend gambles only when it is worth it. Both seats.
import fs from 'node:fs';import assert from 'node:assert/strict';import {MobileDuel,M,L} from './web/duel.js';
import {smartContext} from './web/smart_policy.js';
const meta=JSON.parse(fs.readFileSync(new URL('./web/content.json',import.meta.url))),data=JSON.parse(fs.readFileSync(new URL('./web/engine-data.json',import.meta.url))),id=n=>{const c=meta.cards.find(c=>c.name===n);assert(c,n);return c.id};
let checks=0;const same=(a,b,m)=>{assert.deepEqual(a,b,m);checks++};const ok=(v,m)=>{assert(v,m);checks++};
const card=(name,location,controller,sequence,position=1,extra={})=>({code:id(name),attack:data[id(name)]?.attack??0,defense:data[id(name)]?.defense??0,position,controller,location,sequence,type:data[id(name)]?.type||0,...extra});
const mon=(name,controller,sequence,position=1,extra)=>card(name,L.MZONE,controller,sequence,position,extra);
const filler=(controller,n=20,where=L.DECK)=>Array.from({length:n},(_,i)=>card('Battle Ox',where,controller,i,10));
function duel(zones,state={}){
 const e=new MobileDuel(meta.cards);
 Object.assign(e,{data,lp:[8000,8000],turn:6,player:1,phase:4,events:[],visuals:[],peak:{},pendingSummons:[],activeChain:[],battleProtected:[false,false],aiModifiers:{}},state);
 const slots=list=>{const out=Array(5).fill(null);for(const c of list)out[c.sequence]=c;return out};
 for(const p of [0,1]){zones[p]={[L.DECK]:filler(p),...zones[p]};for(const loc of [L.MZONE,L.SZONE])zones[p][loc]=slots(zones[p][loc]||[]);}
 e.query=(side,loc)=>zones[side]?.[loc]||[];
 e.core={duelQueryCount:(_,side,loc)=>(zones[side]?.[loc]||[]).length};
 return e;
}
const SCT=id('Second Coin Toss');
for(const p of [0,1]){
 const q=1-p,ctx=(zones,state)=>smartContext(duel(zones,{player:p,...state}),p,L,{type:M.SELECT_IDLECMD});
 const toss=(name,results,extra={})=>({player:p,results,code:id(name),turn:6,...extra});
 // Second Coin Toss: redo a bad result only.
 const redo=ctx({}).coinRedo;
 same(redo(toss('Cup of Ace',[false])),true,`seat ${p}: Cup of Ace tails is redone`);
 same(redo(toss('Cup of Ace',[true])),false,`seat ${p}: Cup of Ace heads is kept`);
 same(redo(toss('Gambler of Legend',[true,false,false])),true,`seat ${p}: Gambler of Legend 1 head is redone`);
 same(redo(toss('Gambler of Legend',[true,true,false])),false,`seat ${p}: Gambler of Legend 2 heads are kept`);
 same(redo(toss('Twin-Barrel Dragon',[true,false])),true,`seat ${p}: Twin-Barrel Dragon needs 2 heads`);
 same(redo(toss('Kryuel',[true]),{heads:false,code:id('Kryuel'),turn:6}),true,`seat ${p}: a called toss that missed our call is redone`);
 same(redo(toss('Kryuel',[true]),{heads:true,code:id('Kryuel'),turn:6}),false,`seat ${p}: a called toss that matched is kept`);
 same(redo(toss('Cup of Ace',[false],{player:q})),false,`seat ${p}: never the opponent's toss`);
 same(redo(toss('Cup of Ace',[false],{turn:5})),false,`seat ${p}: never a toss from an earlier turn`);
 // Second Coin Toss: activated, but only one face-up copy.
 const cup=card('Cup of Ace',L.HAND,p,0),ox=card('Battle Ox',L.HAND,p,1),sct=card('Second Coin Toss',L.SZONE,p,0,1),spare=card('Second Coin Toss',L.HAND,p,2);
 ok(ctx({[p]:{[L.HAND]:[spare,ox]}}).activation(spare)>=0,`seat ${p}: Second Coin Toss is activated`);
 same(ctx({[p]:{[L.HAND]:[spare,ox],[L.SZONE]:[sct]}}).activation(spare),-1,`seat ${p}: not a second copy beside a face-up one`);
 // Cup of Ace: played, higher with a ready redo so Second Coin Toss goes first.
 const ready=ctx({[p]:{[L.HAND]:[cup,ox],[L.SZONE]:[sct]}}).activation(cup),plain=ctx({[p]:{[L.HAND]:[cup,ox]}}).activation(cup);
 ok(ready>plain&&plain>=0,`seat ${p}: Cup of Ace is played, preferably with a ready Second Coin Toss`);
 ok(ctx({[p]:{[L.HAND]:[cup,spare]}}).activation(spare)>plain,`seat ${p}: Second Coin Toss goes before Cup of Ace`);
 same(ctx({[p]:{[L.HAND]:[cup,ox],[L.SZONE]:[sct]}},{coinRedoTurn:{[p]:6}}).activation(cup),plain,`seat ${p}: a spent redo counts as none`);
 same(ctx({[p]:{[L.HAND]:[cup,ox],[L.SZONE]:[sct],[L.DECK]:filler(p,2)}}).activation(cup),-1,`seat ${p}: never with under 3 cards in our Deck`);
 // Gambler of Legend.
 const gambler=mon('Gambler of Legend',p,0);
 ok(ctx({[p]:{[L.MZONE]:[gambler],[L.HAND]:[ox]},[q]:{[L.MZONE]:[mon('Summoned Skull',q,0),mon('Vorse Raider',q,1)],[L.HAND]:filler(q,3,L.HAND)}}).activation(gambler)>=0,`seat ${p}: Gambler of Legend gambles against a full board`);
 same(ctx({[p]:{[L.MZONE]:[gambler],[L.HAND]:filler(p,5,L.HAND)},[q]:{}}).activation(gambler),-1,`seat ${p}: not with nothing to gain and a full hand to lose`);
 // Gambler of Legend's 1 head: destroy our cheapest card, the spent Gambler first.
 const judge=mon('Ms. Judge',p,1),lucky=card('Lucky Chance',L.SZONE,p,1,1),pick=ctx({[p]:{[L.MZONE]:[gambler,judge],[L.SZONE]:[sct,lucky]}}).ownLossPick;
 same(pick([judge,sct,lucky,gambler],gambler),3,`seat ${p}: the spent Gambler of Legend goes first`);
 same(pick([judge,sct,lucky]),2,`seat ${p}: then a Lucky Chance, never Ms. Judge`);
 same(pick([judge,sct]),1,`seat ${p}: an only Second Coin Toss goes before an 1800 monster`);same(pick([mon('Kryuel',p,2),sct]),0,`seat ${p}: a 1000 monster goes before an only Second Coin Toss`);
}
console.log(`PASS Sid T3 deck rules (2026-11-12): ${checks} checks`);
