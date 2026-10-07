// One delegated handler for Tag, Ultimate Collector and Draft room lobbies.
export function roomCodeControl(value){
 const code=String(value||'').toUpperCase(),valid=/^[A-Z2-9]{5}$/.test(code);
 return `<div class="room-code-control"><strong class="room-lobby-code">${valid?code:'…'}</strong><button type="button" class="room-copy-button" data-copy-room="${valid?code:''}" aria-label="Copy room code" title="Copy room code" ${valid?'':'disabled'}><svg class="room-copy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h4"/></svg><svg class="room-copied-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg></button><span class="room-copy-feedback" role="status" aria-live="polite"></span></div>`;
}
function manualCopy(code){
 document.querySelector('.room-copy-dialog')?.close();
 const dialog=document.createElement('dialog');dialog.className='room-copy-dialog';
 dialog.innerHTML='<h2>Room code</h2><p>Select the code and use Copy.</p><input readonly aria-label="Room code"><button type="button">Close</button>';
 dialog.querySelector('input').value=code;dialog.querySelector('button').onclick=()=>dialog.close();dialog.addEventListener('close',()=>dialog.remove(),{once:true});document.body.append(dialog);dialog.showModal();const field=dialog.querySelector('input');field.focus();field.select();field.setSelectionRange(0,code.length);
}
async function copyCode(code){
 if(navigator.clipboard?.writeText){try{await navigator.clipboard.writeText(code);return true}catch{}}
 const field=document.createElement('textarea');field.value=code;field.readOnly=true;field.style.cssText='position:fixed;top:0;left:0;width:1px;height:1px;opacity:0';document.body.append(field);
 const previous=document.activeElement;let copied=false;try{field.focus();field.select();field.setSelectionRange(0,code.length);copied=document.execCommand('copy')}catch{}finally{field.remove();previous?.focus?.({preventScroll:true})}return copied;
}
const feedbackTimers=new WeakMap();
document.addEventListener('click',async event=>{
 const button=event.target.closest?.('[data-copy-room]');if(!button||button.disabled)return;
 event.preventDefault();event.stopImmediatePropagation();const code=button.dataset.copyRoom;if(!/^[A-Z2-9]{5}$/.test(code))return;button.disabled=true;
 try{if(await copyCode(code)){if(button.isConnected){button.classList.add('copied');button.title='Code copied';button.setAttribute('aria-label','Room code copied');button.parentElement.querySelector('[role=status]').textContent='Room code copied';clearTimeout(feedbackTimers.get(button));feedbackTimers.set(button,setTimeout(()=>{feedbackTimers.delete(button);if(button.isConnected){button.classList.remove('copied');button.title='Copy room code';button.setAttribute('aria-label','Copy room code');button.parentElement.querySelector('[role=status]').textContent=''}},1600));}}else if(button.isConnected)manualCopy(code)}finally{button.disabled=false}
},true);
