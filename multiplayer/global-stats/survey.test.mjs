// 10K player survey route (survey.mjs + worker.mjs): validation, retries, the per-address cap, closing, the admin CSV.
import assert from 'node:assert/strict';
import worker,{SurveyAnswers} from './worker.mjs';
import {surveyRow,surveyCsv,COLUMNS} from './survey.mjs';
const data=new Map();let writes=0;
const storage={get:async k=>structuredClone(data.get(k)),put:async(k,v)=>{writes++;data.set(k,structuredClone(v))},
 list:async({prefix,startAfter,limit})=>new Map([...data].filter(([k])=>k.startsWith(prefix)&&(!startAfter||k>startAfter)).sort(([a],[b])=>a.localeCompare(b)).slice(0,limit))};
const env={SURVEY_ADMIN_TOKEN:'test-token-0123456789'};
const object=new SurveyAnswers({storage},env);
env.SURVEY={idFromName:name=>name,get:()=>object};
const answer=(over={})=>({survey:'10k-2026',id:crypto.randomUUID(),country:'FR',countryName:'France',answers:{fav_character:'Yami Yugi',fav_relic:'=HYPERLINK("x")'},wish:'More "Toons", please\nand Draft.',...over});
const post=(body,ip='1.2.3.4')=>worker.fetch(new Request('https://example/v1/survey',{method:'POST',headers:{'CF-Connecting-IP':ip},body:typeof body==='string'?body:JSON.stringify(body)}),env,{waitUntil(){}});
const csv=(token=env.SURVEY_ADMIN_TOKEN)=>worker.fetch(new Request('https://example/v1/survey.csv',{headers:token?{Authorization:'Bearer '+token}:{}}),env,{waitUntil(){}});

// Accepted once; a retry of the same answer is accepted without a second row.
const first=answer();
assert.equal((await post(first)).status,200);assert.equal(writes,1);
assert.equal((await post(first)).status,200);assert.equal(writes,1,'a retried answer is stored once');
// Everything skipped is still a valid answer (an empty row says the player took part).
assert.equal((await post(answer({country:'',countryName:'',answers:{},wish:''}))).status,200);
// Refused: other surveys, unknown fields, bad IDs or countries, non-text answers, junk.
for(const bad of [answer({survey:'other'}),{...answer(),language:'fr'},answer({id:'x'}),answer({id:"'; DROP TABLE"}),answer({country:'France'}),answer({answers:{fav_character:3}}),answer({answers:{device:'x'}}),answer({answers:[1]}),answer({wish:{}}),'not json','null'])
 assert.equal((await post(bad)).status,400,JSON.stringify(bad).slice(0,60));
// Oversized bodies stop early.
assert.equal((await post(answer({wish:'x'.repeat(9000)}))).status,413);
// Long text is cut, control characters removed.
assert.equal(surveyRow(answer({wish:'a'.repeat(2000)})).wish.length,1000);
assert.equal(surveyRow(answer({answers:{fav_relic:'Dice\u0000 Jar'}})).fav_relic,'Dice Jar');
// Ten answers per address per day.
for(let i=0;i<8;i++)assert.equal((await post(answer())).status,200);
assert.equal((await post(answer())).status,429,'the 11th answer from one address today is refused');
assert.equal((await post(answer(),'5.6.7.8')).status,200,'another address still answers');
// The CSV: admin only, every row once, formula-safe, quoted.
assert.equal((await csv(null)).status,401);assert.equal((await csv('wrong-token-0123456789')).status,401);
const res=await csv();assert.equal(res.status,200);assert.match(res.headers.get('Content-Type'),/text\/csv/);
const text=await res.text(),lines=text.replace(/^﻿/,'').trim().split('\r\n');
assert.equal(lines[0],COLUMNS.join(','));
assert.equal(data.size,11);
assert(text.includes(first.id)&&text.includes("'=HYPERLINK"),'formula cells are defused');
assert(text.includes('"More ""Toons"", please\nand Draft."'),'quotes and line breaks are quoted');
assert(!text.includes('1.2.3.4'),'no address is stored');
assert.equal(surveyCsv([]).replace(/^﻿/,'').trim(),COLUMNS.join(','));
// Closing the survey: clients drop their waiting answer on 410.
env.SURVEY_CLOSED='true';assert.equal((await post(answer(),'9.9.9.9')).status,410);
// A deployment without a token never serves the CSV.
assert.equal((await worker.fetch(new Request('https://example/v1/survey.csv',{headers:{Authorization:'Bearer '}}),{...env,SURVEY_ADMIN_TOKEN:''},{})).status,401);
console.log('PASS survey answers: validation, retries stored once, per-address cap, admin-only formula-safe CSV, closing');
