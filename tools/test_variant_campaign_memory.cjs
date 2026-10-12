const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Win/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
// Accelerated lifecycle soak: controlled victories advance all nine rounds.
// Card startup preload is bypassed; duels run to completion, with periodic board renders.
// No external requests or real player saves are used.
const root=process.cwd(),web=path.join(root,'android/web');
const hook=`
window.checkMemfs=()=>{
 const FS=py.FS,dir='/memory-regression';FS.mkdirTree(dir);
 for(let i=0;i<250;i++){FS.writeFile(dir+'/pending','value-'+i);FS.rename(dir+'/pending',dir+'/save');}
 const count=()=>FS.nameTable.reduce((sum,node)=>{for(;node;node=node.name_next)if(node.parent.name==='memory-regression')sum++;return sum},0);
 if(count()!==1||FS.readFile(dir+'/save',{encoding:'utf8'})!=='value-249')throw Error('Save replacement leaked or corrupted data');
 FS.rename(dir+'/save',dir+'/save');
 try{FS.rename(dir+'/missing',dir+'/save');throw Error('Missing source accepted')}catch(e){if(e.message==='Missing source accepted')throw e;}
 if(count()!==1||FS.readFile(dir+'/save',{encoding:'utf8'})!=='value-249')throw Error('Failed rename changed destination');
 FS.unlink(dir+'/save');FS.rmdir(dir);return true;
};
window.campaignSoak=async n=>{
 await py.runPythonAsync("p=mobile_backend.storage.profile();p['unlocked']=list(mobile_backend.content.PLAYABLE_IDS);p['character_levels']={str(i):2 for i in p['unlocked']};mobile_backend.storage.write(mobile_backend.storage.ROOT/'profile.json',p)");await command('new',{character:[4,10,13,16,17,19,20,23,28,29,35,0][n],variant:1,replace:true,level:0});
 await py.runPythonAsync("mobile_backend.run['pool'] += [c['id'] for c in mobile_backend.g.CARDS if c.get('level',0)<=4][:150]");await command('auto');state=JSON.parse(await py.runPythonAsync('mobile_backend.json.dumps(mobile_backend.state())'));go('draft');
 let duels=0,steps=0;
 for(let round=0;round<9;round++){
  if(modal.open)modal.close();await command('choose',state.run.routes[0]);await command('auto');await command('begin');
  if(!engine)engine=await new MobileDuel([...content.cards,...content.tokenCards]).init();else engine.destroy();
  const d=state.run.mobile_duel;snapshot=engine.start(d.deck,d.enemy,d.lp,d.enemyLP,d.draw,d.seed,d.extra,d.enemyExtra,d.passives,d.enemyDraw??5);screen='duel';render();
  let count=0;while(!engine.finished&&count++<5000&&engine.turn<160){snapshot=engine.respond(engine.auto());if(count%40===0){renderDuel();await new Promise(r=>setTimeout(r,0));}engine.visuals=[];}
  if(!engine.finished||engine.errors.length)throw Error('Incomplete duel '+n+'/'+round+': '+engine.errors.join(','));steps+=count;duels++;
  // Controlled victory advances the lifecycle even when the automated player loses.
  await command('finish',{winner:0,lp:8000,events:engine.summary()});engine.destroy();snapshot=null;go(state.run.stage==='shop'?'shop':'ending');
  if(modal.open)modal.close();showRewardSlots();await new Promise(r=>setTimeout(r,30));
  rewardPresentation?.destroy();rewardPresentation=null;if(modal.open)modal.close();await command('reward-accept');if(state.run.cursed_offer)await command('cursed-choose',state.run.cursed_offer.options[0]);
  if(round<8){go('shop');playUISound('shop-select');go('draft');inspect(state.run.pool[0]);closeDialog();go('shop');await command('auto');}
 }
 window.memfsNodes=()=>{const rows={};for(let node of py.FS.nameTable)for(;node;node=node.name_next)rows[node.name]=(rows[node.name]||0)+1;return rows};go('ending');await new Promise(r=>setTimeout(r,30));if(modal.open)modal.close();go('title');return {duels,steps,round:state.run.round,stage:state.run.stage};
};`;
(async()=>{const server=http.createServer((req,res)=>{let name=decodeURIComponent(req.url.split('?')[0]);if(name==='/')name='/index.html';const f=path.resolve(web,'.'+name);if(!f.startsWith(web+path.sep)){res.writeHead(403);return res.end()}
try{let body=fs.readFileSync(f);if(name==='/campaign-files.json'){const data=JSON.parse(body);for(const key of Object.keys(data)){const src=path.join(root,key==='mobile_backend.py'?'android/'+key:key);if(fs.existsSync(src))data[key]=fs.readFileSync(src,'utf8')}data['pack_odds.py']=fs.readFileSync(path.join(root,'pack_odds.py'),'utf8');body=JSON.stringify(data)}
if(name==='/mobile.js'){body=body.toString().replace('await Promise.all([preloadCards(', 'await Promise.all([(async()=>{} )(')+hook;}
res.setHeader('Content-Type',/\.(m?js)$/.test(f)?'text/javascript':f.endsWith('.json')?'application/json':f.endsWith('.html')?'text/html':f.endsWith('.css')?'text/css':f.endsWith('.wasm')?'application/wasm':f.endsWith('.mp4')?'video/mp4':'application/octet-stream');res.end(body)}catch{res.writeHead(404);res.end()}});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{browser=await chromium.launch({headless:true,channel:'chrome',args:['--js-flags=--expose-gc','--enable-precise-memory-info','--autoplay-policy=no-user-gesture-required']});const context=await browser.newContext({viewport:{width:390,height:844}});await context.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:')?route.continue():route.abort());await context.addInitScript(()=>localStorage.setItem('ygo-preload-visuals','sounds'));const page=await context.newPage(),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message)});page.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text().slice(0,160))});await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>!!window.shadowTest,{},{timeout:120000});assert.ok(await page.evaluate(()=>checkMemfs()));console.log('PASS 250 overwrite/same-path/failed-rename checks; BOOTED');const cdp=await context.newCDPSession(page);await cdp.send('Performance.enable');const results=[];
for(let i=0;i<12;i++){const result=await page.evaluate(n=>campaignSoak(n),i);await page.waitForTimeout(800);await cdp.send('HeapProfiler.collectGarbage');const heap=await cdp.send('Runtime.getHeapUsage'),dom=await cdp.send('Memory.getDOMCounters');const media=await page.evaluate(()=>({saveNodes:memfsNodes()['run.json'],videos:document.querySelectorAll('video').length,animations:document.getAnimations().length}));results.push({campaign:i+1,...result,...heap,...dom,...media});console.log(JSON.stringify(results.at(-1)));fs.writeFileSync('temp/variant-campaign-memory.json',JSON.stringify({results,errors},null,2));}
assert.equal(errors.length,0);const baseline=results[3],last=results.at(-1);assert.ok(last.usedSize-baseline.usedSize<8*1024*1024);assert.ok(last.jsEventListeners-baseline.jsEventListeners<20);assert.ok(last.nodes-baseline.nodes<100);assert.ok(last.backingStorageSize-baseline.backingStorageSize<2*1024*1024,'Buffer growth');assert.equal(last.saveNodes,1);console.log('PASS 12 campaign cycles / 108 full automated duels');
}finally{await browser?.close();server.close()}})().catch(e=>{console.error(e);process.exitCode=1});

