const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const {chromium}=require('C:/Users/Win/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
process.env.TEMP=process.env.TMP=path.resolve('temp');
const relayOnly=process.argv.includes('--relay');const external=process.argv.find(a=>a.startsWith('--endpoint='))?.slice(11);
(async()=>{const python=external?null:spawn(path.resolve('python/python.exe'),['-B','-u','-c',"from multiplayer.signaling import server;s=server(port=0);print(s.server_port,flush=True);s.serve_forever()"],{cwd:process.cwd(),windowsHide:true});
 let browser,staticServer;try{
 const port=external?null:await new Promise((resolve,reject)=>{python.stdout.once('data',b=>resolve(Number(String(b).trim())));python.on('error',reject)});
 const endpoint=external||'http://127.0.0.1:'+port;
 staticServer=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/tag-peer.js'?'text/javascript':'text/html');res.end(req.url==='/tag-peer.js'?fs.readFileSync('android/web/tag-peer.js'):'<html>Tag transport test</html>')});await new Promise(r=>staticServer.listen(0,'127.0.0.1',r));
 browser=await chromium.launch({headless:true,channel:'chrome',env:{...process.env,TEMP:path.resolve('temp'),TMP:path.resolve('temp')}});
 const pages=await Promise.all([0,1].map(async()=>{const context=await browser.newContext();const page=await context.newPage();await page.goto('http://127.0.0.1:'+staticServer.address().port);await page.evaluate(async ({endpoint,relayOnly})=>{window.Peer=(await import('/tag-peer.js')).TagPeer;window.messages=[];window.states=[];window.endpoint=endpoint;window.newPeer=()=>new Peer(endpoint,{relayOnly,onMessage:m=>messages.push(m),onState:(...s)=>states.push(s)});window.peer=newPeer()},{endpoint,relayOnly});return page}));
 const room=await pages[0].evaluate(()=>peer.host());assert.match(room.code,/^[A-Z2-9]{5}$/);await pages[1].evaluate(code=>peer.join(code),room.code);
 for(const page of pages)await page.waitForFunction(()=>peer.channel?.readyState==='open',null,{timeout:25000});
 await pages[0].evaluate(()=>peer.send({kind:'snapshot',revision:7}));await pages[1].waitForFunction(()=>messages.length===1);assert.equal(await pages[1].evaluate(()=>messages[0].revision),7);
 assert.equal(await pages[0].evaluate(()=>peer.route()),relayOnly?'relay':'direct');
 if(process.argv.includes('--idle')){
  const generations=await Promise.all(pages.map(p=>p.evaluate(()=>peer.generation)));
  await Promise.all(pages.map(p=>p.evaluate(()=>{window.stableStateStart=states.length})));
  await new Promise(resolve=>setTimeout(resolve,130000));
  for(let i=0;i<pages.length;i++){
   assert.equal(await pages[i].evaluate(()=>peer.generation),generations[i]);
   assert.deepEqual(await pages[i].evaluate(()=>states.slice(stableStateStart).filter(s=>['disconnected','reconnecting','failed'].includes(s[0]))),[]);
   assert.equal(await pages[i].evaluate(()=>peer.channel.readyState),'open');
  }
  console.log('PASS idle relay stayed connected across two 60-second checks without reconnects');
 }
 // Drop the guest's RTC connection, retain its local seat token, join the same code again.
 await pages[1].evaluate(()=>{peer.suspend();peer=newPeer()});await pages[1].evaluate(code=>peer.join(code),room.code);
 for(const page of pages)await page.waitForFunction(()=>peer.channel?.readyState==='open',null,{timeout:30000});
 assert.equal(await pages[1].evaluate(()=>peer.seat),1);await pages[1].evaluate(()=>peer.send({kind:'resume',revision:7}));await pages[0].waitForFunction(()=>messages.some(m=>m.kind==='resume'));
 // Reclaim the host seat too; neither player is converted into a fresh guest.
 await pages[0].evaluate(()=>{peer.suspend();peer=newPeer()});await pages[0].evaluate(code=>peer.join(code),room.code);
 for(const page of pages)await page.waitForFunction(()=>peer.channel?.readyState==='open',null,{timeout:30000});
 assert.equal(await pages[0].evaluate(()=>peer.seat),0);
 // Both players reconnect together; repeated presses share a single attempt.
 await Promise.all(pages.map(page=>page.evaluate(()=>Promise.all([peer.reconnect(),peer.reconnect()]))));
 for(const page of pages)await page.waitForFunction(()=>peer.channel?.readyState==='open',null,{timeout:30000});
 await pages[0].evaluate(()=>peer.send({kind:'after-both-reconnect',revision:8}));await pages[1].waitForFunction(()=>messages.some(m=>m.kind==='after-both-reconnect'));
 // Exactly one ready notification for each established data channel.
 for(const page of pages)assert.equal(await page.evaluate(()=>states.filter(s=>s[0]==='connected').length),4);
 const outsider=await fetch(endpoint+'/v1/join',{method:'POST',body:JSON.stringify({code:room.code}),headers:{'Content-Type':'application/json'}});assert.equal(outsider.status,400);
 console.log('PASS real WebRTC ('+(relayOnly?'forced relay':'direct')+'): room code, channel, guest/host/simultaneous same-code reconnect, repeated-click protection, one ready notification per connection, third-player rejection');
 for(const page of pages)await page.evaluate(()=>peer.close());
 }finally{await browser?.close();if(staticServer)await new Promise(r=>staticServer.close(r));python?.kill()}})().catch(e=>{console.error(e);process.exitCode=1});
