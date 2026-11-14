// Text overflow check (2026-11-14): loads the webapp from tools/serve_qa.py in headless Chrome, switches the Language
// setting through all 9 languages, walks the screens in portrait, landscape-phone and desktop sizes at Text Size 100 and
// 150 (plus the Pixel Art Duel Look), and lists every piece of text that leaves the button, pill, label or box it sits
// in. Local QA tool: nothing here is bundled in a release.
//
//   node tools/check_text_overflow.cjs [--langs en,de] [--views portrait,landscape,desktop] [--screens shop,settings]
//        [--looks default@100,default@150,pixel-art@150] [--out D:/Codex Exports/Diagnostics/text-overflow] [--shots]
//
// Needs Playwright with Chrome (tools/require-module.cjs) and Node 20+. Exit code 1 when anything overflows.
const {chromium}=require('./require-module.cjs').requireModule('playwright');
const {spawn}=require('node:child_process'),fs=require('node:fs'),path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const arg=(name,fallback)=>{const i=process.argv.indexOf('--'+name);return i<0?fallback:process.argv[i+1]};
const list=(name,fallback)=>arg(name,fallback).split(',').map(s=>s.trim()).filter(Boolean);
const LANGS=list('langs','en,de,es,fr,it,ja,ko,pt,zh');
const VIEWS={portrait:{width:412,height:915,isMobile:true,hasTouch:true},landscape:{width:915,height:412,isMobile:true,hasTouch:true},desktop:{width:1600,height:900}};
const VIEW_NAMES=list('views','portrait,landscape,desktop');
const LOOKS=list('looks','default@100,default@150,pixel-art@150').map(s=>{const [theme,size]=s.split('@');return {name:s,theme:theme==='default'?'':theme,size:+size||100}});
const OUT=arg('out',path.join(ROOT,'temp','text-overflow'));
const SHOTS=process.argv.includes('--shots');
const ONLY=arg('screens',null)?.split(',');

// Each screen: how to reach it from the shop scenario's run. `go` names mobile.js screens, `do` clicks a data-do button.
const SCREENS=[
 {id:'title',go:'title'},
 {id:'title-online',go:'title',do:['online']},
 {id:'startup-choice',special:'startup-choice'},
 {id:'characters',go:'characters'},
 {id:'routes',go:'routes'},
 {id:'shop',go:'shop'},
 {id:'shop-relics',go:'shop',do:['relic-ledger']},
 {id:'shop-scorecard',go:'shop',do:['scorecard']},
 {id:'deck-editor',go:'draft'},
 {id:'achievements',go:'achievements'},
 {id:'relics',go:'relics'},
 ...['sound','effects','gameplay','display','devices','replays','about'].map(tab=>({id:'settings-'+tab,go:'settings',tab})),
 {id:'language-picker',go:'settings',tab:'display',do:['language']},
 {id:'cosmetics',go:'cosmetics'},
 {id:'tutorial',go:'tutorial'},
 {id:'collection',go:'collection'},
 {id:'stats',go:'stats'},
 {id:'duel',special:'duel'},
];
// Screens that need their own page load: run end scenarios, and the online lobbies (Tag, Draft Duels) as far as they go offline.
const ENDINGS=[{id:'run-end-won',scenario:'won',go:'ending'},{id:'run-end-lost',scenario:'lost',go:'ending'},{id:'tag-lobby',scenario:'shop',do:'tag'},{id:'draft-duels',scenario:'shop',do:'draft-pvp'},{id:'ultimate-collector',scenario:'shop',do:'collector'}];

