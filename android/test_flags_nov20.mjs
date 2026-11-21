// Behaviour flags and Discord relic reports of 2026-11-20 (builds 0.2.34-0.2.39). Stubbed boards and relic duels always
// run; the flagged replays are checked too when the review folder is present.
// 12822091: White Magical Hat (1000) was summoned against a piercing 1800 Tiger Axe beside a Man-Eater Bug it could Set.
// 417e226f: Giant Turtle (1400) hit Physical Double's 1400 Mirage Token on the attack replay; both died, the Token was
//           gone at the End Phase anyway.
// 78824ddf: Enchanted Javelin was spent on a 1300 ATK attack while a 2000 ATK Kycoo could still attack.
// 7e51fc19: Rescue Cat summoned two Beasts on the CPU's opening turn (it started), with no Battle Phase to use them.
// a8084328: Magic Cylinder was spent on an attack under 1000 ATK beside a 3000+ ATK attacker (replay diverges: rainbow card).
// d09fb0ca: Zaborg was Tribute Summoned against an empty field and its effect destroyed itself.
// Discord: Magician's Bond never listed Dark Magician itself; Field of Attraction ignored Name Changer's "Magnet Warrior".
import fs from 'node:fs';import assert from 'node:assert/strict';import {gunzipSync} from 'node:zlib';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {MobileDuel,M,R,I,B,L} from './web/duel.js';
import {smartContext} from './web/smart_policy.js';
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^\uFEFF/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json'),scripts=json('android/web/scripts.json');
const allCards=[...meta.cards,...(meta.tokenCards||[])],id=n=>{const c=allCards.find(c=>c.name===n);assert(c,n);return c.id};
let checks=0;const ok=(value,why)=>{assert(value,why);checks++};

// Stubbed boards: the CPU is seat 1.
const card=(name,location,controller,sequence,position=1,extra={})=>({code:id(name),attack:data[id(name)]?.attack??0,defense:data[id(name)]?.defense??0,position,controller,location,sequence,type:data[id(name)]?.type||0,...extra});
const filler=(p,name='Battle Ox')=>Array.from({length:20},(_,i)=>card(name,L.DECK,p,i,10));
const slots=(list,n)=>{const out=Array(n).fill(null);for(const c of list)out[c.sequence]=c;return out};
function duel(zones,extra={}){
 const e=new MobileDuel(allCards);
 Object.assign(e,{data,lp:[8000,8000],turn:4,player:1,phase:8,events:[],visuals:[],peak:{},pendingSummons:[],activeChain:[],battleProtected:[false,false],aiModifiers:{}},extra);
 for(const p of [0,1]){zones[p]={[L.DECK]:filler(p),...zones[p]};zones[p][L.MZONE]=slots(zones[p][L.MZONE]||[],5);zones[p][L.SZONE]=slots(zones[p][L.SZONE]||[],6);}
 e.query=(side,loc)=>zones[side]?.[loc]||[];e.core={duelQueryCount:(_,side,loc)=>(zones[side]?.[loc]||[]).length};
 return e;
}
const battle=attacks=>({type:M.SELECT_BATTLECMD,player:1,attacks});

// 1. A Token is never traded for at equal ATK.
{
 const turtle=card('Giant Turtle Who Feeds on Flames',L.MZONE,1,2,1),token=card('Mirage Token',L.MZONE,0,2,1,{attack:1400,defense:1800});
 const s=smartContext(duel({1:{[L.MZONE]:[turtle]},0:{[L.MZONE]:[token]}}),1,L,battle([turtle]));
 ok(s.attackScore(turtle,token,{dmg:0})<=-99999,'417e226f: no 1400 into 1400 trade with a Mirage Token');
 const strong={...turtle,attack:1900};
 ok(smartContext(duel({1:{[L.MZONE]:[strong]},0:{[L.MZONE]:[token]}}),1,L,battle([strong])).attackScore(strong,token,{dmg:500})>-99999,'a stronger attacker still destroys the Token');
 const twin=card('Giant Turtle Who Feeds on Flames',L.MZONE,0,2,1);
 ok(smartContext(duel({1:{[L.MZONE]:[turtle]},0:{[L.MZONE]:[twin]}}),1,L,battle([turtle])).attackScore(turtle,twin,{dmg:0})>-99999,'an equal trade with a real monster is still allowed');
}

