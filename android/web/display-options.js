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
export const DECK_COLUMNS_MIN=3,DECK_COLUMNS_MAX=20;
// '' is the default look; storage.py keeps the same list.
export const DUEL_THEMES=[['','Default'],['duel-disk','Duel Disk'],['shadow-realm','Shadow Realm'],['clean-tournament','Clean Tournament'],['millennium-stone','Millennium Stone'],['kaiba-hologram','Kaiba Hologram']];
export function applyDisplayOptions({reduceMotion:reduce=false,textSize=100,deckColumns=0,deckSplit=false,duelTheme=''}={}){
 if(reduce!==reduceMotion){reduceMotion=reduce;applyReducedCSS()}
 const html=document.documentElement;
 html.classList.toggle('text-scaled',textSize!==100);html.style.setProperty('--text-scale',textSize/100);
 if(duelTheme)html.dataset.duelTheme=duelTheme;else delete html.dataset.duelTheme;
 // 0 keeps each screen's own automatic grid.
 html.toggleAttribute('data-deck-columns',deckColumns>=DECK_COLUMNS_MIN);html.toggleAttribute('data-deck-split',!!deckSplit);html.style.setProperty('--deck-columns',deckColumns||'');
}
