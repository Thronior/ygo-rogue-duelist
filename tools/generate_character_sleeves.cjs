// Level 6 sleeves: the character pack layout (portrait over the signature card's art) with the Level 6
// rainbow instead of the pack's single tint, and no logo. One JPEG per playable character, card-back sized.
// Usage: runtime/ai/node.exe tools/generate_character_sleeves.cjs [--only "Seto Kaiba"]
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('./require-module.cjs').requireModule('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'assets/sleeves');
const content=JSON.parse(fs.readFileSync(path.join(root,'android/web/content.json'),'utf8'));
const packArt=JSON.parse(fs.readFileSync(path.join(root,'data/character-pack-art.json'),'utf8')).packs;
// Same rule as android/web/sleeves.js.
const slug=name=>name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const only=process.argv.includes('--only')?process.argv[process.argv.indexOf('--only')+1]:null;
const rows=content.playable.map(i=>content.characters[i]).filter(c=>!only||c.name===only).map(c=>{
 const pack=packArt.find(p=>p.name===c.name);
 const named=c.cards?.length?content.cards.find(x=>x.name===c.cards[0]):null;
 // No character pack: the first signature card, else the card back itself (Dueling Engine).
 return {name:c.name,slug:slug(c.name),sprite:c.sprite,art:pack?`/assets/cards/${pack.card}.jpg`:named?`/assets/cards/${named.id}.jpg`:'/assets/card-back.jpg',cardArt:!!(pack||named)};
});
if(!rows.length)throw Error('No character matched');
const R='#ff4f8b,#ff9f43,#ffe45c,#5cf08f,#45c8ff,#8f6bff,#ff5fd2,#ff4f8b';
const css=`*{box-sizing:border-box}html,body{margin:0;background:#000}
#s{width:428px;height:614px;position:relative;overflow:hidden;background:linear-gradient(135deg,${R})}
.inner{position:absolute;inset:10px;border-radius:7px;overflow:hidden;background:#fff;box-shadow:0 0 0 1px #0006}
.art{position:absolute;inset:0;filter:saturate(.75) contrast(.72) brightness(1.15);opacity:.78}.art svg{width:100%;height:100%}
.rain{position:absolute;inset:0;background:linear-gradient(135deg,${R});opacity:.62;mix-blend-mode:color}
.rain2{position:absolute;inset:0;background:linear-gradient(135deg,${R});opacity:.28}
.shine{position:absolute;inset:0;background:linear-gradient(115deg,transparent 30%,#fff6 45%,transparent 58%)}
.portrait{position:absolute;left:0;bottom:-6%;width:100%;height:82%;object-fit:contain;object-position:center bottom;filter:drop-shadow(0 0 3px #fffa) drop-shadow(0 3px 5px #0006)}`;
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const server=http.createServer((req,res)=>{if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end('<style>'+css+'</style><div id="s"></div>');return}const f=path.resolve(root,'.'+decodeURIComponent(req.url));if(!f.startsWith(root+path.sep)){res.writeHead(403);res.end();return}try{res.end(fs.readFileSync(f))}catch{res.writeHead(404);res.end()}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true,channel:'chrome'});
  const page=await browser.newPage({viewport:{width:428,height:614}});await page.goto(`http://127.0.0.1:${server.address().port}/`);
  for(const row of rows){
   await page.evaluate(async row=>{const im=new Image();im.src=row.art;await im.decode();const w=im.naturalWidth,h=im.naturalHeight;
    // A card's artwork box (x 12-88%, y 19-71.5%), cropped to the sleeve's inner shape; the card back is used whole.
    const ratio=408/594;let ax=0,ay=0,aw=w,ah=h;if(row.cardArt){ax=w*.12;aw=w*.76;ay=h*.19;ah=h*.525}
    let cw=aw,ch=cw/ratio;if(ch>ah){ch=ah;cw=ch*ratio}const cx=ax+(aw-cw)/2,cy=ay+(ah-ch)/2;
    document.querySelector('#s').innerHTML=`<div class="inner"><div class="art"><svg viewBox="${cx} ${cy} ${cw} ${ch}" preserveAspectRatio="xMidYMid slice"><image href="${im.src}" width="${w}" height="${h}"/></svg></div><div class="rain"></div><div class="rain2"></div><div class="shine"></div><img class="portrait" src="/assets/${row.sprite}"></div>`;
    await Promise.all([...document.images].map(i=>i.decode()))},row);
   await page.locator('#s').screenshot({path:path.join(out,row.slug+'.jpg'),type:'jpeg',quality:88});
   console.log('Wrote assets/sleeves/'+row.slug+'.jpg');
  }
 }finally{await browser?.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
