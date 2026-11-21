// Hidden coin feats (user, 2026-11-20; duel_rewards.SECRET): sleeve-metrics.js records the card whose attack dealt the
// winning damage (finisher), how far past 0 the final hit went (bestOverkill), the lowest LP the player fell to
// (lowestLp), a win from full LP within one turn (oneTurnKill) and both sides' monster counts at the end.
// tools/test_hidden_coin_feats_nov20.py checks the payouts. Solo and Tag (the team is seat 0).
import fs from 'node:fs';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
const {MobileDuel}=await import('./web/duel.js');
const {TagDuel}=await import('./web/tag-duel.js');
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json'),scripts=json('android/web/scripts.json');
const id=n=>meta.cards.find(c=>c.name===n).id;
let checks=0;const ok=(v,why)=>{assert(v,why);checks++};

// Level 8 Normal Monsters only: nobody can summon, so the one monster put on seat 0's field decides the duel.
const BEWD=id('Blue-Eyes White Dragon'),ARM=id('Left Arm of the Forbidden One');
const deck=Array(40).fill(BEWD),armDeck=[ARM,...Array(39).fill(BEWD)];
// At startup, Special Summon CODE from seat 0's Deck to its field; optionally set seat 0's LP first.
const startup=(code,lp)=>`do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_STARTUP) e:SetOperation(function(e) e:Reset() ${lp?`Duel.SetLP(0,${lp})`:''} local c=Duel.GetFirstMatchingCard(Card.IsCode,0,LOCATION_DECK,0,nil,${code}) if c then Duel.SpecialSummon(c,0,0,0,true,false,POS_FACEUP_ATTACK) end end) Duel.RegisterEffect(e,0) end`;

function play(e,s){for(let i=0;i<6000&&!s.finished;i++){if(!e.pending)break;s=e.respond(e.auto())}return s}
function finish(e,label){
 assert.deepEqual(e.errors||[],[],label);
 ok(e.finished&&e.finished.player===0&&Number(e.finished.reason)===1,`${label}: seat 0 wins on LP (${JSON.stringify(e.finished)})`);
 const event=e.summary().find(x=>x.kind==='sleeve_metrics');
 ok(event&&event.winReason===1,`${label}: the duel reports its win reason`);
 ok(!('oppTurnLp' in event)&&!('oppPeakLp' in event),`${label}: the turn bookkeeping stays out of the summary`);
 return event;
}
async function solo(myDeck,enemyLP,passives){
 const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,scripts]);
 play(e,e.start(myDeck,deck,8000,enemyLP,5,11,[],[],passives));return e;
}

// 1. Blue-Eyes (3000) attacks 1,000 LP: the finisher, 2,000 past 0, from full LP in one turn, 1 monster against 0.
{const e=await solo(deck,1000,startup(BEWD));const ev=finish(e,'Blue-Eyes OTK');
 ok(ev.finisher===BEWD,`finisher is Blue-Eyes (${ev.finisher})`);ok(ev.bestOverkill===2000,`overkill 2000 (${ev.bestOverkill})`);
 ok(ev.oneTurnKill===true,'a 1,000 LP opponent killed in one turn counts as a One Turn Kill');
 ok(ev.lowestLp===null,'no LP lost: lowestLp stays null');ok(ev.monsters===1&&ev.oppMonsters===0,`monster counts ${ev.monsters}/${ev.oppMonsters}`);
 e.destroy()}
// 2. Two hits on 4,000 LP: the last one starts from 1,000 LP, so no One Turn Kill; the overkill is the last hit's.
{const e=await solo(deck,4000,startup(BEWD));const ev=finish(e,'Blue-Eyes over two turns');
 ok(ev.oneTurnKill===false,'damage on an earlier turn means no One Turn Kill');ok(ev.bestOverkill===2000,`overkill 2000 (${ev.bestOverkill})`);
 e.destroy()}
// 3. An Exodia arm (200 ATK) finishes 100 LP, after seat 0's LP was set to 800: finisher, weak finish, lowest LP.
{const e=await solo(armDeck,100,startup(ARM,800));const ev=finish(e,'Left Arm slap');
 ok(ev.finisher===ARM,`finisher is the Left Arm (${ev.finisher})`);ok(ev.weakFinish===true,'a 200 ATK finisher is a weak finish');
 ok(ev.lowestLp===800,`lowest LP 800 (${ev.lowestLp})`);
 e.destroy()}
// 4. Tag: the same Blue-Eyes OTK reports the same fields for the team.
{const e=await new TagDuel([...meta.cards,...meta.tokenCards]).init([data,scripts]);
 play(e,e.startTag({teams:[[{main:deck},{main:deck}],[{main:deck},{main:deck}]],lp:8000,enemyLP:1000,seed:11,passives:startup(BEWD)}));
 const ev=finish(e,'Tag Blue-Eyes OTK');
 ok(ev.finisher===BEWD&&ev.oneTurnKill===true&&ev.bestOverkill===2000,`Tag: finisher ${ev.finisher}, OTK ${ev.oneTurnKill}, overkill ${ev.bestOverkill}`);
 ok(e.snapshotFor(0).tag.rewardEvents.some(x=>x.kind==='sleeve_metrics'&&x.finisher===BEWD),'Tag: the reward events carry the summary');
 e.destroy()}
// 5. The shop Coin scorecard lists only the hidden feats this player found; the victory lines mark an earned one.
{const {coinScorecardMarkup}=await import('./web/coin-scorecard.js');const {victoryRewardsMarkup}=await import('./web/experience-ui.js');
 const secret=meta.secretCoinRules,rules=meta.battleCoinRules,luck=secret.find(r=>r.id==='lady_luck'),draw=secret.find(r=>r.id==='last_draw');
 ok(secret.length===15&&!rules.some(r=>secret.some(s=>s.label===r.label)),'hidden feats are not in battleCoinRules');
 const none=coinScorecardMarkup(rules,{});ok(!none.includes('Hidden feats')&&!secret.some(r=>none.includes(r.label)),'nothing found: no hidden feat is shown');
 const found=coinScorecardMarkup(rules,{[draw.label]:draw.coins},[luck,draw]);
 ok(found.includes('Hidden feats')&&found.includes(luck.label)&&found.includes(draw.label)&&!found.includes(secret.find(r=>r.id==='three_gods').label),'found feats only');
 ok(/sc-feat secret got"><b>\+100<\/b><span>The last draw/.test(found)&&/sc-feat secret"><b>\+15<\/b><span>Lady Luck/.test(found),'the one earned last duel is marked');
 const lines=victoryRewardsMarkup({Victory:30,[draw.label]:100},meta.battleBonusLabels,secret.map(r=>r.label));
 ok(lines.startsWith('<p class="row secret-feat"><span><small>Hidden feat!</small>The last draw</span><b>+100</b></p>'),'victory lines put the hidden feat first');}
console.log(`PASS hidden coin feats: ${checks} checks`);
