// Behaviour flags of 2026-11-25 (review 1, build 0.2.44) and one Discord report. Engine duels always run; the flagged
// replays are checked too when the review folder is present.
// 193a843a, 7c1c03de, 86cdd987: Tribe-Infecting Virus against Genetic Override monsters (every Type) announced all Types at
//           once; the core refused it and asked again forever.
// 98ae2db9: Book of Moon on the player's monster right after the CPU Set its only monster (nothing could attack it).
// d8c581cf: Archfiend General Normal Summoned with no Pandemonium: it destroyed itself.
// e52ead1d: Brain Control (800 LP) on a monster equipped with Rod of Silence - Kay'est, which negates Spells that target it.
// fad7a32f: Magic Drain on Contract with the Abyss: the CPU kept a dead Hamburger Recipe and lost The Masked Beast's Ritual Summon.
// Discord: Hyper Hammerhead attacked a Defense Position monster whose DEF reflected a third of the CPU's LP or more.
import fs from 'node:fs';import assert from 'node:assert/strict';import {gunzipSync} from 'node:zlib';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {MobileDuel,M,I,L} from './web/duel.js';
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^\uFEFF/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json'),scripts=json('android/web/scripts.json');
const allCards=[...meta.cards,...(meta.tokenCards||[])],id=n=>{const c=allCards.find(c=>c.name===n);assert(c,n);return c.id};
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const relicLua=relics=>execFileSync(python,['-B','-c',`import sys;sys.path.insert(0,'.');import passives;print(passives.script({'artifacts':${JSON.stringify(relics)},'curses':[],'round':1,'character':0,'lp':8000},telemetry=False))`],{cwd:root,encoding:'utf8'});
let checks=0;const ok=(value,why)=>{assert(value,why);checks++};
const duel=await new MobileDuel(allCards).init([data,scripts]);
const add=(n,p,loc,pos,seq=0)=>`Debug.AddCard(${id(n)},${p},${p},LOCATION_${loc},${seq},POS_${pos})\n`;
const field=(body,lp=[8000,8000])=>{let s=`Debug.ReloadFieldBegin(DUEL_MODE_MR1,1)\nDebug.SetPlayerInfo(0,${lp[0]},0,0)\nDebug.SetPlayerInfo(1,${lp[1]},0,0)\n`+body;for(const p of [0,1])for(let i=0;i<10;i++)s+=add('Kuriboh',p,'DECK','FACEDOWN');return s+'Debug.ReloadFieldEnd()\n'};
// The player ends turn 1 at once; the CPU then plays turn 2 with today's policy. Relic scripts load after the field.
function cpuTurn(body,{lp=[8000,8000],lua=''}={}){
 duel.start([],[],lp[0],lp[1],0,7,[],[],field(body,lp)+lua,0);duel.core.startDuel(duel.h);duel.advance();
 const did=[],races=[];const seen=duel.onMessage.bind(duel);let prompts=0;
 duel.onMessage=m=>{if(m.type===M.CHAINING)did.push(['chain',duel.name(m.code),m.controller??m.player]);if([M.SUMMONING,M.SPSUMMONING].includes(m.type))did.push(['summon',duel.name(m.code)]);if(m.type===M.ATTACK)did.push(['attack',duel.name(duel.query(m.card.controller,L.MZONE).find(c=>c&&c.sequence===m.card.sequence)?.code)]);if(m.type===M.MOVE&&m.from?.location===L.MZONE&&m.to?.location===L.GRAVE)did.push(['died',duel.name(m.card)]);return seen(m)};
 try{for(;prompts<200&&duel.pending&&!duel.finished&&duel.turn<3;prompts++){const m=duel.pending;
  if(m.player===0){duel.respond(m.type===M.SELECT_IDLECMD?{type:1,action:7,index:null}:m.type===M.SELECT_CHAIN?{type:8,index:null}:m.type===M.SELECT_BATTLECMD?{type:0,action:3,index:null}:duel.auto());continue}
  const r=duel.auto(m);if(m.type===M.ANNOUNCE_RACE)races.push(...r.races.map(BigInt));duel.respond(r)}}finally{duel.onMessage=seen}
 return {did,races,prompts,turn:duel.turn,chained:n=>did.some(x=>x[0]==='chain'&&x[1]===n&&x[2]!==0)};
}
const single=v=>v>0n&&(v&(v-1n))===0n;

