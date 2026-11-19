// Behaviour flags of 2026-11-19 (build 0.2.38). Stubbed boards always run; the flagged replays are checked too when the
// review folder is present.
// 10713cd6: Soul of Purity and Light hit a face-up Prickle Fairy (turns the attacker to Defense) and left a 2400 Granmarg.
// 42d71747: three attacks into a 700 DEF Cat's Ear Tribe (the attacker's original ATK becomes 200) cost 1500 LP.
// 9e847c50: two Legendary Fishermen under A Legendary Ocean cannot be attacked, so they block nothing; the forecast
//           counted them as walls, a second Fisherman was summoned and 5600 came in directly.
// 9f096bea: a Set Luster Dragon (1900) was flipped into Attack Position as 1300 ATK (Mirror Stats, relic) beside 1700 ATK.
// a0309e60: Serket was Tribute Summoned for "lethal" with no Temple of the Kings and destroyed itself.
// c1e19ce1: on turn 2 against a piercing 2800 Gearfried, Amazoness Paladin was summoned (1000 damage) over Amazoness Swords
//           Woman, who sends her battle damage to the opponent. Paladin in Attack Position was right: Set it took 2500.
// d466fd66: Cyber Raider attacked a Set monster under a face-up Continuous Destruction Punch and died, instead of the
//           100 ATK Big Shield Gardna in Attack Position.
import fs from 'node:fs';import assert from 'node:assert/strict';import {gunzipSync} from 'node:zlib';import {fileURLToPath} from 'node:url';
import {MobileDuel,M,R,I,B,L} from './web/duel.js';
import {smartContext} from './web/smart_policy.js';
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^\uFEFF/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json'),id=n=>{const c=meta.cards.find(c=>c.name===n);assert(c,n);return c.id};
let checks=0;const ok=(value,why)=>{assert(value,why);checks++};

// Stubbed boards: the CPU is seat 1.
const card=(name,location,controller,sequence,position=1,extra={})=>({code:id(name),attack:data[id(name)]?.attack??0,defense:data[id(name)]?.defense??0,position,controller,location,sequence,type:data[id(name)]?.type||0,...extra});
const filler=p=>Array.from({length:20},(_,i)=>card('Battle Ox',L.DECK,p,i,10));
const slots=(list,n)=>{const out=Array(n).fill(null);for(const c of list)out[c.sequence]=c;return out};
function duel(zones,extra={}){
 const e=new MobileDuel(meta.cards);
 Object.assign(e,{data,lp:[8000,8000],turn:4,player:1,phase:8,events:[],visuals:[],peak:{},pendingSummons:[],activeChain:[],battleProtected:[false,false],aiModifiers:{}},extra);
 for(const p of [0,1]){zones[p]={[L.DECK]:filler(p),...zones[p]};zones[p][L.MZONE]=slots(zones[p][L.MZONE]||[],5);zones[p][L.SZONE]=slots(zones[p][L.SZONE]||[],6);}
 e.query=(side,loc)=>zones[side]?.[loc]||[];e.core={duelQueryCount:(_,side,loc)=>(zones[side]?.[loc]||[]).length};
 return e;
}
const battle=attacks=>({type:M.SELECT_BATTLECMD,player:1,attacks});

// 1. Prickle Fairy: still a legal target, but ranked below an open Attack Position monster.
{
 const soul=card('Soul of Purity and Light',L.MZONE,1,2,1,{attack:2800}),prickle=card('Prickle Fairy',L.MZONE,0,3,4,{defense:2600}),granmarg=card('Granmarg the Rock Monarch',L.MZONE,0,1,1,{attack:2400});
 const s=smartContext(duel({1:{[L.MZONE]:[soul]},0:{[L.MZONE]:[prickle,granmarg]}}),1,L,battle([soul]));
 const p=s.attackScore(soul,prickle,{dmg:0}),g=s.attackScore(soul,granmarg,{dmg:400});
 ok(p>-99999&&p<=g-1000,'10713cd6: Prickle Fairy is scored at least 1000 below Granmarg, and still attackable');
 const quiet=smartContext(duel({1:{[L.MZONE]:[soul]},0:{[L.MZONE]:[{...prickle,is_disabled:true}]}}),1,L,battle([soul]));
 ok(quiet.attackScore(soul,{...prickle,is_disabled:true},{dmg:0})===0,'a negated Prickle Fairy has no penalty');
}

