// Offline-only: exports the code-drawn duel backgrounds to low-resolution looping H.264 clips.
// node export_duel_scenes.cjs <playwright> <ffmpeg> [scene] [--still]
const {chromium}=require(process.argv[2]||'playwright');
const {spawn}=require('child_process'),{once}=require('events');
const fs=require('fs'),path=require('path');
// 800 x 800: a clip is cropped to the screen, so about 370 of those lines show at once, a true 360p picture.
const source=path.join(__dirname,'background-export'),out=path.join(__dirname,'../assets/backgrounds');
const ff=process.argv[3],fps=24,size=800,stage=1024,stillOnly=process.argv.includes('--still');
const options=['-an','-c:v','libx264','-profile:v','main','-level:v','3.1','-pix_fmt','yuv420p','-preset','slow','-crf','25','-maxrate','900k','-bufsize','1800k','-movflags','+faststart'];
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:stage,height:stage},deviceScaleFactor:size/stage});
  await page.setContent('<!doctype html><body></body>');
  await page.addStyleTag({path:path.join(source,'duel-scenes.css')});await page.addScriptTag({path:path.join(source,'duel-scenes.js')});
  const named=process.argv.slice(4).find(x=>!x.startsWith('--'));
  const scenes=await page.evaluate(()=>Object.keys(duelScenes)),selected=named?[named]:scenes;
  for(const scene of selected){
   const seconds=await page.evaluate(async id=>{document.body.innerHTML=`<div class="bgx ${id}">${duelScenes[id].html()}</div>`;await document.fonts.ready;await Promise.all([...document.querySelectorAll('.bgx *')].map(el=>{const m=getComputedStyle(el).backgroundImage.match(/url\("(.+)"\)/s);if(!m)return;const i=new Image();i.src=m[1];return i.decode().catch(()=>{})}));const animations=document.getAnimations();animations.forEach(a=>a.pause());
    window.seek=t=>{for(const a of animations)a.currentTime=t*1000;return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))};return duelScenes[id].seconds},scene);
   const name='duel-'+scene,final=path.join(out,name+'.mp4');
   await page.evaluate(()=>seek(0));fs.writeFileSync(path.join(out,name+'.jpg'),await page.screenshot({type:'jpeg',quality:86}));
   if(stillOnly){console.log('STILL',name);continue}
   const encoder=spawn(ff,['-hide_banner','-loglevel','error','-y','-f','image2pipe','-framerate',String(fps),'-i','pipe:0',...options,final],{stdio:['pipe','inherit','inherit']});
   const ended=once(encoder,'close');encoder.stdin.on('error',()=>{});
   const frames=seconds*fps;
   for(let i=0;i<frames;i++){
    await page.evaluate(t=>seek(t),i/fps);
    if(!encoder.stdin.write(await page.screenshot({type:'png'})))await once(encoder.stdin,'drain');
    if(i%(fps*12)===0)console.log(name,i/fps+'/'+seconds+'s');
   }
   encoder.stdin.end();const [code]=await ended;if(code)throw Error('Video encoder failed: '+code);
   console.log('DONE',name,fs.statSync(final).size,'bytes');
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
