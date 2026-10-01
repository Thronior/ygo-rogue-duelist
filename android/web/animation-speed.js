// Presentation timing only. Game clocks and network timeouts remain real-time.
(()=>{
 const scale=1.2,seen=new WeakSet();
 const slow=animation=>{if(!seen.has(animation)){seen.add(animation);animation.playbackRate/=scale;}return animation;};
 const animate=Element.prototype.animate;
 Element.prototype.animate=function(...args){return slow(animate.apply(this,args));};
 const refresh=()=>document.getAnimations().forEach(slow);
 document.addEventListener('animationstart',refresh,true);
 document.addEventListener('transitionrun',refresh,true);
 document.addEventListener('DOMContentLoaded',refresh,{once:true});
})();