// Tribe-Infecting Virus: one Type, even when every monster of the player has them all (Genetic Override).
{
 const r=cpuTurn(add('Summoned Skull',0,'MZONE','FACEUP_ATTACK',2)+add('Tribe-Infecting Virus',1,'MZONE','FACEUP_ATTACK',2)+add('Kuriboh',1,'HAND','FACEDOWN')+add('Kuriboh',1,'HAND','FACEDOWN'),{lua:relicLua(['genetic_override'])});
 ok(r.chained('Tribe-Infecting Virus'),'Tribe-Infecting Virus is used on the Genetic Override monster');
 ok(r.races.length===1&&single(r.races[0]),'193a843a: it announces exactly one Type (got '+r.races.join(',')+')');
 ok(r.did.some(x=>x[0]==='died'&&x[1]==='Summoned Skull')&&r.turn>=3,'the Type destroys the monster and the duel goes on');
}
// Book of Moon: no target for it when the CPU's only monster was just Set (98ae2db9); with a ready attacker it still opens a kill.
{
 const player=add('Kabazauls',0,'MZONE','FACEUP_ATTACK',1)+add('Blazing Inpachi',0,'MZONE','FACEUP_ATTACK',2)+add('Destroyersaurus',0,'MZONE','FACEUP_ATTACK',3);
 const r=cpuTurn(player+add('Giant Soldier of Stone',1,'HAND','FACEDOWN')+add('Book of Moon',1,'HAND','FACEDOWN'));
 ok(!r.chained('Book of Moon'),'98ae2db9: no Book of Moon on the CPU\'s own turn when nothing of it can attack');
 const ready=cpuTurn(add('Destroyersaurus',0,'MZONE','FACEUP_ATTACK',3)+add('Giant Soldier of Stone',1,'MZONE','FACEUP_ATTACK',2)+add('Book of Moon',1,'HAND','FACEDOWN'));
 ok(ready.chained('Book of Moon'),'with a 1300 ATK attacker ready, Book of Moon still turns the 1100 DEF monster face-down');
}
// Archfiend General is not Normal Summoned without Pandemonium (d8c581cf); Pandemonium from the hand comes first.
{
 const r=cpuTurn(add('Archfiend General',1,'HAND','FACEDOWN')+add('Archfiend Soldier',1,'HAND','FACEDOWN'));
 ok(!r.did.some(x=>x[0]==='summon'&&x[1]==='Archfiend General'),'d8c581cf: Archfiend General stays in hand with no Pandemonium');
 ok(r.did.some(x=>x[0]==='summon'&&x[1]==='Archfiend Soldier'),'Archfiend Soldier is summoned instead');
 const both=cpuTurn(add('Archfiend General',1,'HAND','FACEDOWN')+add('Pandemonium',1,'HAND','FACEDOWN'));
 const order=both.did.filter(x=>x[0]==='chain'||x[0]==='summon').map(x=>x[1]);
 ok(order.indexOf('Pandemonium')>=0&&order.indexOf('Pandemonium')<order.indexOf('Archfiend General')&&!both.did.some(x=>x[0]==='died'&&x[1]==='Archfiend General'),'with Pandemonium in hand: Pandemonium, then Archfiend General ('+order.join(' > ')+')');
}
// Brain Control never targets a monster equipped with Rod of Silence - Kay'est (e52ead1d).
{
 const rod="local v=Debug.AddCard("+id('Maha Vailo')+",0,0,LOCATION_MZONE,2,POS_FACEUP_ATTACK) local r=Debug.AddCard("+id("Rod of Silence - Kay'est")+",0,0,LOCATION_SZONE,1,POS_FACEUP) Debug.PreEquip(r,v)\n";
 const cpu=add('Gilasaurus',1,'MZONE','FACEUP_ATTACK',1)+add('Gilasaurus',1,'MZONE','FACEUP_ATTACK',3)+add('Brain Control',1,'HAND','FACEDOWN');
 const r=cpuTurn(rod+cpu);
 ok(!r.chained('Brain Control'),'e52ead1d: no Brain Control on the monster Rod of Silence guards');
}
// Hyper Hammerhead: no attack into a Defense Position monster whose DEF reflects a third of the CPU's LP or more.
{
 const body=add('Hyper Hammerhead',1,'MZONE','FACEUP_ATTACK',2)+add('Big Shield Gardna',0,'MZONE','FACEUP_DEFENSE',2);
 const low=cpuTurn(body,{lp:[8000,3000]});
 ok(!low.did.some(x=>x[0]==='attack'&&x[1]==='Hyper Hammerhead'),'Discord: at 3000 LP Hyper Hammerhead does not take 1100 reflected damage to bounce Big Shield Gardna');
 const high=cpuTurn(body,{lp:[8000,8000]});
 ok(high.did.some(x=>x[0]==='attack'&&x[1]==='Hyper Hammerhead'),'at 8000 LP the bounce is still worth 1100 LP');
}

