// The 10K survey is closed and its popup is a Family Feud style results quiz (user, 2026-11-27): survey.js,
// survey-results.js, survey-results.json (tools/survey_results_snapshot.py), multiplayer/global-stats/wrangler.jsonc.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {playlists} from './web/music-config.js';
import {ROUNDS,roundOptions,surveyOptions,placeColor,points,bestScore,rankTitle,QUIZ_MUSIC} from './web/survey-results.js';

const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const data=JSON.parse(read('./web/survey-results.json'));
const content=JSON.parse(read('./web/content.json'));
const survey=read('./web/survey.js');

// Closed: the client sends nothing, and the stats Worker refuses new answers once deployed.
assert.ok(!/fetch\(|\/v1\/survey|sendBeacon/.test(survey),'survey.js must not send answers any more');
assert.match(read('../multiplayer/global-stats/wrangler.jsonc'),/"SURVEY_CLOSED":\s*"true"/);
assert.ok(!/fetch\([^)]*(stats|survey\.csv|\/v1\/)/.test(read('./web/survey-results.js')),'results are a bundled snapshot, never fetched from a server');

// The snapshot: multiple-choice tallies only, no wishes, IDs or times; the popup's count matches it.
assert.equal(data.survey,'10k-2026');
assert.equal(Number(/SURVEY_PLAYERS=(\d+)/.exec(survey)[1]),data.players);
assert.ok(!/wish|response_id|received_utc/.test(read('./web/survey-results.json')));
for(const r of ROUNDS){
 const q=data.questions[r.id];assert.ok(q&&q.counts.length,`${r.id} missing`);
 assert.equal(q.answered,q.counts.reduce((n,[,c])=>n+c,0));
 for(let i=1;i<q.counts.length;i++)assert.ok(q.counts[i-1][1]>=q.counts[i][1],`${r.id} not sorted`);
}
assert.ok(data.places.top.every(([,n])=>n>=3),'places picked by fewer than 3 players are folded into "other"');

// Every answer is a shipped character, relic or online mode, so its picture and translation resolve.
const known=new Set([...content.characters.map(c=>c.name),...Object.values(content.artifacts).map(a=>a[0]),'Tag Duels','Draft Duels','Ultimate Collector']);
for(const r of ROUNDS)for(const [name] of data.questions[r.id].counts)assert.ok(known.has(name),`${r.id}: unknown answer ${name}`);

// Points are the whole-number % of players who gave the answer.
assert.equal(points(1,3),33);assert.equal(points(2,3),67);assert.equal(points(5,0),0);
// A round: the top 5 hidden on the board, and every option the survey offered as a choice (user, 2026-11-27: "pick
// an answer out of all the characters, not just a limited list"), sorted by name, no repeats.
for(const r of ROUNDS){
 const q=data.questions[r.id],names=surveyOptions(content,r.id),o=roundOptions(q,names);
 assert.deepEqual(o.board.map(x=>x.name),q.counts.slice(0,5).map(x=>x[0]));
 assert.equal(new Set(o.choices.map(x=>x.name)).size,o.choices.length);
 for(const n of names)assert.ok(o.choices.some(x=>x.name===n),`${r.id}: ${n} not offered`);
 for(const [n] of q.counts)assert.ok(o.choices.some(x=>x.name===n),`${r.id}: answer ${n} not offered`);
 for(const x of o.choices)assert.equal(x.pts,points(x.count,q.answered));
 if(names.length>3)for(let i=1;i<o.choices.length;i++)assert.ok(o.choices[i-1].name.localeCompare(o.choices[i].name)<=0,`${r.id} not sorted`);
}
const playable=new Set(content.playable.map(i=>content.characters[i].name));
assert.equal(surveyOptions(content,'fav_character').length,playable.size);
assert.ok(surveyOptions(content,'fav_relic').length>100,'every normal relic is offered');
assert.deepEqual(roundOptions(data.questions.fav_online_mode,surveyOptions(content,'fav_online_mode')).choices.map(x=>x.name),['Tag Duels','Draft Duels','Ultimate Collector']);
assert.ok(!surveyOptions(content,'fav_opponent').includes('Copycat'));
const best=bestScore(data);
assert.equal(best,ROUNDS.reduce((n,r)=>n+points(data.questions[r.id].counts[0][1],data.questions[r.id].answered),0));
assert.equal(rankTitle(best,best),'Survey Master');assert.equal(rankTitle(0,best),'Wild Card');
assert.equal(rankTitle(Math.ceil(best*.6),best),'Crowd Reader');assert.equal(rankTitle(Math.ceil(best*.35),best),'Rising Duelist');

// The quiz's track and art ship with the game.
// The map (user, 2026-11-27): every place a player named has a shape or a dot; white at 0%, dark blue at 25% and up.
const map=JSON.parse(read('./web/survey-map.json')),mapped=new Set([...map.paths.map(p=>p[0]),...map.dots.map(d=>d[0])]);
for(const code of [...data.places.top.map(p=>p[0]),...data.places.few])assert.ok(mapped.has(code),`${code} missing from the map`);
assert.ok(!data.places.few.some(c=>data.places.top.some(([t])=>t===c)));
assert.equal(placeColor(0),'rgb(255,255,255)');assert.equal(placeColor(25),'rgb(8,48,107)');assert.equal(placeColor(60),'rgb(8,48,107)');
// One player is already a bright blue (user: "bright blue is 1 player"), and shares keep getting darker.
const rgb=c=>c.match(/\d+/g).map(Number),one=rgb(placeColor(100/data.places.answered));assert.ok(one[2]>=240&&one[0]<=120,`1 player should be bright blue, got ${one}`);
for(let i=1;i<25;i++)assert.ok(rgb(placeColor(i+1))[2]<=rgb(placeColor(i))[2]);
assert.ok(read('./web/survey-map.json').length<200_000,'map stays small');
// The quiz plays Dark Magician Girl's Legendary summon music.
assert.match(read('./web/legendary-summon.js'),/hearts\?'summon-cute'/);assert.match(read('./web/legendary-summon.js'),/38033121:\{name:'Dark Magician Girl'[^}]*hearts:true/);
assert.equal(QUIZ_MUSIC,'summon-cute');assert.ok(playlists[QUIZ_MUSIC]?.length);
for(const id of playlists[QUIZ_MUSIC])assert.ok(fs.existsSync(new URL(`./web/assets/music/${id}.m4a`,import.meta.url)),id);
for(const f of ['assets/random-hat.png','assets/cards/38033121.jpg','assets/sfx/summon-38033121.mp3','survey-results.css'])assert.ok(fs.existsSync(new URL('./web/'+f,import.meta.url)),f);

// Translated in all 8 languages, each naming its own version of the show (Korean has none: Family Feud).
const show={de:'Familien-Duell',es:'100 mexicanos dijeron',fr:'Une famille en or',it:"Famiglie d'Italia",ja:'クイズ100人に聞きました',ko:'Family Feud',pt:'Tem ou Não Tem',zh:'家庭赛乐赛'};
const english=['Hover or tap a country. Scroll or pinch to zoom.','Zoom in','1–2 players','{0} players ({1}%)','No one picked it.','Less than 1% of players picked it.','Thank you for your votes on the 10K players survey!','See results','Survey says!','Start the quiz','Continue to results','Family Feud style quiz','Pick the answer you think most players gave.','Characters: loved vs. disliked','Where players are from',...ROUNDS.map(r=>r.label),...ROUNDS.map(r=>r.q)];
for(const [lang,name] of Object.entries(show)){
 const ui=JSON.parse(read(`./web/i18n/${lang}.json`)).ui;
 for(const s of english)assert.ok(ui[s]&&ui[s]!==s||lang==='ko'&&s==='Family Feud style quiz',`${lang}: "${s}" not translated`);
 for(const s of ['Family Feud style quiz','{0} players answered. Can you guess what they picked? Find out in a Family Feud style quiz.','See what {0} players picked, in a Family Feud style quiz.'])assert.ok(ui[s].includes(name),`${lang}: "${s}" should name ${name}`);
}
console.log('PASS survey results quiz: closed survey, snapshot, rounds and scoring, assets, 8 languages');