// Runs in the page. Every visible text node is measured against the boxes around it: the nearest button, pill,
// input or element with its own background/border, and any ancestor that clips. Scroll lists may scroll along their axis.
function audit(){
 const found=[],range=document.createRange(),vw=innerWidth,styles=new Map();
 const style=el=>{let s=styles.get(el);if(!s){s=getComputedStyle(el);styles.set(el,s)}return s};
 const name=el=>{const parts=[];for(let e=el;e&&e!==document.body&&parts.length<4;e=e.parentElement){let p=e.tagName.toLowerCase();if(e.id)p+='#'+e.id;const cls=[...e.classList].filter(c=>!/^(active|selected|on|off|is-|has-)/.test(c)).slice(0,2);if(cls.length)p+='.'+cls.join('.');const d=e.dataset?.do;if(d)p+=`[data-do=${d}]`;parts.unshift(p)}return parts.join(' > ')};
 const boxed=(el,s)=>{
  if(/^(BUTTON|SELECT|INPUT|SUMMARY)$/.test(el.tagName)||el.getAttribute('role')==='button'||el.getAttribute('role')==='tab')return true;
  if(s.display==='inline')return false;
  const bg=s.backgroundColor,hasBg=bg&&!/rgba\(.*,\s*0\)$/.test(bg)&&bg!=='transparent';
  const border=parseFloat(s.borderLeftWidth)+parseFloat(s.borderRightWidth)>0&&s.borderLeftStyle!=='none';
  return hasBg||border||s.backgroundImage!=='none';
 };
 const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{acceptNode:n=>/\S/.test(n.nodeValue)?1:2});
 for(let n=walker.nextNode();n;n=walker.nextNode()){
  const el=n.parentElement;if(!el||el.closest('script,style,noscript,template,option,textarea,.qa-ignore'))continue;
  const shut=el.closest('details:not([open])');if(shut&&!el.closest('summary'))continue;
  range.selectNodeContents(n);const rects=[...range.getClientRects()].filter(r=>r.width>.5&&r.height>.5);if(!rects.length)continue;
  // Rows far outside the screen look the same as the visible ones; skipping them keeps long lists quick.
  if(rects[0].top>innerHeight*1.5||rects[rects.length-1].bottom<-innerHeight*.5)continue;
  const t={left:Math.min(...rects.map(r=>r.left)),right:Math.max(...rects.map(r=>r.right)),top:Math.min(...rects.map(r=>r.top)),bottom:Math.max(...rects.map(r=>r.bottom))};
  const es=style(el),font=parseFloat(es.fontSize)||12;
  let hidden=false,boxes=0,issue=null,inner=null,done=false,placed=false;
  for(let a=el;a&&a!==document.documentElement;a=a.parentElement){
   const s=style(a);if(s.visibility==='hidden'||s.opacity==='0'||s.display==='none'||s.contentVisibility==='hidden'){hidden=true;break}
   if(issue||done)continue;
   const clipX=s.overflowX!=='visible',clipY=s.overflowY!=='visible',scrollY=/auto|scroll/.test(s.overflowY),scrollX=/auto|scroll/.test(s.overflowX)&&!scrollY;
   // Past an absolutely placed label (a badge or name set over an edge on purpose) only clipping counts.
   const isBox=!placed&&boxed(a,s);if(/absolute|fixed/.test(s.position))placed=true;if(!isBox&&!clipX&&!clipY)continue;
   const r=a.getBoundingClientRect();if(r.width<1||r.height<1)continue;
   const L=r.left+parseFloat(s.borderLeftWidth),R=r.right-parseFloat(s.borderRightWidth),T=r.top+parseFloat(s.borderTopWidth),B=r.bottom-parseFloat(s.borderBottomWidth);
   // Line boxes are taller than glyphs; give the vertical test a little slack so tight pills with line-height 1 pass.
   const dx=Math.max(L-t.left,t.right-R),dy=Math.max(T-t.top,t.bottom-B),slackY=1+font*.22;
   const overX=dx>1.5&&!scrollX,overY=dy>slackY&&!scrollY;
   // A whole item sliding out of a non-boxed clipping row (carousel, scrolled list) is layout, not text overflow.
   const itemOut=inner&&!isBox&&(()=>{const b=inner.getBoundingClientRect();return overX?Math.max(L-b.left,b.right-R)>=dx-1:Math.max(T-b.top,b.bottom-B)>=dy-1})();
   if((overX||overY)&&itemOut){done=true;continue}
   if(overX||overY){
    const ellipsis=a===el&&es.textOverflow==='ellipsis'&&clipX;
    issue={kind:ellipsis?'ellipsis':clipX||clipY?'clipped':'spills',axis:overX?'x':'y',px:Math.round(overX?dx:dy),box:name(a),boxIsText:a===el};
   }
   if(scrollY||scrollX){done=true;continue}
   if(isBox){inner=a;if(++boxes>=3)done=true}
  }
  if(hidden)continue;
  if(!issue&&(t.right>vw+1.5||t.left<-1.5)){let inScroll=false;for(let a=el;a&&a!==document.body;a=a.parentElement){const s=style(a);if(/auto|scroll/.test(s.overflowX)){inScroll=true;break}}const card=inner?.getBoundingClientRect(),cardOut=card&&Math.max(card.right-vw,-card.left)>=Math.max(t.right-vw,-t.left)-1;if(!inScroll&&!cardOut)issue={kind:'offscreen',axis:'x',px:Math.round(Math.max(t.right-vw,-t.left)),box:'viewport'}}
  if(issue){issue.text=n.nodeValue.trim().replace(/\s+/g,' ').slice(0,80);issue.el=name(el);issue.font=font;found.push(issue)}
 }
 // Dropdowns draw their chosen option themselves, so measure that text against the room left beside the arrow.
 const ctx=document.createElement('canvas').getContext('2d');
 for(const sel of document.querySelectorAll('select')){
  const r=sel.getBoundingClientRect();if(r.width<1||r.top>innerHeight||r.bottom<0||!sel.checkVisibility?.({visibilityProperty:true,opacityProperty:true}))continue;
  const s=style(sel),text=sel.selectedOptions[0]?.textContent.trim();if(!text)continue;
  ctx.font=`${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
  const room=sel.clientWidth-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight)-(s.appearance==='none'?0:20),wide=ctx.measureText(text).width;
  if(wide>room+1.5)found.push({kind:'clipped',axis:'x',px:Math.round(wide-room),box:name(sel),el:name(sel),text,font:parseFloat(s.fontSize)});
 }
 return found;
}

async function startServer(){
 const port=4300+Math.floor(Math.random()*500);
 const child=spawn('python',[path.join(ROOT,'tools','serve_qa.py')],{env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','ignore']});
 await new Promise((ok,fail)=>{child.stdout.on('data',d=>{if(/Serving on/.test(d))ok()});child.on('exit',c=>fail(Error('serve_qa.py exited '+c)))});
 return {url:`http://127.0.0.1:${port}`,stop:()=>child.kill()};
}

