// The shop's coin scorecard: every way a victory pays, grouped, with last duel's earnings in gold.
// The rules come from duel_rewards.py through content.battleCoinRules; this module only lays them out.
import {safe} from './experience-ui.js';

// duel_rewards.score: the victory award, the payout cap and the slow-duel brackets of pace_penalty.
const BASE_VICTORY=30,PAYOUT_CAP=400,SLOW=[[10,7],[20,12],[30,15]];
const PACE=/^Win within (\d+) total turns$/,TIER=/^(.*): ([\d,]+)\+$/;
export const SCORECARD_GROUPS=[
 ['summon','Summoning',['summons','normal_summons','special_summons','tribute_summons','flip_summons','fusion','ritual','normal_monsters','effect_monsters','high_level','level_eight','unique_monsters','races','attributes','peak_field']],
 ['battle','Battle',['attacks','damage','big_hit','effect_damage','peak_attack','peak_defense','battle_destroy','destroy','destroyed_total','banish','healed']],
 ['cards','Spells & Traps',['spells','traps','effects','sets','monster_sets','spell_trap_sets','draws']],
];
const COIN='<img src="assets/ui/coins.png" alt="" aria-hidden="true">';

export function coinScorecardMarkup(rules,last){
 last=last||{};rules=rules||[];
 const got=r=>Object.hasOwn(last,r.label);
 const pace=rules.map(r=>({...r,turns:Number(PACE.exec(r.label)?.[1])})).filter(r=>r.turns).sort((a,b)=>a.turns-b.turns);
 const paceFrom=turns=>pace.filter(r=>r.turns>=turns).reduce((sum,r)=>sum+r.coins,0);
 // Tiered milestones share a label prefix; everything else is a one-off feat.
 const tiered=new Map(),feats=[];
 for(const r of rules){
  if(PACE.test(r.label))continue;
  const m=TIER.exec(r.label);if(!m){feats.push(r);continue}
  const key=r.metric||m[1];if(!tiered.has(key))tiered.set(key,{name:m[1],metric:r.metric,tiers:[]});
  tiered.get(key).tiers.push({...r,at:m[2]});
 }
 const groupOf=metric=>SCORECARD_GROUPS.find(([,,metrics])=>metrics.includes(metric))?.[0]||'cards';
 const order=metric=>SCORECARD_GROUPS.flatMap(([,,metrics])=>metrics).indexOf(metric);
 const earned=rules.filter(got),earnedCoins=earned.reduce((sum,r)=>sum+r.coins,0);

 const stat=(value,label,extra='')=>`<div class="sc-stat ${extra}"><b>${COIN}${value}</b><span>${label}</span></div>`;
 const hero=`<div class="sc-hero">${stat(BASE_VICTORY,'Every victory')}${pace.length?stat('+'+paceFrom(pace[0].turns),`Win by turn ${pace[0].turns}`):''}${stat(PAYOUT_CAP,'Most per duel')}${earned.length?stat('+'+earnedCoins,`Last duel · ${earned.length} milestone${earned.length===1?'':'s'}`,'last'):''}</div>`;

 const paceTrack=pace.length?`<section class="sc-pace" aria-label="Pace bonuses"><h3>Pace</h3><ol class="sc-track">${pace.map(r=>`<li class="${got(r)?'got':''}" title="${safe(r.label)}: +${r.coins}"><b>+${paceFrom(r.turns)}</b><span>by turn ${r.turns}</span></li>`).join('')}${SLOW.map(([after,coins])=>`<li class="slow" title="−${coins} coins per turn after turn ${after}"><b>−${coins}</b><span>after ${after}</span></li>`).join('')}</ol><p class="sc-note">Win by a turn to collect every bonus from that turn on. Past turn ${SLOW[0][0]}, each extra turn costs coins: ${SLOW.map(([after,coins])=>`${coins} after turn ${after}`).join(', ')}, then 3 more per turn every 10 turns. Turns count both players, and a slow win still pays at least ${BASE_VICTORY}.</p></section>`:'';

 const row=g=>{const sum=g.tiers.reduce((n,t)=>n+t.coins,0);return `<div class="sc-row${g.tiers.some(got)?' got':''}"><span class="sc-name">${safe(g.name)}</span><ol class="sc-tiers">${g.tiers.map(t=>`<li class="${got(t)?'got':''}" title="${safe(t.label)}: +${t.coins}"><i>${safe(t.at)}+</i><b>+${t.coins}</b></li>`).join('')}</ol><span class="sc-total" title="All tiers">+${sum}</span></div>`};
 const groups=SCORECARD_GROUPS.map(([id,title])=>{
  const list=[...tiered.values()].filter(g=>groupOf(g.metric)===id).sort((a,b)=>order(a.metric)-order(b.metric));
  if(!list.length)return '';
  return `<section class="sc-group g-${id}"><h3>${title}<small class="sc-col">All tiers</small></h3>${list.map(row).join('')}</section>`;
 }).join('');
 const featList=feats.length?`<section class="sc-group g-feats"><h3>Feats</h3><ul class="sc-feats">${feats.map(r=>`<li class="sc-feat${got(r)?' got':''}"><b>+${r.coins}</b><span>${safe(r.label)}</span>${r.victoryOnly?'<em>At victory</em>':''}</li>`).join('')}</ul></section>`:'';

 const tabs=[['all','All'],...SCORECARD_GROUPS.map(([id,title])=>[id,title]),...(feats.length?[['feats','Feats']]:[])];
 // CSS-only filter: each radio shows its group, so the dialog needs no handler of its own.
 const milestones=`<div class="sc-milestones">${tabs.map(([id],i)=>`<input type="radio" name="sc-tab" id="sc-tab-${id}" ${i?'':'checked'}>`).join('')}<div class="sc-tabs" role="group" aria-label="Show milestones">${tabs.map(([id,title])=>`<label for="sc-tab-${id}">${title}</label>`).join('')}</div><div class="sc-groups">${groups}${featList}</div></div>`;

 const legend=`<p class="sc-legend">Every milestone pays once per duel, and its tiers stack.${earned.length?' <span class="sc-earned"><span class="sc-key"></span>Earned in your last duel.</span>':''}</p>`;
 return `<div class="scorecard">${hero}${legend}${paceTrack}${milestones}</div>`;
}
