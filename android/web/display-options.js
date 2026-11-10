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
function scaleText(on){
 if(on===textScaled)return;textScaled=on;
 if(on&&!textRules){textRules=[];for(const sheet of document.styleSheets){try{findTextRules(sheet.cssRules,textRules)}catch{}}}
 for(const [style,prop,value,priority] of textRules||[])style.setProperty(prop,on?`calc(${value} * var(--text-scale,1))`:value,priority);
}
export const DECK_COLUMNS_MIN=3,DECK_COLUMNS_MAX=20;
// '' is the default look; storage.py keeps the same list.
export const DUEL_THEMES=[['','Default'],['duel-disk','Duel Disk'],['shadow-realm','Shadow Realm'],['clean-tournament','Clean Tournament'],['millennium-stone','Millennium Stone'],['kaiba-hologram','Kaiba Hologram']];
export function applyDisplayOptions({reduceMotion:reduce=false,textSize=100,deckColumns=0,deckSplit=false,duelTheme='',fpsCap=120}={}){
 globalThis.frameCap?.set(fpsCap);
 if(reduce!==reduceMotion){reduceMotion=reduce;applyReducedCSS()}
 const html=document.documentElement;
 html.classList.toggle('text-scaled',textSize!==100);html.style.setProperty('--text-scale',textSize/100);scaleText(textSize!==100);
 if(duelTheme)html.dataset.duelTheme=duelTheme;else delete html.dataset.duelTheme;
 // 0 keeps each screen's own automatic grid.
 html.toggleAttribute('data-deck-columns',deckColumns>=DECK_COLUMNS_MIN);html.toggleAttribute('data-deck-split',!!deckSplit);html.style.setProperty('--deck-columns',deckColumns||'');
}