// 2. Cat's Ear Tribe: the attack is judged with 200 ATK plus the attacker's boosts.
{
 const ox=card('Battle Ox',L.MZONE,1,2,1);
 const score=(cat,attacker=ox)=>smartContext(duel({1:{[L.MZONE]:[attacker]},0:{[L.MZONE]:[cat]}}),1,L,battle([attacker])).attackScore(attacker,cat,{dmg:0});
 ok(score(card("Cat's Ear Tribe",L.MZONE,0,3,4,{defense:700}))<=-99999,"42d71747: Battle Ox (200 in battle) does not attack a 700 DEF Cat's Ear Tribe");
 ok(score(card("Cat's Ear Tribe",L.MZONE,0,3,1))<=-99999,"no attack into a 200 ATK Cat's Ear Tribe in Attack Position (200 against 200)");
 ok(score(card("Cat's Ear Tribe",L.MZONE,0,3,4))>-99999,"a 100 DEF Cat's Ear Tribe still falls to 200");
 ok(score(card("Cat's Ear Tribe",L.MZONE,0,3,4,{defense:700}),{...ox,attack:2300})>-99999,'an attacker with +600 battles at 800 and beats 700 DEF');
 ok(score(card("Cat's Ear Tribe",L.MZONE,0,3,4,{defense:700,is_disabled:true}))>-99999,"a negated Cat's Ear Tribe is attacked normally");
}

// 3. The Legendary Fisherman under A Legendary Ocean blocks nothing in the forecast.
{
 const fisher=card('The Legendary Fisherman',L.MZONE,1,2,1,{attack:1700}),ocean=card('A Legendary Ocean',L.SZONE,1,5,1),bewd=card('Blue-Eyes White Dragon',L.MZONE,0,2,1);
 const prompt={type:M.SELECT_IDLECMD,player:1,summons:[],monster_sets:[]};
 const s=smartContext(duel({1:{[L.MZONE]:[fisher,{...fisher,sequence:3}],[L.SZONE]:[ocean]},0:{[L.MZONE]:[bewd]}},{phase:4}),1,L,prompt);
 ok(s.incomingDamage(null)===3000,'9e847c50: two Fishermen under the Ocean let Blue-Eyes attack directly for 3000');
 const hand=card('The Legendary Fisherman',L.HAND,1,0,10);
 ok(s.incomingDamage(hand,true)===3000,'a third Fisherman from the hand blocks nothing either');
 ok(s.incomingDamage(card('Battle Ox',L.HAND,1,0,10),false)===0,'a Set Battle Ox does block');
 const open=smartContext(duel({1:{[L.MZONE]:[fisher]},0:{[L.MZONE]:[bewd]}},{phase:4}),1,L,prompt);
 ok(open.incomingDamage(null)===1300,'without the Ocean the Fisherman is attacked (3000 - 1700)');
}

// 4. A Set monster whose face-up ATK (Mirror Stats here) loses to a visible attacker is not flipped.
{
 const luster=card('Luster Dragon',L.MZONE,1,2,8),swordsman=card('Silent Swordsman LV3',L.MZONE,0,2,1,{attack:1700});
 const prompt={type:M.SELECT_IDLECMD,player:1,pos_changes:[luster],to_bp:true};
 const cursed=smartContext(duel({1:{[L.MZONE]:[luster]},0:{[L.MZONE]:[swordsman]}},{phase:4,aiModifiers:{activeCurses:['mirror_stats'],challengeLevel:0}}),1,L,prompt);
 ok(cursed.flipUseful('Luster Dragon',luster)===false,'9f096bea: Luster Dragon (1600 face-up under Mirror Stats) stays Set beside 1700 ATK');
 const plain=smartContext(duel({1:{[L.MZONE]:[luster]},0:{[L.MZONE]:[swordsman]}},{phase:4}),1,L,prompt);
 ok(plain.flipUseful('Luster Dragon',luster)===null,'without the curse its 1900 ATK is unchanged and the flip rule says nothing');
 const weak=card('Mystical Elf',L.MZONE,0,3,1);
 const target=smartContext(duel({1:{[L.MZONE]:[luster]},0:{[L.MZONE]:[swordsman,weak]}},{phase:4,aiModifiers:{activeCurses:['mirror_stats'],challengeLevel:0}}),1,L,prompt);
 ok(target.flipUseful('Luster Dragon',luster)===null,'with an 800 ATK target it can still beat, the flip stays open');
}

// 5. Serket without a face-up Temple of the Kings never counts as an attacker.
{
 const serket=card('Mystical Beast of Serket',L.HAND,1,0,10),temple=card('Temple of the Kings',L.SZONE,1,1,1);
 ok(smartContext(duel({}),1,L,{type:M.SELECT_IDLECMD,player:1}).attackAllowed(serket,true)===false,'a0309e60: Serket cannot attack without the Temple');
 ok(smartContext(duel({1:{[L.SZONE]:[temple]}}),1,L,{type:M.SELECT_IDLECMD,player:1}).attackAllowed(serket,true)===true,'with a face-up Temple it can');
 ok(smartContext(duel({1:{[L.SZONE]:[{...temple,position:10}]}}),1,L,{type:M.SELECT_IDLECMD,player:1}).attackAllowed(serket,true)===false,'a Set Temple does not keep Serket');
}

