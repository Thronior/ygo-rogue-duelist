// Behaviour flags of 2026-11-18 (after v0.2.37).
// 5a313fbb: in a Tag Duel, Dragon Lord's Decree was never offered to the second duelist. The relic's summon procedure was put
// on the player's cards once, when the script loaded, and the core keeps the partner's Deck and hand aside until their turn.
// approved_relic_effects.each_card now runs those loops again at every Draw Phase (Decree, Black Chaos Rite, Shining, Dragon
// Blood Fusion, Guardian's Call, Soul Fusion, Fusion Time).
// 6647ca22: the CPU Normal Summoned Frontier Wiseman beside its own Beautiful Headhuntress with two Legendary Swords, and
// Wiseman destroyed both. It now holds Wiseman back while that would cost it more of its own Spells than the opponent's,
// and does not equip a Spell to a Warrior a face-up Wiseman guards.
import fs from 'node:fs';import assert from 'node:assert/strict';import {gunzipSync} from 'node:zlib';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {MobileDuel,M,R,I,B,L} from './web/duel.js';
import {smartContext} from './web/smart_policy.js';
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^\uFEFF/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json'),scripts=json('android/web/scripts.json'),id=n=>{const c=meta.cards.find(c=>c.name===n);assert(c,n);return c.id};
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const relicScript=artifacts=>execFileSync(python,['-B','-c',"import sys,json;sys.path.insert(0,'.');import passives;print(passives.script(json.loads(sys.argv[1]),telemetry=False))",JSON.stringify({curses:[],artifacts,cursed_artifacts:[],challenge_level:0})],{cwd:root,encoding:'utf8',env:{...process.env,PYTHONUTF8:'1'}});
let checks=0;const ok=(value,why)=>{assert(value,why);checks++},same=(a,b,why)=>{assert.deepEqual(a,b,why);checks++};
const fill=(code,n=40)=>Array(n).fill(code);
const toEnd={type:R.SELECT_IDLECMD,action:I.TO_EP,index:null},noBattle={type:R.SELECT_BATTLECMD,action:B.TO_EP,index:null};

// 1. Tag: the second duelist's Level 7+ Dragon gets Dragon Lord's Decree's summon, once per card.
{
 const BEWD=id('Blue-Eyes White Dragon'),KOUMORI=id('Koumori Dragon'),WABOKU=id('Waboku'),OX=id('Battle Ox');
 const script=relicScript(['dragon_lords_decree','fusion_time','soul_fusion','guardians_call']);
 // The core draws from the end of the list (no shuffle here): two Blue-Eyes among the second duelist's first cards.
 const second=[...fill(KOUMORI,35),KOUMORI,BEWD,KOUMORI,KOUMORI,BEWD];
 const teams=[[{main:fill(WABOKU),extra:[]},{main:second,extra:[id('Flame Swordsman')]}],[{main:fill(OX),extra:[]},{main:fill(OX),extra:[]}]];
 const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,scripts]);
 try{
  let s=e.start(fill(WABOKU),fill(OX),8000,8000,5,11,[],[],script,5,teams);
  const seen=[];
  for(let i=0;i<3000&&!s.finished&&e.turn<=3;i++){const m=e.pending;if(!m)break;let answer=null;
   if(m.player===0){
    if(m.type===M.SELECT_IDLECMD){if(e.turn===1||e.turn===3)seen.push({turn:e.turn,offers:(m.special_summons||[]).filter(c=>c.code===BEWD).length,hand:e.query(0,L.HAND).filter(c=>c?.code===BEWD).length});answer=toEnd}
    else if(m.type===M.SELECT_BATTLECMD)answer=noBattle;
   }
   s=e.respond(answer||e.auto());
  }
  same(e.errors||[],[],'no script errors in Tag with the per-card relics');
  const first=seen.find(x=>x.turn===1),third=seen.find(x=>x.turn===3);
  ok(first&&first.hand===0,'turn 1 is the first duelist, who holds no Blue-Eyes');
  ok(third&&third.hand>=1,'turn 3 is the second duelist, holding Blue-Eyes');
  same(third.offers,third.hand,'5a313fbb: the second duelist is offered Dragon Lord\'s Decree, once for each Blue-Eyes in hand');
 }finally{e.destroy()}
}

// 2. Solo: the loop that runs again each Draw Phase never adds a second procedure to the same card.
{
 const BEWD=id('Blue-Eyes White Dragon'),KOUMORI=id('Koumori Dragon'),OX=id('Battle Ox');
 const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,scripts]);
 try{
  let s=e.start([...fill(KOUMORI,39),BEWD],fill(OX),8000,8000,5,3,[],[],relicScript(['dragon_lords_decree']));
  const seen=[];
  for(let i=0;i<3000&&!s.finished&&e.turn<=3;i++){const m=e.pending;if(!m)break;let answer=null;
   if(m.player===0){if(m.type===M.SELECT_IDLECMD){seen.push({turn:e.turn,offers:(m.special_summons||[]).filter(c=>c.code===BEWD).length,hand:e.query(0,L.HAND).filter(c=>c?.code===BEWD).length});answer=toEnd}else if(m.type===M.SELECT_BATTLECMD)answer=noBattle;}
   s=e.respond(answer||e.auto());
  }
  same(e.errors||[],[],'no script errors');
  ok(seen.some(x=>x.turn>=3&&x.hand>=1),'Blue-Eyes is still in hand after two Draw Phases (turn 3)');
  same(seen.filter(x=>x.offers!==x.hand),[],'every turn, one Decree summon per Blue-Eyes in hand, never a second one');
 }finally{e.destroy()}
}

