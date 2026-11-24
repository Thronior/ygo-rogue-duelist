// Local preview of Stats > CPU Stats and Character Stats' CPU pages (2026-11-24), without deploying anything.
// Serves android/web and answers /v2/cpu-stats with the real stats Worker code (multiplayer/global-stats/worker.mjs) on
// in-memory storage, seeded once like the Worker would be (cpu-seed.mjs, or --seed <file.json|file.mjs>). Every other
// request (global totals, Character Stats) still goes to the live servers. Local only; nothing here ships.
//   runtime/ai/node.exe tools/cpu_stats_local.mjs [--port 4212] [--seed path]
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),web=path.join(root,'android/web');
const args=process.argv.slice(2),opt=(n,f)=>{const i=args.indexOf(n);return i>=0?args[i+1]:f};
const port=Number(opt('--port',4212)),seedPath=opt('--seed',null);
const {GlobalStats}=await import(pathToFileURL(path.join(root,'multiplayer/global-stats/worker.mjs')).href);
const seed=seedPath?(seedPath.endsWith('.json')?JSON.parse(fs.readFileSync(seedPath,'utf8')):(await import(pathToFileURL(path.resolve(seedPath)).href)).default):undefined;
const data=new Map(),storage={get:async k=>structuredClone(data.get(k)),put:async rows=>{for(const [k,v] of Object.entries(rows))data.set(k,structuredClone(v))},getAlarm:async()=>null,setAlarm:async()=>{},list:async()=>new Map(),delete:async()=>{}};storage.transaction=fn=>fn(storage);
const stats=new GlobalStats({storage,blockConcurrencyWhile:fn=>fn()},{},...(seed===undefined?[]:[seed]));await stats.ready;
console.log('CPU seed:',data.get('migration:cpu-seed-v1')||'none');
// Sends the page's /v2/cpu-stats requests here instead of the live stats server.
const shim=`{const f=globalThis.fetch;globalThis.fetch=function(input,init){const u=typeof input==='string'||input instanceof URL?String(input):input?.url;try{const t=new URL(u,location.href);if(t.pathname==='/v2/cpu-stats')return f.call(this,'/local-cpu-stats'+t.search,init)}catch{}return f.call(this,input,init)}}\n`;
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.wasm':'application/wasm','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.wav':'audio/wav','.mp3':'audio/mpeg','.ogg':'audio/ogg','.woff2':'font/woff2','.ttf':'font/ttf','.ico':'image/x-icon','.txt':'text/plain','.zip':'application/zip','.whl':'application/zip','.data':'application/octet-stream'};
http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/local-cpu-stats'){const r=await stats.fetch(new Request('https://stats/v2/cpu-stats'+url.search));res.writeHead(r.status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(await r.text());return}
 let file=path.join(web,decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
 if(!file.startsWith(web)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);res.end();return}
 let body=fs.readFileSync(file);if(url.pathname==='/mobile.js')body=Buffer.concat([Buffer.from(shim),body]);
 res.writeHead(200,{'Content-Type':types[path.extname(file).toLowerCase()]||'application/octet-stream','Cache-Control':'no-store'});res.end(body);
}).listen(port,()=>console.log(`CPU stats preview on http://localhost:${port}`));
