// Developer room tool (tools/room-admin, never shipped): the rooms Worker's /v3/admin route checks every action with
// adminAction() before it reaches a room, and the clients apply them here. Duel changes reach both devices at the same
// step of the duel log (TagSession.adminStep, the Draft hub's event list); text and emotes are shown on arrival.
export const ADMIN_EMOTES=['❤️','😜','🍆'];
const DUEL_KINDS=new Set(['damage','heal','set-lp','hand']);
const SHOW_KINDS=new Set(['text','emote']);
const RUN_KINDS=new Set(['coins','run-lp','relic-add','relic-remove','curse-add','curse-remove','pool']);
export const isDuelAdmin=a=>DUEL_KINDS.has(a?.kind);
export const isShowAdmin=a=>SHOW_KINDS.has(a?.kind);
export const isRunAdmin=a=>RUN_KINDS.has(a?.kind);
const int=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
const key=v=>typeof v==='string'&&/^[a-z0-9_]{1,64}$/.test(v);
// Returns a clean copy of a valid action, or throws. `id` lets the host report back which action it applied.
export function adminAction(a){
 if(!a||typeof a!=='object'||Array.isArray(a))throw Error('Missing action.');
 const id=typeof a.id==='string'&&/^[A-Za-z0-9-]{1,40}$/.test(a.id)?a.id:Math.random().toString(36).slice(2,12);
 const side=a.side===undefined||a.side===null?null:a.side;
 switch(a.kind){
  case 'info':return {kind:'info',id};
  case 'text':{const text=typeof a.text==='string'?a.text.trim():'';if(!text||text.length>140)throw Error('Text must be 1-140 characters.');const seconds=a.seconds??4;if(!int(seconds,1,15))throw Error('Seconds must be 1-15.');return {kind:'text',id,text,seconds};}
  case 'emote':if(!ADMIN_EMOTES.includes(a.emoji))throw Error('Unknown emote.');if(side!==null&&side!==0&&side!==1)throw Error('Side must be 0 or 1.');return {kind:'emote',id,emoji:a.emoji,side};
  case 'damage':case 'heal':if(side!==0&&side!==1)throw Error('Side must be 0 or 1.');if(!int(a.amount,1,99999))throw Error('Amount must be 1-99999.');return {kind:a.kind,id,side,amount:a.amount};
  case 'set-lp':if(side!==0&&side!==1)throw Error('Side must be 0 or 1.');if(!int(a.amount,0,999999))throw Error('LP must be 0-999999.');return {kind:'set-lp',id,side,amount:a.amount};
  case 'hand':if(side!==0&&side!==1)throw Error('Side must be 0 or 1.');if(!int(a.code,1,2147483647))throw Error('Card id must be a number.');return {kind:'hand',id,side,code:a.code};
  case 'coins':case 'run-lp':if(!int(a.amount,-999999,999999)||!a.amount)throw Error('Amount must be a non-zero number.');return {kind:a.kind,id,amount:a.amount};
  case 'relic-add':case 'relic-remove':case 'curse-add':case 'curse-remove':if(!key(a.key))throw Error('Unknown key.');if(side!==null&&side!==0&&side!==1)throw Error('Seat must be 0 or 1.');return {kind:a.kind,id,key:a.key,side};
  case 'pool':{if(side!==0&&side!==1)throw Error('Seat must be 0 or 1.');if(!int(a.code,1,2147483647))throw Error('Card id must be a number.');const count=a.count??1;if(!int(count,1,3))throw Error('Copies must be 1-3.');return {kind:'pool',id,side,code:a.code,count};}
 }
 throw Error('Unknown admin action.');
}
// Centre-screen text on this device. Plain text only, so nothing typed can become markup.
let banner=null,bannerTimer=null;
export function showAdminText(text,seconds=4){
 if(!globalThis.document?.body)return;
 clearTimeout(bannerTimer);banner?.remove();
 banner=document.createElement('div');banner.className='admin-banner';banner.setAttribute('role','status');banner.textContent=String(text).slice(0,140);
 document.body.append(banner);const shown=banner;
 bannerTimer=setTimeout(()=>{shown.classList.add('leaving');setTimeout(()=>{shown.remove();if(banner===shown)banner=null},400)},Math.max(1,Math.min(15,seconds))*1000);
}
