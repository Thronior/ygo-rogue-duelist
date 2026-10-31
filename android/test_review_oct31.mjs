// Fixes from the 2026-10-31 review of v0.2.13 flags and Discord reports.
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {MobileDuel,M,R,I,L} from './web/duel.js';import {smartContext} from './web/smart_policy.js';import {liveCardFacts} from './web/duel-presentation.js';import {deckStats} from './web/feedback-ui.js';
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8'));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json');let checks=0;const ok=(v,why)=>{assert.ok(v,why);checks++};
const byName=n=>{const c=meta.cards.find(c=>c.name===n);assert(c,n);return c},id=n=>byName(n).id;
// Every Spell and Trap in a duel used to read "Continuous".
for(const [n,kind] of [['Book of Moon','Quick-Play'],['Mirror Force','Normal'],['Pot of Greed','Normal'],['Call of the Haunted','Continuous']]){const c=byName(n);assert.equal(liveCardFacts(c,{race:0,attribute:0},meta.cards).race,kind,n);checks++}
assert.equal(liveCardFacts(byName('Dark Magician'),{race:data[id('Blue-Eyes White Dragon')].race,attribute:32},meta.cards).race,'Dragon','a monster still shows its live Type');checks++;
// CPU rules on a stubbed board (seat 1 is the CPU).
const e=new MobileDuel(meta.cards);let z={};e.query=(s,l)=>z[s+':'+l]||[];
const c=(n,loc,side,extra={})=>({code:id(n),controller:side,location:loc,sequence:0,position:1,attack:data[id(n)]?.attack??0,defense:data[id(n)]?.defense??0,...extra});
const put=(side,loc,...cards)=>z[side+':'+loc]=cards.map((t,i)=>({...t,controller:side,location:loc,sequence:t.sequence??i}));
const reset=()=>{z={};Object.assign(e,{data,lp:[8000,8000],player:1,phase:4,turn:4,effect:null,activeChain:[],battleProtected:[false,false],fusionSupport:{},aiModifiers:{}});for(const s of [0,1])put(s,L.DECK,...Array(12).fill(c('Battle Ox',L.DECK,s)))};
const score=(n,where)=>smartContext(e,1,L).activation(where,false);
// Obelisk cannot be targeted, so Tribute to the Doomed has no target among your monsters.
reset();put(1,L.HAND,c('Tribute to the Doomed',L.HAND,1),c('Battle Ox',L.HAND,1));put(0,L.MZONE,c('Obelisk the Tormentor',L.MZONE,0));
assert.equal(score('',e.query(1,L.HAND)[0]),-1,'no Tribute to the Doomed into Obelisk');checks++;

