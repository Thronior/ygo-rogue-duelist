// 2026-11-19: Immortal Dark Magic, the fused relic of the four Dark Magician relics (Magician Staff, Magician's Bond, Master
// and Apprentice, Black Chaos Rite), and Dark Sage always treated as a "Dark Magician" card (data/card-archetype-rules.json).
// Real-core duels; the relic's data, recipe and Dark Sage's text are checked through Python at the end.
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const {MobileDuel,M,R,I,B,L}=await import('./web/duel.js');
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json'),scripts=json('android/web/scripts.json'),id=n=>{const c=meta.cards.find(c=>c.name===n);assert(c,n);return c.id};
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const py=(code,...args)=>execFileSync(python,['-B','-c',"import sys,json;sys.path.insert(0,'.');"+code,...args],{cwd:root,encoding:'utf8',env:{...process.env,PYTHONUTF8:'1'},maxBuffer:1<<26}).trim();
const runScript=(artifacts,side=0)=>py('import passives;print(passives.multiplayer_script(json.loads(sys.argv[1]),int(sys.argv[2])))',JSON.stringify({curses:[],artifacts,cursed_artifacts:[],challenge_level:0}),String(side));
let checks=0;const ok=(value,why)=>{assert(value,why);checks++},same=(a,b,why)=>{assert.deepEqual(a,b,why);checks++};

const WABOKU=id('Waboku'),OX=id('Battle Ox'),HOLE=id('Dark Hole'),ELF=id('Mystical Elf');
const DM=id('Dark Magician'),DMG=id('Dark Magician Girl'),SKILLED=id('Skilled Dark Magician'),KNIVES=id('Thousand Knives');
const SAGE=id('Dark Sage'),PALADIN=id('Dark Paladin');
const RELIC='immortal_dark_magic';
// The engine data without Dark Sage's house-rule setcode, to show the checks below depend on it.
const plainSage={...data,[SAGE]:{...data[SAGE],setcodes:[]}};
ok((data[SAGE].setcodes||[]).includes(0x10a2),'engine-data.json gives Dark Sage the "Dark Magician" setcode (0x10a2)');

const setup=moves=>moves.length?`do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_STARTUP)
e:SetOperation(function(e) e:Reset() ${moves.map(([code,where,p=0])=>`do local c=Duel.GetMatchingGroup(Card.IsCode,${p},LOCATION_DECK,0,nil,${code}):Filter(function(x) return not x:IsLocation(LOCATION_HAND) end,nil):GetFirst() if c then ${where==='grave'?'Duel.SendtoGrave(c,REASON_RULE)':where==='field'?`Duel.MoveToField(c,${p},${p},LOCATION_MZONE,POS_FACEUP_ATTACK,true)`:`Duel.SendtoHand(c,${p},REASON_RULE)`} end end`).join(' ')} end) Duel.RegisterEffect(e,0) end`:'';
async function duel({script='',deck,enemy,turns=1,drive,engine=data}){
 const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([engine,scripts]);
 let s=e.start(deck,enemy,8000,8000,5,7,[],[],script);
 for(let i=0;i<6000&&!s.finished&&e.turn<=turns;i++){const m=e.pending;if(!m)break;const answer=drive(e,m);s=e.respond(answer||e.auto())}
 assert.deepEqual(e.errors||[],[],'no script errors');
 return e;
}
const idle=(m,action,codes,list)=>{const at=(m[list]||[]).findIndex(c=>[].concat(codes).includes(c.code));return at<0?null:{type:R.SELECT_IDLECMD,action,index:at}};
const toEnd={type:R.SELECT_IDLECMD,action:I.TO_EP,index:null},noBattle={type:R.SELECT_BATTLECMD,action:B.TO_EP,index:null};
const fill=(...codes)=>Array.from({length:40},(_,n)=>codes[n%codes.length]);
// The listed cards go to the bottom of the Deck (the core draws from the front of the list, unshuffled), so they stay there.
const deckOf=(cards,filler=WABOKU)=>[...fill(filler).slice(cards.length),...cards];
const cards=(e,p,loc,code)=>e.query(p,loc).filter(c=>c&&(!code||c.code===code));
const count=(e,p,loc,code)=>cards(e,p,loc,code).length;
// Plays each step once, in order; answers yes; picks the listed cards when asked to select.
const steps=(list,{pick=[]}={})=>{const done=new Set();return (e,m)=>{
 if(m.player!==0)return null;
 if(m.type===M.SELECT_IDLECMD){for(const [n,[action,codes,field]] of list.entries()){if(done.has(n))continue;const s=idle(m,action,codes,field);if(s){done.add(n);return s}}return toEnd}
 if(m.type===M.SELECT_BATTLECMD)return noBattle;
 if(m.type===M.SELECT_YESNO)return {type:R.SELECT_YESNO,yes:true};
 if(m.type===M.SELECT_EFFECTYN)return {type:R.SELECT_EFFECTYN,yes:true};
 if(m.type===M.SELECT_POSITION)return {type:R.SELECT_POSITION,position:1};
 // The first listed code that is offered wins (Dark Magician Girl is both a summon choice and a search choice).
 if(m.type===M.SELECT_CARD)for(const code of pick){const at=m.selects.map((c,i)=>[c,i]).filter(([c])=>c.code===code).map(([,i])=>i).slice(0,m.max);if(at.length&&at.length>=m.min)return {type:R.SELECT_CARD,indicies:at}}
 return null}};

