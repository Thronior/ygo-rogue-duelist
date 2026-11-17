// Startup diagnostics for "Could not start: Program terminated with exit(1)" (Discord, 2026-11-17: Redmi Note 12 in the
// APK and Kiwi, and another phone in Chrome). Python stopped in init_fs_encoding with "no codec search functions
// registered", which means it could not import `encodings` from python_stdlib.zip. The APK serves that file from its
// own assets, so a bad download alone cannot explain it. These checks show which part fails:
// - checkStdlib fetches the zip itself, checks it is a complete ZIP holding `encodings`, and hands Pyodide those bytes.
//   If the check passes and Python still fails, the zip is ruled out.
// - details() is the text behind the error screen's Copy details button, for Discord reports.
// - retryOnce() restarts once on its own (saves are untouched).
const RETRY_KEY='ygo-boot-retry';
const u16=(b,i)=>b[i]|b[i+1]<<8,u32=(b,i)=>(b[i]|b[i+1]<<8|b[i+2]<<16|b[i+3]<<24)>>>0;

// A structural check only (no checksums): first local header, end-of-central-directory record, central directory
// bounds, and an `encodings/` entry. Cheap on 2.3 MB: one scan of the last 64 KB and of the central directory.
export function inspectZip(buffer){
 const b=new Uint8Array(buffer),n=b.length;
 if(n<22)return {ok:false,size:n,problem:n?'too small':'empty'};
 if(!(b[0]===0x50&&b[1]===0x4b&&b[2]===3&&b[3]===4)){
  const head=new TextDecoder().decode(b.subarray(0,64)).trim().toLowerCase();
  return {ok:false,size:n,problem:head.startsWith('<')?'HTML page instead of ZIP':'not a ZIP'};
 }
 let end=-1;for(let i=n-22;i>=Math.max(0,n-65557);i--)if(b[i]===0x50&&b[i+1]===0x4b&&b[i+2]===5&&b[i+3]===6){end=i;break}
 if(end<0)return {ok:false,size:n,problem:'truncated (no ZIP directory)'};
 const entries=u16(b,end+10),dirSize=u32(b,end+12),dirStart=u32(b,end+16);
 if(dirStart+dirSize!==end||u32(b,dirStart)!==0x02014b50)return {ok:false,size:n,entries,problem:'damaged ZIP directory'};
 let encodings=false;
 for(let i=dirStart,k=0;k<entries&&i+46<=end;k++){
  if(u32(b,i)!==0x02014b50)return {ok:false,size:n,entries,problem:'damaged ZIP directory'};
  const nameLength=u16(b,i+28),name=new TextDecoder().decode(b.subarray(i+46,i+46+nameLength));
  if(name.startsWith('encodings/'))encodings=true;
  i+=46+nameLength+u16(b,i+30)+u16(b,i+32);
 }
 return encodings?{ok:true,size:n,entries}:{ok:false,size:n,entries,problem:'no encodings module'};
}

// Fetches the zip (bypassing the HTTP cache on the retry) and returns {url,report,release}. With a sound zip, url is a
// blob: URL of the same bytes for loadPyodide's stdLibURL; otherwise it is null and Pyodide loads the file as before.
export async function checkStdlib(indexURL,{retry=false,fetchImpl=fetch}={}){
 const report={retry};
 try{
  const response=await fetchImpl(new URL('python_stdlib.zip',indexURL).href,retry?{cache:'reload'}:{});
  report.status=response.status;
  if(!response.ok){report.problem=`HTTP ${response.status}`;return {url:null,report,release(){}}}
  const buffer=await response.arrayBuffer();Object.assign(report,inspectZip(buffer));
  if(!report.ok||typeof URL.createObjectURL!=='function')return {url:null,report,release(){}};
  const url=URL.createObjectURL(new Blob([buffer],{type:'application/zip'}));
  return {url,report,release(){try{URL.revokeObjectURL(url)}catch{}}};
 }catch(error){report.problem='fetch failed: '+(error?.message||error);return {url:null,report,release(){}}}
}

// Python's own last lines (Pyodide prints them to stderr) go in the details; console output is unchanged.
export function stderrTail(limit=12){
 const lines=[];
 return {lines,write(line){console.warn(line);lines.push(String(line));if(lines.length>limit)lines.shift()}};
}

// Only the lines that say why Python stopped; the sys.path dump before them is the same on every device.
const pythonCause=lines=>lines.filter(line=>/error|exception|lookup|fatal|traceback|memory/i.test(line)).slice(-4);

export function details({version,error,zip,stderr=[],nav=globalThis.navigator,native=false,retried=false}){
 const ua=String(nav?.userAgent||''),chrome=/(?:Chrome|Chromium)\/([\d.]+)/.exec(ua)?.[1],android=/Android ([\d.]+)/.exec(ua)?.[1];
 const zipLine=!zip?'not checked':zip.ok?`${zip.size} bytes · ZIP ok · ${zip.entries} files`:`${zip.problem||'failed'}${zip.size!=null?` · ${zip.size} bytes`:''}`;
 return [
  `Game v${version} · ${native?'Android app':'Web'}`,
  `Browser: ${chrome?`Chrome ${chrome}`:'unknown'}${/; wv\)/.test(ua)?' (WebView)':''}${android?` · Android ${android}`:''}`,
  `Device memory: ${nav?.deviceMemory?nav.deviceMemory+' GB':'unknown'}`,
  `Stdlib zip: ${zipLine}${zip?.retry?' · re-downloaded':''}`,
  `Automatic retry: ${retried?'used':'not used'}`,
  `Error: ${error?.message||error||'unknown'}`,
  ...pythonCause(stderr).map(line=>'Python: '+line),
  `UA: ${ua}`
 ].join('\n');
}

// Only Python failing to start is retried, once per browser tab; a successful start clears the mark.
export const startupRetried=(storage=globalThis.sessionStorage)=>{try{return storage?.getItem(RETRY_KEY)==='1'}catch{return false}};
export function clearRetry(storage=globalThis.sessionStorage){try{storage?.removeItem(RETRY_KEY)}catch{}}
// No cache is cleared: the web app's service worker stores only files whose SHA-256 matches the build (pwa-sw.js
// verified()), and the APK reads its own assets, so a cached copy cannot be the broken one. Dropping the offline
// files would only break offline play until they downloaded again. The retry's zip check bypasses the HTTP cache.
export function retryOnce({storage=globalThis.sessionStorage,reload=()=>location.reload()}={}){
 try{if(!storage||storage.getItem(RETRY_KEY)==='1')return false;storage.setItem(RETRY_KEY,'1')}catch{return false}
 reload();return true;
}

export async function copyText(text,doc=globalThis.document){
 try{await navigator.clipboard.writeText(text);return true}catch{}
 // Older WebViews: select a hidden textarea and copy.
 try{const area=doc.createElement('textarea');area.value=text;area.setAttribute('readonly','');area.style.cssText='position:fixed;opacity:0';doc.body.append(area);area.select();const done=doc.execCommand('copy');area.remove();return done}catch{return false}
}
