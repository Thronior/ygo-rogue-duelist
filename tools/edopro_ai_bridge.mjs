#!/usr/bin/env node
// Serve the Dueling AI to a native EDOPro/ocgcore build over stdin/stdout, one JSON object per line.
// See docs/DUELING-AI.md ("Plugging into an EDOPro-based project"). Usage:
//   node tools/edopro_ai_bridge.mjs [--cards <cards.json>] [--engine-data <engine-data.json>]
//
// Requests and replies:
//   {"start":{"seat":1,"deck":{"main":[...],"extra":[...]},"lp":[8000,8000],"seed":123}}  -> {"ok":true}
//   {"decide":{"messages":[[type,...body],...],"zones":{"0,1":[...bytes],...}}}         -> {"response":[...bytes]}
//   {"observe":{"messages":[...],"zones":{...}}}                                        -> {"ok":true}
// Any failure replies {"error":"..."} and keeps the bridge running.
import fs from 'node:fs';
import readline from 'node:readline';
import {EdoproAI} from '../android/web/edopro-adapter.js';

const option=(name,fallback)=>{const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:fallback};
const root=new URL('../',import.meta.url);
const json=path=>JSON.parse(fs.readFileSync(path,'utf8').replace(/^\uFEFF/,''));
const cards=json(option('--cards',new URL('data/cards.json',root)));
const engineData=json(option('--engine-data',new URL('android/web/engine-data.json',root)));

let ai=null;
const reply=value=>process.stdout.write(JSON.stringify(value)+'\n');
for await (const line of readline.createInterface({input:process.stdin,crlfDelay:Infinity})){
 if(!line.trim())continue;
 try{
  const request=JSON.parse(line);
  if(request.start){ai=new EdoproAI({cards,engineData,...request.start});reply({ok:true});}
  else if(!ai)throw Error('Send {"start":...} before the first decision.');
  else if(request.decide)reply({response:ai.decide(request.decide.messages,request.decide.zones)});
  else if(request.observe){ai.observe(request.observe.messages,request.observe.zones);reply({ok:true});}
  else throw Error('Unknown request: expected start, decide or observe.');
 }catch(error){reply({error:String(error?.message||error)});}
}
