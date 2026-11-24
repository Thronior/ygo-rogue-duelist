// Downloads every 10K survey answer as CSV from the stats Worker (multiplayer/global-stats/survey.mjs).
// Usage:  $env:YGO_SURVEY_ADMIN_TOKEN='…'; runtime/ai/node.exe tools/export_survey.mjs [output.csv]
// The token is the Worker secret SURVEY_ADMIN_TOKEN; it's read from the environment only and never printed.
// Default output: D:\Codex Exports\Survey\<date>\survey-answers.csv. An existing file is never overwritten.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {statsUrl}=JSON.parse(fs.readFileSync(path.join(root,'android/web/multiplayer-config.json'),'utf8'));
const token=(process.env.YGO_SURVEY_ADMIN_TOKEN||'').trim();
if(!token){console.error('Set YGO_SURVEY_ADMIN_TOKEN to the Worker secret SURVEY_ADMIN_TOKEN first.');process.exit(2)}
const stamp=new Date().toISOString().replace(/[:]/g,'-').slice(0,16);
const out=path.resolve(process.argv[2]||`D:/Codex Exports/Survey/${stamp}/survey-answers.csv`);
if(fs.existsSync(out)){console.error('Refusing to overwrite',out);process.exit(2)}
const res=await fetch(statsUrl+'/v1/survey.csv',{headers:{Authorization:'Bearer '+token}});
if(res.status===401){console.error('The Worker refused the token (401).');process.exit(1)}
if(!res.ok){console.error('Export failed:',res.status,(await res.text()).slice(0,200));process.exit(1)}
const text=await res.text();
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,text);
console.log(`Wrote ${Math.max(0,text.trim().split('\r\n').length-1)} answers to ${out}`);
