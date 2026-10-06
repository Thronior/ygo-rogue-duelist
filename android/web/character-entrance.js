// One finite entrance at a time; cancellation never leaves an input blocker behind.
let active;
export function cancelCharacterEntrance(){active?.()}
export async function characterEntrance(source,enter){
 cancelCharacterEntrance();
 if(!source?.isConnected||document.hidden){enter();return}
 const rect=source.getBoundingClientRect(),reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
 const overlay=document.createElement('div'),portrait=source.cloneNode();
 overlay.className='character-entrance';overlay.setAttribute('aria-hidden','true');
 portrait.removeAttribute('loading');overlay.append(portrait);
 Object.assign(portrait.style,{left:rect.x+'px',top:rect.y+'px',width:rect.width+'px',height:rect.height+'px'});
 document.body.append(overlay);
 const animations=[];let cancelled=false,target;
 const cleanup=()=>{for(const a of animations)a.cancel();overlay.remove();if(target)target.inert=false;if(active===cancel)active=null};
 const cancel=()=>{cancelled=true;cleanup()};active=cancel;
 const animate=(el,frames,options)=>{const a=el.animate(frames,options);animations.push(a);return a.finished};
 try{
  if(!reduced){const width=Math.min(innerWidth*.88,innerHeight*.95),height=innerHeight*.84;
   await Promise.all([
    animate(overlay,[{backgroundColor:'rgba(3,8,20,0)'},{backgroundColor:'rgba(3,8,20,.9)'}],{duration:240,fill:'forwards'}),
    animate(portrait,[{left:rect.x+'px',top:rect.y+'px',width:rect.width+'px',height:rect.height+'px'},{left:(innerWidth-width)/2+'px',top:(innerHeight-height)/2+'px',width:width+'px',height:height+'px',filter:'drop-shadow(0 0 24px #e8cc8177)',offset:.72},{left:(innerWidth-width*1.04)/2+'px',top:(innerHeight-height*1.04)/2+'px',width:width*1.04+'px',height:height*1.04+'px',filter:'drop-shadow(0 0 30px #e8cc8166)'}],{duration:620,easing:'cubic-bezier(.2,.7,.2,1)',fill:'forwards'})]);
  }
  if(cancelled)return;
  // Detach the cancellation hook before the intentional navigation.
  active=null;enter();overlay.remove();target=document.querySelector('.pack-theatre');
  if(target){target.inert=true;active=cancel;await animate(target,[{opacity:0,transform:reduced?'none':'translateY(10px)'},{opacity:1,transform:'none'}],{duration:reduced?100:200,easing:'ease-out'})}
 }catch(error){if(!cancelled&&error.name!=='AbortError')throw error}finally{cleanup()}
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelCharacterEntrance()});
