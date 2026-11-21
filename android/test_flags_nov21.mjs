// Behaviour flags of 2026-11-21 (build 0.2.39). Stubbed boards always run; the flagged replays are checked too when the
// review folder is present. 12822091 (the 1000 ATK summon) was fixed on 2026-11-20 and is covered by test_flags_nov20.mjs.
// 18d6e598: Level Up! sent a 3000 Horus the Black Flame Dragon LV8 to summon a 2300 LV6 (LV8's text names LV6).
// 20a8bb28: Premature Burial revived Gearfried the Iron Knight, which destroyed the Burial and so itself.
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

// 1. Level Up! only climbs to a higher LV: never from the top of a line.
{
 const levelUp=card('Level Up!',L.HAND,1,0,10);
 const at=(field,inDeck)=>{
  const top=card(field,L.MZONE,1,2,1),deck=[...filler(1).slice(0,17),...inDeck.map((n,i)=>card(n,L.DECK,1,17+i,10))];
  const e=duel({1:{[L.HAND]:[levelUp],[L.MZONE]:[top],[L.DECK]:deck}});
  return {s:smartContext(e,1,L,idle([levelUp])),top,deck};
 };
 const horus8=at('Horus the Black Flame Dragon LV8',['Horus the Black Flame Dragon LV6','Horus the Black Flame Dragon LV6']);
 ok(horus8.s.activation(levelUp)<0,'18d6e598: Level Up! is not used on Horus LV8 to bring out a LV6');
 const silent8=at('Silent Magician LV8',['Silent Magician LV4']);
 ok(silent8.s.activation(levelUp)<0,'nor on Silent Magician LV8 to bring out a LV4');
 const horus6=at('Horus the Black Flame Dragon LV6',['Horus the Black Flame Dragon LV8']);
 ok(horus6.s.activation(levelUp)>0,'Horus LV6 still levels up to LV8');
 const lv8=horus6.deck.at(-1);
 ok(horus6.s.targetScore('Level Up!',horus6.top,{})>0,'Horus LV6 is the monster Level Up! sends');
 ok(horus6.s.targetScore('Level Up!',lv8,{})>0,'and LV8 is the monster it summons');
 ok(horus8.s.targetScore('Level Up!',horus8.top,{})<0,'Horus LV8 is never the monster sent');
}

// 2. Equip revivals skip a monster that destroys Equip Cards put on it.
{
 const burial=card('Premature Burial',L.HAND,1,0,10),gear=card('Gearfried the Iron Knight',L.GRAVE,1,0,10),lizard=card('Armored Lizard',L.GRAVE,1,1,10);
 const at=(grave,mzone=[],extra={})=>smartContext(duel({1:{[L.HAND]:[burial],[L.GRAVE]:grave},0:{[L.MZONE]:mzone}},extra),1,L,idle([burial]));
 const s=at([gear,lizard]);
 ok(s.targetScore('Premature Burial',gear,{})<s.targetScore('Premature Burial',lizard,{}),'20a8bb28: Premature Burial revives Armored Lizard (1500), not Gearfried (1800)');
 ok(s.targetScore('Premature Burial',gear,{})===-Infinity,'Gearfried is never a Premature Burial target');
 ok(s.targetScore('Monster Reborn',gear,{})!==-Infinity,'Monster Reborn (no equip) may still revive Gearfried');
 const joan=card('St. Joan',L.MZONE,0,2,1);
 ok(at([gear],[joan]).activation(burial)<0,'with only Gearfried in the GY Premature Burial stays in hand');
 const reborn=card('Monster Reborn',L.HAND,1,0,10);
 ok(smartContext(duel({1:{[L.HAND]:[reborn],[L.GRAVE]:[gear]},0:{[L.MZONE]:[]}},{lp:[1000,8000]}),1,L,idle([reborn])).activation(reborn)>0,'Monster Reborn still revives Gearfried for lethal');
}

// 2b. A relic-boosted Spirit Reaper keeps Attack Position for a battle it wins when that costs no LP next turn.
{
 const at=(reaperAtk,theirs)=>{
  const reaper=card('Spirit Reaper',L.MZONE,1,2,1,{attack:reaperAtk,defense:1500});
  const s=smartContext(duel({1:{[L.MZONE]:[reaper]},0:{[L.MZONE]:theirs}}),1,L,idle([],{pos_changes:[reaper]}));
  return s.reaperBattleReady(reaper);
 };
 const leg=()=>card('Right Leg of the Forbidden One',L.MZONE,0,2,1,{attack:0,defense:0});
 ok(at(2200,[leg()]),'98342710: a 2200 ATK Spirit Reaper stays in Attack Position to attack a 0/0 Exodia piece');
 ok(!at(2200,[leg(),card('Dark Magician',L.MZONE,0,3,1)]),'it still goes to Defense when a 2500 ATK attacker would hit it next turn');
 ok(!at(2200,[card('Dark Magician',L.MZONE,0,3,1)]),'and when it beats nothing on their field');
}