// 2. Zaborg needs an opposing monster to destroy.
{
 const zaborg=card('Zaborg the Thunder Monarch',L.HAND,1,0,10),harp=card('Spirit of the Harp',L.MZONE,1,2,1);
 const prompt={type:M.SELECT_IDLECMD,player:1,summons:[zaborg],monster_sets:[zaborg],to_bp:true};
 ok(smartContext(duel({1:{[L.HAND]:[zaborg],[L.MZONE]:[harp]}},{phase:4}),1,L,prompt).summonScore(zaborg)<0,'d09fb0ca: no Zaborg summon against an empty field');
 ok(smartContext(duel({1:{[L.HAND]:[zaborg],[L.MZONE]:[harp]},0:{[L.MZONE]:[card('Battle Ox',L.MZONE,0,2,1)]}},{phase:4}),1,L,prompt).summonScore(zaborg)>=0,'with a monster to destroy it may be summoned');
}

// 3. Rescue Cat's Beasts need a Battle Phase this turn.
{
 const cat=card('Rescue Cat',L.HAND,1,0,10),deck=filler(1,'Hyena');
 const prompt={type:M.SELECT_IDLECMD,player:1,summons:[cat],monster_sets:[cat],to_bp:true};
 const at=firstPlayer=>smartContext(duel({1:{[L.HAND]:[cat],[L.DECK]:deck}},{phase:4,turn:2,aiModifiers:{firstPlayer}}),1,L,prompt).summonScore(cat);
 ok(at(1)<0,'7e51fc19: on the CPU\'s opening turn (it started) Rescue Cat is not used');
 ok(at(0)>0,'on turn 2 after the player started, two Beasts attack an empty field');
}

// 4. Enchanted Javelin waits for a bigger attacker unless this hit is lethal.
{
 const giant=card('Giant Soldier of Stone',L.MZONE,0,2,1),kycoo=card('Kycoo the Ghost Destroyer',L.MZONE,0,1,1),elf=card('Gemini Elf',L.MZONE,0,3,1,{attack:950});
 const bird=card('Sonic Bird',L.MZONE,1,2,8),javelin=card('Enchanted Javelin',L.SZONE,1,2,10);
 const at=(lp,others=[kycoo,elf])=>smartContext(duel({1:{[L.MZONE]:[bird],[L.SZONE]:[javelin]},0:{[L.MZONE]:[giant,...others]}},{player:0,lp:[8000,lp],attackCard:giant,attackTarget:bird}),1,L,{type:M.SELECT_CHAIN,player:1,selects:[javelin]}).activation(javelin,true);
 ok(at(7400)<0,'78824ddf: Javelin is kept for Kycoo (2000) while Giant Soldier (1300) attacks a Set monster');
 ok(at(7400,[elf])>0,'with no bigger attacker left it gains 1300 now');
}

// 5. Magic Cylinder waits for a much bigger attacker when this attack costs nothing.
{
 const imp=card('Feral Imp',L.MZONE,0,1,1,{attack:900}),bewd=card('Blue-Eyes White Dragon',L.MZONE,0,2,1,{attack:3200}),cylinder=card('Magic Cylinder',L.SZONE,1,2,10);
 const at=(others,lp=8000)=>smartContext(duel({1:{[L.SZONE]:[cylinder]},0:{[L.MZONE]:[imp,...others]}},{player:0,lp:[8000,lp],attackCard:imp,attackTarget:null}),1,L,{type:M.SELECT_CHAIN,player:1,selects:[cylinder]}).activation(cylinder,true);
 ok(at([bewd])<0,'a8084328: Cylinder is kept for the 3200 Blue-Eyes, not spent on a 900 direct attack');
 ok(at([])>0,'with no bigger attacker it reflects the 900');
 ok(at([bewd],900)>0,'a lethal 900 is still stopped');
}

