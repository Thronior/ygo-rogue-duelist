// Every request to this build's online servers carries its build ID and signature (b, s), which the official servers
// check (multiplayer/shared/official-build.mjs, 2026-11-24). Done here once for fetch and WebSocket, so no caller can
// forget it; requests to any other host are untouched. Query parameters keep the requests "simple" for CORS (a custom
// header would add a preflight request to each call). Import this module before anything that goes online.
import {officialBuild,servers} from './official-build.js';
export {servers};

const hosts=new Set(Object.values(servers).map(url=>new URL(url).host));
export function signedURL(url){
 let target;try{target=new URL(String(url),globalThis.location?.href)}catch{return null}
 if(!hosts.has(target.host)||!/^(https|wss):$/.test(target.protocol))return null;
 if(!target.searchParams.has('b')){target.searchParams.set('b',officialBuild.id);target.searchParams.set('s',officialBuild.sig)}
 return target.href;
}

if(typeof globalThis.fetch==='function'&&!globalThis.fetch.signedBuild){
 const nativeFetch=globalThis.fetch;
 const signedFetch=function(input,init){
  try{
   if(typeof input==='string'||input instanceof URL){const url=signedURL(input);if(url)input=url}
   else if(typeof Request!=='undefined'&&input instanceof Request){const url=signedURL(input.url);if(url)input=new Request(url,input)}
  }catch{}
  return nativeFetch.call(this,input,init);
 };
 signedFetch.signedBuild=true;globalThis.fetch=signedFetch;
}
if(typeof globalThis.WebSocket==='function'&&!globalThis.WebSocket.signedBuild){
 const NativeSocket=globalThis.WebSocket;
 const SignedSocket=function(url,protocols){const signed=signedURL(url)||url;return protocols===undefined?new NativeSocket(signed):new NativeSocket(signed,protocols)};
 SignedSocket.prototype=NativeSocket.prototype;
 for(const name of ['CONNECTING','OPEN','CLOSING','CLOSED'])SignedSocket[name]=NativeSocket[name];
 SignedSocket.signedBuild=true;globalThis.WebSocket=SignedSocket;
}
