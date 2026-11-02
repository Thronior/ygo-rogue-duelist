// The 2026-11-02 curses in the real core: Shield Breaker, Relic Mirror, Hand Limiter, No Specials Allowed and Miller.
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {MobileDuel,M,R,I,L} from './web/duel.js';
import {curseDescription,curseIconFile} from './web/experience-ui.js';
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json');let checks=0;
const same=(a,b,why)=>{assert.deepEqual(a,b,why);checks++};const ok=(v,why)=>{assert.ok(v,why);checks++};
const id=n=>{const c=meta.cards.find(c=>c.name===n);assert(c,n);return c.id};
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const py=code=>execFileSync(python,['-B','-c',`import sys;sys.path.insert(0,'.')\n${code}`],{cwd:root,maxBuffer:1<<26}).toString();
const script=(curses=[],level=0,artifacts=[],extra={})=>py(`import json,passives;print(passives.script(json.loads(${JSON.stringify(JSON.stringify({curses,artifacts,challenge_level:level,...extra}))})))`);
const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,json('android/web/scripts.json')]);
const count=(side,zone)=>e.query(side,zone).filter(Boolean).length;
const idle=()=>{for(let i=0;i<80&&(e.pending?.type!==M.SELECT_IDLECMD||e.pending?.player!==0);i++)e.respond(e.auto());return e.pending};
const until=turn=>{for(let i=0;i<400&&e.turn<turn&&e.pending&&!e.finished;i++)e.respond(e.auto())};
const start=(mine,enemy,s)=>e.start(Array(40).fill(mine),Array(40).fill(enemy),8000,8000,5,3,[],[],s);
const can=name=>idle().activates.some(x=>x.code===id(name));
const OX=id('Battle Ox'),POT=id('Pot of Greed'),GOAT=id('Scapegoat'),REBORN=id('Monster Reborn'),GRAVE=id('The Shallow Grave');
// Plays one of your cards, answering prompts automatically, and lists the prompt types it raised.
const activate=name=>{const m=idle(),k=m.activates.findIndex(x=>x.code===id(name));assert(k>=0,name);const seen=[];e.respond({type:R.SELECT_IDLECMD,action:I.SELECT_ACTIVATE,index:k});for(let i=0;i<30&&e.pending&&!(e.pending.type===M.SELECT_IDLECMD&&e.pending.player===0);i++){seen.push(e.pending.type);e.respond(e.auto())}return seen};
// What the opponent could activate at its first idle prompt.
const theirOptions=()=>{for(let i=0;i<400&&e.pending&&!e.finished;i++){const m=e.pending;if(m.type===M.SELECT_IDLECMD&&m.player===1)return m.activates.map(x=>x.code);e.respond(e.auto())}return []};
// A monster already in each GY, for Monster Reborn and The Shallow Grave.
const graveOx=`local g=Effect.GlobalEffect() g:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS) g:SetCode(EVENT_PHASE_START+PHASE_DRAW) g:SetOperation(function(e) e:Reset() Duel.SendtoGrave(Duel.CreateToken(0,${OX}),REASON_RULE) Duel.SendtoGrave(Duel.CreateToken(1,${OX}),REASON_RULE) end) Duel.RegisterEffect(g,0)`;

// Shield Breaker.
{
 const sets=s=>{start(OX,POT,s);const m=idle();return [m.monster_sets.length>0,m.summons.length>0]};
 same(sets(script()),[true,true],'monsters can normally be Set');
 same(sets(script(['shield_breaker'])),[false,true],'base: no Normal Set, Normal Summon is fine');
 same(sets(script(['shield_breaker'],2)),[false,true],'amplified: no Normal Set either');
 start(POT,OX,script(['shield_breaker']));ok(idle().spell_sets.length>0,'Spells can still be Set');
 start(GOAT,OX,script(['shield_breaker']));activate('Scapegoat');same(count(0,L.MZONE),4,'base: a Special Summon in Defense Position still works');
 start(GRAVE,OX,script(['shield_breaker'])+'\n'+graveOx);ok(can('The Shallow Grave'),'base: so does a face-down Special Summon');
 start(GOAT,OX,script(['shield_breaker'],2));ok(!can('Scapegoat'),'amplified: Scapegoat cannot be activated');
 start(GRAVE,OX,script(['shield_breaker'],2)+'\n'+graveOx);ok(!can('The Shallow Grave'),'amplified: nor can a face-down Special Summon');
 start(REBORN,OX,script([],0)+'\n'+graveOx);ok(activate('Monster Reborn').includes(M.SELECT_POSITION),'Monster Reborn normally offers a position');
 start(REBORN,OX,script(['shield_breaker'],2)+'\n'+graveOx);const prompts=activate('Monster Reborn');
 ok(!prompts.includes(M.SELECT_POSITION),'amplified: Monster Reborn offers no Defense Position');
 same(e.query(0,L.MZONE).filter(Boolean)[0].position,1,'amplified: and summons in Attack Position');
 start(POT,GOAT,script(['shield_breaker'],2));ok(theirOptions().includes(GOAT),'amplified: the opponent is unaffected');
 // The list only names Special Summon effects, so a card's other effects stay usable.
 const list=py(`import approved_relic_effects as a;print(a.DEFENSE_SUMMON_EFFECTS)`).trim().split(',');
 const lua=n=>[`runtime/script/official/c${n}.lua`].map(p=>fs.readFileSync(root+p,'utf8'))[0];
 ok(list.every(n=>/CATEGORY_SPECIAL_SUMMON/.test(lua(n))&&/POS_FACE(UP|DOWN)_DEFENSE/.test(lua(n))),'every listed card really has a Defense Position summon effect');
}

