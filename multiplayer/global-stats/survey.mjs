// 10K player survey answers (android/web/survey.js, user 2026-11-24). Its own Durable Object (SURVEY, one object
// "survey-v1"), so the STATS namespace, class and global-v1 object stay exactly as AGENTS.md requires.
//   POST /v1/survey       one player's answers; the same response ID again is accepted and not stored twice
//   GET  /v1/survey.csv   every answer as CSV; needs "Authorization: Bearer <SURVEY_ADMIN_TOKEN>" (tools/export_survey.mjs)
// A row holds only what the player chose to send, plus when it arrived. No address, device or build is stored.
// The columns match tools/survey_csv.py, which records the local QA demo.
export const SURVEY_ID='10k-2026';
export const ANSWERS=['fav_character','least_character','fav_relic','fav_shadow_relic','fav_fused_relic','fav_opponent','least_opponent','fav_online_mode'];
export const COLUMNS=['received_utc','response_id','country_code','country',...ANSWERS,'wish'];
const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Cache-Control':'no-store'};
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
const MAX_BODY=8192,ID=/^[0-9a-fA-F-]{8,64}$/,COUNTRY=/^[A-Z]{2}$/;
// Answers per address per day, counted in memory only: enough for a family or a school sharing one connection.
const PER_ADDRESS=10;
const clean=(value,limit)=>String(value??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').trim().slice(0,limit);

// The answer as a stored row, or null when it isn't a valid answer to this survey.
export function surveyRow(data,now=Date.now()){
 if(!data||typeof data!=='object'||Array.isArray(data)||data.survey!==SURVEY_ID)return null;
 if(Object.keys(data).some(k=>!['survey','id','country','countryName','answers','wish'].includes(k)))return null;
 const id=String(data.id||''),country=String(data.country||''),answers=data.answers??{};
 if(!ID.test(id)||(country&&!COUNTRY.test(country)))return null;
 if(typeof answers!=='object'||Array.isArray(answers)||Object.keys(answers).some(k=>!ANSWERS.includes(k))||Object.values(answers).some(v=>typeof v!=='string'))return null;
 if(typeof (data.wish??'')!=='string'||typeof (data.countryName??'')!=='string')return null;
 const row={received_utc:new Date(now).toISOString().slice(0,16).replace('T',' '),response_id:id.toLowerCase(),country_code:country,country:country?clean(data.countryName,80):''};
 for(const k of ANSWERS)row[k]=clean(answers[k],80);
 row.wish=clean(data.wish,1000);
 return row;
}

// RFC 4180 with a byte-order mark for Excel. A cell starting with = + - @ gets a ' so a spreadsheet never runs it.
export function surveyCsv(rows){
 const cell=v=>{let s=String(v??'');if(/^[=+\-@]/.test(s))s="'"+s;return /[",\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s};
 return '﻿'+[COLUMNS.join(','),...rows.map(r=>COLUMNS.map(k=>cell(r[k])).join(','))].join('\r\n')+'\r\n';
}

// Constant-time token check.
export function adminAllowed(request,env){
 const token=String(env?.SURVEY_ADMIN_TOKEN||''),given=(request.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');
 if(token.length<16||given.length!==token.length)return false;
 let diff=0;for(let i=0;i<token.length;i++)diff|=token.charCodeAt(i)^given.charCodeAt(i);
 return diff===0;
}

export class SurveyAnswers{
 constructor(ctx,env){this.ctx=ctx;this.env=env;this.addresses=new Map();this.day=''}
 async fetch(request){
  const path=new URL(request.url).pathname;
  if(request.method==='GET'&&path==='/v1/survey.csv')return this.export();
  if(request.method!=='POST'||path!=='/v1/survey')return reply({error:'Not found'},404);
  // SURVEY_CLOSED=true ends the survey: clients drop their waiting answer on 410.
  if(String(this.env?.SURVEY_CLOSED||'')==='true')return reply({error:'This survey has ended.'},410);
  const reader=request.body?.getReader();if(!reader)return reply({error:'Missing body'},400);
  let size=0,raw='';const decoder=new TextDecoder();
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_BODY){await reader.cancel();return reply({error:'Too large'},413)}raw+=decoder.decode(value,{stream:true})}
  raw+=decoder.decode();
  let row=null;try{row=surveyRow(JSON.parse(raw))}catch{}
  if(!row)return reply({error:'Invalid survey answer'},400);
  const key='a:'+row.response_id;
  if(await this.ctx.storage.get(key)!==undefined)return reply({accepted:true});
  const today=row.received_utc.slice(0,10);if(today!==this.day){this.day=today;this.addresses.clear()}
  const address=request.headers.get('CF-Connecting-IP')||'unknown',n=(this.addresses.get(address)||0)+1;
  if(n>PER_ADDRESS||(!this.addresses.has(address)&&this.addresses.size>=50000))return reply({error:'Too many answers from your network today.'},429);
  this.addresses.set(address,n);
  await this.ctx.storage.put(key,row);
  return reply({accepted:true});
 }
 async export(){
  const rows=[];let startAfter;
  for(;;){const page=await this.ctx.storage.list({prefix:'a:',startAfter,limit:1000});for(const row of page.values())rows.push(row);if(page.size<1000)break;startAfter=[...page.keys()].pop()}
  rows.sort((a,b)=>a.received_utc.localeCompare(b.received_utc)||a.response_id.localeCompare(b.response_id));
  return new Response(surveyCsv(rows),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="survey-answers.csv"','Cache-Control':'no-store'}});
 }
}
