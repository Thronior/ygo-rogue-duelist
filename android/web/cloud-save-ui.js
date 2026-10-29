// Cloud save screens (2026-10-29): one code to save on your PC, restore by typing it in. The save is encrypted on
// the device with that code (device-backup.js), so the wording promises only what the design guarantees.
import {saveDeckImage} from './save-deck-image.js';

const PRIVACY='<p>Cloud save is off unless you turn it on.</p><p>Your save is encrypted on this device with your code before it is uploaded. The server only keeps that encrypted file and when it was last updated: no name, email or account. It cannot read your save or work out your code.</p><p>Only someone with your code can open your save, so keep it private. If you lose it, nobody can recover your cloud save for you, not even the developer.</p><p>A cloud save that has not been updated for a year is deleted. You can delete yours at any time under Reset Progress.</p>';

export function cloudSettingsMarkup({enabled,code,updatedAt,error},btn,esc){
 const last=updatedAt?`Last backup: ${esc(new Date(updatedAt).toLocaleString())}`:'Your progress is backed up after your next duel while online.';
 const on=enabled&&code?`<p>Cloud save is on. Your code: <strong class="cloud-code-inline">${esc(code)}</strong></p><p class="muted">${last}${error?' The last upload failed and will be retried.':''}</p><div class="settings-actions">${btn('Show my code','cloud-code-show')}</div>`
  :'';
 const desc=enabled&&code?'On: backed up after each duel while online.':'Back up your progress after each duel and get a code that brings it back on any device.';
 return `<label class="set-row"><span class="set-text"><b>Cloud Save</b><small>${desc}</small></span><input type="checkbox" class="switch" id="cloud-saves-enabled" ${enabled?'checked':''}></label>${on}<div class="settings-actions">${btn('Restore from code','cloud-restore-open')}</div><details><summary>How cloud save works</summary>${PRIVACY}</details>`;
}

export function cloudCodeMarkup(code,intro,btn,esc){
 const native=!!globalThis.ShadowNative?.saveDeckImage;
 return `<p>${intro}</p><p class="cloud-code" aria-label="Your cloud save code">${esc(code)}</p><p><strong>Save this code somewhere on your PC</strong>, like a text file or a note. It is the only way to get your save back: on any device, open Settings, Saved Data, Restore from code and type it in.</p><p class="muted">Nobody else can see your save. It is encrypted with this code before it leaves this device.</p><p class="cloud-code-status muted" role="status"></p><div class="settings-actions cloud-code-actions">${btn('Copy code','cloud-copy-code')}${btn(native?'Save as image':'Save as text file','cloud-save-code-file')}${btn('Done','close')}</div>`;
}

export function cloudRestoreMarkup(btn,message=''){
 return `<p>Type your cloud save code to bring your progress to this device.</p><label class="cloud-restore-field">Cloud save code <input id="cloud-restore-code" maxlength="13" autocapitalize="characters" autocomplete="off" spellcheck="false" placeholder="K7QXM-4TB9R"></label><p class="cloud-restore-status ${message?'':'muted'}" role="status">${message}</p><div class="settings-actions">${btn('Find my save','cloud-restore-find')}</div>`;
}

export function cloudFoundMarkup(found,btn,esc){
 const s=found.summary,when=found.savedAt?new Date(found.savedAt).toLocaleString():'an unknown time';
 const facts=[`${s.wins} ${s.wins===1?'win':'wins'}`,`${s.runs} ${s.runs===1?'run':'runs'}`,`${s.characters} ${s.characters===1?'character':'characters'} unlocked`];if(s.inRun)facts.push('a run in progress');
 return `<p>Found your cloud save from <strong>${esc(when)}</strong>: ${esc(facts.join(', '))}.</p><p>Restoring replaces the progress on this device with it, and this device keeps saving to the same code.</p><div class="settings-actions">${btn('Restore this save','cloud-restore-confirm','','danger')}${btn('Cancel','close')}</div>`;
}

export function cloudFirstBootMarkup(btn){
 return `<p>Turn on cloud save to keep a copy of your progress online. You get a code to save on your PC, and that code brings your save back on any device or browser.</p><p class="muted">Your save is encrypted on this device, so nobody without your code can read it. You can change this later in Settings.</p><div class="settings-actions">${btn('Turn on cloud save','cloud-first-on')}${btn('I have a code','cloud-restore-open')}${btn('Not now','cloud-first-later')}</div>`;
}

export async function copyCloudCode(code){
 try{await navigator.clipboard.writeText(code);return 'Code copied.'}catch{return 'Copy failed. Select the code and copy it yourself.'}
}

// A text file on PC, an image on Android (the app can save images, not text files).
export async function saveCloudCode(code){
 if(globalThis.ShadowNative?.saveDeckImage){
  const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=420;const g=canvas.getContext('2d');
  g.fillStyle='#102833';g.fillRect(0,0,1000,420);g.fillStyle='#ffe2a3';g.font='600 40px Georgia,serif';g.textAlign='center';g.fillText('YGO Rogue Duelist cloud save code',500,90);
  g.fillStyle='#ffffff';g.font='800 96px "Courier New",monospace';g.fillText(code,500,230);
  g.fillStyle='#b9d2da';g.font='28px Arial,sans-serif';g.fillText('Settings › Saved Data › Restore from code',500,320);g.fillText('Keep this private: it unlocks your save.',500,365);
  const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Could not prepare the image.')),'image/png'));
  return saveDeckImage(blob,'YGO Rogue cloud save code');
 }
 const text=`YGO Rogue Duelist cloud save code: ${code}\r\n\r\nTo get your save back, open Settings, Saved Data, Restore from code and type it in.\r\nKeep this code private: anyone with it can open your save.\r\n`;
 const url=URL.createObjectURL(new Blob([text],{type:'text/plain'})),a=document.createElement('a');a.href=url;a.download='YGO Rogue cloud save code.txt';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
 return 'Text file download started.';
}