const NO_MOTION=`*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;animation-iteration-count:1!important;transition:none!important;caret-color:transparent!important}`;
async function settle(page,ms=350){await page.waitForTimeout(ms);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))}
// Pages start one at a time: several cold starts at once stall the local server and the WebAssembly loads.
let bootLock=Promise.resolve();
// A cold start that fails ("Could not start") gets a second try.
function boot(...a){const run=bootLock.then(()=>bootPage(...a).catch(e=>{console.log('  retrying start: '+e.message.slice(0,200));return bootPage(...a)}));bootLock=run.catch(()=>{});return run}
async function bootPage(context,base,scenario){
 const page=await context.newPage();page.on('pageerror',e=>console.log('  page error:',e.message.slice(0,200)));
 await page.goto(`${base}/index.html?scenario=${scenario}&tagtest=1`);
 await page.waitForFunction(()=>window.shadowTest&&!document.querySelector('.loading'),null,{timeout:240000}).catch(async e=>{const at=await page.evaluate(()=>document.querySelector('#app')?.innerText.replace(/\s+/g,' ').slice(0,300)).catch(()=>'?');await page.close();throw Error(`${scenario} did not load: ${at}`)});
 await page.addStyleTag({content:NO_MOTION});await settle(page,800);
 await page.evaluate(()=>{const m=document.querySelector('#modal');if(m?.open)m.close()});
 return page;
}
async function setMode(page,lang,look){
 await page.evaluate(async ({lang,look})=>{
  const i18n=await import('./i18n.js'),display=await import('./display-options.js');
  await i18n.setLanguage(lang,{remember:false});
  const settings=window.shadowTest.state().settings||{};display.applyDisplayOptions({...settings,reduceMotion:true,textSize:look.size,duelTheme:look.theme});
 },{lang,look});
}
async function clickDo(page,action,fallback=false){
 const ok=await page.evaluate(({a,fallback})=>{let el=[...document.querySelectorAll(`[data-do="${a}"]`)].find(e=>e.offsetParent||e.getClientRects().length);
  // Menu entries off the carousel's front have no visible button; a stand-in button runs the same action.
  if(!el&&fallback){el=document.createElement('button');el.dataset.do=a;el.style.cssText='position:fixed;opacity:0';document.querySelector('#app').append(el);el.click();el.remove();return true}
  if(!el)return false;el.click();return true},{a:action,fallback});
 await settle(page,450);return ok;
}
async function openScreen(page,s){
 await page.evaluate(()=>{const m=document.querySelector('#modal');if(m?.open)m.close();document.querySelectorAll('.toast').forEach(t=>t.remove())});
 if(s.special==='startup-choice'){
  await page.evaluate(async()=>{const app=document.querySelector('#app');app.querySelector('.startup-choice')?.remove();localStorage.removeItem('ygo-preload-visuals');const m=await import('./startup-choice.js');window.__choice=m.chooseStartupPreload(app);localStorage.setItem('ygo-preload-visuals','sounds')});
  await settle(page);return true;
 }
 if(s.go)await page.evaluate(g=>window.shadowTest.go(g),s.go);
 await settle(page);
 if(s.tab&&!await clickDo(page,`settings-tab"][data-tab="${s.tab}`))return false;
 for(const d of s.do||[])if(!await clickDo(page,d,true))return false;
 return true;
}
async function closeSpecial(page,s){if(s.special==='startup-choice')await page.evaluate(()=>document.querySelector('.startup-choice [data-sounds]')?.click())}

