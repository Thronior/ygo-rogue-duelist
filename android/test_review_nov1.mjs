// Fixes from the 2026-11-01 review of v0.2.14 flags and Discord reports.
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {MobileDuel,M,R,I,L} from './web/duel.js';import {smartContext} from './web/smart_policy.js';
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json');let checks=0;const ok=(v,why)=>{assert.ok(v,why);checks++};
const byName=n=>{const c=meta.cards.find(c=>c.name===n);assert(c,n);return c},id=n=>byName(n).id;
const e=new MobileDuel(meta.cards);let z={};e.query=(s,l)=>z[s+':'+l]||[];
const c=(n,loc,side,extra={})=>({code:id(n),controller:side,location:loc,sequence:0,position:1,attack:data[id(n)]?.attack??0,defense:data[id(n)]?.defense??0,race:data[id(n)]?.race,...extra});
const put=(side,loc,...cards)=>z[side+':'+loc]=cards.map((t,i)=>({...t,controller:side,location:loc,sequence:t.sequence??i}));
const reset=()=>{z={};Object.assign(e,{data,lp:[8000,8000],player:1,phase:4,turn:4,effect:null,activeChain:[],battleProtected:[false,false],fusionSupport:{},aiModifiers:{}});for(const s of [0,1])put(s,L.DECK,...Array(12).fill(c('Battle Ox',L.DECK,s)))};
// A face-up Necrovalley used to stop the CPU with "Cannot access 'setMatch' before initialization".
reset();put(0,L.SZONE,c('Necrovalley',L.SZONE,0,{sequence:5}));z['0:'+L.SZONE]=Object.assign(Array(6).fill(null),{5:z['0:'+L.SZONE][0]});put(0,L.HAND,c("Gravekeeper's Spy",L.HAND,0));put(1,L.HAND,c('Battle Ox',L.HAND,1));put(0,L.MZONE,c("Gravekeeper's Spy",L.MZONE,0,{position:8,rememberedCode:id("Gravekeeper's Spy")}));
// The CPU sizes up a face-down monster it has seen before, while its context is still being built.
ok(smartContext(e,1,L).projectedAttack(e.query(1,L.HAND)[0])>=0,'the context builds with a set monster under Necrovalley');
// Flip Summon triggers are worth flipping for.
reset();put(1,L.MZONE,c('Stealth Bird',L.MZONE,1,{position:8}));
assert.equal(smartContext(e,1,L).flipUseful('Stealth Bird',e.query(1,L.MZONE)[0]),true,'Stealth Bird burns on every flip');checks++;
put(1,L.MZONE,c('Medusa Worm',L.MZONE,1,{position:8}));assert.equal(smartContext(e,1,L).flipUseful('Medusa Worm',e.query(1,L.MZONE)[0]),false,'Medusa Worm needs a target');checks++;
put(0,L.MZONE,c('Battle Ox',L.MZONE,0));assert.equal(smartContext(e,1,L).flipUseful('Medusa Worm',e.query(1,L.MZONE)[0]),true);checks++;
put(1,L.MZONE,c('Stealth Bird',L.MZONE,1,{position:4}));assert.notEqual(smartContext(e,1,L).flipUseful('Stealth Bird',e.query(1,L.MZONE)[0]),true,'a face-up monster has nothing to flip');checks++;
// Cyber Raider's forced effect must not break the CPU's own Jinzo and Amplifier.
{reset();put(1,L.MZONE,c('Jinzo',L.MZONE,1));put(1,L.SZONE,c('Amplifier',L.SZONE,1));put(1,L.HAND,c('Cyber Raider',L.HAND,1));
 const smart=()=>smartContext(e,1,L),raider=()=>e.query(1,L.HAND)[0];
 const idle=()=>({type:M.SELECT_IDLECMD,player:1,summons:[raider()],monster_sets:[raider()],special_summons:[],activates:[],spell_sets:[],pos_changes:[],to_bp:false,to_ep:true,can_shuffle:false});
 assert.notDeepEqual([e.auto(idle()).action,e.auto(idle()).index],[I.SELECT_SUMMON,0],'never Normal Summoned over its own Amplifier');checks++;
 ok(smart().flipUseful('Cyber Raider',c('Cyber Raider',L.MZONE,1,{position:8}))===false,'no flip into its own Amplifier');
 ok(smart().targetScore('Cyber Raider',e.query(1,L.SZONE)[0],{})<0,'own Amplifier is the last choice');
 assert.equal(smart().resourceOption([BigInt(id('Cyber Raider'))*16n+1n,BigInt(id('Cyber Raider'))*16n+2n]),null,'no effect is resolving, so no option is forced');checks++;
 e.effect={code:id('Cyber Raider'),player:1};assert.equal(smart().resourceOption([BigInt(id('Cyber Raider'))*16n+1n,BigInt(id('Cyber Raider'))*16n+2n]),1,'only your own Equip Cards: take one, do not destroy it');checks++;e.effect=null;
 put(0,L.SZONE,c('Axe of Despair',L.SZONE,0));
 ok(smart().flipUseful('Cyber Raider',c('Cyber Raider',L.MZONE,1,{position:8}))!==false,'an enemy Equip Card makes it safe');
 assert.deepEqual([e.auto(idle()).action,e.auto(idle()).index],[I.SELECT_SUMMON,0],'summoned to break your Equip Card');checks++;
 ok(smart().targetScore('Cyber Raider',e.query(0,L.SZONE)[0],{})>smart().targetScore('Cyber Raider',e.query(1,L.SZONE)[0],{}),'it hits your Equip Card first');
 e.effect={code:id('Cyber Raider'),player:1};assert.equal(smart().resourceOption([BigInt(id('Cyber Raider'))*16n+1n,BigInt(id('Cyber Raider'))*16n+2n]),0,'an enemy Equip Card: destroy it');checks++;e.effect=null}