// 1. Spellcaster monsters you control gain 600 ATK; others do not.
{
 let seen=null;
 const e=await duel({script:runScript([RELIC])+'\n'+setup([[DM,'field'],[OX,'field']]),deck:deckOf([DM,OX]),enemy:fill(WABOKU),drive(e,m){
  if(m.player===0&&m.type===M.SELECT_IDLECMD&&!seen)seen={dm:cards(e,0,L.MZONE,DM)[0]?.attack,ox:cards(e,0,L.MZONE,OX)[0]?.attack};
  return steps([])(e,m)}});
 e.destroy();console.log('Immortal Dark Magic ATK',seen);
 same(seen,{dm:3100,ox:1700},'Dark Magician 2500 -> 3100; Battle Ox (Beast-Warrior) stays 1700');
}

// 2. Normal Summoning a Spellcaster (Mystical Elf): Special Summon a "Dark Magician" monster from the Deck and add a card that
// mentions "Dark Magician". The relic's own Special Summon does not set it off again (asked once).
async function call(artifacts){
 let before=null,asked=0;const play=steps([[I.SELECT_SUMMON,ELF,'summons']],{pick:[KNIVES,DMG]});
 const e=await duel({script:runScript(artifacts)+'\n'+setup([[ELF,'hand']]),deck:deckOf([ELF,DMG,DMG,KNIVES]),enemy:fill(WABOKU),drive(e,m){
  if(m.player===0&&m.type===M.SELECT_IDLECMD&&before===null)before=count(e,0,L.HAND,KNIVES);
  if(m.player===0&&m.type===M.SELECT_YESNO)asked++;
  return play(e,m)}});
 const out={elf:count(e,0,L.MZONE,ELF),girl:count(e,0,L.MZONE,DMG),added:count(e,0,L.HAND,KNIVES)+count(e,0,L.GRAVE,KNIVES)-before,asked};e.destroy();return out;
}
const called=await call([RELIC]);console.log('Immortal Dark Magic, Normal Summon',called);
same(called,{elf:1,girl:1,added:1,asked:1},'Dark Magician Girl from the Deck and Thousand Knives to the hand, asked once');
same(await call([]),{elf:1,girl:0,added:0,asked:0},'without the relic nothing happens');
// A Battle Ox Normal Summon is not a Spellcaster's.
{
 let asked=0;
 const e=await duel({script:runScript([RELIC])+'\n'+setup([[OX,'hand']]),deck:deckOf([OX,DMG,KNIVES]),enemy:fill(WABOKU),drive(e,m){if(m.player===0&&m.type===M.SELECT_YESNO)asked++;return steps([[I.SELECT_SUMMON,OX,'summons']],{pick:[DMG,KNIVES]})(e,m)}});
 const out={ox:count(e,0,L.MZONE,OX),girl:count(e,0,L.MZONE,DMG),asked};e.destroy();
 same(out,{ox:1,girl:0,asked:0},'a non-Spellcaster Normal Summon does nothing');
}