async function main(){
 fs.mkdirSync(OUT,{recursive:true});
 const server=await startServer(),browsers=[];
 // One browser per size: pages sharing a browser can be treated as background tabs and stop getting frames.
 const launch=async()=>{const b=await chromium.launch({headless:true,channel:'chrome',args:['--mute-audio','--disable-features=LocalNetworkAccessChecks','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});browsers.push(b);return b};
 const results=[],failures=[];let checked=0;const started=Date.now();
 const record=(meta,issues)=>{checked++;for(const i of issues)results.push({...meta,...i})};
 const shot=async(page,meta)=>{if(SHOTS)await page.screenshot({path:path.join(OUT,`${meta.screen}-${meta.view}-${meta.lang}-${meta.look.replace('@','_')}.png`)})};
 try{
  // The three sizes run side by side, each in its own browser context.
  await Promise.all(VIEW_NAMES.map(viewName=>runView(viewName).catch(e=>{console.log(`[${viewName}] stopped: ${e.message.split(String.fromCharCode(10))[0]}`);failures.push(viewName)})));
  async function runView(viewName){
   const view=VIEWS[viewName];
   const browser=await launch();
   const context=await browser.newContext({viewport:{width:view.width,height:view.height},isMobile:!!view.isMobile,hasTouch:!!view.hasTouch,deviceScaleFactor:1});
   await context.addInitScript(()=>{try{localStorage.setItem('ygo-preload-visuals','sounds');localStorage.setItem('ygo-language','en')}catch{}});
   const page=await boot(context,server.url,'shop');
   console.log(`[${viewName}] booted after ${Math.round((Date.now()-started)/1000)}s`);
   const screens=SCREENS.filter(s=>!ONLY||ONLY.includes(s.id));
   for(const look of LOOKS)for(const lang of LANGS){
    await setMode(page,lang,look);
    for(const s of screens){
     if(s.special==='duel')continue;
     const meta={view:viewName,lang,look:look.name,screen:s.id};
     if(!await openScreen(page,s)){console.log('  could not open',s.id);continue}
     const issues=await page.evaluate(audit);record(meta,issues);if(issues.length)await shot(page,meta);
     await closeSpecial(page,s);
    }
    process.stdout.write(`  ${viewName} ${look.name} ${lang}: ${results.length} so far\n`);
   }
   // The duel: start one from the run and check the field and the first prompt.
   if(!ONLY||ONLY.includes('duel')){
    await setMode(page,'en',LOOKS[0]);
    const ok=await page.evaluate(async()=>{try{window.shadowTest.go('routes');window.shadowTest.startDuel(false,0);return true}catch(e){return e.message}});
    if(ok===true){await page.waitForFunction(()=>window.shadowTest.screen()==='duel'&&document.querySelector('.duel')&&!document.querySelector('.loading'),null,{timeout:120000}).catch(()=>console.log('  duel did not load'));await settle(page,6000);
     for(const look of LOOKS)for(const lang of LANGS){await setMode(page,lang,look);await page.evaluate(()=>{const m=document.querySelector('#modal');if(m?.open&&!m.querySelector('.prompt,.select'))m.close()});await settle(page,500);const meta={view:viewName,lang,look:look.name,screen:'duel'};const issues=await page.evaluate(audit);record(meta,issues);if(issues.length)await shot(page,meta)}
    }else console.log('  duel did not start:',ok);
   }
   await page.close();
   for(const e of ENDINGS){
    if(ONLY&&!ONLY.includes(e.id))continue;
    const p=await boot(context,server.url,e.scenario);
    if(e.do){await clickDo(p,e.do,true);await settle(p,2500)}
    for(const look of LOOKS)for(const lang of LANGS){await setMode(p,lang,look);await p.evaluate(go=>{const m=document.querySelector('#modal');if(m?.open)m.close();if(go)window.shadowTest.go(go);else (window.tagTest?.ui||window.shadowTest.collector())?.render?.()},e.go);await settle(p,500);const meta={view:viewName,lang,look:look.name,screen:e.id};const issues=await p.evaluate(audit);record(meta,issues);if(issues.length)await shot(p,meta)}
    await p.close();
   }
   await context.close();
  }
 }finally{await Promise.all(browsers.map(b=>b.close()));server.stop()}
 // Group the same element and text across languages so the report reads as a fix list.
 const groups=new Map();
 for(const r of results){const key=`${r.screen}|${r.el}|${r.kind}`;const g=groups.get(key)||{screen:r.screen,el:r.el,box:r.box,kind:r.kind,max:0,hits:[]};g.max=Math.max(g.max,r.px);g.hits.push(`${r.lang}/${r.view}/${r.look}: "${r.text}" ${r.axis}+${r.px}px`);groups.set(key,g)}
 const sorted=[...groups.values()].sort((a,b)=>b.hits.length*b.max-a.hits.length*a.max);
 fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify({checked,issues:results.length,groups:sorted},null,1));
 const lines=sorted.map(g=>`${g.kind.toUpperCase()} ${g.screen}  ${g.el}\n   in ${g.box}  (${g.hits.length} hits, up to ${g.max}px)\n   ${g.hits.slice(0,4).join('\n   ')}`);
 fs.writeFileSync(path.join(OUT,'report.txt'),lines.join('\n')+'\n');
 console.log(`${checked} screen checks, ${results.length} overflowing texts in ${sorted.length} groups (${Math.round((Date.now()-started)/1000)}s). Report: ${path.join(OUT,'report.txt')}`);
 if(failures.length)console.log('Sizes that did not finish: '+failures.join(', '));
 if(results.length||failures.length)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=2});
