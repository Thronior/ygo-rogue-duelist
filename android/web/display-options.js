import {setPixelArt} from './pixel-art.js';
// Settings → Display. Must load before any module that asks about reduced motion.
// Reduce Motion acts like the device setting, so the existing motion checks in code and CSS need no second path.
const REDUCED=/prefers-reduced-motion:\s*reduce/,deviceMatchMedia=window.matchMedia.bind(window),original=new WeakMap();
let reduceMotion=false;
window.matchMedia=query=>{
 const device=deviceMatchMedia(query);if(!REDUCED.test(query))return device;
 return {media:device.media,get matches(){return reduceMotion||device.matches},addEventListener:(...args)=>device.addEventListener(...args),removeEventListener:(...args)=>device.removeEventListener(...args)};
};
function applyReducedCSS(){
 for(const sheet of document.styleSheets){
  let rules=[];try{rules=sheet.cssRules}catch{continue}
  for(const rule of rules){
   if(!(rule instanceof CSSMediaRule))continue;
   const text=original.get(rule)??rule.media.mediaText;if(!REDUCED.test(text))continue;
   original.set(rule,text);rule.media.mediaText=reduceMotion?'all':text;
  }
 }
}
// Settings → Text Size (2026-11-09) scales every font-size in the game's stylesheets, not a short list. The first
// time it leaves 100% each rule's own size becomes calc(size * --text-scale), so moving the slider only changes the
// variable; back at 100% the original values return, so the default look is untouched. The stylesheets are walked
// once per session (about 0.1 s on a PC) and never per render. Text that is already large (18px and up at its
// smallest) and text drawn inside fixed boxes (card zones, portraits, price badges) stays put. Layouts that need room
// to grow get it in mobile.css under html.text-scaled.
const LARGE_TEXT=18,
 FIXED_TEXT=/\.turn\b|\.zone \.(power|count)|\.portrait span|\.reveal-cost|\.shop-reroll|\.shop-buy|\.shop-product small|\.shop-layout h3|header h2|\.deck-card-stats|\.new-card-marker|\.card-counter|\.chain-control|\.tag-next-label|\.keeper-bubble/,
 SCALABLE=/\d(px|vw|vh|vmin|vmax|dvh|svh|lvh|cq\w)/;
