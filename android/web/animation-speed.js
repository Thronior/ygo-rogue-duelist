// Presentation timing only. Game clocks and network timeouts remain real-time.
(()=>{
 const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 document.documentElement.classList.toggle('ios-web',ios);
 const scale=1.2,seen=new WeakSet();
 const slow=animation=>{if(!seen.has(animation)){seen.add(animation);animation.playbackRate/=scale;}return animation;};
 const animate=Element.prototype.animate;
 Element.prototype.animate=function(...args){return slow(animate.apply(this,args));};
 const refresh=()=>document.getAnimations().forEach(slow);
 const refreshTarget=event=>event.target.getAnimations?.().forEach(slow);
 document.addEventListener('animationstart',refreshTarget,true);
 document.addEventListener('transitionrun',refreshTarget,true);
 document.addEventListener('DOMContentLoaded',refresh,{once:true});
})();
