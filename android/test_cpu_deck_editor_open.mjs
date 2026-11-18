// The Watch CPU Battle deck editor opens (Discord, Teq, 2026-11-18). In v0.2.37 a "//" comment shared a line with the
// constructor code after it, so this.by and this.rows were never set and every open failed with "Cannot read properties
// of undefined (reading 'push')". This builds the real module in headless Chrome, served from android/web.
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const {chromium}=require('../tools/require-module.cjs').requireModule('playwright');
const web=fileURLToPath(new URL('./web/',import.meta.url));
const types={'.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.html':'text/html'};
const server=http.createServer((req,res)=>{
 const file=path.join(web,decodeURIComponent(new URL(req.url,'http://x').pathname));
 if(!file.startsWith(web)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);res.end();return}
 res.writeHead(200,{'content-type':types[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage();
 await page.goto(`http://127.0.0.1:${server.address().port}/index.html`,{waitUntil:'commit'}).catch(()=>{});
 await page.setContent('<!doctype html><div id=root></div>');
 const result=await page.evaluate(async base=>{
  const {CPUDeckEditor}=await import(base+'cpu-deck-editor.js');
  const cards=[{id:1,name:'Alpha',data:{type:1,level:4},atk:1000,def:1000,desc:''},{id:2,name:'Beta',data:{type:2},desc:''},
   {id:191000001,name:'Randomized',data:{type:1,level:4},atk:2000,def:0,desc:''}];
  const content={cards,cpuDecks:{0:[{label:'Tier 1',main:[1,2],extra:[]},{label:'Tier 2',main:[1],extra:[]}]},characters:[{name:'Yugi',sprite:'x.png'}]};
  const root=document.getElementById('root');
  const editor=new CPUDeckEditor({root,content,inspect(){},onBack(){},onExit(){}});
  return {rows:editor.rows.map(r=>r.key),by:[...editor.by.keys()],deck:editor.deck.main,html:root.innerHTML.includes('Deck editor')};
 },`http://127.0.0.1:${server.address().port}/`);
 assert.deepEqual(result.rows,['0:Tier 1','0:Tier 2'],JSON.stringify(result));
 // Randomized cards stay out (the 2026-11-17 change the broken line came with).
 assert.deepEqual(result.by,[1,2],JSON.stringify(result));
 assert.deepEqual(result.deck,[1,2]);assert.ok(result.html,'editor rendered');
 console.log('PASS CPU deck editor opens: 2 deck rows, real cards only, first deck rendered');
}finally{await browser.close();server.close()}
