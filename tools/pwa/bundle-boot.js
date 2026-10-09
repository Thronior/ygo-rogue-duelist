const EXPECTED='__BUNDLE_VERSION__';
const status=()=>new Promise((resolve,reject)=>{const channel=new MessageChannel(),timer=setTimeout(()=>reject(Error('An update is ready. Close all game windows and reopen to finish updating.')),8000);channel.port1.onmessage=e=>{clearTimeout(timer);channel.port1.close();resolve(e.data);};navigator.serviceWorker.controller.postMessage({type:'BUNDLE_STATUS'},[channel.port2]);});
try{
 if(!navigator.serviceWorker)throw Error('This browser cannot load artwork inside the embedded player. Please open the game directly.');
 const registration=await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});
 await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(Error('The embedded player could not finish loading. Please retry or open the game directly.')),25000))]);
 if(!navigator.serviceWorker.controller)await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Close other game windows and reopen to finish updating.')),15000);navigator.serviceWorker.addEventListener('controllerchange',()=>{clearTimeout(timer);resolve();},{once:true});});
 const worker=await status();if(worker.version!==EXPECTED)throw Error('An update is ready. Close all game windows and reopen to finish updating.');
 document.documentElement.dataset.bundledArtwork='true';document.documentElement.dataset.offlineReady=String(worker.offlineReady);
 await Promise.all([import('./mobile.js'),import('./pwa.js')]);
}catch(error){
 document.querySelector('#loading-status').textContent='Unable to start here';
 document.querySelector('#loading-count').textContent=error.message;
 const actions=document.createElement('p');
 const retry=document.createElement('button');retry.textContent='Retry';retry.onclick=()=>location.reload();actions.append(retry,' ');
 const link=document.createElement('a');link.href='https://ygo-rogue.pages.dev/';link.target='_blank';link.rel='noopener';link.textContent='Open game directly';link.style.color='#ffe3a6';actions.append(link);document.querySelector('.loading').append(actions);
}
