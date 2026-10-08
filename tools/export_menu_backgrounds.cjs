// Offline-only browser capture. Exports portrait and landscape H.264 clips.
// node export_menu_backgrounds.cjs <playwright> <ffmpeg> [scene]
const {chromium}=require(process.argv[2]||'playwright');
const {spawn}=require('child_process'),{once}=require('events');
const fs=require('fs'),path=require('path'),http=require('http');
const source=path.join(__dirname,'background-export'),out=path.join(__dirname,'../assets/backgrounds');
const fps=30,scenes=['hex','rings','crystals','gold','jade','embers','vortex-victory','vortex-defeat'];
const ff=process.argv[3];
async function encode(args){const p=spawn(ff,['-hide_banner','-loglevel','error','-y',...args],{stdio:'inherit'});const [code]=await once(p,'close');if(code)throw Error('Encoder '+code)}
const options=['-an','-c:v','libx264','-profile:v','main','-level:v','3.1','-pix_fmt','yuv420p','-preset','medium','-crf','24','-maxrate','1400k','-bufsize','2800k','-movflags','+faststart'];
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const server=http.createServer((req,res)=>{const name=req.url.split('?')[0].slice(1);if(!['renderer.js','style.css'].includes(name)){res.end('<!doctype html><body></body>');return}res.setHeader('Content-Type',name.endsWith('js')?'text/javascript':'text/css');res.end(fs.readFileSync(path.join(source,name)))}).listen(0,'127.0.0.1');await once(server,'listening');
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const selected=process.argv[4]?scenes.filter(x=>x===process.argv[4]):scenes;
  for(const scene of selected)await Promise.all(['portrait','landscape'].map(async orientation=>{
   const width=orientation==='portrait'?360:640,height=orientation==='portrait'?640:360;
   const existing=path.join(out,scene+'-'+orientation+'.mp4');if(!process.argv.includes('--force')&&fs.existsSync(existing)&&fs.statSync(existing).size>1000){console.log('Already exported',scene,orientation);return;}
   const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
   await page.goto(`http://127.0.0.1:${server.address().port}/`);
   await page.evaluate(async scene=>{
    let seed=17391;Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
    const link=document.createElement('link');link.rel='stylesheet';link.href='/style.css';document.head.append(link);await new Promise(r=>link.onload=r);
    document.body.style.cssText='margin:0;width:100vw;height:100vh;background:#06121a';
    const el=document.createElement('div');el.className='game-vector-background';el.style.cssText='position:absolute;inset:0;overflow:hidden';el.innerHTML=`<div class="bg-stage" data-scene="${scene}"></div>`;document.body.append(el);
    const {prepareExportScene}=await import('/renderer.js');window.seek=prepareExportScene(el,scene);
   },scene);
   const name=scene+'-'+orientation,raw=path.join(out,name+'.raw.mp4'),final=path.join(out,name+'.mp4');
   if(!fs.existsSync(raw)||fs.statSync(raw).size<1000){
   const encoder=spawn(ff,['-hide_banner','-loglevel','error','-y','-f','image2pipe','-framerate',String(fps),'-i','pipe:0',...options,raw],{stdio:['pipe','inherit','inherit']});const ended=once(encoder,'close');encoder.stdin.on('error',()=>{});
   const seconds=scene==='hex'?24:18,start=scene==='hex'?0:12;
   for(let i=0;i<seconds*fps;i++){
    await page.evaluate(t=>seek(t),start+i/fps);
    const image=await page.screenshot({type:'png'});
    if(i===(scene==='hex'?0:2*fps))fs.writeFileSync(path.join(out,name+'.png'),image);
    if(!encoder.stdin.write(image))await once(encoder.stdin,'drain');
    if(i%(fps*6)===0)console.log(name,i/fps+'/'+seconds+'s');
   }
   encoder.stdin.end();const [code]=await ended;if(code)throw Error('Frame encode failed');}
   await page.close();
   const filter=scene==='hex'
    ? '[0:v]split[a][b];[a]setpts=PTS-STARTPTS,fps=30,settb=1/30[body];[b]trim=end=4,reverse,setpts=PTS-STARTPTS,fps=30,settb=1/30[exit];[body][exit]xfade=transition=fade:duration=2:offset=20[v]'
    : '[0:v]split[a][b];[a]trim=start=2,setpts=PTS-STARTPTS,fps=30,settb=1/30[body];[b]trim=end=2,setpts=PTS-STARTPTS,fps=30,settb=1/30[head];[body][head]xfade=transition=fade:duration=2:offset=14[v]';
   if(scene==='hex')fs.copyFileSync(raw,final);else await encode(['-i',raw,'-filter_complex',filter,'-map','[v]',...options,final]);
   fs.unlinkSync(raw);console.log('DONE',name,fs.statSync(final).size,'bytes');
  }));
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