// Pre-errata rules: Brain Control has no summon limit, and each Serpent and Assailant works alone.
{reset();e.phase=4;put(0,L.MZONE,c('Blue-Eyes Ultimate Dragon',L.MZONE,0));put(1,L.HAND,c('Brain Control',L.HAND,1));put(1,L.MZONE,c('Battle Ox',L.MZONE,1));
 ok(smartContext(e,1,L).activation(e.query(1,L.HAND)[0],false)>=0,'Brain Control can take a Fusion Monster');
 reset();put(1,L.GRAVE,c('Sinister Serpent',L.GRAVE,1));put(1,L.HAND,c('Sinister Serpent',L.HAND,1));put(1,L.GRAVE,c('Sinister Serpent',L.GRAVE,1),c('Night Assailant',L.GRAVE,1));
 ok(smartContext(e,1,L).discardBenefit(e.query(1,L.HAND)[0])>0,'a second Serpent still wants the Graveyard');
 put(1,L.HAND,c('Night Assailant',L.HAND,1));ok(smartContext(e,1,L).discardBenefit(e.query(1,L.HAND)[0])>0,'Night Assailant can return another Night Assailant');
 reset();e.lp=[1000,8000];e.phase=4;put(1,L.SZONE,c('Ring of Destruction',L.SZONE,1));put(1,L.MZONE,c('Battle Ox',L.MZONE,1));
 ok(smartContext(e,1,L).activation(e.query(1,L.SZONE)[0],false)>=0,'Ring burns with your own monster for lethal')}
