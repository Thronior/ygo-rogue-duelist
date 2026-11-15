// Art for randomized cards (user, 2026-11-15), all built around the user's hat (assets/random-hat.png): the Random
// Pack cover (the custom pack template: silver seals and logo), the Absolute Random relic and Copycat's Randomizer
// loadout background. node tools/generate_random_art.cjs
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('./require-module.cjs').requireModule('playwright');
const root=path.resolve(__dirname,'..');
// A rainbow light burst behind the hat: soft rays, a bright core and a dark rim.
const burst=`background:radial-gradient(circle at 50% 46%,#fff8 0,#fff3 9%,transparent 30%),
 repeating-conic-gradient(from 0deg at 50% 46%,#ff5f6d22 0deg 7deg,transparent 7deg 15deg,#ffd16622 15deg 22deg,transparent 22deg 30deg,#5fd3ff22 30deg 37deg,transparent 37deg 45deg),
 radial-gradient(circle at 50% 46%,#7a4cff 0,#2a1a6e 45%,#0b0822 100%)`;
const css=`*{box-sizing:border-box}html,body{margin:0;background:transparent}
.art{position:relative;overflow:hidden;${burst}}
.art .spark{position:absolute;width:6px;height:6px;border-radius:50%;background:#fff;box-shadow:0 0 10px 3px #fff8}
.art .hat{position:absolute;left:50%;top:46%;transform:translate(-50%,-50%) rotate(-6deg);filter:drop-shadow(0 0 18px #fff9) drop-shadow(0 10px 14px #0009)}
#pack{width:360px;height:720px;border:1px solid #666;position:relative;overflow:hidden;background:repeating-linear-gradient(135deg,#ff4d6d 0 40px,#ff9f43 40px 80px,#ffe14d 80px 120px,#4dff88 120px 160px,#4dc3ff 160px 200px,#7a5cff 200px 240px,#e04dff 240px 280px)}
#pack .hat{position:absolute;left:50%;top:50%;width:300px;transform:translate(-50%,-50%) rotate(-6deg);filter:drop-shadow(0 0 14px #fffc) drop-shadow(0 10px 14px #0008)}
.logo{position:absolute;top:55px;left:14px;width:330px;height:auto;filter:drop-shadow(0 1px 0 white) drop-shadow(0 2px 6px #0008)}
.seal{position:absolute;left:0;right:0;height:22px;background:linear-gradient(#333 0%,#a5a5a5 16%,#f9f9f9 32%,#858585 48%,#dedede 65%,#fff 78%,#888 100%);box-shadow:0 1px 2px #0005}
.top{top:0}.bottom{bottom:0;transform:rotate(180deg)}
.title{position:absolute;left:0;right:0;bottom:70px;text-align:center;font:64px/1 Bebas;letter-spacing:4px;color:#fff;text-shadow:0 0 12px #c9a6ff,0 3px 0 #2a1a6e,0 6px 12px #000a}
.sub{position:absolute;left:0;right:0;bottom:42px;text-align:center;font:24px/1 Bebas;letter-spacing:3px;color:#ffe9a8;text-shadow:0 2px 6px #000}
#relic{width:500px;height:500px;border:6px solid #2b2f3a;box-shadow:inset 0 0 0 3px #7a8090}#relic .hat{width:400px;top:50%}
#variant{width:464px;height:451px}#variant .hat{width:340px}`;
const sparks=n=>Array.from({length:n},(_,i)=>`<i class="spark" style="left:${(i*37+11)%96}%;top:${(i*53+7)%92}%;transform:scale(${.4+(i%4)*.25})"></i>`).join('');
const only=process.argv.slice(2);   // e.g. "pack" to redraw just the pack cover
const jobs=[
 // The pack (user, Nov 15): just a rainbow pattern with the hat, between the usual silver seals.
 {id:'pack',out:'assets/packs/RANDOM-PACK.jpg',type:'jpeg',html:`<div id="pack"><img class="hat" src="/assets/random-hat.png"><div class="seal top"></div><div class="seal bottom"></div></div>`},
 {id:'relic',out:'assets/relics/Absolute Random.png',type:'png',html:`<div id="relic" class="art">${sparks(12)}<img class="hat" src="/assets/random-hat.png"></div>`},
 {id:'variant',out:'assets/character-backgrounds/variant-37.jpg',type:'jpeg',html:`<div id="variant" class="art">${sparks(12)}<img class="hat" src="/assets/random-hat.png"></div>`},
];
(async()=>{
 const server=http.createServer((req,res)=>{
  if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end(`<style>@font-face{font-family:Bebas;src:url(/android/web/assets/fonts/BebasNeue-Regular.ttf)}${css}</style><div id="stage"></div>`);return}
  const f=path.resolve(root,'.'+decodeURIComponent(req.url));if(!f.startsWith(root+path.sep)){res.writeHead(403);res.end();return}
  try{res.end(fs.readFileSync(f))}catch{res.writeHead(404);res.end()}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true,channel:'chrome'});
  for(const job of jobs.filter(j=>!only.length||only.includes(j.id))){
   const page=await browser.newPage({viewport:{width:600,height:800},deviceScaleFactor:job.id==='pack'?2:1});
   await page.goto(`http://127.0.0.1:${server.address().port}/`);
   await page.evaluate(async html=>{document.getElementById('stage').innerHTML=html;await document.fonts.load('64px Bebas');await Promise.all([...document.images].map(i=>i.decode()))},job.html);
   await page.locator('#'+job.id).screenshot({path:path.join(root,job.out),type:job.type,...(job.type==='jpeg'?{quality:92}:{omitBackground:true})});
   await page.close();console.log('wrote',job.out);
  }
 }finally{await browser?.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