let textScaled=false,textRules=null;
// [style, property, original value, priority] for every size that scales; a fixed line height in the same rule
// grows too, or the larger lines would overlap.
function findTextRules(rules,out){
 for(const rule of rules){
  if(rule instanceof CSSKeyframesRule)continue;
  const style=rule.style,size=style?.getPropertyValue('font-size');
  if(size&&SCALABLE.test(size)&&!FIXED_TEXT.test(rule.selectorText||'')){
   const px=[...size.matchAll(/([\d.]+)px/g)].map(m=>+m[1]);
   if(!(px.length&&Math.min(...px)>=LARGE_TEXT)){
    out.push([style,'font-size',size,style.getPropertyPriority('font-size')]);
    const line=style.getPropertyValue('line-height');if(/\dpx/.test(line))out.push([style,'line-height',line,style.getPropertyPriority('line-height')]);
   }
  }
  if(rule.cssRules?.length)findTextRules(rule.cssRules,out);
 }
 return out;
}
function collectText(){const out=[];for(const sheet of document.styleSheets){try{findTextRules(sheet.cssRules,out)}catch{}}return out}
function scaleText(on){
 if(on===textScaled)return;textScaled=on;
 if(on&&!textRules)textRules=collectText();
 restyle();
}
// Settings → UI Scale (2026-11-15, Discord: the game looks small on 4K screens) zooms the whole page with CSS zoom.
// Chromium and newer Firefox zoom viewport units too, so a 100dvh screen would grow past the window: the first time the
// scale leaves 100% (and a probe shows the browser does that), every vh/vw/dvh/vmin... in the stylesheets becomes
// calc(value / --ui-scale), the same one-time walk as Text Size. Auto keeps 100% up to a 2600-pixel-wide window and
// grows with wider ones (a 4K screen at 100% Windows scaling gets 200%).
export const UI_SCALE_MIN=75,UI_SCALE_MAX=200;
export const autoUiScale=()=>innerWidth<=2600||innerHeight<=1300?100:Math.min(UI_SCALE_MAX,Math.max(100,Math.floor(Math.min(innerWidth/1920,innerHeight/1080)*20)*5));
export const uiScaleValue=value=>Number(value)>=UI_SCALE_MIN?Math.min(UI_SCALE_MAX,Math.round(Number(value)/5)*5):0;
const VIEWPORT=/(-?\d*\.?\d+)(dvh|svh|lvh|vh|dvw|svw|lvw|vw|vmin|vmax)\b/g,VIEWPORT_TEST=/\d(dvh|svh|lvh|vh|dvw|svw|lvw|vw|vmin|vmax)\b/;
let viewportFixed=false,viewportRules=null,zoomsViewport=null,uiAuto=false,appliedScale=1;
const fitViewport=value=>viewportFixed?value.replace(VIEWPORT,'calc($1$2 / var(--ui-scale,1))'):value;
// Every other declaration with a viewport unit; font sizes that Text Size scales are already in textRules.
function findViewportRules(rules,out,skip){
 for(const rule of rules){
  const style=rule.style;
  if(style)for(let i=0;i<style.length;i++){const prop=style[i],value=style.getPropertyValue(prop);if(VIEWPORT_TEST.test(value)&&!skip.get(style)?.has(prop))out.push([style,prop,value,style.getPropertyPriority(prop)])}
  if(rule.cssRules?.length)findViewportRules(rule.cssRules,out,skip);
 }
 return out;
}
function restyle(){
 for(const [style,prop,value,priority] of textRules||[]){const v=fitViewport(value);style.setProperty(prop,textScaled?`calc(${v} * var(--text-scale,1))`:v,priority)}
 for(const [style,prop,value,priority] of viewportRules||[])style.setProperty(prop,fitViewport(value),priority);
}
function fixViewport(on){
 if(on===viewportFixed)return;viewportFixed=on;
 if(on&&!viewportRules){
  textRules??=collectText();const skip=new WeakMap();for(const [style,prop] of textRules){if(!skip.has(style))skip.set(style,new Set());skip.get(style).add(prop)}
  viewportRules=[];for(const sheet of document.styleSheets){try{findViewportRules(sheet.cssRules,viewportRules,skip)}catch{}}
 }
 restyle();
}
// Does zoom stretch a 100vh box in this browser? Measured once, with the page unzoomed.
function zoomStretchesViewport(){
 if(zoomsViewport!==null)return zoomsViewport;if(!document.body)return true;
 const html=document.documentElement,before=html.style.zoom,probe=document.createElement('div');
 probe.style.cssText='position:fixed;left:0;top:0;width:1px;height:100vh;visibility:hidden;pointer-events:none';document.body.append(probe);
 html.style.zoom='';const plain=probe.getBoundingClientRect().height;html.style.zoom='2';const zoomed=probe.getBoundingClientRect().height;
 html.style.zoom=before;probe.remove();return zoomsViewport=plain>0&&zoomed>plain*1.5;
}
function applyUiScale(setting){
 const value=uiScaleValue(setting);uiAuto=!value;const scale=(value||autoUiScale())/100,html=document.documentElement;
 html.style.setProperty('--ui-scale',scale);html.style.zoom=scale===1?'':String(scale);
 fixViewport(scale!==1&&zoomStretchesViewport());
 // mobile.js sizes the page and windows from the window in zoomed pixels (sizeModalViewport).
 if(scale!==appliedScale){appliedScale=scale;dispatchEvent(new Event('ygo-ui-scale'))}
}
addEventListener('resize',()=>{if(uiAuto)applyUiScale(0)});
export const DECK_COLUMNS_MIN=3,DECK_COLUMNS_MAX=20;
// '' is the default look; storage.py keeps the same list.
export const DUEL_THEMES=[['','Default'],['duel-disk','Duel Disk'],['shadow-realm','Shadow Realm'],['clean-tournament','Clean Tournament'],['millennium-stone','Millennium Stone'],['kaiba-hologram','Kaiba Hologram'],['pixel-art','Pixel Art']];
export function applyDisplayOptions({reduceMotion:reduce=false,textSize=100,uiScale=0,deckColumns=0,deckSplit=false,duelTheme='',fpsCap=120}={}){
 globalThis.frameCap?.set(fpsCap);
 if(reduce!==reduceMotion){reduceMotion=reduce;applyReducedCSS()}
 const html=document.documentElement;
 html.classList.toggle('text-scaled',textSize!==100);html.style.setProperty('--text-scale',textSize/100);scaleText(textSize!==100);
 applyUiScale(uiScale);
 if(duelTheme)html.dataset.duelTheme=duelTheme;else delete html.dataset.duelTheme;
 setPixelArt(duelTheme==='pixel-art');
 // 0 keeps each screen's own automatic grid.
 html.toggleAttribute('data-deck-columns',deckColumns>=DECK_COLUMNS_MIN);html.toggleAttribute('data-deck-split',!!deckSplit);html.style.setProperty('--deck-columns',deckColumns||'');
}