// 3. A "Dark Magician" monster destroyed and sent to the GY (Dark Hole): Special Summon a monster that mentions "Dark Magician"
// from the Deck (Dark Sage) or Extra Deck (Dark Paladin), ignoring its Summoning conditions.
async function fallen({artifacts=[RELIC],onField=DM,pick,engine=data,deck=[SAGE]}){
 const e=await duel({engine,script:runScript(artifacts)+'\n'+setup([[onField,'field'],[HOLE,'hand']]),deck:[...deckOf([onField,HOLE,...deck]),PALADIN],enemy:fill(WABOKU),drive:steps([[I.SELECT_ACTIVATE,HOLE,'activates']],{pick:[pick]})});
 const out={sage:count(e,0,L.MZONE,SAGE),paladin:count(e,0,L.MZONE,PALADIN),girl:count(e,0,L.MZONE,DMG),hole:count(e,0,L.GRAVE,HOLE)};e.destroy();return out;
}
const fromDeck=await fallen({pick:SAGE});console.log('Immortal Dark Magic, destroyed (Deck)',fromDeck);
same(fromDeck,{sage:1,paladin:0,girl:0,hole:1},'Dark Sage from the Deck, ignoring its Summoning conditions');
const fromExtra=await fallen({pick:PALADIN});console.log('Immortal Dark Magic, destroyed (Extra Deck)',fromExtra);
same(fromExtra,{sage:0,paladin:1,girl:0,hole:1},'Dark Paladin from the Extra Deck, ignoring its Summoning conditions');
same(await fallen({artifacts:[],pick:SAGE}),{sage:0,paladin:0,girl:0,hole:1},'without the relic nothing is summoned');
same(await fallen({onField:OX,pick:SAGE}),{sage:0,paladin:0,girl:0,hole:1},'a destroyed Battle Ox is not a "Dark Magician" monster');

// Destroyed by battle: the CPU's Gate Guardian (3750) attacks Dark Magician (3100) on turn 2.
{
 const GATE=id('Gate Guardian');
 const e=await duel({script:runScript([RELIC])+'\n'+setup([[DM,'field'],[GATE,'field',1]]),deck:deckOf([DM,SAGE]),enemy:deckOf([GATE]),turns:2,drive:steps([],{pick:[SAGE]})});
 const out={dm:count(e,0,L.GRAVE,DM),sage:count(e,0,L.MZONE,SAGE)};e.destroy();console.log('Immortal Dark Magic, destroyed by battle',out);
 same(out,{dm:1,sage:1},'Dark Magician destroyed by battle calls Dark Sage');
}

// 4. Dark Sage is a "Dark Magician" monster: destroyed, it calls Dark Magician Girl with Immortal Dark Magic...
same(await fallen({onField:SAGE,pick:DMG,deck:[DMG]}),{sage:0,paladin:0,girl:1,hole:1},'a destroyed Dark Sage counts as a "Dark Magician" monster');
same(await fallen({onField:SAGE,pick:DMG,deck:[DMG],engine:plainSage}),{sage:0,paladin:0,girl:0,hole:1},'without its setcode Dark Sage would not count');
// ...and Master and Apprentice summons it from the hand, which sets off Magician's Bond (a "Dark Magician" monster summoned).
async function apprentice(engine){
 let before=null;
 const e=await duel({engine,script:runScript(['master_and_apprentice','magicians_bond'])+'\n'+setup([[DM,'field'],[SAGE,'hand'],[HOLE,'hand']]),deck:deckOf([DM,SAGE,HOLE,KNIVES,KNIVES]),enemy:fill(WABOKU),drive(e,m){
  if(m.player===0&&m.type===M.SELECT_IDLECMD&&before===null)before=count(e,0,L.HAND,KNIVES);
  return steps([[I.SELECT_ACTIVATE,HOLE,'activates']],{pick:[SAGE,KNIVES]})(e,m)}});
 const out={sage:count(e,0,L.MZONE,SAGE),added:count(e,0,L.HAND,KNIVES)+count(e,0,L.GRAVE,KNIVES)-before};e.destroy();return out;
}
const taught=await apprentice(data);console.log('Master and Apprentice + Magician\'s Bond, Dark Sage',taught);
same(taught,{sage:1,added:1},'Master and Apprentice summons Dark Sage; Magician\'s Bond then adds Thousand Knives');
same(await apprentice(plainSage),{sage:0,added:0},'without its setcode Dark Sage is neither summoned nor searched for');

