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
export function applyDisplayOptions({reduceMotion:reduce=false,textSize=100}={}){
 if(reduce!==reduceMotion){reduceMotion=reduce;applyReducedCSS()}
 const html=document.documentElement;
 html.classList.toggle('text-scaled',textSize!==100);html.style.setProperty('--text-scale',textSize/100);
}