// 6. Relic duels: Magician's Bond adds Dark Magician itself; Field of Attraction reads Name Changer's "Magnet Warrior".
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const relicScript=run=>execFileSync(python,['-B','-c',"import sys,json;sys.path.insert(0,'.');import passives;print(passives.script(json.loads(sys.argv[1]),telemetry=False))",JSON.stringify({curses:[],cursed_artifacts:[],challenge_level:0,...run})],{cwd:root,encoding:'utf8',maxBuffer:1<<26});
// Normal Summons `summon` (the last card of `deck`, so in the opening hand) and records the relic's yes/no and card offer.
async function summonWith(run,deck,summon){
 const e=await new MobileDuel(allCards).init([data,scripts]);let asked=false,offered=null,summoned=false;
 try{let s=e.start(deck,Array(40).fill(id('Mountain')),8000,8000,5,7,[],[],relicScript(run));
  for(let i=0;i<2000&&!s.finished&&e.turn<=1;i++){const m=e.pending;if(!m)break;let a=null;
   if(m.player===0){
    if(m.type===M.SELECT_IDLECMD){const at=(m.summons||[]).findIndex(c=>c.code===summon);a=!summoned&&at>=0?(summoned=true,{type:R.SELECT_IDLECMD,action:I.SELECT_SUMMON,index:at}):{type:R.SELECT_IDLECMD,action:I.TO_EP,index:null}}
    else if(m.type===M.SELECT_YESNO||m.type===M.SELECT_EFFECTYN){asked=true;a={type:m.type===M.SELECT_YESNO?R.SELECT_YESNO:R.SELECT_EFFECTYN,yes:true}}
    else if(m.type===M.SELECT_CARD&&summoned&&!offered){offered=m.selects.map(c=>c.code);a={type:R.SELECT_CARD,indicies:[0]}}
    else if(m.type===M.SELECT_BATTLECMD)a={type:R.SELECT_BATTLECMD,action:B.TO_EP,index:null};}
   s=e.respond(a||e.auto());}
  assert.deepEqual(e.errors||[],[],'no script errors');
  return {asked,offered,hand:e.query(0,L.HAND).filter(Boolean).map(c=>c.code)};
 }finally{e.destroy()}
}
{
 const DM=id('Dark Magician'),SKILLED=id('Skilled Dark Magician'),OX=id('Battle Ox'),ROCK=id('Giant Soldier of Stone');
 const rest=Array.from({length:35},(_,n)=>[DM,OX][n%2]);
 const bond=await summonWith({artifacts:['magicians_bond']},[...rest,OX,OX,OX,OX,SKILLED],SKILLED);
 ok(bond.asked&&bond.offered?.length&&bond.offered.every(c=>c===DM),'24e22064 / Discord: Skilled Dark Magician sets off Magician\'s Bond with only Dark Magicians in the Deck');
 ok(bond.hand.includes(DM),'the Dark Magician is added to the hand');
 const none=await summonWith({artifacts:['magicians_bond']},[...Array(35).fill(OX),OX,OX,OX,OX,SKILLED],SKILLED);
 ok(!none.asked,'with no Dark Magician card in the Deck nothing is asked');

 const ALPHA=id('Alpha The Magnet Warrior'),BETA=id('Beta The Magnet Warrior'),PANTHER=id('Panther Warrior'),VALK=id('Valkyrion the Magna Warrior');
 const named=await summonWith({artifacts:['field_of_attraction','name_changer'],name_changes:[0x2066]},[...Array.from({length:35},(_,n)=>[ROCK,OX][n%2]),ROCK,ROCK,ROCK,ROCK,OX],OX);
 ok(named.offered?.length&&named.offered.every(c=>c===ROCK),'Discord: with Name Changer on "Magnet Warrior", Battle Ox sets off Field of Attraction and offers a monster with another name');
 const plain=await summonWith({artifacts:['field_of_attraction']},[...Array.from({length:35},(_,n)=>[ROCK,OX][n%2]),ROCK,ROCK,ROCK,ROCK,OX],OX);
 ok(!plain.offered,'without Name Changer a Battle Ox is no Magnet Warrior');
 const real=await summonWith({artifacts:['field_of_attraction']},[...Array.from({length:35},(_,n)=>[BETA,PANTHER,VALK,ROCK][n%4]),ROCK,ROCK,ROCK,ROCK,ALPHA],ALPHA);
 ok(real.offered?.length&&real.offered.every(c=>c===BETA),'Alpha still offers only Beta: never Valkyrion or Panther Warrior (printed 0x2066)');
}
// Immortal Dark Magic's "add 1 card that mentions Dark Magician" stays as written; Twin Eyes reads Name Changer's "Blue-Eyes".
{
 const src=fs.readFileSync(root+'approved_relic_effects.py','utf8');
 ok(src.includes('local function search(c) return c:IsCode({mentions}) and c:IsAbleToHand() end'),'Immortal Dark Magic still adds only cards that mention Dark Magician');
 ok(src.includes('c:IsSetCard(0xdd) and not c:IsOriginalSetCard(0xdd)'),'Twin Eyes counts Name Changer\'s "Blue-Eyes"');
 const text=json('android/web/content.json');
 ok(JSON.stringify(text).includes('add 1 \\"Dark Magician\\" monster or card that mentions it in its card text'),"Magician's Bond's new text reached the bundle");
}

