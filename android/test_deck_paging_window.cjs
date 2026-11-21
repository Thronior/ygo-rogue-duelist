// Windowed deck grids (deck-paging.js, Nori on Discord 2026-11-20: a huge collection scrolled slower and slower).
// Drives the real module and the game's mobile.css in Chrome: rows far from the view are released and come back, the
// spacer keeps every card exactly where a full grid would put it, cards never change column, a jump (scroll reset or a
// dragged scrollbar) draws the right rows, an in-place redraw keeps the range, and the selected card is never released.
// Run from the project root: runtime/ai/node.exe android/test_deck_paging_window.cjs
const {chromium}=require('../tools/require-module.cjs').requireModule('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
process.env.TEMP=process.env.TMP=path.resolve('temp');
const WEB=path.resolve('android/web'),ORIGIN='http://harness.test';
const page=`<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="mobile.css"></head><body>
<div class="draft-scroll"><div class="draft-card-scroll" id="box" style="height:600px;overflow:auto;width:700px"><div class="cardgrid" id="grid"></div></div></div>
<div class="draft-scroll" style="position:absolute;left:-9999px;top:0"><div class="draft-card-scroll" style="width:700px"><div class="cardgrid" id="full"></div></div></div></body></html>`;
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome'});try{
 const ctx=await browser.newContext({viewport:{width:900,height:800}});
 await ctx.route(ORIGIN+'/**',route=>{const p=new URL(route.request().url()).pathname.slice(1);if(p==='harness.html')return route.fulfill({contentType:'text/html',body:page});const f=path.join(WEB,p);if(!f.startsWith(WEB)||!fs.existsSync(f))return route.fulfill({status:404,body:''});route.fulfill({path:f,contentType:p.endsWith('.css')?'text/css':p.endsWith('.js')?'text/javascript':undefined})});
 const tab=await ctx.newPage();const errors=[];tab.on('pageerror',e=>errors.push(e.message));tab.on('console',m=>{if(m.type()==='warning'||m.type()==='error')errors.push(m.text())});
 await tab.goto(ORIGIN+'/harness.html');
 const r=await tab.evaluate(async()=>{
  const {pagedGrid,PAGE}=await import('./deck-paging.js');
  const N=3000,items=[...Array(N).keys()],afterCalls=[];
  // Rows differ in height (a Spell row has no ATK/DEF line), so the spacer must hold the real heights.
  const markup=i=>`<button class="cardbtn" data-i="${i}" style="height:${i%9===4?150:110}px">${i}</button>`;
  const box=document.querySelector('#box'),grid=document.querySelector('#grid'),full=document.querySelector('#full');
  full.innerHTML=items.map(markup).join('');const fullTop=i=>full.children[i].offsetTop;
  const cols=getComputedStyle(grid).gridTemplateColumns.split(' ').length;
  const frames=n=>new Promise(ok=>{const f=k=>k?requestAnimationFrame(()=>f(k-1)):ok();f(n)});
  const tiles=()=>[...grid.querySelectorAll('[data-i]')];
  // The first-column card at height y of the view (null when the view shows no card there: a blank spacer).
  const at=y=>{const b=box.getBoundingClientRect(),el=tiles().find(el=>{const r=el.getBoundingClientRect();return r.left<b.left+30&&r.bottom>b.top+y});return el&&el.getBoundingClientRect().top<b.top+y+200?el:null};
  const checks={maxTiles:0,misplaced:[],column:[],blank:[]};
  // A jump draws rows at a height estimated from the released rows' average, so until the view is back where rows were
  // measured (the top) a card may sit up to one row-height difference away from the full grid's spot.
  let tol=1;
  const audit=label=>{const t=tiles();checks.maxTiles=Math.max(checks.maxTiles,t.length);const g=grid.getBoundingClientRect().top;
   for(const el of [t[0],t[Math.floor(t.length/2)],t[t.length-1]]){const i=+el.dataset.i,y=el.getBoundingClientRect().top-g;if(Math.abs(y-fullTop(i))>tol)checks.misplaced.push([label,i,Math.round(y),fullTop(i)])}
   const left=at(300);if(!left)checks.blank.push(label);else if(+left.dataset.i%cols)checks.column.push([label,+left.dataset.i])};
  const render=(key='k')=>{grid.innerHTML=pagedGrid('t',key,items,markup,nodes=>afterCalls.push(nodes.length))};
  render();const first=tiles().length;await frames(2);
  // Down to the end, 300px a frame.
  let seen=[];for(let k=0;k<2000&&box.scrollTop+box.clientHeight<box.scrollHeight-1;k++){box.scrollTop+=300;await frames(2);audit('down '+k);seen.push(+at(300)?.dataset.i)}
  const monotonic=seen.every((v,k)=>!k||v>=seen[k-1]),reachedEnd=!!grid.querySelector('[data-i="2999"]'),bottomTiles=tiles().length,gapAtEnd=grid.querySelector('.deck-gap')?.offsetHeight||0;
  // A jump from the end into the released rows (a dragged scrollbar), then back to the end.
  box.scrollTop=fullTop(1500);await frames(3);tol=45;audit('jump');const jumpTile=+at(300)?.dataset.i;
  for(let k=0;k<40&&box.scrollTop+box.clientHeight<box.scrollHeight-1;k++){box.scrollTop=box.scrollHeight;await frames(2)}
  // Back up to the top.
  seen=[];for(let k=0;k<2000&&box.scrollTop>0;k++){box.scrollTop-=300;await frames(2);audit('up '+k);seen.push(+at(300)?.dataset.i)}
  tol=1;const monotonicUp=seen.every((v,k)=>!k||v<=seen[k-1]),topFirst=+tiles()[0].dataset.i,gapAtTop=!!grid.querySelector('.deck-gap');
  // A scroll reset after a redraw with the same order.
  render();box.scrollTop=0;await frames(3);audit('reset');const resetTile=+at(5)?.dataset.i;
  // An in-place redraw (a tap with stacks) restores the scroll and keeps the same cards.
  box.scrollTop=fullTop(2000);await frames(4);const before=+at(300).dataset.i,top=box.scrollTop;render();box.scrollTop=top;await frames(2);const after=+at(300)?.dataset.i;audit('redraw');
  // A column change (Card Size, a resize) with rows released above: cards stay on whole rows, and the top lines up again.
  for(let k=0;k<80;k++){box.scrollTop+=300;await frames(2)}const gapBeforeResize=!!grid.querySelector('.deck-gap');
  tol=1e9;box.style.width='480px';await frames(3);const newCols=getComputedStyle(grid).gridTemplateColumns.split(' ').length;
  const colsBefore=cols;let colBad=[];const colAudit=l=>{const el=at(300);if(el&&+el.dataset.i%newCols)colBad.push([l,+el.dataset.i])};
  for(let k=0;k<10;k++){box.scrollTop+=300;await frames(2);colAudit('resize down '+k)}
  for(let k=0;k<2000&&box.scrollTop>0;k++){box.scrollTop-=300;await frames(2);colAudit('resize up '+k)}
  await frames(3);const resizeTop=+tiles()[0].dataset.i,resizeGap=!!grid.querySelector('.deck-gap');box.style.width='700px';tol=1;
  // The gamepad's selection is never released, however far the view goes.
  const held=at(300);held.setAttribute('data-pad-focus','');box.scrollTop=0;await frames(4);for(let k=0;k<20;k++){box.scrollTop+=50;await frames(1)}const heldKept=held.isConnected;held.removeAttribute('data-pad-focus');
  // A new order starts again at the top with the first page.
  render('other');const freshFirst=+tiles()[0].dataset.i,freshCount=tiles().length,freshGap=!!grid.querySelector('.deck-gap');
  return {PAGE,cols,first,checks,monotonic,monotonicUp,reachedEnd,bottomTiles,gapAtEnd,topFirst,gapAtTop,jumpTile,resetTile,before,after,heldKept,freshFirst,freshCount,freshGap,afterCalls:afterCalls.length,gapBeforeResize,colsBefore,newCols,colBad,resizeTop,resizeGap};
 });
 const out=JSON.stringify(r);
 assert.equal(r.first,r.PAGE,'first draw is one page');
 assert.ok(r.monotonic&&r.monotonicUp,'cards under the view move one way while scrolling: '+out);
 assert.ok(r.reachedEnd,'the last card is reachable');
 assert.ok(r.checks.maxTiles<=700,`at most ~700 of 3000 tiles drawn at once (${r.checks.maxTiles})`);
 assert.ok(r.bottomTiles<400&&r.gapAtEnd>10000,'rows above are released at the end, with their height kept: '+out);
 assert.deepEqual(r.checks.misplaced,[],'every drawn card sits exactly where the full grid puts it');
 assert.deepEqual(r.checks.column,[],'no card changes column');
 assert.deepEqual(r.checks.blank,[],'the view is never blank');
 assert.ok(r.topFirst===0&&!r.gapAtTop,'back at the top: card 0 first, no spacer');
 assert.ok(Math.abs(r.jumpTile-1500)<=r.cols*2,'a dragged scrollbar lands on the right cards: '+out);
 assert.ok(r.resetTile<r.cols,'a scroll reset after a redraw shows the first row: '+out);
 assert.equal(r.after,r.before,'an in-place redraw keeps the same cards in view');
 assert.ok(r.heldKept,'the selected card stays');
 assert.ok(r.gapBeforeResize&&r.newCols!==r.colsBefore,'the resize happened with rows released: '+out);
 assert.deepEqual(r.colBad,[],'after a column change cards still start rows at multiples of the new column count');
 assert.ok(r.resizeTop===0&&!r.resizeGap,'back at the top after a column change: card 0 first, no spacer');
 assert.ok(r.freshFirst===0&&r.freshCount===r.PAGE&&!r.freshGap,'a new order starts at the top');
 assert.ok(r.afterCalls>0,'added tiles go through the after() hook (golden cards)');
 assert.deepEqual(errors,[],'no page errors');
 console.log(`PASS windowed deck grids: ≤${r.checks.maxTiles} of 3000 tiles drawn, cards placed exactly as a full grid, columns kept, jumps, redraws and selection`);
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
