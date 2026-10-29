// Release a hosting player's fullscreen orientation lock where permitted.
export function releaseEmbeddedOrientation(win=window,doc=document){
 if(win.top===win.self)return ()=>{};
 const unlock=()=>{try{win.screen?.orientation?.unlock?.()}catch{}};
 unlock();doc.addEventListener('fullscreenchange',unlock);win.addEventListener('pageshow',unlock);
 return ()=>{doc.removeEventListener('fullscreenchange',unlock);win.removeEventListener('pageshow',unlock)};
}