// 6. Amazoness Swords Woman against an attacker nothing in hand can match.
{
 const gearfried=card('Gearfried the Iron Knight',L.MZONE,0,2,1,{attack:2800}),sw=card('Amazoness Swords Woman',L.HAND,1,1,10),paladin=card('Amazoness Paladin',L.HAND,1,0,10);
 const prompt={type:M.SELECT_IDLECMD,player:1,summons:[paladin,sw],monster_sets:[paladin,sw],to_bp:true};
 const s=smartContext(duel({1:{[L.HAND]:[paladin,sw]},0:{[L.MZONE]:[gearfried]}},{phase:4,turn:2}),1,L,prompt);
 ok(s.incomingDamage(sw,true)===0&&s.incomingDamage(sw,false)===0,'c1e19ce1: Swords Woman takes no battle damage herself');
 ok(s.summonScore(sw)>s.summonScore(paladin)&&s.summonUtility(sw)&&s.preferSet(sw)===false,'she is the summon to show against 2800');
 const bigger={...prompt,summons:[paladin,sw,card('Blue-Eyes White Dragon',L.HAND,1,2,10)]};
 const s2=smartContext(duel({1:{[L.HAND]:[paladin,sw]},0:{[L.MZONE]:[gearfried]}},{phase:4,turn:2}),1,L,bigger);
 ok(s2.summonScore(sw)===0,'with a summon that matches the attacker, no Swords Woman bonus');
}

// 7. Continuous Destruction Punch makes an unknown Set monster a gamble.
{
 const raider=card('Cyber Raider',L.MZONE,1,2,1),set=card('Prickle Fairy',L.MZONE,0,3,8),gardna=card('Big Shield Gardna',L.MZONE,0,2,1),punch=card('Continuous Destruction Punch',L.SZONE,0,1,1);
 const s=smartContext(duel({1:{[L.MZONE]:[raider]},0:{[L.MZONE]:[set,gardna],[L.SZONE]:[punch]}}),1,L,battle([raider]));
 ok(s.attackScore(raider,set,{dmg:0})<=-1500&&s.attackScore(raider,gardna,{dmg:1300})===0,'d466fd66: under Continuous Destruction Punch the Set monster ranks 1500 lower');
 const free=smartContext(duel({1:{[L.MZONE]:[raider]},0:{[L.MZONE]:[set,gardna]}}),1,L,battle([raider]));
 ok(free.attackScore(raider,set,{dmg:0})===0,'without the Trap no penalty');
 const known=duel({1:{[L.MZONE]:[raider]},0:{[L.MZONE]:[set,gardna],[L.SZONE]:[punch]}});known.knownFieldCard=(side,c)=>c.sequence===3?id('Giant Soldier of Stone'):0;
 ok(smartContext(known,1,L,battle([raider])).attackScore(raider,set,{dmg:0})<=-99999,'a remembered 2000 DEF Set monster is not attacked by 1400 ATK under the Trap');
}

// 8. The flagged replays, when the review folder is present.
{
 const dir='D:/Codex Exports/Replay exports/2026-11-19-review/replays/';
 if(fs.existsSync(dir)){
  const scripts=json('android/web/scripts.json'),files=fs.readdirSync(dir);
  const at=async(prefix,step,check)=>{const file=files.find(x=>x.startsWith(prefix));if(!file)return;
   const rec=JSON.parse(gunzipSync(fs.readFileSync(dir+file)),(k,v)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===1&&('$bigint' in v)?BigInt(v.$bigint):v);
   const e=await new MobileDuel([...meta.cards,...(meta.tokenCards||[])]).init([data,scripts]);
   try{e.start(...rec.start);for(let i=0;i<step;i++)e.respond(rec.responses[i].response??rec.responses[i]);check(e,e.pending,e.auto(e.pending))}finally{e.destroy()}};
  const pick=(e,m,r)=>e.name(m.selects[r.indicies[0]].code);
  await at('10713cd6',99,(e,m,r)=>ok(pick(e,m,r)==='Granmarg the Rock Monarch','10713cd6 step 99: Soul of Purity and Light attacks Granmarg, not Prickle Fairy'));
  await at('42d71747',37,(e,m,r)=>ok(r.action!==B.SELECT_BATTLE,"42d71747 step 37: no more attacks into Cat's Ear Tribe"));
  await at('9e847c50',38,(e,m,r)=>ok(!(r.action===I.SELECT_SUMMON&&e.name(m.summons[r.index].code)==='The Legendary Fisherman'),'9e847c50 step 38: no second Fisherman that blocks nothing'));
  await at('9f096bea',21,(e,m,r)=>ok(r.action!==I.SELECT_POS_CHANGE,'9f096bea step 21: the Set Luster Dragon is not flipped to 1300 ATK'));
  await at('a0309e60',149,(e,m,r)=>ok(r.action!==I.SELECT_SUMMON,'a0309e60 step 149: Serket is not Normal Summoned without the Temple'));
  await at('c1e19ce1',8,(e,m,r)=>ok(r.action===I.SELECT_SUMMON&&e.name(m.summons[r.index].code)==='Amazoness Swords Woman','c1e19ce1 step 8: Amazoness Swords Woman is summoned'));
  await at('d466fd66',22,(e,m,r)=>ok(pick(e,m,r)==='Big Shield Gardna','d466fd66 step 22: Cyber Raider attacks Big Shield Gardna, not the Set monster'));
 }
}
console.log(`flags nov19: ${checks} checks passed`);