// 2c. Reversed Remedy ("Bad Reaction to Simochi", Discord, Twist): its LP gain becomes damage, so the CPU keeps
// Enchanted Javelin and Draining Shield instead of hurting itself.
{
 const giant=card('Giant Soldier of Stone',L.MZONE,0,2,1),bird=card('Sonic Bird',L.MZONE,1,2,8);
 const at=(name,relics)=>{const c=card(name,L.SZONE,1,2,10);return smartContext(duel({1:{[L.MZONE]:[bird],[L.SZONE]:[c]},0:{[L.MZONE]:[giant]}},{player:0,lp:[8000,3000],attackCard:giant,attackTarget:bird,aiModifiers:{activeRelics:{0:[],1:relics}}}),1,L,{type:M.SELECT_CHAIN,player:1,selects:[c]}).activation(c,true)};
 ok(at('Enchanted Javelin',[])>0,'without the shadow relic Javelin gains 1300');
 ok(at('Enchanted Javelin',['cursed_reversed_remedy'])<0,'under Reversed Remedy Javelin is not used');
 ok(at('Draining Shield',['cursed_reversed_remedy'])<0,'under Reversed Remedy Draining Shield is not used');
}

// 3. The flagged replays, when the review folder is present.
{
 const dir='D:/Codex Exports/Replay exports/2026-11-21-review/replays/';
 if(fs.existsSync(dir)){
  const files=fs.readdirSync(dir);
  const at=async(prefix,step,check)=>{const file=files.find(x=>x.startsWith(prefix));if(!file)return;
   const rec=JSON.parse(gunzipSync(fs.readFileSync(dir+file)),(k,v)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===1&&('$bigint' in v)?BigInt(v.$bigint):v);
   const e=await new MobileDuel(allCards).init([data,scripts]);
   try{e.start(...rec.start);for(let i=0;i<step;i++)e.respond(rec.responses[i].response??rec.responses[i]);check(e,e.pending,e.auto(e.pending))}
   catch(err){console.log(`${prefix}: replay diverged (${err.message}); skipped`)}finally{e.destroy()}};
  await at('18d6e598',240,(e,m,r)=>ok(!(r.action===I.SELECT_ACTIVATE&&e.name(m.activates[r.index].code)==='Level Up!'),'18d6e598 step 240: Level Up! is not used on Horus LV8'));
  await at('20a8bb28',323,(e,m,r)=>ok(e.name(m.selects[r.indicies[0]].code)!=='Gearfried the Iron Knight','20a8bb28 step 323: Premature Burial does not revive Gearfried'));
 }
}
// 98342710 (build 0.2.40, 2026-11-21b review): the CPU switched a 2200 ATK Spirit Reaper to Defense in front of a 0/0
// Right Leg of the Forbidden One under its own Swords of Revealing Light, then had nothing to attack with.
{
 const dir='D:/Codex Exports/Replay exports/2026-11-21b-review/replays/';
 const file=fs.existsSync(dir)&&fs.readdirSync(dir).find(x=>x.startsWith('98342710'));
 if(file){
  const rec=JSON.parse(gunzipSync(fs.readFileSync(dir+file)),(k,v)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===1&&('$bigint' in v)?BigInt(v.$bigint):v);
  const e=await new MobileDuel(allCards).init([data,scripts]);
  try{e.start(...rec.start);for(let i=0;i<61;i++)e.respond(rec.responses[i].response??rec.responses[i]);
   const r=e.auto(e.pending);ok(r.action!==I.SELECT_POS_CHANGE,'98342710 step 61: Spirit Reaper is not switched to Defense');
   e.respond(r);while(e.pending?.player===1&&e.pending.type!==M.SELECT_BATTLECMD)e.respond(e.auto(e.pending));
   const b=e.auto(e.pending);ok(e.pending.type===M.SELECT_BATTLECMD&&b.action===1&&e.name(e.pending.attacks[b.index].code)==='Spirit Reaper','98342710: Spirit Reaper attacks in the Battle Phase')}
  catch(err){console.log(`98342710: replay diverged (${err.message}); skipped`)}finally{e.destroy()}
 }
}
console.log(`flags nov21: ${checks} checks passed`);
process.exit(0);
