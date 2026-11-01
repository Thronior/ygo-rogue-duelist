// Real Chrome WebRTC and the room hub against a local wrangler dev or the deployed Worker.
// node android/test_tag_peer.cjs [--relay] [--endpoint=https://...]
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('../tools/require-module.cjs').requireModule('playwright');
const relayOnly=process.argv.includes('--relay'),endpoint=process.argv.find(a=>a.startsWith('--endpoint='))?.slice(11)||'http://127.0.0.1:8799';
const page=`<!doctype html><script type="module">import {TagPeer} from './tag-peer.js';window.states=[];window.messages=[];window.newPeer=()=>new TagPeer(${JSON.stringify(endpoint)},{relayOnly:${relayOnly},iceServers:[{urls:'stun:stun.cloudflare.com:3478'}],onState:(s,d)=>states.push([s,d]),onMessage:m=>messages.push(m)});window.peer=newPeer();window.ready=true</script>`;
(async()=>{
 let browser,server;try{
 server=http.createServer((req,res)=>{const name=req.url.slice(1);if(['tag-peer.js','hub-socket.js'].includes(name)){res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync(path.join('android/web',name)));return}res.setHeader('Content-Type','text/html');res.end(page)});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 browser=await chromium.launch({headless:true,channel:'chrome',args:['--disable-features=LocalNetworkAccessChecks']});
 const pages=await Promise.all([0,1].map(async()=>{const context=await browser.newContext(),p=await context.newPage();await p.goto('http://127.0.0.1:'+server.address().port);await p.waitForFunction(()=>window.ready);return p}));
 const [host,guest]=pages,linked=()=>Promise.all(pages.map(p=>p.waitForFunction(()=>peer.linked,null,{timeout:20000})));
 const room=await host.evaluate(()=>peer.host());assert.match(room.code,/^[A-Z2-9]{5}$/);await guest.evaluate(code=>peer.join(code),room.code);await linked();
 // Play starts on the hub straight away: nobody waits for WebRTC.
 await host.evaluate(()=>peer.send({kind:'first',n:1}));await guest.waitForFunction(()=>messages.some(m=>m.kind==='first'),null,{timeout:5000});
 if(relayOnly)assert.equal(await host.evaluate(()=>peer.route),'relay');
 else{await host.waitForFunction(()=>peer.route==='direct',null,{timeout:25000});await guest.waitForFunction(()=>peer.route==='direct',null,{timeout:5000})}
 // Losing the direct route drops nothing, and it comes back without a reconnect.
 await host.evaluate(()=>{for(let n=0;n<20;n++)peer.send({kind:'burst',n});peer.closeDirect()});await guest.evaluate(()=>{peer.closeDirect()});
 await host.evaluate(()=>{for(let n=20;n<40;n++)peer.send({kind:'burst',n})});
 await guest.waitForFunction(()=>messages.filter(m=>m.kind==='burst').length>=40,null,{timeout:15000});
 assert.deepEqual(await guest.evaluate(()=>messages.filter(m=>m.kind==='burst').map(m=>m.n)),Array.from({length:40},(_,n)=>n),'in order, none lost, none doubled');
 // A dropped hub socket resumes the same link: frames sent meanwhile arrive.
 await guest.evaluate(()=>peer.hub.lost());await host.evaluate(()=>peer.send({kind:'during-drop'}));await guest.waitForFunction(()=>messages.some(m=>m.kind==='during-drop'),null,{timeout:20000});
 // A guest page reload keeps the seat through its saved token and starts a new link session.
 await guest.evaluate(()=>{peer.suspend();peer=newPeer()});await guest.evaluate(code=>peer.join(code),room.code);await linked();
 assert.equal(await guest.evaluate(()=>peer.seat),1);await guest.evaluate(()=>peer.send({kind:'resume'}));await host.waitForFunction(()=>messages.some(m=>m.kind==='resume'),null,{timeout:8000});
 await host.evaluate(()=>{peer.suspend();peer=newPeer()});await host.evaluate(code=>peer.join(code),room.code);await linked();assert.equal(await host.evaluate(()=>peer.seat),0);
 await host.evaluate(()=>peer.send({kind:'after-host-reload'}));await guest.waitForFunction(()=>messages.some(m=>m.kind==='after-host-reload'),null,{timeout:8000});
 const outsider=await fetch(endpoint+'/v2/join',{method:'POST',body:JSON.stringify({code:room.code}),headers:{'Content-Type':'application/json'}});assert.equal(outsider.status,400);
 console.log('PASS real Chrome ('+(relayOnly?'hub only':'direct upgrade')+'): instant hub start, route loss with ordered delivery, socket drop resume, guest and host reload, third-player rejection');
 for(const p of pages)await p.evaluate(()=>peer.close()).catch(()=>{});
 }finally{await browser?.close();if(server)await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});