// 5. A copy for player 1 (Relic Mirror; the seat translation Tag's 1v1 finals use too): the CPU Normal Summons Skilled Dark
// Magician and gets Dark Magician Girl from its Deck.
{
 const e=await duel({script:runScript([RELIC],1)+'\n'+setup([[SKILLED,'hand',1]]),deck:fill(WABOKU),enemy:deckOf([SKILLED,DMG,KNIVES]),turns:2,drive:steps([])});
 const field=cards(e,1,L.MZONE).map(c=>c.code),atk=cards(e,1,L.MZONE,SKILLED)[0]?.attack;e.destroy();console.log('CPU Immortal Dark Magic',field,atk);
 ok(field.includes(SKILLED)&&field.includes(DMG),'the CPU\'s copy Special Summons Dark Magician Girl after its Normal Summon');
 same(atk,2500,'the CPU\'s Skilled Dark Magician gains 600 ATK (1900 -> 2500)');
}

// 6. Data: recipe, price (the 4 pieces' prices), art, text; Dark Sage's text, setcode and Magician's Bond's Deck rule.
const facts=JSON.parse(py(`import content,relic_fusions,campaign as g,campaign_expansion as ce
sage=g.BY_ID[92377303]
run={'artifacts':['mage','magicians_bond','master_and_apprentice','black_chaos_rite']};made=relic_fusions.fuse(dict(run,history_mode='tag'))
print(json.dumps(dict(relic=content.ARTIFACTS['immortal_dark_magic'],info=content.ART_INFO['immortal_dark_magic'],recipe=relic_fusions.RECIPES['immortal_dark_magic'],
 pieces=sum(content.ARTIFACTS[k][1] for k in relic_fusions.RECIPES['immortal_dark_magic']),made=[m['relic'] for m in made],
 sage=dict(desc=sage['desc'],setcodes=sage['data']['setcodes']),needs=ce.DECK_NEEDS['magicians_bond'](sage),
 lotus=content.ARTIFACTS['fusion_gate'][1]==sum(content.ARTIFACTS[k][1] for k in relic_fusions.RECIPES['fusion_gate']))))`));
same(facts.recipe,['mage','magicians_bond','master_and_apprentice','black_chaos_rite'],'the four Dark Magician relics fuse');
same(facts.made,['immortal_dark_magic'],'owning all four fuses them');
ok(facts.relic[0]==='Immortal Dark Magic'&&facts.relic[1]===340&&facts.pieces===340&&facts.lotus,'priced like the other fusions: 70 + 90 + 70 + 110 = 340');
ok(facts.info.art==='Dark Magic Attack'&&facts.info.effect==='fused_immortal_dark_magic','Dark Magic Attack art; its own effect');
ok(!/Magician Staff|Magician's Bond|Master and Apprentice|Black Chaos Rite/.test(facts.relic[2]),'the text never names its pieces');
ok(facts.sage.desc.endsWith('\n\n(This card is always treated as a "Dark Magician" card.)'),'Dark Sage\'s text says it is always a "Dark Magician" card');
ok(facts.sage.setcodes.includes(0x10a2)&&facts.needs,'Dark Sage has the setcode in the game data and counts for Magician\'s Bond\'s Deck rule');
const bundles=py(`import json;from pathlib import Path
rows=json.loads(Path('data/card-archetype-rules.json').read_text(encoding='utf8'))['cards']['92377303']
print(json.dumps(sorted(k for k in ('de','es','fr','it','ja','ko','pt','zh') if rows.get(k))))`);
same(JSON.parse(bundles),['de','es','fr','it','ja','ko','pt','zh'],'Dark Sage\'s line is translated into all 8 languages');
console.log(`PASS Immortal Dark Magic and Dark Sage as a "Dark Magician" card (${checks} checks)`);