// The flagged replays, when the review folder is present.
{
 const dir='D:/Codex Exports/Replay exports/2026-11-25-review-1/replays/';
 if(fs.existsSync(dir)){
  const files=fs.readdirSync(dir);
  const at=async(prefix,step,check)=>{const file=files.find(x=>x.startsWith(prefix));if(!file)return;
   const rec=JSON.parse(gunzipSync(fs.readFileSync(dir+file)),(k,v)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===1&&('$bigint' in v)?BigInt(v.$bigint):v);
   const e=await new MobileDuel(allCards).init([data,scripts]);
   try{e.start(...rec.start);for(let i=0;i<step;i++)e.respond(rec.responses[i].response??rec.responses[i]);check(e,e.pending,e.auto(e.pending))}finally{e.destroy()}};
  for(const [prefix,step] of [['193a843a',7],['7c1c03de',11],['86cdd987',73]])
   await at(prefix,step,(e,m,r)=>{ok(m.type===M.ANNOUNCE_RACE&&r.races.length===1&&single(BigInt(r.races[0])),prefix+': one Type is announced');e.respond(r);ok(e.pending?.type!==M.ANNOUNCE_RACE,prefix+': the core accepts it')});
  await at('98ae2db9',40,(e,m,r)=>ok(!(m.type===M.SELECT_CHAIN&&r.index!=null&&e.name(m.selects[r.index].code)==='Book of Moon'),'98ae2db9 step 40: Book of Moon is kept'));
  await at('d8c581cf',80,(e,m,r)=>ok(!(r.action===I.SELECT_SUMMON&&e.name(m.summons[r.index].code)==='Archfiend General'),'d8c581cf step 80: Archfiend General is not Normal Summoned'));
  await at('e52ead1d',57,(e,m,r)=>ok(!(r.action===I.SELECT_ACTIVATE&&e.name(m.activates[r.index].code)==='Brain Control'),'e52ead1d step 57: Brain Control is not activated'));
  await at('fad7a32f',53,(e,m,r)=>ok(m.type===M.SELECT_OPTION&&e.description(m.options[r.index])&&Number(m.options[r.index])===1213,'fad7a32f step 53: a Spell is discarded to keep Contract with the Abyss'));
 }
}
duel.destroy();
console.log(`PASS flags Nov 25 (${checks} checks): Tribe-Infecting Virus Types, Book of Moon, Archfiend General, Rod of Silence, Hyper Hammerhead, Magic Drain`);
