// Relic trigger feedback, active effect sources, boss deck names and loading tips (2026-11-02).
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
globalThis.matchMedia??=()=>({matches:false,addEventListener(){},removeEventListener(){}});
const {MobileDuel,M,R,I,L}=await import('./web/duel.js');
const {smartContext}=await import('./web/smart_policy.js');
const {changesStats,amountLabel,activeEffectsMarkup}=await import('./web/active-effects.js');
const {LOADING_TIPS,loadingTip}=await import('./web/loading-tips.js');
const {bossDeckName}=await import('./web/encounter-reveal.js');
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json');
const id=n=>{const c=meta.cards.find(c=>c.name===n);assert(c,n);return c.id};
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
let checks=0;const same=(a,b,m)=>{assert.deepEqual(a,b,m);checks++};
// Every relic's script still loads: the feedback markers must never land where a value is expected.
const scripts=JSON.parse(execFileSync(python,['-B','-c',`import sys,json;sys.path.insert(0,'.');import passives;from content import ART_INFO
print(json.dumps({k:passives.script({'curses':[],'artifacts':[k],'challenge_level':0,'character':0}) for k in ART_INFO}))`],{cwd:root,encoding:'utf8',maxBuffer:1<<28}));
const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,json('android/web/scripts.json')]);
const OX=id('Battle Ox'),POT=id('Pot of Greed');
for(const [key,text] of Object.entries(scripts)){e.start(Array(40).fill(OX),Array(40).fill(OX),8000,8000,5,3,[],[],text);assert.deepEqual(e.errors,[],key+' script')}checks++;
// Hot Deck pulses its icon when it mills.
{
 const key=Object.keys(scripts).indexOf('hot_deck');assert(key>=0);
 e.start(Array(40).fill(OX),Array(40).fill(POT),8000,8000,5,3,[],[],scripts.hot_deck);e.aiModifiers={...e.aiModifiers};
 for(let i=0;i<200&&e.turn<3&&e.pending;i++){if(e.pending.type===M.SELECT_IDLECMD&&e.pending.player===0)e.respond({type:R.SELECT_IDLECMD,action:I.TO_EP,index:null});else e.respond(e.auto())}
 same(e.visuals.some(c=>c.kind==='relic'&&c.relic==='hot_deck'),true,'Hot Deck shows when it mills');
}
// Sources: one relic's share of the total, and curses by themselves.
{
 const d=new MobileDuel(meta.cards);Object.assign(d,{data,lp:[8000,8000],turn:3,player:0,phase:4,activeChain:[],battleProtected:[false,false],aiModifiers:{activeCurses:['frailty'],challengeLevel:0,statRelics:[[{key:'cursed_reckless_spear',effect:'approved_reckless_spear',amount:0,filter:''},{key:'mage',effect:'atk',amount:300,filter:'Spellcaster'}],[]],activeRelics:[['cursed_reckless_spear','mage'],[]]}});
 const c=(name,seq)=>({code:id(name),attack:data[id(name)].attack,defense:data[id(name)].defense,position:1,controller:0,location:L.MZONE,sequence:seq});
 const ox=c('Battle Ox',0),mag=c('Dark Magician',1);d.query=(side,loc)=>side===0&&loc===L.MZONE?[ox,mag,null,null,null]:[];d.core={duelQueryCount:()=>0};
 const s=smartContext(d,0,L),a=s.statSources(ox,0),b=s.statSources(mag,0);
 same(a.relics,[{key:'cursed_reckless_spear',atk:-1000,def:0}],'only the relic that applies');
 same(b.relics.map(x=>x.key),['cursed_reckless_spear','mage'],'a Spellcaster also gets the Spellcaster relic');
 same(a.curses,[{key:'frailty',atk:-200,def:0}],'curses are listed separately');
 same(d.aiModifiers.activeCurses,['frailty'],'and the curse list is left as it was');
}
// Which face-up cards count.
{
 same(changesStats('All Warrior-Type monsters gain 500 ATK.',{race:'Warrior',attribute:'EARTH'}),true);
 same(changesStats('Monsters you control gain 300 ATK.',{race:'Fiend'}),true);
 same(changesStats('Draw 1 card.',{race:'Fiend'}),false);
 same(changesStats('Gains 500 ATK for each card in your hand.',{race:'Fiend'}),false);
 same(amountLabel(300,300),'+300 ATK/DEF');same(amountLabel(-200,0),'−200 ATK');same(amountLabel(100,-100),'+100 ATK −100 DEF');
 const html=activeEffectsMarkup([{kind:'relic',src:'a.jpg',name:'Mage',atk:300,def:0}],s=>s);
 assert(html.includes('<img')&&html.includes('alt="Mage"')&&html.includes('+300 ATK')&&!/>Mage</.test(html),'icons, not names');checks++;
 same(activeEffectsMarkup([],s=>s),'','nothing to show');
}
// Boss names: every boss the game can draw has one, though the reveal no longer shows it (2026-11-03).
{
 const names=meta.bossDeckNames;
 for(const i of [0,1,3,4,6,7,11,15,17,27])for(const tier of [1,2,3,4])assert(names[i]?.[tier],`${i} tier ${tier}`);checks++;
 const seen=Object.values(names).flatMap(x=>Object.values(x));same(new Set(seen).size,seen.length,'no two decks share a name');
 same(bossDeckName(meta,{round:2,loop:0},0)>'',true,'still looked up');
}
{same(LOADING_TIPS.every(t=>t.length<=80),true,'tips fit one or two lines');same(loadingTip(()=>0),LOADING_TIPS[0]);same(loadingTip(()=>.999),LOADING_TIPS.at(-1))}
// Coin reward text: more coins weigh more, big lines stay clear of the window, spots stay on screen.
{
 const {rewardWeight,rewardTextSpot}=await import('./web/reward-text-layout.js');
 same(rewardWeight(2,50)<rewardWeight(10,50)&&rewardWeight(10,50)<rewardWeight(50,50),true,'weight grows with coins');same(rewardWeight(400,400),1);
 same(rewardWeight(2,100)<.3,true,'small rewards stay small on a modest payout');
 const box={left:570,right:1030,top:180,bottom:720};let clear=0;
 for(let i=0;i<200;i++){const s=rewardTextSpot(400,50,1600,900,box,[],1);assert(s.x>=0&&s.y>=0&&s.x+400<=1600&&s.y+50<=900,'on screen');if(s.x+400<=box.left||s.x>=box.right||s.y+50<=box.top||s.y>=box.bottom)clear++}
 same(clear>190,true,'big lines avoid the window');
 const first=rewardTextSpot(400,50,1600,900,box,[],1,()=>.1),second=rewardTextSpot(400,50,1600,900,box,[{...first,until:1}],1);
 same(Math.abs(first.x-second.x)>=400||Math.abs(first.y-second.y)>=50,true,'and each other');
}
// Boss voice lines: the deck's own line, then a boss's only line, then silence.
{
 globalThis.document??={};
 const {bossVoice}=await import('./web/encounter-reveal.js');
 const content={bossVoices:['boss-1.mp3','boss-42.wav','ultimate-collector.mp3'],ultimateCollectors:[62]};
 for(const round of [2,5,8])same(bossVoice(content,{round,loop:0},1),'boss-1.mp3','every tier uses the same line');
 same(bossVoice(content,{round:8,loop:1},1),'boss-1.mp3','later loops too');
 same(bossVoice(content,{round:5,loop:0},42),'boss-42.wav','wav works too');
 same(bossVoice(content,{round:2,loop:0},7),null,'not recorded yet: silent');
 same(bossVoice(content,{round:4,loop:0},42),null,'not a boss duel');
 same(bossVoice(content,{round:2,loop:1},62),'ultimate-collector.mp3','one line for every Ultimate Collector');
 same(bossVoice(content,{round:2,loop:1},3,true),'ultimate-collector.mp3','fallen Collectors too');
 same(bossVoice({bossVoices:[],ultimateCollectors:[62]},{round:2,loop:1},62),null,'silent until it exists');
}
// Coin reward tiers: 10+ coins big, 5+ medium.
{
 const {rewardTier,rewardWeight}=await import('./web/reward-text-layout.js');
 same([2,4,5,9,10,50].map(rewardTier),['small','small','medium','medium','big','big']);
 same(rewardWeight(4,50)<rewardWeight(5,50)&&rewardWeight(9,50)<rewardWeight(10,50),true,'each tier sits above the one below');
}
// Chain Sometimes: Fairy Box and Half or Nothing ask only when an attack is declared.
{
 const {chainWindowAllowed}=await import('./web/duel-presentation.js');
 const names={1:'Fairy Box',2:'Half or Nothing',3:'Mirror Force'},card=code=>({name:names[code],data:{type:4}});
 const ask=(code,timing)=>chainWindowAllowed({player:0,selects:[{code}],hint_timing:timing,hint_timing_other:0},'sometimes',[],{card,turnPlayer:1,phase:8});
 // OcgHintTiming: BATTLE_START 8, ATTACK 4096, DAMAGE_STEP 8192.
 for(const code of [1,2]){same(ask(code,8),false,names[code]+' stays quiet at the start of the Battle Phase');same(ask(code,8192),false,names[code]+' and in the Damage Step');same(ask(code,4096),true,names[code]+' asks at attack declaration')}
 same(chainWindowAllowed({player:0,forced:true,selects:[{code:1}]},'sometimes',[],{card}),true,'forced prompts always show');
}
console.log(`PASS duel QoL: ${checks} checks`);process.exit(0);