// 7. The flagged replays, when the review folder is present.
{
 const dir='D:/Codex Exports/Replay exports/2026-11-20-review/replays/';
 if(fs.existsSync(dir)){
  const files=fs.readdirSync(dir);
  const at=async(prefix,step,check)=>{const file=files.find(x=>x.startsWith(prefix));if(!file)return;
   const rec=JSON.parse(gunzipSync(fs.readFileSync(dir+file)),(k,v)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===1&&('$bigint' in v)?BigInt(v.$bigint):v);
   const e=await new MobileDuel(allCards).init([data,scripts]);
   try{e.start(...rec.start);for(let i=0;i<step;i++)e.respond(rec.responses[i].response??rec.responses[i]);check(e,e.pending,e.auto(e.pending))}finally{e.destroy()}};
  await at('12822091',59,(e,m,r)=>ok(r.action===I.SELECT_MONSTER_SET&&e.name(m.monster_sets[r.index].code)==='Man-Eater Bug','12822091 step 59: Man-Eater Bug is Set, White Magical Hat stays in hand'));
  await at('417e226f',38,(e,m,r)=>ok(r.indicies===null,'417e226f step 38: the replayed attack is cancelled, not aimed at the Mirage Token'));
  await at('78824ddf',91,(e,m,r)=>ok(r.index===null,'78824ddf step 91: Enchanted Javelin waits for Kycoo'));
  await at('7e51fc19',0,(e,m,r)=>ok(!(r.action===I.SELECT_SUMMON&&e.name(m.summons[r.index].code)==='Rescue Cat'),'7e51fc19 step 0: Rescue Cat is not summoned on the opening turn'));
  await at('d09fb0ca',22,(e,m,r)=>ok(!(r.action===I.SELECT_SUMMON&&e.name(m.summons[r.index].code)==='Zaborg the Thunder Monarch'),'d09fb0ca step 22: no Zaborg against an empty field'));
 }
}
console.log(`flags nov20: ${checks} checks passed`);
process.exit(0);
