import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {MobileDuel,M,L} from './web/duel.js';
import {publishNativeResponse} from './web/native-response.js';
import {decodeNativeMessage,decodeNativeQuery,encodeNativeResponse} from './web/vendor/package/dist/index.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const runtime=path.join(root,'runtime');
const meta=JSON.parse(fs.readFileSync(path.join(root,'android/web/content.json')));
const e=new MobileDuel(meta.cards);e.data=JSON.parse(fs.readFileSync(path.join(root,'android/web/engine-data.json')));
e.pendingSummons=[];e.events=[];e.visuals=[];e.peak={turns:0,peak_attack:0,peak_defense:0,peak_field:0};e.lp=[8000,8000];e.chainDepth=0;e.selectionHint=null;
e.aiModifiers=JSON.parse(process.env.SHADOW_RUN_AI_MODIFIERS||'{}');
let zones={},last=0;e.query=(p,l)=>zones[p+','+l]||[];
e.core={duelQueryCount:(_,p,l)=>e.query(p,l).length,duelSetResponse(){}};e.advance=()=>null;
const request=path.join(runtime,'ai-request.json'),response=path.join(runtime,'ai-response.json');
fs.writeFileSync(path.join(runtime,'ai-ready'),'ready');
while(true){
 try{
  const q=JSON.parse(fs.readFileSync(request,'utf8'));
  if(q.id!==last){last=q.id;zones={};for(const [k,bytes] of Object.entries(q.zones)){try{zones[k]=decodeNativeQuery(bytes).map(c=>c?{...c,type:e.data[c.code]?.type||0}:null)}catch(err){console.error('Query failed, using empty zone',k,String(err).slice(0,120));zones[k]=[]}}
   e.lp=q.lp;e.player=q.player;e.phase=q.phase;
   for(const bytes of q.messages){let m;try{m=decodeNativeMessage(bytes)}catch(err){console.error('Message decode failed, skipping',String(err).slice(0,120));continue}if(!m)continue;e.onMessage(m);if(m.type===M.HINT&&m.hint_type===3)e.selectionHint=Number(m.hint);e.last=m;}
   const m=decodeNativeMessage(q.prompt);e.pending=m;
   const decision=e.auto(m);e.respond(decision);
   const result={id:q.id,response:encodeNativeResponse(decision)};
   const retries=await publishNativeResponse(fs,response,result);if(retries)console.warn('Shared AI response delivered after',retries,'file-lock retries');e.visuals=[];
  }
 }catch(error){if(error.code!=='ENOENT'){fs.appendFileSync(path.join(runtime,'ai-errors.log'),String(error.stack)+'\n');}}
 await new Promise(r=>setTimeout(r,15));
}