// 3. Frontier Wiseman, stubbed boards (the CPU is seat 1).
{
 const card=(name,location,controller,sequence,position=1,extra={})=>({code:id(name),attack:data[id(name)]?.attack??0,defense:data[id(name)]?.defense??0,position,controller,location,sequence,type:data[id(name)]?.type||0,...extra});
 const filler=p=>Array.from({length:20},(_,i)=>card('Battle Ox',L.DECK,p,i,10));
 const slots=list=>{const out=Array(5).fill(null);for(const c of list)out[c.sequence]=c;return out};
 function duel(zones){
  const e=new MobileDuel(meta.cards);
  Object.assign(e,{data,lp:[8000,8000],turn:4,player:1,phase:4,events:[],visuals:[],peak:{},pendingSummons:[],activeChain:[],battleProtected:[false,false],aiModifiers:{}});
  for(const p of [0,1]){zones[p]={[L.DECK]:filler(p),...zones[p]};for(const loc of [L.MZONE,L.SZONE])zones[p][loc]=slots(zones[p][loc]||[]);}
  e.query=(side,loc)=>zones[side]?.[loc]||[];e.core={duelQueryCount:(_,side,loc)=>(zones[side]?.[loc]||[]).length};
  return e;
 }
 const at=c=>({controller:c.controller,location:c.location,sequence:c.sequence});
 const hunt=card('Beautiful Headhuntress',L.MZONE,1,3,1,{attack:2200});
 const sword=(p,seq,on)=>card('Legendary Sword',L.SZONE,p,seq,1,{equip_card:at(on)});
 const wiseman=card('Frontier Wiseman',L.HAND,1,0,10),knight=card("Queen's Knight",L.HAND,1,1,10);
 const prompt=extra=>({type:M.SELECT_IDLECMD,player:1,summons:[wiseman,knight],special_summons:[],pos_changes:[],monster_sets:[wiseman,knight],spell_sets:[],activates:[],to_bp:true,to_ep:true,...extra});
 const summoned=zones=>{const r=duel(zones).auto(prompt());return r.action===I.SELECT_SUMMON?['Frontier Wiseman',"Queen's Knight"][r.index]:r.action===I.SELECT_MONSTER_SET?'set':'other'};
 const swordsOwn=()=>({1:{[L.MZONE]:[hunt],[L.SZONE]:[sword(1,1,hunt),sword(1,2,hunt)],[L.HAND]:[wiseman,knight]},0:{[L.MZONE]:[card('Y-Dragon Head',L.MZONE,0,2,8)]}});
 ok(summoned(swordsOwn())!=='Frontier Wiseman','6647ca22: no Frontier Wiseman summon beside our own Legendary Swords');
 const e=duel(swordsOwn()),s=smartContext(e,1,L,prompt());
 same(s.summonScore(wiseman),-1,'Wiseman scores -1 while it would destroy our Equip Spells');
 const plain=duel({1:{[L.MZONE]:[card('Beautiful Headhuntress',L.MZONE,1,3)],[L.HAND]:[wiseman,knight]},0:{}});
 ok(smartContext(plain,1,L,prompt()).summonScore(wiseman)>=0,'without Spells on our Warriors, Wiseman is an ordinary summon');
 // Their Equip Spell on our Warrior (Wiseman's reason to exist) outweighs nothing of ours.
 const theirs=duel({1:{[L.MZONE]:[hunt],[L.HAND]:[wiseman,knight]},0:{[L.SZONE]:[sword(0,1,hunt)]}});
 ok(smartContext(theirs,1,L,prompt()).summonScore(wiseman)>=0,'their Spell on our Warrior: Wiseman may come out');
 // With a face-up Wiseman, a Spell equipped to our Warrior would be negated and destroyed.
 const equipChoice=withWiseman=>{const blade=card('Legendary Sword',L.HAND,1,0,10);
  const e=duel({1:{[L.MZONE]:[card('Beautiful Headhuntress',L.MZONE,1,3),card(withWiseman?'Frontier Wiseman':'Battle Ox',L.MZONE,1,2)],[L.HAND]:[blade]},0:{[L.MZONE]:[card('Y-Dragon Head',L.MZONE,0,2)]}});
  const r=e.auto(prompt({summons:[],monster_sets:[],activates:[blade]}));return r.action===I.SELECT_ACTIVATE};
 ok(equipChoice(false),'control: Legendary Sword goes on Beautiful Headhuntress');
 ok(!equipChoice(true),'no Legendary Sword on a Warrior that a face-up Frontier Wiseman guards');
}

// 4. The flagged replay, when the review folder is present: turn 4, the CPU summons Queen's Knight instead.
{
 const dir='D:/Codex Exports/Replay exports/2026-11-18-review/replays/';
 const file=fs.existsSync(dir)&&fs.readdirSync(dir).find(x=>x.startsWith('6647ca22'));
 if(file){
  const rec=JSON.parse(gunzipSync(fs.readFileSync(dir+file)));
  const e=await new MobileDuel([...meta.cards,...(meta.tokenCards||[])]).init([data,scripts]);
  try{e.start(...rec.start);for(let i=0;i<21;i++)e.respond(rec.responses[i].response??rec.responses[i]);
   const m=e.pending,r=e.auto(m);
   ok(!(r.action===I.SELECT_SUMMON&&e.name(m.summons[r.index].code)==='Frontier Wiseman'),'6647ca22 step 21: Frontier Wiseman is not Normal Summoned beside two Legendary Swords');
  }finally{e.destroy()}
 }
}
console.log(`flags nov18: ${checks} checks passed`);