// No Specials Allowed.
{
 start(GOAT,GOAT,script(['no_specials']));ok(!can('Scapegoat'),'base: you cannot Special Summon');ok(!theirOptions().includes(GOAT),'base: nor can the opponent');
 start(GOAT,GOAT,script(['no_specials'],2));ok(!can('Scapegoat'),'amplified: you cannot Special Summon');ok(theirOptions().includes(GOAT),'amplified: but the opponent can');
 start(OX,POT,script(['no_specials']));ok(idle().summons.length>0,'Normal Summons are unaffected');
}

// Hand Limiter: read after your End Phase, with Pot of Greed keeping the hand over any limit.
{
 const hand=(curses,level=0,artifacts=[])=>{start(POT,OX,script(curses,level,artifacts));until(2);return count(0,L.HAND)};
 same(hand([]),6,'the normal limit is 6');
 same(hand(['hand_limiter']),4,'base: reduced by 2');
 same(hand(['hand_limiter'],2),3,'amplified: reduced by 3');
 same(hand(['hand_limiter','hand_limiter']),2,'base: it stacks');
 same(hand(Array(4).fill('hand_limiter')),0,'base: down to the minimum of 0, never below it');
 same(hand(['hand_limiter','hand_limiter'],2),0,'amplified: down to the minimum of 0');
 same(hand(['hand_limiter','hand_limiter','hand_limiter'],2),0,'and never below it');
 same(hand(['hand_limiter'],0,['cursed_empty_hand_pact']),2,'it comes off a relic limit');
 start(OX,OX,script(['hand_limiter'],2,[],{first_player:1}));until(2);same(count(0,L.HAND),5,'the skipped first turn discards nothing');
}

// Miller: once, on your first Standby Phase.
{
 const deck=()=>count(0,L.DECK);
 start(OX,POT,script(['miller']));idle();same([deck(),count(0,L.GRAVE)],[24,10],'base: the top 10 cards, after your 1 draw');
 until(3);idle();same(deck(),23,'once per Duel: your next turn only draws');
 start(OX,POT,script(['miller'],2));idle();same([deck(),count(0,L.GRAVE)],[17,17],'amplified: half of the 34 cards left');
 start(OX,POT,script(['miller'],0,[],{first_player:1}));until(2);same(deck(),35,'going second, the skipped turn does not count');
 until(3);idle();same(deck(),24,'it happens on your first real turn');
 same(e.finished?1:0,0,'and the duel continues');
}

// Relic Mirror.
{
 const mirror=(artifacts,mirrored,level=0,curses=['relic_mirror'])=>script(curses,level,artifacts,{mirrored_relics:mirrored,round:2});
 const opponentAttack=s=>{start(POT,OX,s);until(3);return e.query(1,L.MZONE).filter(Boolean)[0]?.attack};
 same(opponentAttack(script()),1700,'Battle Ox has 1700 ATK');
 same(opponentAttack(mirror(['sword'],['sword'])),1800,'the opponent gets your ATK relic');
 same(opponentAttack(mirror(['sword'],[])),1700,'and nothing without a mirrored relic');
 same(opponentAttack(mirror(['sword'],['sword'],0,[])),1700,'and nothing without the curse');
 const taken=s=>{start(POT,POT,s);until(3);return 8000-e.lp[0]};
 same(taken(mirror(['flame'],['flame'])),meta.artifactInfo.flame.amount,'a burn relic hits you at the end of the opponent\'s turn');
 same(e.errors,[],'and runs cleanly');
 // Every relic that acts in a duel, copied at once, across several turns.
 const all=JSON.parse(py(`import json,passives,content;print(json.dumps([k for k in content.ART_INFO if k!='magic_mirror' and passives.acts_in_duel(k)]))`));
 ok(all.length>100,'most relics act in a duel');
 start(OX,OX,mirror([],all,2));until(6);same(e.errors,[],`all ${all.length} relics run on the opponent's side without a script error`);
}
e.destroy();

// Text, icons and drawing.
const keys=['shield_breaker','relic_mirror','hand_limiter','no_specials','miller'];
const rows=JSON.parse(py(`import json,challenge_levels as c,content,feedback_update as f,random
keys=${JSON.stringify(keys)}
print(json.dumps(dict(amplified=[c.curse_description(dict(challenge_level=2),k,content.CURSES[k][1]) for k in keys],unique=[f.dedupe_curses([k,k]) for k in keys],drawn=[f.draw_curses(random.Random(1),80,existing=[k]).count(k) for k in keys])))`));
keys.forEach((key,i)=>{
 ok(meta.curses[key]?.[1],key+' is in the game');
 same(rows.amplified[i],curseDescription(meta,key,2),key+': Python and the client share the amplified text');
 ok(rows.amplified[i]!==meta.curses[key][1],key+': the amplified text differs');
 ok(!curseIconFile(key).includes('cancel-out-effect'),key+': it has its own icon');
});
same(rows.unique,[['shield_breaker'],['relic_mirror'],['hand_limiter','hand_limiter'],['no_specials'],['miller']],'only Hand Limiter stacks');
same(rows.drawn.map(n=>n>0),[false,false,true,false,false],'the rest are never drawn twice');
console.log(`PASS 2026-11-02 curses: ${checks} checks`);
