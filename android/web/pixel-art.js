// Pixel Art look (2026-11-12). While it is on, every picture and icon is redrawn once at a low resolution and shown with
// image-rendering:pixelated, so the browser only scales a small bitmap: no per-frame or SVG filters.
// - Pictures (card art, relics, portraits, packs, flags) are measured when they come near the screen
//   (IntersectionObserver, no forced layout), shrunk to about one source pixel per BLOCK CSS pixels (ICON_BLOCK for
//   small ones) and cached as small PNG blob URLs keyed by source and size.
//   <img> pictures are swapped by stylesheet rules (see addRule), inline style url(...) pictures in their style.
// - Stylesheet backgrounds and masks (the shop interior, field-spell placeholder, CSS icons) get one override rule each.
// - Inline <svg> icons are drawn once into a hard-edged bitmap; single-colour ones become a mask over currentColor, so
//   hover and active colours still apply.
// - Background videos are copied into a one-sixth-resolution canvas eight times a second (the clip itself runs underneath).
const BLOCK=3,ICON_BLOCK=2,VIDEO_BLOCK=6,VIDEO_FPS=8,MIN_BOX=12,MAX_CACHE=900;
const SIZES=[6,8,10,12,14,16,20,24,28,32,40,48,56,64,80,96,112,128,160,192,224,256,320];
let on=false,mutations=null,visible=null,running=0;
const cache=new Map(),pending=new Map(),ours=new Map(),lastSize=new Map(),queue=[],videos=new Map();
// Pictures already drawn as pixel art (assets/icons/pixel) are left alone.
const skip=src=>!src||ours.has(src)||/\/pixel\//.test(src);
const bucket=px=>SIZES.find(s=>s>=px)||SIZES.at(-1);
const blockFor=box=>Math.max(box.width,box.height)<=48?ICON_BLOCK:BLOCK;
const urlsIn=text=>[...String(text).matchAll(/url\((['"]?)([^'")]+)\1\)/g)].map(m=>m[2]);
function remember(key,url){cache.set(key,url);ours.set(url,key.slice(0,key.lastIndexOf('|')));
 while(cache.size>MAX_CACHE){const [old,oldUrl]=cache.entries().next().value;cache.delete(old);
  if(!ruleUrls.has(oldUrl)&&!document.querySelector(`img[src="${oldUrl}"],[style*="${oldUrl}"]`)){ours.delete(oldUrl);URL.revokeObjectURL(oldUrl)}}}
const encode=canvas=>new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(URL.createObjectURL(blob)):reject(Error('encode')),'image/png'));
async function shrink(src,box){
 const image=new Image();image.decoding='async';image.src=src;await image.decode();
 // An SVG without its own size reports 0: draw it at twice its box.
 let nw=image.naturalWidth,nh=image.naturalHeight;if(!nw||!nh){nw=Math.ceil(box.width*2);nh=Math.ceil(box.height*2)}if(!nw||!nh)throw Error('empty');
 // The drawn width on screen (cover-style fit), divided by the block size.
 const shown=nw*Math.max(box.width/nw,box.height/nh),w=Math.min(nw,bucket(shown/blockFor(box))),h=Math.max(1,Math.round(w*nh/nw));
 const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');ctx.imageSmoothingQuality='high';
 let source=image;
 try{source=await createImageBitmap(image,{resizeWidth:w,resizeHeight:h,resizeQuality:'high'})}catch{
  // Halve step by step so a big source averages instead of skipping pixels.
  let cw=nw,ch=nh;while(cw/2>w){const step=document.createElement('canvas');step.width=cw=Math.ceil(cw/2);step.height=ch=Math.ceil(ch/2);step.getContext('2d').drawImage(source,0,0,cw,ch);source=step}
 }
 ctx.drawImage(source,0,0,w,h);source.close?.();image.removeAttribute('src');
 return {url:await encode(canvas),w};
}
const sizeOf=box=>bucket(Math.max(box.width,box.height)/blockFor(box));
function request(src,box){
 const key=src+'|'+sizeOf(box);
 if(cache.has(key))return Promise.resolve(cache.get(key));
 if(pending.has(key))return pending.get(key);
 const task=new Promise((resolve,reject)=>{queue.push({run:()=>shrink(src,box),resolve,reject});pump()}).then(({url})=>{remember(key,url);lastSize.set(src,key);return url}).finally(()=>pending.delete(key));
 pending.set(key,task);return task;
}
// Two at a time, started in idle time, so a deck editor full of new cards or a duel's first draws never land on an
// animation frame (measured 2026-11-12: starting them at once added long tasks during duel animations).
const idle=globalThis.requestIdleCallback?(fn,timeout=700)=>requestIdleCallback(fn,{timeout}):fn=>setTimeout(fn,16);
let waiting=false;
function pump(){if(waiting||running>=2||!queue.length)return;waiting=true;idle(()=>{waiting=false;
 while(running<2&&queue.length){const job=queue.shift();running++;job.run().then(job.resolve,job.reject).finally(()=>{running--;pump()})}})}
function originalOf(src){return ours.get(src)||src}
function setImage(img,url){if(!on||!img.isConnected)return;const current=img.getAttribute('src');if(!current||originalOf(current)!==img.dataset.pixOrig)return;
 if(current!==url){img.setAttribute('src',url);img.classList.add('pix')}}
function setStyle(el,from,url){if(!on)return;const style=el.getAttribute('style')||'';if(!style.includes(from))return;el.setAttribute('style',style.split(from).join(url));el.classList.add('pix-bg')}
function styleSources(el){return urlsIn(el.getAttribute('style')||'').map(originalOf).filter(src=>!skip(src))}

// <img> pictures are swapped by one stylesheet rule per source, img[src="…"]{content:url(small copy)}. The duel re-creates
// its card images on every update (about 1,900 in a 45 s duel), and swapping each src in script cost 0.55 s of main
// thread per 45 s at 4x CPU throttle; a rule costs nothing per new node (2026-11-12).
// A rule follows the smallest place the picture is shown (a portrait first seen large on character select stays
// coarse in the duel's small frame); a picture shown much larger than its rule gets its own src swap.
let swapSheet=null;const rules=new Map(),ruleUrls=new Set();
function sheet(){if(!swapSheet){const style=document.createElement('style');style.id='pixel-art-swaps';document.head.append(style);swapSheet=style.sheet}return swapSheet}
const quote=s=>s.replace(/["\\]/g,'\\$&');
function addRule(src,url,size){
 if(!on)return;const rule=rules.get(src);
 if(rule){if(size>=rule.size)return;rule.css.style.setProperty('content',`url("${url}")`);rule.size=size;rule.url=url;ruleUrls.add(url);
  // Places that showed the earlier, finer copy are measured again and get their own copy if they are larger.
  for(const img of document.querySelectorAll(`img[src="${quote(src)}"]`))visible.observe(img);return}
 const s=sheet(),index=s.insertRule(`img[src="${quote(src)}"]{content:url("${url}");image-rendering:pixelated}`,s.cssRules.length);
 rules.set(src,{size,url,css:s.cssRules[index]});ruleUrls.add(url);
}

// Inline SVG icons: drawn at their box size, scaled down with smoothing, then every pixel made fully opaque or fully
// clear, so a thin stroke becomes a run of solid pixels instead of a grey blur.
const icons=new Map(),iconSeen=new Map();
const shapeOf=svg=>(svg.getAttribute('viewBox')||'')+'|'+svg.innerHTML;
// Single-colour icons use currentColor and no other colour, so their shape can be a mask over the element's colour.
const singleColour=svg=>{const m=svg.outerHTML;return /currentColor/i.test(m)&&!/(fill|stroke|stop-color|color)\s*[=:]\s*["']?\s*(#|rgb|hsl|(?!none|currentColor|inherit)[a-z]+\b)/i.test(m.replace(/currentColor/gi,''))};
async function rasterIcon(svg,box,cs,w,h){
 const clone=svg.cloneNode(true);clone.setAttribute('xmlns','http://www.w3.org/2000/svg');clone.setAttribute('width',box.width);clone.setAttribute('height',box.height);
 clone.removeAttribute('class');clone.removeAttribute('style');
 clone.setAttribute('style',`color:${cs.color};fill:${cs.fill};stroke:${cs.stroke};stroke-width:${cs.strokeWidth};stroke-linecap:${cs.strokeLinecap};stroke-linejoin:${cs.strokeLinejoin}`);
 const image=new Image();image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(clone));await image.decode();
 const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d',{willReadFrequently:true});
 ctx.imageSmoothingQuality='high';ctx.drawImage(image,0,0,w,h);
 const data=ctx.getImageData(0,0,w,h),px=data.data;for(let i=3;i<px.length;i+=4)px[i]=px[i]>=90?255:0;ctx.putImageData(data,0,0);
 return encode(canvas);
}
function applyIcon(svg,{mask,url}){
 if(!on||!svg.isConnected)return;
 if(mask){svg.style.setProperty('-webkit-mask-image',`url("${url}")`);svg.style.setProperty('mask-image',`url("${url}")`);svg.classList.add('pix-icon','pix-mask')}
 else{svg.style.backgroundImage=`url("${url}")`;svg.classList.add('pix-icon')}
}
function measureIcon(svg,box){
 const cs=getComputedStyle(svg),block=blockFor(box),w=Math.max(4,Math.round(box.width/block)),h=Math.max(4,Math.round(box.height/block));
 const mask=singleColour(svg),shape=shapeOf(svg),key=`${shape}|${w}x${h}|${cs.strokeWidth}`+(mask?'':`|${cs.color}|${cs.fill}|${cs.stroke}`);
 let task=icons.get(key);
 if(!task){task=new Promise((resolve,reject)=>{queue.push({run:()=>rasterIcon(svg,box,cs,w,h),resolve,reject});pump()}).then(url=>({mask,url}));icons.set(key,task);task.catch(()=>icons.delete(key))}
 task.then(icon=>{iconSeen.set(shape,icon);applyIcon(svg,icon)},()=>{});
}
function trackIcon(svg){
 if(svg.ownerSVGElement||svg.classList.contains('pix-icon'))return;
 // Seen before: reuse its last bitmap at once so a re-render never flashes the smooth icon, then re-measure.
 const seen=iconSeen.get(shapeOf(svg));if(seen)applyIcon(svg,seen);
 visible.observe(svg);
}

// Stylesheet backgrounds and masks: one override rule per stylesheet rule, sized from the first element it styles.
// Rules are listed once; the ones not yet matched are checked in idle time at most once a second after the page changes.
let sheetRules=null,sheetCheck=0;
const DYNAMIC=/:(hover|active|focus|focus-visible|focus-within)\b|::?(before|after|backdrop|placeholder|marker|selection|first-line|first-letter|-webkit-[a-z-]+)/g;
function listSheetRules(){
 sheetRules=[];
 const walk=(list,media,base)=>{for(const rule of list){
  if(rule instanceof CSSMediaRule){walk(rule.cssRules,media?`${media} and ${rule.conditionText}`:rule.conditionText,base);continue}
  if(!(rule instanceof CSSStyleRule))continue;
  const selector=rule.selectorText;if(/pixel-art|data-duel-theme/.test(selector))continue;
  for(const prop of ['background-image','mask-image','-webkit-mask-image']){
   const value=rule.style.getPropertyValue(prop);if(!value.includes('url('))continue;
   const srcs=urlsIn(value).filter(u=>!u.startsWith('blob:')&&!skip(u));if(!srcs.length)continue;
   const probe=selector.replace(DYNAMIC,'');
   sheetRules.push({selector,probe,media,prop,value,srcs:srcs.map(u=>new URL(u,base).href),important:rule.style.getPropertyPriority(prop)});
  }
 }};
 for(const s of document.styleSheets){if(s===swapSheet)continue;try{walk(s.cssRules,'',s.href||location.href)}catch{}}
}
function checkSheetRules(){
 sheetCheck=0;if(!on)return;if(!sheetRules)listSheetRules();
 for(const rule of sheetRules){
  if(rule.done)continue;let el=null;try{el=document.querySelector(rule.probe)}catch{rule.done=true;continue}
  if(!el)continue;const box=el.getBoundingClientRect();if(box.width<MIN_BOX&&box.height<MIN_BOX)continue;rule.done=true;
  Promise.all(rule.srcs.map(src=>request(src,box))).then(urls=>{
   if(!on)return;let value=rule.value;urlsIn(rule.value).forEach(u=>{const i=rule.srcs.indexOf(new URL(u,location.href).href);if(i>=0)value=value.split(u).join(urls[i])});
   const css=`${rule.selector}{${rule.prop}:${value} !important;image-rendering:pixelated}`;
   try{const s=sheet();s.insertRule(rule.media?`@media ${rule.media}{${css}}`:css,s.cssRules.length)}catch{}
  },()=>{});
 }
}
const queueSheetCheck=()=>{if(!sheetCheck)sheetCheck=setTimeout(()=>idle(checkSheetRules,1500),1000)};

// One selector query per added subtree: the duel adds many short-lived nodes (2026-11-12, see addRule).
const WANTED='img,[style*="url("],video,svg';
let tracked=0;
function track(el){tracked++;
 if(el instanceof HTMLImageElement){if(skip(el.getAttribute('src')))return}
 else for(const src of styleSources(el)){const key=lastSize.get(src);if(key&&cache.has(key))setStyle(el,src,cache.get(key))}
 visible.observe(el);
}
function visit(el){
 if(el instanceof SVGSVGElement)trackIcon(el);
 else if(el instanceof HTMLVideoElement){if(el.classList.contains('background-video'))pixelVideo(el)}
 else if(el instanceof HTMLImageElement||el.getAttribute('style')?.includes('url('))track(el);
}
function scan(node){
 if(!(node instanceof Element)||!node.isConnected)return;
 if(node.matches(WANTED))visit(node);
 for(const el of node.querySelectorAll(WANTED))visit(el);
}
function measured(el,box){
 if(box.width<MIN_BOX&&box.height<MIN_BOX)return;
 if(el instanceof SVGSVGElement){measureIcon(el,box);return}
 if(el instanceof HTMLImageElement){
  const current=el.getAttribute('src')||'',src=ours.has(current)?el.dataset.pixOrig:current;if(!src||skip(src))return;
  const size=sizeOf(box),rule=rules.get(src);
  if(!rule||size*1.4<rule.size)request(src,box).then(url=>addRule(src,url,size),()=>{});
  else if(size>rule.size*1.4){el.dataset.pixOrig=src;request(src,box).then(url=>setImage(el,url),()=>{})}
  return;
 }
 for(const src of styleSources(el)){const current=urlsIn(el.getAttribute('style')).find(u=>originalOf(u)===src);request(src,box).then(url=>setStyle(el,current,url),()=>{})}
}
function onMutations(records){
 let removed=false,added=false;
 for(const r of records){
  if(r.type==='attributes'){if(r.target instanceof HTMLImageElement&&!ours.has(r.target.getAttribute('src')||'')){delete r.target.dataset.pixOrig;r.target.classList.remove('pix');track(r.target)}continue}
  for(const node of r.addedNodes){scan(node);added=true}
  if(r.removedNodes.length)removed=true;
 }
 if(added)queueSheetCheck();
 // Detached pictures need no unobserve: Chrome's IntersectionObserver holds its targets weakly.
 if(removed&&videos.size)for(const [v,stop] of videos)if(!v.isConnected)stop();
}
// Background videos: one small canvas over the clip, drawn from the playing frame.
function pixelVideo(video){
 if(videos.has(video))return;
 const canvas=document.createElement('canvas');canvas.className='pix-video';canvas.setAttribute('aria-hidden','true');
 const ctx=canvas.getContext('2d',{alpha:false});let layout=null,last=0,handle=0,stopped=false;
 const place=()=>{const parent=canvas.parentElement;if(!parent)return;const p=parent.getBoundingClientRect(),v=video.getBoundingClientRect();
  canvas.width=Math.max(1,Math.ceil(p.width/VIDEO_BLOCK));canvas.height=Math.max(1,Math.ceil(p.height/VIDEO_BLOCK));layout={p,v};draw(true)};
 const draw=force=>{
  if(stopped||video.readyState<2||!layout||!video.videoWidth)return;const now=performance.now();if(!force&&now-last<1000/VIDEO_FPS)return;last=now;
  const {p,v}=layout,s=canvas.width/p.width,fit=Math.max(v.width/video.videoWidth,v.height/video.videoHeight),dw=video.videoWidth*fit,dh=video.videoHeight*fit;
  ctx.save();ctx.beginPath();ctx.rect((v.left-p.left)*s,(v.top-p.top)*s,v.width*s,v.height*s);ctx.clip();
  ctx.drawImage(video,(v.left-p.left+(v.width-dw)/2)*s,(v.top-p.top+(v.height-dh)/2)*s,dw*s,dh*s);ctx.restore();
  video.classList.add('pix-covered');
 };
 const loop=()=>{if(stopped)return;draw(false);handle=video.requestVideoFrameCallback?video.requestVideoFrameCallback(loop):setTimeout(loop,1000/VIDEO_FPS)};
 const resize=new ResizeObserver(place),moved=new MutationObserver(place);
 const kick=()=>{draw(true);if(!handle)loop()};
 const events=['loadeddata','seeked','play'];
 const stop=()=>{stopped=true;resize.disconnect();moved.disconnect();for(const e of events)video.removeEventListener(e,kick);
  if(video.cancelVideoFrameCallback)video.cancelVideoFrameCallback(handle);else clearTimeout(handle);canvas.remove();video.classList.remove('pix-covered');videos.delete(video)};
 videos.set(video,stop);video.after(canvas);resize.observe(video.parentElement);resize.observe(video);moved.observe(video,{attributes:true,attributeFilter:['style']});
 for(const e of events)video.addEventListener(e,kick);requestAnimationFrame(()=>{place();loop()});
}
function restore(){
 swapSheet?.ownerNode?.remove();swapSheet=null;rules.clear();ruleUrls.clear();sheetRules=null;clearTimeout(sheetCheck);sheetCheck=0;
 for(const img of document.querySelectorAll('img[data-pix-orig]')){const src=img.getAttribute('src');if(ours.has(src))img.setAttribute('src',img.dataset.pixOrig);delete img.dataset.pixOrig;img.classList.remove('pix')}
 for(const el of document.querySelectorAll('.pix-bg')){let style=el.getAttribute('style')||'';for(const u of urlsIn(style))if(ours.has(u))style=style.split(u).join(ours.get(u));el.setAttribute('style',style);el.classList.remove('pix-bg')}
 for(const svg of document.querySelectorAll('svg.pix-icon')){for(const p of ['-webkit-mask-image','mask-image','background-image'])svg.style.removeProperty(p);svg.classList.remove('pix-icon','pix-mask');if(!svg.getAttribute('style'))svg.removeAttribute('style')}
 for(const stop of [...videos.values()])stop();
}
export function setPixelArt(enable){
 enable=!!enable;if(!document.body){document.addEventListener('DOMContentLoaded',()=>setPixelArt(enable),{once:true});return}
 if(enable===on)return;on=enable;
 if(on){
  visible=new IntersectionObserver(entries=>{for(const e of entries){if(!e.isIntersecting)continue;visible.unobserve(e.target);measured(e.target,e.boundingClientRect)}},{rootMargin:'300px'});
  mutations=new MutationObserver(onMutations);mutations.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['src']});
  scan(document.body);queueSheetCheck();
 }else{mutations?.disconnect();visible?.disconnect();mutations=visible=null;queue.length=0;restore()}
}
globalThis.pixelArt={set:setPixelArt,get on(){return on},stats:()=>({tracked,cached:cache.size,pending:pending.size,videos:videos.size,icons:icons.size,sheetRules:sheetRules?.filter(r=>r.done).length??0})};
