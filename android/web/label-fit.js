// Shop button labels stay inside their buttons in every language (user, 2026-11-12: German "KAUFEN" spilled out of
// the Buy button). After the translation pass (a MutationObserver, so it has run by the next frame), a label wider
// than its button gets a smaller font; labels that fit keep the stylesheet size. One layout per pass, a few elements.
// Only the Buy label: Reroll's translations already wrap on purpose (German breaks at a soft hyphen).
const LABELS='.shop-buy>b';
export function fitButtonLabels(root=document){
 requestAnimationFrame(()=>{
  const labels=[...root.querySelectorAll(LABELS)];if(!labels.length)return;
  for(const b of labels){b.style.fontSize='';b.style.whiteSpace='nowrap'}
  const fixes=labels.map(b=>{
   const button=b.closest('button');if(!button||!button.clientWidth)return null;const cs=getComputedStyle(button);
   const room=button.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight)-2,wide=b.scrollWidth;
   if(!room||wide<=room)return null;
   return [b,Math.max(7,Math.floor(parseFloat(getComputedStyle(b).fontSize)*room/wide*10)/10)];
  }).filter(Boolean);
  for(const [b,size] of fixes)b.style.fontSize=size+'px';
 });
}
