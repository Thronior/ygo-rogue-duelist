// Offline export only: no canvas or SVG animation is run on players' devices.
// Usage: node export_duel_background.cjs <playwright-module> <ffmpeg-exe> <output-directory>
const {chromium}=require(process.argv[2]||'playwright');
const {spawn}=require('child_process');
const fs=require('fs'),path=require('path'),{once}=require('events');
const out=process.argv[4]||path.join(__dirname,'../assets');
const size=640,fps=30,seconds=72;
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage();
  await page.setContent('<canvas width="640" height="640"></canvas>');
  await page.evaluate(()=>{
   const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d');
   const paths=[],radius=Math.hypot(250,250)*1.4,extent=Math.log(radius/5)/.3;
   for(let arm=0;arm<4;arm++)for(let layer=0;layer<4;layer++){
    const points=[];
    for(let edge=0;edge<2;edge++)for(let j=0;j<=64;j++){
     const t=(edge?64-j:j)/64*extent,r=5*Math.exp(t*.3),a=t+arm*Math.PI/2+(edge?(.83-layer*.11):layer*.035);
     points.push(`${250+Math.cos(a)*r},${250+Math.sin(a)*r}`);
    }
    paths.push(`<path d="M${points.join('L')}Z" fill="url(#depth)" opacity="${.14+layer*.06}"/>`);
   }
   window.frame=async t=>{
    const colors=[[205,120,47],[179,47,55],[134,83,197],[179,47,55],[205,120,47]];
    const phase=(t%36)/9,k=Math.floor(phase),f=phase-k,color=colors[k].map((v,i)=>Math.round(v+(colors[k+1][i]-v)*f));
    // Five identical quarter-turns over 72s give a seamless loop; close to the old 55s rotation.
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 500 500"><defs><radialGradient id="depth" gradientUnits="userSpaceOnUse" cx="250" cy="250" r="${Math.hypot(250,250)}"><stop stop-color="#080609"/><stop offset=".13" stop-color="#130b0c"/><stop offset=".6" stop-color="rgb(${color})" stop-opacity=".7"/><stop offset="1" stop-color="rgb(${color})"/></radialGradient></defs><g transform="rotate(${t/72*450} 250 250)">${paths.join('')}</g></svg>`;
    const image=new Image();image.src='data:image/svg+xml;base64,'+btoa(svg);await image.decode();
    ctx.globalAlpha=1;ctx.fillStyle='#100707';ctx.fillRect(0,0,640,640);ctx.globalAlpha=.8;ctx.drawImage(image,0,0);ctx.globalAlpha=1;
    const veil=ctx.createRadialGradient(320,320,0,320,320,Math.hypot(320,320));
    for(const [stop,color] of [[0,'#040406'],[.08,'#040406dd'],[.22,'#06040780'],[.52,'#09050720'],[.82,'#09050700']])veil.addColorStop(stop,color);
    ctx.fillStyle=veil;ctx.fillRect(0,0,640,640);return canvas.toDataURL('image/png').split(',')[1];
   };
  });
  const encoder=spawn(process.argv[3],['-hide_banner','-loglevel','error','-y','-f','image2pipe','-framerate',String(fps),'-i','pipe:0','-an','-c:v','libx264','-profile:v','main','-level:v','3.1','-pix_fmt','yuv420p','-preset','medium','-crf','24','-maxrate','1400k','-bufsize','2800k','-movflags','+faststart',path.join(out,'duel-spiral.mp4')],{stdio:['pipe','inherit','inherit']});
  const ended=once(encoder,'close');encoder.stdin.on('error',()=>{});
  for(let i=0;i<seconds*fps;i++){
   const buffer=Buffer.from(await page.evaluate(t=>frame(t),i/fps),'base64');
   if(i===0)fs.writeFileSync(path.join(out,'duel-spiral-still.png'),buffer);
   if(!encoder.stdin.write(buffer))await once(encoder.stdin,'drain');
   if(i%(fps*12)===0)console.log(`Exported ${i/fps}/${seconds}s`);
  }
  encoder.stdin.end();const [code]=await ended;if(code)throw Error('Video encoder failed: '+code);
  console.log('Exported 640×640,30fps,72s seamless silent H.264 spiral',fs.statSync(path.join(out,'duel-spiral.mp4')).size,'bytes');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
