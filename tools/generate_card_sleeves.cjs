// Card-art sleeves (2026-11-12): each card's artwork filling a card-back sized sleeve inside a thin frame.
// The duelist-count sleeves at 20, 30 and 36 get bronze, silver and gold foil frames (the gold one with a rainbow edge).
// The foil is baked into the image, so the duel draws a still picture; the Settings picker adds the moving sheen.
// Usage: runtime/ai/node.exe tools/generate_card_sleeves.cjs [--only <sleeve id>]
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('./require-module.cjs').requireModule('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'assets/sleeves/cards');
const only=process.argv.includes('--only')?process.argv[process.argv.indexOf('--only')+1]:null;
const rows=JSON.parse(fs.readFileSync(path.join(root,'data/card-sleeves.json'),'utf8')).sleeves.filter(s=>!only||s.id===only);
if(!rows.length)throw Error('No sleeve matched');
const R='#ff4f8b,#ff9f43,#ffe45c,#5cf08f,#45c8ff,#8f6bff,#ff5fd2,#ff4f8b';
const FRAMES={
 plain:{width:9,frame:'linear-gradient(160deg,#2b3442,#121820 55%,#2b3442)',line:'#c9d3dc'},
 bronze:{width:20,frame:'linear-gradient(135deg,#5a2f12,#c9824a 18%,#ffd3a1 30%,#8a4d22 45%,#e7a46b 62%,#ffe1bd 72%,#6b3a17 88%,#b8743f)',line:'#ffe0bf'},
 silver:{width:22,frame:'linear-gradient(135deg,#5d6670,#c9d1d9 18%,#ffffff 30%,#8b949e 45%,#e3e8ee 62%,#ffffff 72%,#6b747e 88%,#b9c1c9)',line:'#ffffff'},
 gold:{width:25,frame:'linear-gradient(135deg,#7a5208,#e6b843 18%,#fff3b0 30%,#a8780f 45%,#f5cf5a 62%,#fff8d2 72%,#8c6109 88%,#d9a632)',line:'#fff6cf',rainbow:true},
};
const css=`*{box-sizing:border-box}html,body{margin:0;background:#000}
#s{width:428px;height:614px;position:relative;overflow:hidden}
.frame{position:absolute;inset:0}
.edge{position:absolute;inset:0;background:linear-gradient(135deg,${R})}
.inner{position:absolute;overflow:hidden;border-radius:5px;background:#000}
.inner svg{position:absolute;inset:0;width:100%;height:100%}
.foil{position:absolute;inset:0;background:linear-gradient(115deg,transparent 20%,#ffffff66 30%,transparent 38%,transparent 62%,#ffffff55 70%,transparent 78%),repeating-linear-gradient(45deg,#ffffff10 0 2px,transparent 2px 6px);mix-blend-mode:screen}
.gloss{position:absolute;inset:0;background:linear-gradient(115deg,transparent 35%,#ffffff26 47%,transparent 60%)}`;
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const server=http.createServer((req,res)=>{if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end('<style>'+css+'</style><div id="s"></div>');return}const f=path.resolve(root,'.'+decodeURIComponent(req.url));if(!f.startsWith(root+path.sep)){res.writeHead(403);res.end();return}try{res.end(fs.readFileSync(f))}catch{res.writeHead(404);res.end()}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true,channel:'chrome'});
  const page=await browser.newPage({viewport:{width:428,height:614}});await page.goto(`http://127.0.0.1:${server.address().port}/`);
  for(const row of rows){
   const f=FRAMES[row.tier||'plain'];
   await page.evaluate(async([row,f])=>{const im=new Image();im.src=`/assets/cards/${row.card}.jpg`;await im.decode();const w=im.naturalWidth,h=im.naturalHeight;
    const pad=f.width,ratio=(428-2*pad)/(614-2*pad);
    // The card's artwork box (x 12.5-87.5%, y 19-70%), cropped to the sleeve's inner shape.
    const ax=w*.125,aw=w*.75,ay=h*.19,ah=h*.512;let cw=aw,ch=cw/ratio;if(ch>ah){ch=ah;cw=ch*ratio}const cx=ax+(aw-cw)/2,cy=ay+(ah-ch)/2;
    const rainbow=f.rainbow?'<div class="edge"></div>':'';
    document.querySelector('#s').innerHTML=`${rainbow}<div class="frame" style="background:${f.frame};${f.rainbow?'inset:5px;border-radius:4px':''}"></div>${f.width>10?'<div class="foil"></div>':''}<div class="inner" style="inset:${pad}px;box-shadow:0 0 0 1.5px ${f.line},0 0 0 3px #0008"><svg viewBox="${cx} ${cy} ${cw} ${ch}" preserveAspectRatio="xMidYMid slice"><image href="${im.src}" width="${w}" height="${h}"/></svg><div class="gloss"></div></div>`;
    await Promise.all([...document.images].map(i=>i.decode()))},[row,f]);
   await page.locator('#s').screenshot({path:path.join(out,row.id+'.jpg'),type:'jpeg',quality:88});
  }
  console.log(`Wrote ${rows.length} sleeves to assets/sleeves/cards`);
 }finally{await browser?.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
