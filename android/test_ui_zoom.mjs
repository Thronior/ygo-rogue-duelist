// UI Scale zooms <html> with CSS zoom; floating elements placed from getBoundingClientRect, pointer coordinates or
// innerWidth divide by the measured zoom (ui-zoom.js, Discord 2026-11-22: card menu and tooltips off the card at 150%).
import assert from 'node:assert/strict';

let probes=0,rectScale=1.5;
const html={style:{zoom:''}};
const body={append(el){probes++;el.isConnected=true},};
globalThis.document={documentElement:html,body,createElement:()=>({style:{},getBoundingClientRect(){return {width:100*rectScale}},remove(){}})};
Object.assign(globalThis,{innerWidth:1500,innerHeight:900});
const {pageZoom,pageRect,pageWidth,pageHeight,unzoom}=await import('./web/ui-zoom.js');

// Unzoomed: no probe, rects pass through untouched.
assert.equal(pageZoom(),1);assert.equal(probes,0);
const rect={left:300,top:150,right:450,bottom:375,width:150,height:225,x:300,y:150};
assert.equal(pageRect({getBoundingClientRect:()=>rect}),rect);

// 150%: window pixels become style pixels; measured once per zoom value.
html.style.zoom='1.5';
assert.equal(pageZoom(),1.5);assert.equal(pageZoom(),1.5);assert.equal(probes,1,'the zoom is measured once and cached');
assert.deepEqual(pageRect({getBoundingClientRect:()=>rect}),{left:200,top:100,right:300,bottom:250,width:100,height:150,x:200,y:100});
assert.equal(pageWidth(),1000);assert.equal(pageHeight(),600);assert.equal(unzoom(90),60);

// A menu centred over that card, as mobile.js places the card action menu: style left + half its width lands on the
// card's centre once the browser zooms the style values again.
const r=pageRect({getBoundingClientRect:()=>rect}),menuWidth=120,left=Math.max(3,Math.min(pageWidth()-menuWidth-3,r.left+r.width/2-menuWidth/2));
assert.equal((left+menuWidth/2)*1.5,rect.left+rect.width/2,'menu centre sits on the card centre in window pixels');

// 50%, then an engine whose rects ignore the zoom (older WebViews): the measured factor follows what the rects report.
html.style.zoom='0.5';rectScale=.5;assert.equal(pageZoom(),.5);assert.equal(pageWidth(),3000);
html.style.zoom='2';rectScale=1;assert.equal(pageZoom(),1,'rects that are not zoomed need no correction');
html.style.zoom='';assert.equal(pageZoom(),1);
console.log('UI zoom helpers OK');