// Tribe-Infecting Virus names the Type that hits you, not its own.
const ALL=(1<<25)-1,BEAST=BigInt(data[id('Hyena')].race),AQUA=BigInt(data[id('Tribe-Infecting Virus')].race);
reset();put(0,L.MZONE,c('Hyena',L.MZONE,0),c('Hyena',L.MZONE,0));put(1,L.MZONE,c('Tribe-Infecting Virus',L.MZONE,1));
assert.equal(smartContext(e,1,L).virusRace(ALL),BEAST,'declares the Beasts');checks++;
put(0,L.MZONE);ok(smartContext(e,1,L).virusRace(ALL)!==AQUA,'never its own Type');
// Real core: Serket is not flipped into its own destruction, and relic rules.
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const script=(artifacts,turns=0)=>execFileSync(python,['-B','-c',`import sys;sys.path.insert(0,'.');import passives;print(passives.script({'curses':[],'artifacts':${JSON.stringify(artifacts)},'clock_turns':${turns}}))`],{cwd:root,maxBuffer:1<<26}).toString();
const real=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,json('android/web/scripts.json')]);
const own=(cards)=>{let s=real.start(cards,Array(40).fill(id('Battle Ox')),8000,8000,5,3,[],[],own.script);for(let i=0;i<40&&(real.pending?.type!==M.SELECT_IDLECMD||real.pending?.player!==0);i++)s=real.respond(real.auto());return real.pending};
// Berserker's Pact: Defense-only summons cannot be activated, so the card is not wasted.
own.script=script(['cursed_berserkers_pact']);
for(const name of ['Stray Lambs','Scapegoat'])ok(!own(Array(40).fill(id(name))).activates.some(x=>x.code===id(name)),name+' cannot be activated');
own.script=script([]);ok(own(Array(40).fill(id('Scapegoat'))).activates.some(x=>x.code===id('Scapegoat')),'without the relic it can');
// Dark Scorpion Squad counts Don Zaloog, for his own ATK and for the others.
own.script=script(['dark_scorpion_squad']);const summon=(name)=>{const m=own(Array(40).fill(id(name)));const x=m.summons.findIndex(c=>c.code===id(name));real.respond({type:R.SELECT_IDLECMD,action:I.SELECT_SUMMON,index:x});for(let i=0;i<4&&real.pending?.type!==M.SELECT_IDLECMD;i++)real.respond(real.auto());return real.query(0,L.MZONE).find(Boolean)};
assert.equal(summon('Don Zaloog').attack,1600,'Don Zaloog gains 200 for himself');checks++;
// Token relics in the real core.
const goats=(artifacts,enemy='Battle Ox')=>{let s=real.start(Array(40).fill(id('Scapegoat')),Array(40).fill(id(enemy)),8000,8000,5,3,[],[],script(artifacts));for(let i=0;i<40&&(real.pending?.type!==M.SELECT_IDLECMD||real.pending?.player!==0);i++)s=real.respond(real.auto());const k=real.pending.activates.findIndex(x=>x.code===id('Scapegoat'));s=real.respond({type:R.SELECT_IDLECMD,action:I.SELECT_ACTIVATE,index:k});for(let i=0;i<14&&real.pending&&real.pending.type!==M.SELECT_IDLECMD;i++)s=real.respond(real.auto());return real.query(0,L.MZONE).filter(Boolean)};
assert.deepEqual(goats([]).map(x=>x.attack),[0,0,0,0]);checks++;
assert.deepEqual(goats(['token_regiment']).map(x=>x.attack),[750,750,750,750],'Token Regiment');checks++;
assert.deepEqual(goats(['token_resonance']).map(x=>x.attack),[0,0,0,0],'nothing to double');checks++;
assert.deepEqual(goats(['token_regiment','token_resonance']).map(x=>x.attack),[1500,1500,1500,1500],'Token Resonance doubles the relic');checks++;
assert.deepEqual(goats(['sword','token_resonance']).map(x=>[x.attack,x.defense]),goats(['sword']).map(x=>[x.attack*2,x.defense*2]),'and any other boost');checks++;
// Token Martyrs: the CPU attacks a Sheep Token on its turn.
{goats(['token_martyrs']);let s=null;const lp=real.lp[1];for(let i=0;i<160&&real.turn<3&&!real.finished;i++){if(!real.pending)break;s=real.respond(real.auto())}const lost=4-real.query(0,L.MZONE).filter(Boolean).length;ok(lost>0,'a Token was destroyed');assert.equal(lp-real.lp[1],lost*500,'500 for each Token');checks++}
// Ominous Clock: 600, down 100 every 10 turns across duels, then healing.
const clock=turns=>{let s=real.start(Array(40).fill(id('Pot of Greed')),Array(40).fill(id('Pot of Greed')),8000,8000,5,3,[],[],script(['cursed_ominous_clock'],turns));for(let i=0;i<60&&!s.finished&&real.turn<2;i++){if(!real.pending)break;s=real.respond(real.auto())}for(let i=0;i<8&&real.pending&&real.phase<4;i++)s=real.respond(real.auto());return real.lp[1]};
assert.equal(clock(0),7400,'600 at the start');checks++;assert.equal(clock(8),7500,'turn 10 of the run: 500');checks++;assert.equal(clock(58),8000,'turn 60: nothing');checks++;assert.equal(clock(68),8100,'turn 70: heals 100');checks++;
// Reversed Remedy: an LP cost heals instead, and can always be paid.
const toon=(artifacts,lp=8000)=>{let s=real.start(Array(40).fill(id('Toon World')),Array(40).fill(id('Pot of Greed')),lp,8000,5,3,[],[],script(artifacts));for(let i=0;i<40&&(real.pending?.type!==M.SELECT_IDLECMD||real.pending?.player!==0);i++)s=real.respond(real.auto());const k=real.pending.activates.findIndex(x=>x.code===id('Toon World'));if(k<0)return null;s=real.respond({type:R.SELECT_IDLECMD,action:I.SELECT_ACTIVATE,index:k});for(let i=0;i<10&&real.pending&&real.pending.type!==M.SELECT_IDLECMD;i++)s=real.respond(real.auto());return real.lp[0]};
assert.equal(toon([]),7000,'Toon World costs 1000');checks++;assert.equal(toon(['cursed_reversed_remedy']),9000,'under the relic it gains 1000');checks++;
assert.equal(toon([],500),null,'too few LP to pay normally');checks++;assert.equal(toon(['cursed_reversed_remedy'],500),1500,'the relic has no minimum LP');checks++;
real.destroy();
const out=JSON.parse(execFileSync(python,['-B','-c',`import sys,json;sys.path.insert(0,'.')
import campaign as g,archetype_relics as a
from content import ARTIFACTS,ART_INFO
print(json.dumps([ARTIFACTS['ritual_dagger'],ART_INFO['ritual_dagger']['effect'],'ritual_dagger' in a.NEW_IDS,[a.matches('ritual_dagger',g.BY_ID[i]) for i in (${id('Black Luster Ritual')},${id('Black Luster Soldier')},${id('Battle Ox')})],ARTIFACTS['dark_scorpion_squad'][2]]))`],{cwd:root,maxBuffer:1<<26}).toString().trim().split('\n').at(-1));
const extra=JSON.parse(execFileSync(python,['-B','-c',`import sys,json,random,tempfile;from pathlib import Path;sys.path.insert(0,'.')
import campaign as g,storage,content,relic_affinity as aff,cursed_relics,character_variants
base=Path(tempfile.mkdtemp());storage.ROOT=base;g.SAVE=base/'run.json';g.RUNTIME=base/'runtime';g.RUNTIME.mkdir()
p=storage.profile();p['unlocked']=list(content.PLAYABLE_IDS);storage.write(base/'profile.json',p)
r=g.new_run(0,random.Random(2),0);r['artifacts'].append('cursed_ominous_clock');r['pool']=[c['id'] for c in g.CARDS if c['data']['type']&1 and not c['data']['type']&64][:40];r['selected']=list(range(40));r['stage']='draft';g.routes(r,random.Random(1));r['opponent']=r['routes'][0];g.prepare_duel(r,random.Random(1))
g.finish_duel(r,{'protocol':1,'id':r['duel']['id'],'winner':0,'lp':4000,'events':[{'kind':'duel_metrics','turns':7}]},random.Random(1))
token=[c['id'] for c in g.CARDS if c['name'] in ('Scapegoat','Stray Lambs','Fires of Doomsday','Multiply')]
plain=[c['id'] for c in g.CARDS if c['name']=='Battle Ox']
print(json.dumps([r.get('clock_turns'),aff.multipliers(['token_regiment'],{'pool':token*3+plain*3})['token_regiment'],aff.multipliers(['token_regiment'],{'pool':plain*6})['token_regiment'],'ominous_clock' in content.RETIRED_ARTIFACTS,'cursed_ominous_clock' in cursed_relics.approved(),content.CHARACTERS[30]['starting_relic']]))`],{cwd:root,maxBuffer:1<<26}).toString().trim().split('\n').at(-1));
assert.equal(extra[0],7,'the clock keeps counting across duels');assert.ok(extra[1]>extra[2]&&extra[2]===1,'Token cards raise the relic weight');assert.deepEqual(extra.slice(3),[true,true,'burn_proficiency']);checks+=3;
const pack=json('data/packs.json').find(x=>x.id==='DRAFT-YAMI-YUGI');for(const n of ['Beastking of the Swamps','Goddess with the Third Eye','Mystical Sheep #1','Versago the Destroyer'])ok(pack.common.includes(id(n)),n+' is in the pack');ok(pack.rare.includes(id('Metamorphosis'))&&!pack.common.includes(id('Metamorphosis')),'Metamorphosis is a rare');
assert.equal(out[1],'archetype_stock','Ritual Dagger adds a shop slot');assert.equal(out[2],true);assert.deepEqual(out[3],[true,true,false]);assert.match(out[0][2],/one additional random card/);assert.match(out[4],/Don Zaloog/);checks+=5;
console.log(`PASS Nov 1 review: ${checks} checks`);
