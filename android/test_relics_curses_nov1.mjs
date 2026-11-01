// New relics and curses from the 2026-11-01 Discord notes, in the real core.
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {MobileDuel,M,R,I,L} from './web/duel.js';
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json');let checks=0;const ok=(v,why)=>{assert.ok(v,why);checks++};const same=(a,b,why)=>{assert.deepEqual(a,b,why);checks++};
const id=n=>{const c=meta.cards.find(c=>c.name===n);assert(c,n);return c.id};
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const script=(artifacts=[],curses=[],level=0)=>execFileSync(python,['-B','-c',`import sys;sys.path.insert(0,'.');import passives;print(passives.script(${JSON.stringify({curses,artifacts,challenge_level:level})}))`],{cwd:root,maxBuffer:1<<26}).toString();
const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,json('android/web/scripts.json')]);
const start=(mine,enemy,s,lp=8000)=>{let state=e.start(mine,enemy,lp,8000,5,3,[],[],s);return state};
const idle=()=>{for(let i=0;i<60&&(e.pending?.type!==M.SELECT_IDLECMD||e.pending?.player!==0);i++)e.respond(e.auto());return e.pending};
const activate=name=>{const m=idle(),k=m.activates.findIndex(x=>x.code===id(name));if(k<0)return false;e.respond({type:R.SELECT_IDLECMD,action:I.SELECT_ACTIVATE,index:k});for(let i=0;i<12&&e.pending&&e.pending.type!==M.SELECT_IDLECMD;i++)e.respond(e.auto());return true};
const until=turn=>{for(let i=0;i<220&&e.turn<turn&&e.pending&&!e.finished;i++)e.respond(e.auto())};
const OX=id('Battle Ox'),POT=id('Pot of Greed');
// Jammers: paid when the card activates, doubled at Level 2+, and a card you cannot afford cannot be activated.
start(Array(40).fill(POT),Array(40).fill(OX),script([],['spell_jammer']));activate('Pot of Greed');same(e.lp[0],7700,'Spell Jammer costs 300');
start(Array(40).fill(POT),Array(40).fill(OX),script([],['spell_jammer'],2));activate('Pot of Greed');same(e.lp[0],7400,'600 at Level 2');
start(Array(40).fill(POT),Array(40).fill(OX),script([],['spell_jammer']),200);same(activate('Pot of Greed'),false,'too few LP to activate');
start(Array(40).fill(POT),Array(40).fill(OX),script([],['trap_jammer']));activate('Pot of Greed');same(e.lp[0],8000,'Trap Jammer ignores Spells');
// Fireproof Vest: half, then none. Battle damage is untouched.
const OOKAZI=id('Ookazi');
start(Array(40).fill(OOKAZI),Array(40).fill(OX),script([],['fireproof_vest']));activate('Ookazi');same(e.lp[1],7600,'half of 800');
start(Array(40).fill(OOKAZI),Array(40).fill(OX),script([],['fireproof_vest'],2));activate('Ookazi');same(e.lp[1],8000,'none at Level 2');
// Open Wound is battle damage only.
start(Array(40).fill(POT),Array(40).fill(OOKAZI),script([],['exposed']));until(3);ok(e.lp[0]%800===0&&e.lp[0]<8000,'effect damage stays at 800 a card');
const battle=c=>{start(Array(40).fill(POT),Array(40).fill(OX),script([],c));until(3);return 8000-e.lp[0]};same(battle(['exposed']),battle([])*1.5,'battle damage is raised');
// Fire Extinguisher: only the first card effect each turn.
const burnt=a=>{start(Array(40).fill(POT),Array(40).fill(OOKAZI),script(a));until(3);return 8000-e.lp[0]};
same(burnt([])-burnt(['fire_extinguisher']),800,'the first Ookazi of the turn is negated');
start(Array(40).fill(POT),Array(40).fill(POT),script(['fire_extinguisher'],['tax']));until(2);same(e.lp[0],7800,'curses and relics still hit');
// Token Defender: an empty field at your End Phase gets a Lamb Token in Defense.
const lamb=a=>{start(Array(40).fill(POT),Array(40).fill(POT),script(a));for(let i=0;i<30&&e.turn<2&&e.pending;i++)e.respond(e.auto());return e.query(0,L.MZONE).filter(Boolean)};
same(lamb([]).length,0);{const f=lamb(['token_defender']);same(f.map(c=>[c.code,c.position]),[[60764582,4]],'one Lamb Token in Defense')}
// The Creator: revives from your GY at your Standby Phase.
{const mine=[...Array(36).fill(OOKAZI),...Array(4).fill(OX)];const s=script(['the_creator'])+"\ndo local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START|PHASE_DRAW) e:SetCountLimit(1) e:SetOperation(function() local c=Duel.GetFirstMatchingCard(Card.IsMonster,0,LOCATION_DECK,0,nil) if c then Duel.SendtoGrave(c,REASON_EFFECT) end end) Duel.RegisterEffect(e,0) end";start(mine,Array(40).fill(POT),s);until(2);ok(e.query(0,L.MZONE).filter(Boolean).length>=1,'a monster came back')}
// Tenacity of the Weak: card effects cannot destroy Level 3 or lower Normal Monsters.
{const weak=meta.cards.find(c=>(c.data.type&0x11)===0x11&&c.level>0&&c.level<=3&&!(c.data.type&0x20)).id;const survives=a=>{const s=script(a)+"\ndo local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START|PHASE_END) e:SetCountLimit(1) e:SetOperation(function() Duel.Destroy(Duel.GetFieldGroup(0,LOCATION_MZONE,0),REASON_EFFECT) end) Duel.RegisterEffect(e,0) end";start(Array(40).fill(weak),Array(40).fill(POT),s);const m=idle();e.respond({type:R.SELECT_IDLECMD,action:I.SELECT_SUMMON,index:0});until(2);return e.query(0,L.MZONE).filter(Boolean).length};same(survives([]),0,'card effects clear it');same(survives(['tenacity_of_the_weak']),1,'the relic saves it')}
// Berserker's Pact only removes the choice: a summon that can only go in Defense or face-down must not fizzle.
const landed=pos=>{const s=script(['cursed_berserkers_pact'])+`\ndo local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START|PHASE_MAIN1) e:SetCountLimit(1) e:SetOperation(function() local c=Duel.GetFirstMatchingCard(Card.IsMonster,0,LOCATION_HAND,0,nil) if c then Duel.SpecialSummon(c,0,0,0,false,false,${pos}) end end) Duel.RegisterEffect(e,0) end`;start(Array(40).fill(OX),Array(40).fill(POT),s);idle();return e.query(0,L.MZONE).filter(Boolean).map(c=>c.position)};
same(landed('POS_FACEDOWN_DEFENSE'),[8],'face-down stays face-down');same(landed('POS_FACEUP_DEFENSE'),[4],'a summon that is Defense only still lands');same(landed('POS_FACEUP'),[1],'a free choice lands in Attack');
// Stand Tall halves stat losses from curses.
const hit=a=>{start(Array(40).fill(OX),Array(40).fill(POT),script(a,['frailty'],2));const m=idle();e.respond({type:R.SELECT_IDLECMD,action:I.SELECT_SUMMON,index:0});for(let i=0;i<6&&e.pending?.type!==M.SELECT_IDLECMD;i++)e.respond(e.auto());return e.query(0,L.MZONE).find(Boolean).attack};
const ATK=data[OX].attack;same(hit([]),ATK-400,'the curse costs 400');same(hit(['stand_tall']),ATK-200,'Stand Tall gives half back');
// Protect the Weak and Sacrifice the Weak, from two different monsters on the field. A marker heals you when the check passes.
const WEAK=id('Kuriboh'),STRONG=OX;
const two=(relic,check)=>{const s=script([relic])+`\ndo local a=Effect.GlobalEffect() a:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) a:SetCode(EVENT_PHASE_START|PHASE_MAIN1) a:SetCountLimit(1) a:SetOperation(function() local g=Duel.GetMatchingGroup(Card.IsMonster,0,LOCATION_HAND,0,nil) local w=g:Filter(Card.IsCode,nil,${WEAK}):GetFirst() local b=g:Filter(Card.IsCode,nil,${STRONG}):GetFirst() Duel.SpecialSummonStep(w,0,0,0,false,false,POS_FACEUP_ATTACK) Duel.SpecialSummonStep(b,0,0,0,false,false,POS_FACEUP_ATTACK) Duel.SpecialSummonComplete() end) Duel.RegisterEffect(a,0)
local c=Effect.GlobalEffect() c:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) c:SetCode(EVENT_PHASE_START|PHASE_MAIN1) c:SetCondition(function() return Duel.GetTurnPlayer()==1 end) c:SetOperation(function(e) ${check} end) Duel.RegisterEffect(c,1) end`;start(Array(20).fill([WEAK,STRONG]).flat(),Array(40).fill(POT),s);until(3);return e.lp[0]};
const marker=(cond)=>`for x in Duel.GetFieldGroup(0,LOCATION_MZONE,0):Iter() do if ${cond} then Duel.Recover(0,1000,REASON_EFFECT) end end`;
same(two('protect_the_weak',marker(`x:IsCode(${WEAK}) and x:IsHasEffect(EFFECT_CANNOT_BE_BATTLE_TARGET)`)),9000,'the weakest cannot be attacked');
same(two('protect_the_weak',marker(`x:IsCode(${STRONG}) and x:IsHasEffect(EFFECT_CANNOT_BE_BATTLE_TARGET)`)),8000,'the strongest can');
same(two('sacrifice_the_weak',marker(`x:IsCode(${STRONG}) and x:IsHasEffect(EFFECT_CANNOT_BE_BATTLE_TARGET)`)),9000,'the strongest cannot be attacked');same(two('sacrifice_the_weak',marker(`x:IsCode(${STRONG}) and not x:IsCanBeEffectTarget(e)`)),8000,'card effects can still target it');
same(two('sacrifice_the_weak',marker(`x:IsCode(${WEAK}) and x:IsHasEffect(EFFECT_CANNOT_BE_BATTLE_TARGET)`)),8000,'the weakest can be attacked');
// Normal Barrier: Dark Hole style Spells from the opponent do nothing to Normal Monsters; your own Spells still work.
const barrier=a=>{start(Array(40).fill(OX),Array(40).fill(id('Raigeki')),script(a));idle();e.respond({type:R.SELECT_IDLECMD,action:I.SELECT_SUMMON,index:0});for(let i=0;i<220&&e.turn<3&&e.pending;i++){const m=e.pending,k=m.player===1&&m.type===M.SELECT_IDLECMD?m.activates.findIndex(c=>c.code===id('Raigeki')):-1;e.respond(k>=0?{type:R.SELECT_IDLECMD,action:I.SELECT_ACTIVATE,index:k}:e.auto())}return e.query(0,L.MZONE).filter(Boolean).length};
same(barrier([]),0,'Raigeki clears a Normal Monster');same(barrier(['normal_barrier']),1,'Normal Barrier stops it');
{const k=meta.cards.find(c=>c.name==='Blackland Fire Dragon');ok(k,'card list loaded')}
// Sebek's Blessing reaches you on Chain Sometimes, right after the direct attack lands.
{const {chainWindowAllowed}=await import('./web/duel-presentation.js');const byId=new Map(meta.cards.map(c=>[c.id,c]));const deck=Array(20).fill([id("Sebek's Blessing"),OX]).flat();let s=e.start(deck,Array(40).fill(POT),8000,8000,5,3,[],[],script([]));let summoned=false,offered=0,seen=0;
 for(let i=0;i<260&&!s.finished&&e.turn<=4;i++){const m=e.pending;if(!m)break;if(m.player===0&&m.type===M.SELECT_CHAIN&&m.selects?.some(c=>c.code===id("Sebek's Blessing"))){seen++;if(chainWindowAllowed(m,'sometimes',e.activeChain,{turnPlayer:e.player,phase:e.phase,attackers:0,card:code=>byId.get(code)}))offered++}
  if(m.player===0&&m.type===M.SELECT_IDLECMD&&!summoned&&m.summons.length){summoned=true;s=e.respond({type:R.SELECT_IDLECMD,action:I.SELECT_SUMMON,index:m.summons.findIndex(c=>c.code===OX)});continue}s=e.respond(e.auto())}
 ok(seen>0,'the core offers it');same(offered,seen,'every window reaches the player on Chain Sometimes')}