// A face-up Power Stone needs one of your own monsters with room for a counter.
reset();put(1,L.SZONE,c('Pitch-Black Power Stone',L.SZONE,1));put(1,L.HAND,c('Skilled Dark Magician',L.HAND,1));put(0,L.MZONE,c('Magical Marionette',L.MZONE,0));
const stone=()=>({code:id('Pitch-Black Power Stone'),controller:1,location:L.SZONE,sequence:0});
assert.equal(score('',stone()),-1,'a Spell Counter user in hand is no reason to move a counter');checks++;
put(1,L.MZONE,c('Skilled Dark Magician',L.MZONE,1,{counters:{1:3}}));assert.equal(score('',stone()),-1,'a full Skilled Dark Magician cannot take another');checks++;
put(1,L.MZONE,c('Skilled Dark Magician',L.MZONE,1,{counters:{1:1}}));ok(score('',stone())>=0,'it feeds your own monster');
// A Spirit keeps its Mirror of Yata; without one it returns as normal.
reset();e.phase=512;put(1,L.MZONE,c('Asura Priest',L.MZONE,1));put(1,L.SZONE,c('Mirror of Yata',L.SZONE,1,{equipCard:{controller:1,location:L.MZONE,sequence:0}}));
assert.deepEqual(e.auto({type:M.SELECT_EFFECTYN,player:1,code:id('Asura Priest')}),{type:R.SELECT_EFFECTYN,yes:false},'Mirror of Yata lets it stay');checks++;
put(1,L.SZONE);assert.equal(e.auto({type:M.SELECT_EFFECTYN,player:1,code:id('Asura Priest')}).yes,true,'no Mirror, normal return');checks++;
// Dust Tornado: never Set a Field Spell over your active one.
reset();e.effect={code:id('Dust Tornado'),player:1};put(1,L.SZONE,c('Rising Air Current',L.SZONE,1,{sequence:5}));z['1:'+L.SZONE]=Object.assign(Array(6).fill(null),{5:z['1:'+L.SZONE][0]});put(1,L.HAND,c('Rising Air Current',L.HAND,1));
assert.deepEqual(e.auto({type:M.SELECT_YESNO,player:1}),{type:R.SELECT_YESNO,yes:false},'only a Field Spell to Set: decline');checks++;
const smart=smartContext(e,1,L);ok(smart.targetScore('Dust Tornado',c('Mirror Force',L.HAND,1),{})>smart.targetScore('Dust Tornado',c('Rising Air Current',L.HAND,1),{}),'a Trap beats a Field Spell for the Set');
// Dragon's Rage pierces only for its owner.
reset();e.phase=8;put(1,L.MZONE,c('Blue-Eyes White Dragon',L.MZONE,1));put(0,L.MZONE,c('Battle Ox',L.MZONE,0,{position:8}));put(0,L.SZONE,c("Dragon's Rage",L.SZONE,0));
assert.equal(smartContext(e,1,L).attackBackfires(e.query(1,L.MZONE)[0],e.query(0,L.MZONE)[0]),false,'your Rage never hurts the CPU');checks++;
// Rescue Cat is only summoned in the open when its effect will be used.
reset();put(1,L.HAND,c('Rescue Cat',L.HAND,1));put(1,L.DECK,c('Ojama Green',L.DECK,1),c('Ojama Yellow',L.DECK,1));put(0,L.MZONE,c('Battle Ox',L.MZONE,0));
ok(smartContext(e,1,L).position('Rescue Cat',e.query(1,L.HAND)[0])!==true,'not face-up into a stronger monster with nothing to call for');
// Deck editor stats include Level 6 curses, doubled, and nothing below Level 6.
const ox=byName('Battle Ox'),run=(level,curses)=>({challenge_level:level,artifacts:[],curses,persistent_curses:curses,card_mods:{}});
assert.deepEqual(deckStats(ox,run(6,['frailty','hunger']),0,meta.artifactInfo),[ox.atk-400,ox.defense-600],'Level 6 curses apply');checks++;
assert.deepEqual(deckStats(ox,run(6,['brittle','brittle']),0,meta.artifactInfo),[ox.atk-400,ox.defense-800],'each copy counts');checks++;
assert.deepEqual(deckStats(ox,run(6,['mirror_stats']),0,meta.artifactInfo),[ox.defense,ox.atk],'Mirror curse swaps');checks++;
assert.deepEqual(deckStats(ox,run(5,['frailty']),0,meta.artifactInfo),[ox.atk,ox.defense],'below Level 6 curses do not stay');checks++;
assert.deepEqual(deckStats(ox,{...run(6,['relic_seal']),artifacts:['sword']},0,meta.artifactInfo),[ox.atk,ox.defense],'Relic Seal hides relic bonuses');checks++;
// Berserker's Pact in the real core: no Sets, and Special Summons land in Attack Position.
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const script=execFileSync(python,['-B','-c',"import sys;sys.path.insert(0,'.');import passives;print(passives.script({'curses':[],'artifacts':['cursed_berserkers_pact']}))"],{cwd:root,maxBuffer:1<<26}).toString();
const real=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,json('android/web/scripts.json')]);
const hand=Array(40).fill(id('Gilasaurus'));let s=real.start(hand,Array(40).fill(id('Battle Ox')),8000,8000,5,3,[],[],script);
for(let i=0;i<40&&real.pending?.type!==M.SELECT_IDLECMD||real.pending?.player!==0;i++)s=real.respond(real.auto());
let m=real.pending;ok(m.summons.length>0,'can still Normal Summon');assert.equal(m.monster_sets.length,0,'cannot Set a monster');checks++;
ok(m.special_summons.length>0,'Gilasaurus is offered');s=real.respond({type:R.SELECT_IDLECMD,action:I.SELECT_SPECIAL_SUMMON,index:0});
for(let i=0;i<6&&real.pending?.type!==M.SELECT_POSITION&&real.pending?.type!==M.SELECT_IDLECMD;i++)s=real.respond(real.auto());
if(real.pending?.type===M.SELECT_POSITION){assert.equal(real.pending.positions,1,'Attack Position only');checks++;s=real.respond({type:R.SELECT_POSITION,position:1})}
const landed=real.query(0,L.MZONE).find(Boolean);ok(landed&&(landed.position&1),'it lands in Attack Position');
const plain=execFileSync(python,['-B','-c',"import sys;sys.path.insert(0,'.');import passives;print(passives.script({'curses':[],'artifacts':[]}))"],{cwd:root,maxBuffer:1<<26}).toString();
s=real.start(hand,Array(40).fill(id('Battle Ox')),8000,8000,5,3,[],[],plain);for(let i=0;i<40&&(real.pending?.type!==M.SELECT_IDLECMD||real.pending?.player!==0);i++)s=real.respond(real.auto());
ok(real.pending.monster_sets.length>0,'without the relic you can Set');real.destroy();
console.log(`PASS Oct 31 review: ${checks} checks`);
