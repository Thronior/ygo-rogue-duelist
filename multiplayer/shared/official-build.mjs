// Only the official releases may use the official servers (user, 2026-11-24: "allow others to host their own servers
// while keeping mine safe and only accessible through my public releases"). The whole game is public, so a URL or a
// shared key in the client can never be secret. Instead each release build signs its build ID (version + a hash of
// the game data, tools/sign_build.mjs) with a private Ed25519 key that never leaves the maintainer's PC, and the client
// sends both as the `b` and `s` query parameters on every request (android/web/servers.js). These Workers check the
// signature with BUILD_PUBLIC_KEY (wrangler.jsonc). A fork or a modified build can't sign its own ID, so it is refused;
// someone who copies an official build's pair gets in, which is why the daily caps and per-address limits exist too.
//
// Self-hosting: a copy of these Workers deployed without BUILD_PUBLIC_KEY accepts every build (see SELF-HOSTING.md),
// or with its own public key, its own signed builds.
//   BUILD_PUBLIC_KEY   base64url raw Ed25519 public key; unset = no check
//   UNSIGNED_UNTIL     ISO time; before it, requests with no build ID at all are let through, so players on an older
//                      release can keep playing while they update (requests with a bad signature are always refused)
//   REVOKED_BUILDS     comma-separated build IDs refused even with a valid signature (a leaked pair)
const verified=new Map();let keyText='',keyPromise=null;
const fromBase64url=text=>{const s=text.replace(/-/g,'+').replace(/_/g,'/');const bin=atob(s+'='.repeat((4-s.length%4)%4));return Uint8Array.from(bin,c=>c.charCodeAt(0))};
const ID=/^[0-9A-Za-z.+_-]{1,80}$/,SIG=/^[A-Za-z0-9_-]{86}$/;

// 'official', 'unsigned' (no build ID, inside UNSIGNED_UNTIL), or false.
export async function officialBuild(request,env,now=Date.now()){
 const key=String(env?.BUILD_PUBLIC_KEY||'').trim();if(!key)return 'official';
 const url=new URL(request.url),id=url.searchParams.get('b')||'',sig=url.searchParams.get('s')||'';
 if(!id&&!sig){const until=Date.parse(env?.UNSIGNED_UNTIL||'');return Number.isFinite(until)&&now<until?'unsigned':false}
 if(!ID.test(id)||!SIG.test(sig))return false;
 if(String(env?.REVOKED_BUILDS||'').split(',').map(x=>x.trim()).includes(id))return false;
 const memo=id+'.'+sig;if(verified.has(memo))return verified.get(memo)?'official':false;
 if(key!==keyText){keyText=key;keyPromise=crypto.subtle.importKey('raw',fromBase64url(key),{name:'Ed25519'},false,['verify'])}
 let ok=false;try{ok=await crypto.subtle.verify({name:'Ed25519'},await keyPromise,fromBase64url(sig),new TextEncoder().encode(id))}catch{ok=false}
 if(verified.size>512)verified.clear();verified.set(memo,ok);
 return ok?'official':false;
}

// What a refused build is told. 426 like the old-version gate, so older clients stop retrying.
export const UNOFFICIAL={status:426,body:{error:'Online play needs the latest official version of the game. Modified versions need their own servers: see SELF-HOSTING.md on GitHub.',unofficial:true}};

// Requests per address per minute, counted in this isolate's memory only (no storage, no cost). A busy shared network
// (a school, a mobile carrier) stays well under it; one source flooding requests is cut off for the rest of the minute.
const windows=new Map();
export function rateLimited(request,limit,now=Date.now()){
 const address=request.headers.get('CF-Connecting-IP')||'unknown',minute=Math.floor(now/60000);
 let entry=windows.get(address);if(!entry||entry.minute!==minute){entry={minute,count:0};windows.set(address,entry)}
 entry.count++;
 if(windows.size>5000)for(const [k,v] of windows)if(v.minute!==minute)windows.delete(k);
 return entry.count>limit;
}
export const TOO_MANY={status:429,body:{error:'Too many requests from your network. Wait a minute and try again.'}};