e.destroy();
const out=JSON.parse(execFileSync(python,['-B','-c',`import sys,json,random,tempfile,collections;from pathlib import Path;sys.path.insert(0,'.')
import campaign as g,storage,content,relic_affinity as aff,choice_relics,challenge_levels as cl
custom=json.load(open('data/relic-custom-art.json',encoding='utf8'))
seen=collections.Counter(g.BY_NAME[a]['id'] if a in g.BY_NAME else a for a in (custom.get(k) or v.get('art') for k,v in content.ART_INFO.items()))
base=Path(tempfile.mkdtemp());storage.ROOT=base;g.SAVE=base/'run.json';g.RUNTIME=base/'runtime';g.RUNTIME.mkdir()
p=storage.profile();p['unlocked']=list(content.PLAYABLE_IDS);storage.write(base/'profile.json',p)
r=g.new_run(0,random.Random(2),0);r['pool']=[c['id'] for c in g.CARDS if c['data']['type']&1 and not c['data']['type']&64][:40];r['selected']=list(range(40));r['stage']='draft';r['round']=2;r['artifacts'].append('protection_charm');g.routes(r,random.Random(1));r['opponent']=r['routes'][0];g.prepare_duel(r,random.Random(1))
charm=[r.get('charmed_curse') in content.CURSES,r['charmed_curse'] not in r['curses']]
pool=[c['id'] for c in g.CARDS if c['name']=='Scapegoat']+[c['id'] for c in g.CARDS if c['name']=='Battle Ox']*39
tok=lambda s:aff.multipliers(['token_regiment'],dict(pool=pool,selected=s))['token_regiment']
print(json.dumps(dict(dupes=[str(k) for k,n in seen.items() if n>1],charm=charm,deck=[tok([]),tok([0])],picker='almighty' in choice_relics.relic_pool(dict(r,artifacts=[])),drain=[cl.drained_lp(dict(curses=['drain'],challenge_level=0),4000),cl.drained_lp(dict(curses=['drain'],challenge_level=0),2500),cl.drained_lp(dict(curses=['drain'],challenge_level=2),2500),cl.drained_lp(dict(curses=['drain'],challenge_level=2),500)])))`],{cwd:root,maxBuffer:1<<26}).toString().trim().split('\n').at(-1));
same(out.dupes,[],'every relic has its own art');same(out.charm,[true,true],'Protection Charm lifts one curse');ok(out.deck[1]>out.deck[0],'deck cards count more than collection cards');ok(out.picker,'Relic Picker can offer very rare relics');same(out.drain,[3000,2000,1000,500],'Withering Soul keeps its floor');
console.log(`PASS relics and curses: ${checks} checks`);
