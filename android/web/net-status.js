// Small connection readout for online duels. One timer and a text update only when the wording changes.
const SLOW_MS=700;
export function netStatusView({online=true,partnerOnline=true,rtt=null,route='relay',partner='Teammate'}={}){
 const quality=!online||!partnerOnline?'lost':rtt>=SLOW_MS?'slow':'good';
 const message=!online?'Connection lost. Reconnecting… your moves are kept':!partnerOnline?`${partner} lost connection. Waiting for them to return`:rtt>=SLOW_MS?'Slow connection':'';
 return {quality,message,detail:online&&rtt!=null?`${Math.round(rtt)} ms${route==='direct'?' · direct':''}`:''};
}
let timer=0,source=null,last='';
function draw(){
 const stats=source?.();if(!stats){hideNetStatus();return}
 const view=netStatusView(stats),key=JSON.stringify(view);if(key===last&&document.getElementById('net-status'))return;last=key;
 let el=document.getElementById('net-status');
 if(!el){el=document.createElement('div');el.id='net-status';el.setAttribute('role','status');el.setAttribute('aria-live','polite');el.innerHTML='<i aria-hidden="true"></i><span></span>';document.body.append(el)}
 el.dataset.quality=view.quality;el.children[1].textContent=view.message||view.detail;el.title=view.detail;
}
export function showNetStatus(read){source=read;draw();if(!timer)timer=setInterval(draw,1000)}
export function hideNetStatus(){source=null;last='';clearInterval(timer);timer=0;document.getElementById('net-status')?.remove()}
