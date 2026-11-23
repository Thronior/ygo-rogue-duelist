// Behaviour flags of 2026-11-22 (review c, build 0.2.41): stubbed boards for the three CPU fixes.
import fs from 'node:fs';import assert from 'node:assert/strict';import {gunzipSync} from 'node:zlib';import {fileURLToPath} from 'node:url';
import {MobileDuel,M,I,L} from './web/duel.js';
import {smartContext} from './web/smart_policy.js';
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^\uFEFF/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json'),scripts=json('android/web/scripts.json');
const allCards=[...meta.cards,...(meta.tokenCards||[])],id=n=>{const c=allCards.find(c=>c.name===n);assert(c,n);return c.id};
let checks=0;const ok=(value,why)=>{assert(value,why);checks++};

// Stubbed boards: the CPU is seat 1, in its Main Phase 1.
const card=(name,location,controller,sequence,position=1,extra={})=>({code:id(name),attack:data[id(name)]?.attack??0,defense:data[id(name)]?.defense??0,position,controller,location,sequence,type:data[id(name)]?.type||0,...extra});
const filler=(p,name='Battle Ox')=>Array.from({length:20},(_,i)=>card(name,L.DECK,p,i,10));
const slots=(list,n)=>{const out=Array(n).fill(null);for(const c of list)out[c.sequence]=c;return out};
function duel(zones,extra={}){
 const e=new MobileDuel(allCards);
 Object.assign(e,{data,lp:[8000,8000],turn:6,player:1,phase:4,events:[],visuals:[],peak:{},pendingSummons:[],activeChain:[],battleProtected:[false,false],aiModifiers:{}},extra);
 for(const p of [0,1]){zones[p]={[L.DECK]:filler(p),...zones[p]};zones[p][L.MZONE]=slots(zones[p][L.MZONE]||[],5);zones[p][L.SZONE]=slots(zones[p][L.SZONE]||[],6);}
 e.query=(side,loc)=>zones[side]?.[loc]||[];e.core={duelQueryCount:(_,side,loc)=>(zones[side]?.[loc]||[]).length};
 return e;
}
const idle=(cards,extra={})=>({type:M.SELECT_IDLECMD,player:1,summons:[],special_summons:[],pos_changes:[],monster_sets:[],spell_sets:cards,activates:cards,to_bp:true,to_ep:true,...extra});

// 5. a6da310a: Limiter Removal only from the Battle Phase on (two copies were spent in the Draw/Main Phase on Machines
// that then became Fusion Material).
{
 const lim=card('Limiter Removal',L.HAND,1,0,10),xhead=card('X-Head Cannon',L.MZONE,1,2,1),wall=card('Gemini Elf',L.MZONE,0,2,1);
 const at=phase=>smartContext(duel({1:{[L.HAND]:[lim],[L.MZONE]:[xhead]},0:{[L.MZONE]:[wall]}},{phase,player:1}),1,L,{type:M.SELECT_CHAIN,player:1,selects:[lim]}).activation(lim,true);
 ok(at(4)<0,'Main Phase 1: Limiter Removal waits');
 ok(at(8)>0,'Battle Phase: X-Head Cannon (1800) doubles past Gemini Elf (1900)');
}

// 9. becd514f: a Spellbinding Circle whose monster has left locks nothing, so Dust Tornado keeps it for something better.
{
 const tornado=card('Dust Tornado',L.SZONE,1,1,10),circle=card('Spellbinding Circle',L.SZONE,0,1,5),mine=card('Battle Ox',L.MZONE,1,2,1);
 const run=locks=>{const e=duel({1:{[L.SZONE]:[tornado],[L.MZONE]:[mine]},0:{[L.SZONE]:[circle]}},{player:0,phase:1,attackLocks:locks});
  return smartContext(e,1,L,{type:M.SELECT_CHAIN,player:1,selects:[tornado]}).activation(tornado,true)};
 ok(!(run(new Map())>0),'an empty Spellbinding Circle is not worth Dust Tornado');
 ok(run(new Map([['1:2',{code:circle.code,controller:0,location:L.SZONE,sequence:1}]]))>0,'a Circle locking our Battle Ox is');
}

// 10. d3e32da5: Dark Spirit of the Silent redirects the attack to their weakest face-up monster.
{
 const gazelle=card('Gazelle the King of Mythical Beasts',L.MZONE,0,1,1),neo=card('Neo the Magic Swordsman',L.MZONE,0,2,1);
 const s=smartContext(duel({0:{[L.MZONE]:[gazelle,neo]}},{player:0,phase:8}),1,L);
 ok(s.targetScore('Dark Spirit of the Silent',gazelle,{})>s.targetScore('Dark Spirit of the Silent',neo,{}),'Gazelle (1500) is picked over Neo (2000)');
}
console.log(`flags nov22: ${checks} checks passed`);
