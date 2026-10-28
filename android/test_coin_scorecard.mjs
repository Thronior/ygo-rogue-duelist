// The shop coin scorecard lists every coin rule exactly once, adds up the pace ladder and marks last duel's earnings.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {coinScorecardMarkup,SCORECARD_GROUPS} from './web/coin-scorecard.js';

const content=JSON.parse(fs.readFileSync(new URL('./web/content.json',import.meta.url),'utf8'));
const rules=content.battleCoinRules;
assert.ok(rules.length>100&&rules.every(r=>r.metric&&r.threshold!==undefined),'the build sends each rule with its metric and threshold');
const html=coinScorecardMarkup(rules,{});
const count=(text,needle)=>text.split(needle).length-1;
const decode=s=>s.replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>');

// Every tier and pace step carries its full label once; feats show theirs as text.
for(const r of rules){
 const shown=count(decode(html),`title="${r.label}: +${r.coins}"`)+count(decode(html),`<span>${r.label}</span>`);
 assert.equal(shown,1,`${r.label} appears exactly once`);
}
// Tiered metrics all have a group, so none fall back to the last one by accident.
const grouped=new Set(SCORECARD_GROUPS.flatMap(([,,metrics])=>metrics));
for(const r of rules)if(/: [\d,]+\+$/.test(r.label))assert.ok(grouped.has(r.metric),`${r.metric} has a scorecard group`);

// The pace ladder stacks: winning by a turn collects every bonus from that turn on.
const pace=rules.map(r=>[Number(/^Win within (\d+) total turns$/.exec(r.label)?.[1]),r.coins]).filter(([t])=>t).sort((a,b)=>a[0]-b[0]);
const ladder=[...html.matchAll(/<li class="[^"]*" title="Win within \d+ total turns: \+\d+"><b>\+(\d+)<\/b>/g)].map(m=>+m[1]);
assert.deepEqual(ladder,pace.map(([t])=>pace.filter(([u])=>u>=t).reduce((n,[,c])=>n+c,0)));
assert.equal(ladder[0],205,'the fastest win pays the documented +205');
assert.match(html,/<b><img[^>]*>30<\/b><span>Every victory<\/span>/);
assert.match(html,/<b><img[^>]*>400<\/b><span>Most per duel<\/span>/);
assert.doesNotMatch(html,/Last duel/,'no last-duel tile before any duel');

// Last duel's milestones turn gold and are totalled.
const last={'Victory':30,[rules[0].label]:rules[0].coins,[rules[1].label]:rules[1].coins,'Play your signature card':10};
const marked=coinScorecardMarkup(rules,last);
assert.match(marked,new RegExp(`\\+${rules[0].coins+rules[1].coins+10}</b><span>Last duel · 3 milestones`));
assert.equal(count(marked,'<li class="got"'),2,'two tiers are gold');
assert.equal(count(marked,'sc-feat got'),1,'the signature feat is gold');
assert.equal(count(marked,'type="radio"'),SCORECARD_GROUPS.length+2,'All, one tab per group, and Feats');
console.log(`PASS coin scorecard: ${rules.length} rules each shown once, pace ladder ${ladder.join('/')}, last-duel marking`);
