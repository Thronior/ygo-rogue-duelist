// UI Scale (display-options.js) zooms <html> with CSS zoom. Chromium reports getBoundingClientRect, pointer clientX/Y and
// innerWidth/innerHeight in window pixels, but a px value in an element's style is zoomed again, so a floating element placed
// from those measurements has to divide them by the zoom first (Discord 2026-11-22: at 130-150% the card menu and the
// tooltips sat away from the card). The factor is measured, not read from the setting, so a WebView that reports unzoomed
// rects gets 1; it is measured once per zoom value and cached.
let key='',factor=1;
export function pageZoom(){
 const z=document.documentElement?.style?.zoom||'';
 if(z===key)return factor;
 if(!z){key=z;return factor=1}
 if(!document.body)return parseFloat(z)||1;
 const probe=document.createElement('div');
 probe.style.cssText='position:fixed;left:0;top:0;width:100px;height:1px;visibility:hidden;pointer-events:none;contain:strict';
 document.body.append(probe);const w=probe.getBoundingClientRect().width;probe.remove();
 key=z;return factor=w>0?w/100:1;
}
// Window pixels to style pixels.
export const unzoom=n=>n/pageZoom();
// getBoundingClientRect in style pixels, ready for style.left/top/width/height.
export function pageRect(el){
 const r=el.getBoundingClientRect(),z=pageZoom();
 return z===1?r:{left:r.left/z,top:r.top/z,right:r.right/z,bottom:r.bottom/z,width:r.width/z,height:r.height/z,x:r.x/z,y:r.y/z};
}
// The window's size in style pixels (the containing block of a position:fixed element).
export const pageWidth=()=>innerWidth/pageZoom();
export const pageHeight=()=>innerHeight/pageZoom();
